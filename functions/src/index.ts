import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { GoogleGenAI, Type } from "@google/genai";

import { CanduSearchAgent } from "./agent";

// Initialize app targeting named db
initializeApp();
const db = getFirestore("candu");

// Primary deploy region
setGlobalOptions({ region: "asia-southeast2" });

// Per Gemini Enterprise Agent Platform docs:
//   GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION (default "global"),
//   GOOGLE_GENAI_USE_VERTEXAI=True. ADC handles auth automatically.
const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "candu-project";

// ─── Google Gen AI SDK client (Gemini Enterprise Agent Platform) ────────────
const ai = new GoogleGenAI({
  vertexai: true,
  project: projectId,
  location: "us-central1", // Force stable region for Enterprise Generative APIs
});

// Use the stable GA model. `gemini-3-flash-preview` requires per-project
// allow-listing on Vertex AI and silently 404s on projects that haven't been
// granted preview access, surfacing as a generic 503 to the client.
const PRO_MODEL = "gemini-2.5-flash";
const FLASH_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL = "text-embedding-004";

// Reusable agent instance for structured intent + regional trends.
const searchAgent = new CanduSearchAgent();

/**
 * generateEmbedding
 * Converts arbitrary text into a 768-dim text-embedding-004 vector via the
 * Google Gen AI SDK.
 *
 * Returns:
 *   - `[]`   when the input is empty/whitespace-only (semantically valid).
 *   - `null` when the upstream Vertex API call fails. Callers should
 *            distinguish these cases to avoid persisting empty vectors
 *            on transient errors.
 */
async function generateEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
): Promise<number[] | null> {
  const cleanText = text.substring(0, 2500).replace(/\n/g, " ");
  if (!cleanText.trim()) return [];

  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: cleanText,
      config: { taskType },
    });

    const values = response.embeddings?.[0]?.values;
    if (values && values.length > 0) {
      return values;
    }
    console.error(
      `[Embedding] Vertex response missing values for task=${taskType}, textLen=${cleanText.length}:`,
      response,
    );
    return null;
  } catch (err) {
    console.error(
      `[Embedding] Vertex AI failure for task=${taskType}, textLen=${cleanText.length}:`,
      err,
    );
    return null;
  }
}

/**
 * tokenize
 * Simple word tokenizer used by the keyword fallback. Lowercases, strips
 * punctuation, drops short stop-ish tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

/**
 * keywordScore
 * Lightweight bag-of-words overlap score between a query and a creator doc
 * (bio + skills + displayName). Returns a [0,1] score used only when the
 * vector search path produces zero results or fails. NOT a replacement for
 * semantic search — just a safety net.
 */
function keywordScore(
  queryTokens: Set<string>,
  creator: { displayName?: unknown; bio?: unknown; skills?: unknown },
): number {
  if (queryTokens.size === 0) return 0;
  const docText = [
    String(creator.displayName || ""),
    String(creator.bio || ""),
    Array.isArray(creator.skills) ? creator.skills.join(" ") : "",
  ]
    .join(" ")
    .toLowerCase();
  const docTokens = new Set(tokenize(docText));
  if (docTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of queryTokens) {
    if (docTokens.has(t)) overlap += 1;
  }
  return overlap / queryTokens.size;
}

/**
 * Fetches an external image URL and converts it to base64 inlineData for the Gemini SDK.
 */
async function fetchToInlineData(url: string, format: string = "jpeg"): Promise<{ inlineData: { mimeType: string, data: string } } | null> {
  try {
    // Map simple extensions to full MIME
    let mimeType = "image/jpeg";
    const lower = format.toLowerCase();
    if (lower === "png") mimeType = "image/png";
    if (lower === "webp") mimeType = "image/webp";
    if (lower === "pdf") mimeType = "application/pdf";
    
    // In case of .pdf in URL override
    if (url.toLowerCase().endsWith(".pdf")) {
      mimeType = "application/pdf";
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed download: ${resp.status}`);
    
    const buf = await resp.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    
    return { inlineData: { mimeType, data: base64 } };
  } catch (err) {
    console.warn(`Skipping media extraction for ${url}:`, err);
    return null;
  }
}

/**
 * distillCreatorContent (Multimodal Upgrade)
 * Leverages Gemini Vision/Multi-modal capabilities to ingest BOTH the bio text
 * and the ACTUAL visual portfolio artifacts, yielding a truly unified competency vector.
 */
async function distillCreatorContent(
  bio: string,
  skills: string[],
  portfolio: any[] = []
): Promise<string> {
  const textPrompt = `You are an Elite Competency Extractor.
Task: Analyze the provided creator profile (Bio/Skills) AND their actual visual portfolio artifacts (Images/Docs).
Objective: Extract deep, unsaid technical competencies and visual quality markers evident in their real work.
Output: A single condensed string of comma-separated keywords containing their stated AND proven capabilities. Output ONLY the result. No conversation.

Bio: ${bio}
Skills: ${skills.join(", ")}
`;

  try {
    // Extract latest 3 artifacts to manage token window & latency
    const activeMedia = portfolio.slice(0, 3);
    const mediaPartsPromises = activeMedia.map(async (item: any) => {
      const url = item.secure_url || item.url;
      if (!url) return null;
      return fetchToInlineData(url, item.format || "jpeg");
    });

    const resolvedParts = (await Promise.all(mediaPartsPromises)).filter(Boolean);

    const contents: any[] = [{ text: textPrompt }];
    resolvedParts.forEach(part => {
      if (part) contents.push(part);
    });

    console.log(`Sending distill prompt with ${resolvedParts.length} multi-modal artifacts...`);
    
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents,
      config: { 
        temperature: 0.1, // Strictness matters here
        maxOutputTokens: 300 
      },
    });

    const text = response.text?.trim();
    if (text) {
      console.log("Distillation successful with artifact injection.");
      return text;
    }
  } catch (err) {
    console.warn("Deep multi-modal distillation failed, using fallback text-only:", err);
  }

  // Ultimate safe fallback
  return `${bio} ${skills.join(", ")}`;
}

/**
 * onCreatorProfileWrite
 * Trigger re-computation of search vector when bio or metadata text changes.
 */
export const onCreatorProfileWrite = onDocumentWritten(
  {
    document: "creators/{creatorId}",
    database: "candu",
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!afterData) return; // Deletions handled by index

    const compositeText = [
      afterData.displayName || "",
      afterData.bio || "",
      ...(afterData.skills || []),
      ...(afterData.portfolioImages || []).map((p: any) => p.publicId || p.url),
    ].join(" | ");

    const oldComposite = beforeData
      ? [
          beforeData.displayName || "",
          beforeData.bio || "",
          ...(beforeData.skills || []),
          ...(beforeData.portfolioImages || []).map((p: any) => p.publicId || p.url),
        ].join(" | ")
      : "";

    if (compositeText === oldComposite && beforeData?.embedding) {
      console.log("No fundamental profile or portfolio changes detected.");
      return;
    }

    console.log(
      `Step 1: Deep-distilling multi-modal semantics for creator ${event.params.creatorId}...`,
    );

    const essentialText = await distillCreatorContent(
      afterData.bio || "",
      afterData.skills || [],
      afterData.portfolioImages || [],
    );
    const finalIndexingText = `${afterData.displayName} | ${essentialText}`;

    console.log(
      `Step 2: Vectorizing distilled index: ${finalIndexingText.substring(
        0,
        50,
      )}...`,
    );
    const embedding = await generateEmbedding(finalIndexingText);

    if (embedding === null) {
      console.error(
        `Embedding generation FAILED for ${event.params.creatorId}; skipping write to avoid clobbering existing vector.`,
      );
      return;
    }

    if (embedding.length === 0) {
      console.warn(
        `Empty composite text for ${event.params.creatorId}; no vector persisted.`,
      );
      return;
    }

    await event.data?.after.ref.update({
      embedding: FieldValue.vector(embedding),
      vectorizedAt: FieldValue.serverTimestamp(),
      aiIndexSource: essentialText,
    });
    console.log("Creator agent vector persisted.");
  },
);

/**
 * searchCreators
 * Orchestrates hybrid spatial + semantic vector retrieval using the
 * CANDU search agent (Gemini Enterprise Agent Platform).
 */
export const searchCreators = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Auth required.");
    }

    const { prompt, limit = 25, city = "Indonesia" } = request.data;
    if (!prompt) {
      throw new HttpsError(
        "invalid-argument",
        "Query text prompt required.",
      );
    }

    try {
      const startTime = Date.now();

      // 🚀 PHASE A: AGENT INTENT EXTRACTION
      console.log(`[Search] Processing user prompt with Agent: "${prompt}"`);
      const intent = await searchAgent.parseQueryIntent(prompt);
      console.log("[Search] Agent extracted intent:", {
        cleanPrompt: intent.cleanPrompt,
        budgetLimit: intent.budgetLimit,
        isUrgent: intent.isUrgent,
        skills: intent.skills,
        industry: intent.industry,
      });

      // 🚀 PHASE B: RETRIEVAL (Query Vectorization)
      const queryEmbedding = await generateEmbedding(
        intent.cleanPrompt,
        "RETRIEVAL_QUERY",
      );

      if (queryEmbedding === null) {
        console.error(
          "[Search] Query embedding generation failed; falling back to keyword search.",
        );
      } else if (queryEmbedding.length === 0) {
        console.warn(
          "[Search] Empty query embedding (empty cleanPrompt); falling back to keyword search.",
        );
      } else {
        console.log(
          `[Search] Query embedding generated (dim=${queryEmbedding.length}).`,
        );
      }

      // 🚀 PHASE C: VECTOR MATCHING
      // NOTE: We intentionally do NOT apply isAvailable or hourlyRate as
      // pre-filters on the Firestore vector query. Pre-filtering on
      // hourlyRate caused relevant high-rate creators to be dropped before
      // semantic ranking even ran; pre-filtering on isAvailable excluded
      // every legacy creator missing the field. Both constraints are now
      // applied as soft post-filters / scoring signals further down.
      const creatorsRef = db.collection("creators");

      type VectorResult = {
        id: string;
        data: FirebaseFirestore.DocumentData;
        rawScore: number;
      };

      let vectorResults: VectorResult[] = [];
      let vectorSearchFailed = false;

      if (queryEmbedding && queryEmbedding.length > 0) {
        try {
          // Overshoot the requested limit so soft post-filters (availability,
          // budget) still leave enough candidates for the reranker.
          const vectorQuery = creatorsRef.findNearest(
            "embedding",
            FieldValue.vector(queryEmbedding),
            {
              limit: Math.max(limit * 3, 30),
              distanceMeasure: "COSINE",
            },
          );

          const snapshot = await vectorQuery.get();
          console.log(
            `[Search] Vector search returned ${snapshot.size} candidate(s) (pre-filter).`,
          );

          vectorResults = snapshot.docs.map((doc) => {
            const d = doc.data();
            const rawEmbedding = d.embedding;
            let realScore = 0;

            try {
              // Firestore admin provides a VectorValue (toArray()) or, in some
              // runtimes, a plain number[]. text-embedding-004 vectors are
              // L2-normalized so dot product === cosine similarity.
              const vectorB: number[] =
                typeof rawEmbedding?.toArray === "function"
                  ? rawEmbedding.toArray()
                  : Array.isArray(rawEmbedding)
                    ? rawEmbedding
                    : [];

              if (vectorB.length > 0 && queryEmbedding.length > 0) {
                let dot = 0;
                const len = Math.min(queryEmbedding.length, vectorB.length);
                for (let i = 0; i < len; i++) {
                  dot += queryEmbedding[i] * (vectorB[i] || 0);
                }
                realScore = dot;
              } else {
                console.warn(
                  `[Search] Doc ${doc.id} has no usable embedding vector; score=0.`,
                );
              }
            } catch (e) {
              console.error(
                `[Search] Failed vector math for doc ${doc.id}:`,
                e,
              );
            }

            return { id: doc.id, data: d, rawScore: realScore };
          });
        } catch (vecErr) {
          vectorSearchFailed = true;
          console.error(
            "[Search] Vector findNearest call FAILED; falling back to keyword search:",
            vecErr,
          );
        }
      }

      // 🚀 PHASE C.1: KEYWORD FALLBACK
      // Triggered when vector search produced no usable candidates, either
      // because the embedding call failed, the findNearest call failed, or
      // the corpus simply has no vectorized matches yet.
      if (vectorResults.length === 0) {
        console.warn(
          `[Search] No vector candidates (failed=${vectorSearchFailed}); engaging keyword fallback.`,
        );
        try {
          const fallbackSnap = await creatorsRef.limit(200).get();
          const queryTokens = new Set(
            tokenize(`${intent.cleanPrompt} ${(intent.skills || []).join(" ")}`),
          );
          const scored = fallbackSnap.docs
            .map((doc) => {
              const d = doc.data();
              const score = keywordScore(queryTokens, d);
              return { id: doc.id, data: d, rawScore: score };
            })
            .filter((r) => r.rawScore > 0)
            .sort((a, b) => b.rawScore - a.rawScore)
            .slice(0, Math.max(limit * 3, 30));
          vectorResults = scored;
          console.log(
            `[Search] Keyword fallback produced ${vectorResults.length} candidate(s).`,
          );
        } catch (fallbackErr) {
          console.error("[Search] Keyword fallback also failed:", fallbackErr);
        }
      }

      // 🚀 PHASE C.2: SOFT POST-FILTERS & SCORING ADJUSTMENTS
      const preAvailability = vectorResults.length;
      // Treat creators with no `isAvailable` field as available; only drop
      // those explicitly set to false.
      vectorResults = vectorResults.filter(
        (r) => r.data.isAvailable !== false,
      );
      console.log(
        `[Search] Availability filter: ${preAvailability} -> ${vectorResults.length} (dropped only explicit false).`,
      );

      if (intent.budgetLimit && intent.budgetLimit > 0) {
        const preBudget = vectorResults.length;
        // Soft penalty rather than hard drop: keep over-budget creators but
        // halve their score so within-budget peers float to the top.
        vectorResults = vectorResults.map((r) => {
          const rate = Number(r.data.hourlyRate);
          if (Number.isFinite(rate) && rate > (intent.budgetLimit as number)) {
            return { ...r, rawScore: r.rawScore * 0.5 };
          }
          return r;
        });
        console.log(
          `[Search] Budget soft-penalty applied (limit=${intent.budgetLimit}); kept ${vectorResults.length}/${preBudget} candidates.`,
        );
      }

      vectorResults.sort((a, b) => b.rawScore - a.rawScore);
      vectorResults = vectorResults.slice(0, limit);

      const results = vectorResults.map(({ id, data, rawScore }) => {
        // Strip heavy vector from standard response payloads to minimize bandwidth.
        const { embedding: _discard, ...publicData } = data;
        void _discard;

        return {
          id,
          displayName: publicData.displayName,
          bio: publicData.bio,
          skills: publicData.skills,
          ...publicData,
          computedMatchScore: Number(rawScore.toFixed(4)),
          hasEmbedding: !!data.embedding,
        };
      });

      console.log(
        `[Search] Final candidate scores (top ${Math.min(results.length, 5)}):`,
        results.slice(0, 5).map((r) => {
          const rec = r as Record<string, unknown>;
          return {
            id: r.id,
            name: r.displayName,
            score: r.computedMatchScore,
            hourlyRate: rec.hourlyRate,
          };
        }),
      );

      // 🚀 PHASE D: ELITE RERANKING (Gemini Verification Layer)
      // Harness Gemini's deep comprehension to surgically excise high-similarity semantic noise.
      let finalMatches = results;
      if (results.length > 0) {
        try {
          const candidateLog = results.map((r, idx) => 
            `${idx}: [${r.displayName}] Bio: ${r.bio || 'n/a'}. Skills: ${Array.isArray(r.skills) ? r.skills.join(', ') : 'n/a'}`
          ).join('\n');

          const rerankPrompt = `Task: Smart Relevancy Gatekeeper
Evaluate if candidates actually match the specific User Request.

User Search Request: "${prompt}"

Candidate Pool:
${candidateLog}

LOGICAL EVALUATION GUIDELINES:
1. ACCEPTANCE RULE: If a user asks for a specific technical service (e.g., Programmer, Developer) and the candidate explicitly lists those technical skills, you MUST ACCEPT THEM ([idx]). They are a perfect match.
2. REJECTION RULE: If a user asks for an unrelated category (e.g., Laundry, Cleaners) and the candidate ONLY lists Coding/Tech, you MUST REJECT THEM immediately. 
3. No Category Mixing: A software creator cannot perform physical laundry services, and vice versa.
4. Be accurate, logical, and fair. Output the indices of logical matches only.

Output Instructions: Output ONLY the flat JSON array of matching indices.`;

          const reResp = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: rerankPrompt,
            config: {
              temperature: 0,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.INTEGER,
                },
              },
              maxOutputTokens: 100,
            }
          });

          let rawText = reResp.text?.trim() || "[]";
          
          // Aggressive cleaning in case of markdown leakage
          if (rawText.includes("```")) {
            rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          }

          const validIndices = JSON.parse(rawText);
          if (Array.isArray(validIndices)) {
            const parsedIndices = validIndices
              .map((n) => Number(n))
              .filter((n) => !isNaN(n));
            const reranked = results.filter((_, i) =>
              parsedIndices.includes(i),
            );
            if (reranked.length === 0) {
              // Reranker returned an empty set — this often happens when the
              // gatekeeper LLM is overly strict. Prefer showing the raw
              // semantic candidates over an empty radar.
              console.warn(
                "[Reranker] Returned 0 matches; keeping unfiltered semantic results to avoid an empty radar.",
              );
              finalMatches = results;
            } else {
              finalMatches = reranked;
              console.log(
                `[Reranker] Pruned candidates ${results.length} -> ${finalMatches.length}.`,
              );
            }
          } else {
            console.warn(
              "[Reranker] Invalid response shape; keeping unfiltered semantic results.",
            );
            finalMatches = results;
          }
        } catch (rerankErr) {
          // Soft degradation: if the gatekeeper crashes, fall back to the
          // unfiltered semantic results rather than silently zeroing the UI.
          console.error(
            "[Reranker] Gatekeeper failed; falling back to unfiltered semantic results:",
            rerankErr,
          );
          finalMatches = results;
        }
      }

      // 🚀 PHASE E: GENERATION (RAG Synthesis with Search Grounding)
      // Feed actual Top 3 matching profiles to the reasoning engine.
      const topMatchesForAi = finalMatches.slice(0, 3).map((r) => ({
        displayName: String(r.displayName || "Anon"),
        bio: String(r.bio || ""),
        skills: Array.isArray(r.skills) ? r.skills : [],
      }));

      console.log("Invoking Enterprise RAG engine with local context facts...");
      const trendData = await searchAgent.generateRegionalTrends(
        intent.cleanPrompt,
        city,
        topMatchesForAi,
      );

      return {
        status: "success",
        count: finalMatches.length,
        data: finalMatches,
        aiInsights: trendData,
        extractedIntent: intent,
        telemetry: {
          ms: Date.now() - startTime,
        },
      };
    } catch (err: unknown) {
      console.error("Agent discovery pipeline crash:", err);
      const message =
        err instanceof Error ? err.message : "Discovery pipeline failed.";
      throw new HttpsError("internal", message);
    }
  },
);

/**
 * processEscrow
 * Atomic simulation logic that transfers 'candu' tokens between parties securely.
 * Restricts operation permissions and updates audit log.
 */
export const processEscrow = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Tindakan finansial memerlukan autentikasi.",
    );
  }

  const { projectId: targetProjectId, amount } = request.data;

  if (!targetProjectId || !amount || amount <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "Informasi proyek dan nominal tidak valid.",
    );
  }

  const uid = request.auth.uid;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const projRef = db.collection("projects").doc(targetProjectId);
      const userRef = db.collection("users").doc(uid);

      const projSnap = await transaction.get(projRef);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) throw "Profil pengguna tidak ditemukan.";
      if (!projSnap.exists) throw "Proyek tidak ditemukan.";

      const projData = projSnap.data();

      if (projData?.clientId !== uid) {
        throw "Anda tidak berwenang memproses pembayaran untuk proyek ini.";
      }

      if (projData?.status !== "pending") {
        throw "Proyek ini sudah diproses atau sedang berjalan.";
      }

      transaction.update(projRef, {
        status: "active",
        escrowedAmount: amount,
        startedAt: FieldValue.serverTimestamp(),
      });

      const txRef = db.collection("transactions").doc();
      transaction.set(txRef, {
        projectId: targetProjectId,
        fromUid: uid,
        toUid: projData?.creatorId || "unknown",
        amount,
        type: "escrow_deposit",
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.update(userRef, {
        balance: FieldValue.increment(-amount),
      });

      return txRef.id;
    });

    return {
      success: true,
      message: "Dana berhasil masuk Escrow CANDU.",
      transactionId: result,
    };
  } catch (err: unknown) {
    console.error("Escrow failure:", err);
    const message =
      typeof err === "string"
        ? err
        : err instanceof Error
          ? err.message
          : "Transaksi gagal dilakukan.";
    throw new HttpsError("aborted", message);
  }
});

/**
 * Callable AI Utility: Expands a user's simple keywords into a professional
 * creative bio.
 */
export const enhanceBio = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { text: rawInput, displayName, city, skills } = request.data || {};

  if (!rawInput || typeof rawInput !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Please provide raw text to enhance.",
    );
  }

  // Dynamic context injection
  const contextPrompt = `
CREATOR CONTEXT:
- Name: ${displayName || "Kreator"}
- Location: ${city || "Indonesia"}
- Expertise Skills: ${skills || "Umum"}
`;

  const sysPrompt = `You are an elite Career Copywriter and Brand Strategist.
Your task is to transform basic input into a MAGNETIC, conversion-optimized professional profile summary.

${contextPrompt}

DRAFT INPUT FROM USER: "${rawInput}"

COPYWRITING FRAMEWORK TO USE:
1. Powerful Hook: Open with a very strong value proposition immediately.
2. Depth & Skill: Weave the user's expertise into an engaging narrative. Highlight ${city || "their locality"} as an active market presence.
3. Smooth CTA: Sound professional, reliable, and ready to act.

CRITICAL CONSTRAINTS:
- Write in fluent, modern, and highly persuasive BAHASA INDONESIA.
- Length: Make it slightly more detailed and robust. About 3 to 4 well-crafted sentences. DO NOT be overly brief.
- DO NOT output any conversational meta-talk. Output ONLY the enhanced final text.`;

  try {
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: sysPrompt,
      config: { 
        temperature: 0.85, 
        maxOutputTokens: 600, // Boost capacity for richness
      },
    });

    const enhancedText = response.text?.trim();
    if (enhancedText) {
      return { enhancedText };
    }

    console.error("EnhanceBio: empty response from model", { model: PRO_MODEL });
    throw new HttpsError(
      "unavailable",
      "AI returned an empty response. Coba lagi.",
    );
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    console.error("EnhanceBio failed:", err);
    throw new HttpsError(
      "unavailable",
      `AI gagal merespons: ${message}`,
    );
  }
});
