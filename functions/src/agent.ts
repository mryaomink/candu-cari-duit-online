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
  "candu-project";
const location = process.env.GOOGLE_CLOUD_LOCATION || "global";

const ai = new GoogleGenAI({
  vertexai: true,
  project: projectId,
  location,
});

const INTENT_MODEL = "gemini-3-flash-preview";
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
}

const FALLBACK_TRENDS: RegionalTrends = {
  trends: [
    "Digitalisasi layanan mandiri",
    "Kebutuhan konten lokal berkualitas",
  ],
  matchReasoning:
    "Berdasarkan pemetaan riwayat proyek dan kedekatan geografis.",
  detectedIndustry: "Kreatif / Jasa Umum",
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
   * Synthesize 2 short regional industry trends + a one-line match reasoning
   * for the requested city. Falls back to a static payload.
   */
  async generateRegionalTrends(
    prompt: string,
    city: string,
  ): Promise<RegionalTrends> {
    const sysPrompt = `Analyze local business trends for search: "${prompt}" in ${city}.
Provide 2 current industry trends and 1 sentence reasoning for creator matching.
Format: {"trends": ["tren1", "tren2"], "matchReasoning": "karena...", "detectedIndustry": "..."}`;

    try {
      const response = await ai.models.generateContent({
        model: TRENDS_MODEL,
        contents: sysPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 250,
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text) as Partial<RegionalTrends>;
        return {
          trends: Array.isArray(parsed.trends)
            ? parsed.trends
            : FALLBACK_TRENDS.trends,
          matchReasoning:
            parsed.matchReasoning || FALLBACK_TRENDS.matchReasoning,
          detectedIndustry:
            parsed.detectedIndustry || FALLBACK_TRENDS.detectedIndustry,
        };
      }
    } catch (err) {
      console.error("Regional trends generation failed:", err);
    }

    return FALLBACK_TRENDS;
  }
}
