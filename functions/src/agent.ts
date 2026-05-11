/**
 * agent.ts
 * CANDU Search Agent powered by the Gemini Enterprise Agent Platform via the
 * official Google Gen AI SDK (`@google/genai`).
 *
 * Encapsulates structured-intent extraction and regional-trends synthesis
 * into a reusable class so callable functions (e.g. `searchCreators`) stay
 * focused on orchestration.
 *
 * Auth: ADC. The SDK reads `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION`
 * (and may default `GOOGLE_GENAI_USE_VERTEXAI=True`) from the environment.
 */
import { GoogleGenAI, Type, type Tool } from "@google/genai";

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "endless-memento-495505-f2";

const ai = new GoogleGenAI({
  vertexai: true,
  project: projectId,
  // CRITICAL FIX: Explicitly target a universal model endpoint location.
  // Production runtime may inherit regional value (e.g. asia-southeast2) which DOES NOT yet 
  // support Advanced Search Grounding features, causing silent fallback cycles.
  location: "us-central1", 
});

// `gemini-3-flash-preview` is preview-gated and silently 404s on projects
// without allow-list access. Use the stable GA model for both paths until
// preview is verified available for this project.
const INTENT_MODEL = "gemini-2.5-flash";
const TRENDS_MODEL = "gemini-2.5-flash";

const INTENT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "parse_search_intent",
        description:
          "Parse user search query into structured intent for the CANDU creator marketplace.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            cleanPrompt: {
              type: Type.STRING,
              description: "Essential keywords for vector search",
            },
            budgetLimit: {
              type: Type.NUMBER,
              description:
                "Maximum budget in Rupiah, null if not specified",
            },
            isUrgent: {
              type: Type.BOOLEAN,
              description: "Whether the request is urgent",
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Extracted skills/requirements",
            },
            industry: {
              type: Type.STRING,
              description: "Detected industry category",
            },
          },
          required: ["cleanPrompt"],
        },
      },
    ],
  },
];

export interface QueryIntent {
  cleanPrompt: string;
  budgetLimit: number | null;
  isUrgent: boolean;
  skills: string[];
  industry: string;
}

export interface RegionalTrends {
  trends: string[];
  matchReasoning: string;
  detectedIndustry: string;
  strategicTip?: string;
  marketPulse?: string;
}

const FALLBACK_TRENDS: RegionalTrends = {
  trends: [
    "Digitalisasi layanan mandiri",
    "Kebutuhan konten lokal berkualitas",
  ],
  matchReasoning:
    "Berdasarkan pemetaan riwayat proyek dan kedekatan geografis.",
  detectedIndustry: "Kreatif / Jasa Umum",
  strategicTip: "Optimalkan profil portofolio untuk menarik klien regional.",
  marketPulse: "Stabil",
};

export class CanduSearchAgent {
  /**
   * Convert a free-form user prompt into structured `QueryIntent`.
   * Falls back to a safe identity-mapped intent on failure.
   */
  async parseQueryIntent(prompt: string): Promise<QueryIntent> {
    const sysPrompt = `You are a search intent parser for CANDU, a hyperlocal creator marketplace.
Analyze the user's search query and extract structured information.

User Query: "${prompt}"

Extract:
- Essential keywords for semantic search
- Budget limit if mentioned (in Rupiah)
- Urgency level
- Required skills
- Industry category`;

    try {
      const response = await ai.models.generateContent({
        model: INTENT_MODEL,
        contents: sysPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          tools: INTENT_TOOLS,
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text) as Partial<QueryIntent>;
        return {
          cleanPrompt: parsed.cleanPrompt || prompt,
          budgetLimit:
            typeof parsed.budgetLimit === "number" ? parsed.budgetLimit : null,
          isUrgent: !!parsed.isUrgent,
          skills: Array.isArray(parsed.skills) ? parsed.skills : [],
          industry: parsed.industry || "General",
        };
      }
    } catch (err) {
      console.error("Agent intent parsing failed:", err);
    }

    return {
      cleanPrompt: prompt,
      budgetLimit: null,
      isUrgent: false,
      skills: [],
      industry: "General",
    };
  }

  /**
   * Synthesize hyper-local regional industry trends and formulate context-aware
   * creator matching reasoning using the Enterprise RAG pipeline.
   * Uses dynamic Google Search grounding + vectorized local Firestore context.
   */
  async generateRegionalTrends(
    prompt: string,
    city: string,
    matchingCreators: Array<{ displayName: string; bio: string; skills: string[] }>
  ): Promise<RegionalTrends> {
    // Dynamic Context Construction from RAG retrieval stream
    const creatorsContext = matchingCreators.length > 0
      ? matchingCreators.map(c => 
          `- ${c.displayName}: ${c.bio} (Skills: ${c.skills.join(", ")})`
        ).join("\n")
      : "No specific creator records available in retrieval context.";

    const sysPrompt = `You are an expert economic and industry analysis agent for the Hyperlocal CANDU Marketplace.
Analyze current business trends and formulate a precise matching reasoning using LIVE SEARCH DATA and LOCAL CREATOR CONTEXT.

TARGET REGION: "${city}"
USER SEARCH INTENT: "${prompt}"

RETRIEVED CREATOR CONTEXT:
${creatorsContext}

TASK:
1. Use Google Search Grounding to identify 2 dynamic real-time trends in ${city} related to ${prompt}.
2. Analyze RETRIEVED CREATOR CONTEXT to write a 1-2 sentence specific reasoning mentioning matching creator profiles.
3. Formulate a short ACTIONABLE strategic advice for this intent.
4. Determine market pulse status (High Demand, Rising, Stable).

OUTPUT INSTRUCTIONS:
You must output EXACTLY 5 segments separated by the delimiter "||SPLIT||" in this exact order. DO NOT output any other text.
Segment 1: Trend1; Trend2 (separate trends with single semicolon)
Segment 2: The specific matching reasoning text
Segment 3: Detected industry name
Segment 4: Strategic Action Tip (1 short sentence)
Segment 5: Market Pulse (One-two words, e.g., "Tinggi", "Meningkat", "Stabil")

Example Correct Output:
Trend A; Trend B||SPLIT||Profil A cocok karena X||SPLIT||Teknologi||SPLIT||Saran aksi taktis||SPLIT||Meningkat`;

    try {
      const response = await ai.models.generateContent({
        model: TRENDS_MODEL,
        contents: sysPrompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 500,
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text?.trim();
      if (text) {
        console.log("Raw RAG Payload:", text.substring(0, 100));
        // Bulletproof Token-based Split Protocol
        const parts = text.split("||SPLIT||").map(p => p.trim());
        
        if (parts.length >= 3) {
          const trendPart = parts[0].split(";").map(t => t.trim()).filter(Boolean);
          return {
            trends: trendPart.length > 0 ? trendPart : [text.substring(0, 50)],
            matchReasoning: parts[1] || text.substring(0, 150),
            detectedIndustry: parts[2] || "Umum",
            strategicTip: parts[3] || "Pertimbangkan keahlian spesifik pencarian Anda.",
            marketPulse: parts[4] || "Stabil",
          };
        }
        
        // SUPER AGGRESSIVE RECOVERY: Map raw text to ALL fields dynamically!
        console.warn("Split protocol failed. Salvaging dynamic payload anyway.");
        const lines = text.split(/[\n.]/).map(l => l.trim()).filter(l => l.length > 5);
        
        return {
          trends: lines.length >= 2 
            ? [lines[0].substring(0, 80), lines[1].substring(0, 80)] 
            : [text.substring(0, 80), "Tren dinamis terdeteksi"],
          matchReasoning: text.length > 200 ? text.substring(0, 200) + "..." : text,
          detectedIndustry: "Analisis Terpusat",
          strategicTip: lines.length > 2 ? lines[2] : "Optimalkan pencarian spesifik.",
          marketPulse: "Aktif",
        };
      }
    } catch (err) {
      console.error("Ultimate RAG Pipeline Crash:", err);
    }

    return FALLBACK_TRENDS;
  }
}
