import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { GoogleAuth } from "google-auth-library";
import { VertexAI } from "@google-cloud/vertexai";

import { CanduSearchAgent } from "./agent";

// Initialize app targeting named db
initializeApp();
const db = getFirestore("candu");

// Primary deploy region
setGlobalOptions({ region: "asia-southeast2" });

const projectId =
  process.env.VERTEX_AI_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "candu-project";
const vertexLocation = process.env.VERTEX_AI_LOCATION || "global";
const apiEndpoint = "aiplatform.googleapis.com";

// ─── Vertex AI client (Gemini Enterprise Agent Platform) ────────────────────
const vertexAI = new VertexAI({
  project: projectId,
  location: vertexLocation,
});

const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-3.1-pro",
});

const flashModel = vertexAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite",
});

// Reusable agent instance for structured intent + regional trends.
const searchAgent = new CanduSearchAgent();

// ─── Embeddings (REST via ADC) ──────────────────────────────────────────────
//
// The `@google-cloud/vertexai` SDK currently exposes generative-model
// surface only. Embedding generation still uses the Vertex AI REST API,
// authenticated via Application Default Credentials (ADC) through
// `google-auth-library`. The REST call benefits from the same identity
// resolution as the SDK, so this keeps a single auth model.
const auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

interface VertexEmbeddingResponse {
  predictions?: Array<{
    embeddings?: { values?: number[] };
  }>;
}

/**
 * generateEmbedding
 * Converts arbitrary text into a 768-dim text-embedding-004 vector.
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
    const client = await auth.getClient();
    const url = `https://${apiEndpoint}/v1/projects/${projectId}/locations/${vertexLocation}/publishers/google/models/text-embedding-004:predict`;

    const payload = {
      instances: [
        {
          content: cleanText,
          task_type: "RETRIEVAL_DOCUMENT",
        },
      ],
    };

    const res = await client.request<VertexEmbeddingResponse>({
      url,
      method: "POST",
      data: payload,
    });

    const values = res.data?.predictions?.[0]?.embeddings?.values;
    if (values && values.length > 0) {
      return values;
    }
    console.error("Vertex embedding response missing values:", res.data);
    return null;
  } catch (err) {
    console.error("Vertex AI embedding failure:", err);
    return null;
  }
}

/**
 * distillCreatorContent
 * Leverages Gemini (via Vertex AI SDK) to strip noise and define the
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
    const result = await flashModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 150 },
    });

    const text =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
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

      // 🚀 PHASE B: PARALLEL EXECUTION (Embeddings & Regional Trends)
      const [queryEmbedding, trendData] = await Promise.all([
        generateEmbedding(intent.cleanPrompt),
        searchAgent.generateRegionalTrends(intent.cleanPrompt, city),
      ]);

      if (queryEmbedding === null) {
        throw new Error("Failed generating query vector.");
      }
      if (queryEmbedding.length === 0) {
        throw new Error("Empty query vector generated.");
      }

      // 🚀 PHASE C: AGENT LOGICAL FILTER INJECTION
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

      // 🚀 PHASE D: VERTEX RAG VECTOR RETRIEVAL
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
        // Strip the embedding before returning to clients.
        const { embedding: _embedding, ...publicData } = d;
        void _embedding;
        return {
          id: doc.id,
          ...publicData,
          computedMatchScore: Math.max(0.6, 0.95 - idx * 0.02),
        };
      });

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
 * Callable AI Utility: Expands a user's simple keywords into a professional creative bio.
 */
export const enhanceBio = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const rawInput = request.data.text;
  if (!rawInput || typeof rawInput !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Please provide raw text to enhance.",
    );
  }

  const sysPrompt = `Anda adalah copywriter karir profesional.
Tugas Anda adalah mengubah input sederhana pengguna menjadi BIOGRAFI PROFIL PROFESIONAL yang sangat menarik untuk dipajang di platform jasa.
Buat teks menjadi mengalir, percaya diri, dan fokus pada nilai tambah bagi klien.
Gunakan Bahasa Indonesia profesional. Batasi maksimal 2-3 kalimat padat.

Input Pengguna: "${rawInput}"

Balasan Anda HANYA berisi teks biografi tersebut, tanpa embel-embel percakapan lain.`;

  try {
    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: sysPrompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
    });

    const enhancedText =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (enhancedText) {
      return { enhancedText };
    }
  } catch (err) {
    console.error("EnhanceBio failed:", err);
  }

  throw new HttpsError(
    "unavailable",
    "All GenAI tiers exhausted. Try again later.",
  );
});
