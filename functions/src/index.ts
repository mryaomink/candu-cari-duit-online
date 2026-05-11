import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { GoogleGenAI } from "@google/genai";

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
async function generateEmbedding(text: string): Promise<number[] | null> {
  const cleanText = text.substring(0, 2500).replace(/\n/g, " ");
  if (!cleanText.trim()) return [];

  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: cleanText,
      config: { taskType: "RETRIEVAL_DOCUMENT" },
    });

    const values = response.embeddings?.[0]?.values;
    if (values && values.length > 0) {
      return values;
    }
    console.error("Vertex embedding response missing values:", response);
    return null;
  } catch (err) {
    console.error("Vertex AI embedding failure:", err);
    return null;
  }
}

/**
 * distillCreatorContent
 * Leverages Gemini (via the Gen AI SDK) to strip noise and define the
 * essential vector-indexing text from raw bio/skills.
 */
async function distillCreatorContent(
  bio: string,
  skills: string[],
): Promise<string> {
  const prompt = `You are a professional entity extractor. Summarize the creator profile into a concise list of core keywords/capabilities for system matching. Remove unnecessary connector words.
Bio: ${bio}
Skills: ${skills.join(", ")}
Output ONLY the essential summary text separated by commas.`;

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 150 },
    });

    const text = response.text?.trim();
    if (text) return text;
  } catch (err) {
    console.warn("Distillation failed, using fallback:", err);
  }

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
    ].join(" | ");

    const oldComposite = beforeData
      ? [
          beforeData.displayName || "",
          beforeData.bio || "",
          ...(beforeData.skills || []),
        ].join(" | ")
      : "";

    if (compositeText === oldComposite && beforeData?.embedding) {
      console.log("No fundamental text changes detected.");
      return;
    }

    console.log(
      `Step 1: Distilling semantics for creator ${event.params.creatorId}...`,
    );

    const essentialText = await distillCreatorContent(
      afterData.bio || "",
      afterData.skills || [],
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
      console.log(`Processing user prompt with Agent: "${prompt}"`);
      const intent = await searchAgent.parseQueryIntent(prompt);
      console.log("Agent extracted intent:", intent);

      // 🚀 PHASE B: RETRIEVAL (Query Vectorization)
      const queryEmbedding = await generateEmbedding(intent.cleanPrompt);

      if (queryEmbedding === null) {
        throw new Error("Failed generating query vector.");
      }
      if (queryEmbedding.length === 0) {
        throw new Error("Empty query vector generated.");
      }

      // 🚀 PHASE C: AGENT LOGICAL FILTER & VECTOR MATCHING
      const creatorsRef = db.collection("creators");
      let filteredQuery: FirebaseFirestore.Query = creatorsRef.where(
        "isAvailable",
        "==",
        true,
      );

      if (intent.budgetLimit && intent.budgetLimit > 0) {
        console.log(
          `Agent enforcing budget constraint: <= ${intent.budgetLimit}`,
        );
        filteredQuery = filteredQuery.where(
          "hourlyRate",
          "<=",
          intent.budgetLimit,
        );
      }

      const vectorQuery = filteredQuery.findNearest(
        "embedding",
        FieldValue.vector(queryEmbedding),
        {
          limit,
          distanceMeasure: "COSINE",
        },
      );

      const snapshot = await vectorQuery.get();
      const results = snapshot.docs.map((doc, idx) => {
        const d = doc.data();
        const { embedding: _embedding, ...publicData } = d;
        void _embedding;
        return {
          id: doc.id,
          displayName: publicData.displayName,
          bio: publicData.bio,
          skills: publicData.skills,
          ...publicData,
          computedMatchScore: Math.max(0.6, 0.95 - idx * 0.02),
        };
      });

      // 🚀 PHASE D: GENERATION (RAG Synthesis with Search Grounding)
      // Feed actual Top 3 matching profiles to the reasoning engine.
      const topMatchesForAi = results.slice(0, 3).map((r) => ({
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
        count: results.length,
        data: results,
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
