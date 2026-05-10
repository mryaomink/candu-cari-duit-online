/**
 * agent.ts
 * CANDU Search Agent powered by the Gemini Enterprise Agent Platform
 * via the official `@google-cloud/vertexai` SDK.
 *
 * Encapsulates the structured-intent extraction and regional-trends
 * synthesis into a reusable class so that callable functions
 * (e.g. `searchCreators`) stay focused on orchestration.
 */
import {
  VertexAI,
  SchemaType,
  type GenerativeModel,
  type GenerateContentResult,
} from "@google-cloud/vertexai";

const projectId =
  process.env.VERTEX_AI_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "candu-project";
const vertexLocation = process.env.VERTEX_AI_LOCATION || "global";

const vertexAI = new VertexAI({
  project: projectId,
  location: vertexLocation,
});

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

/**
 * Try to extract the first JSON-encoded text part from a Vertex
 * `GenerateContentResult`. Returns `null` if no decodable text is present.
 */
function extractText(result: GenerateContentResult): string | null {
  const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" && text.trim().length > 0 ? text : null;
}

export class CanduSearchAgent {
  private readonly intentModel: GenerativeModel;

  constructor() {
    this.intentModel = vertexAI.getGenerativeModel({
      model: "gemini-3.1-pro",
      tools: [
        {
          functionDeclarations: [
            {
              name: "parse_search_intent",
              description:
                "Parse user search query into structured intent for the CANDU creator marketplace.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  cleanPrompt: {
                    type: SchemaType.STRING,
                    description: "Essential keywords for vector search",
                  },
                  budgetLimit: {
                    type: SchemaType.NUMBER,
                    description:
                      "Maximum budget in Rupiah, null if not specified",
                  },
                  isUrgent: {
                    type: SchemaType.BOOLEAN,
                    description: "Whether the request is urgent",
                  },
                  skills: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: "Extracted skills/requirements",
                  },
                  industry: {
                    type: SchemaType.STRING,
                    description: "Detected industry category",
                  },
                },
                required: ["cleanPrompt"],
              },
            },
          ],
        },
      ],
    });
  }

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
      const result = await this.intentModel.generateContent({
        contents: [{ role: "user", parts: [{ text: sysPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const text = extractText(result);
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
   * Synthesize 2 short regional industry trends + a one-line match
   * reasoning for the requested city. Falls back to a static payload.
   */
  async generateRegionalTrends(
    prompt: string,
    city: string,
  ): Promise<RegionalTrends> {
    const trendsModel = vertexAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
    });

    const sysPrompt = `Analyze local business trends for search: "${prompt}" in ${city}.
Provide 2 current industry trends and 1 sentence reasoning for creator matching.
Format: {"trends": ["tren1", "tren2"], "matchReasoning": "karena...", "detectedIndustry": "..."}`;

    try {
      const result = await trendsModel.generateContent({
        contents: [{ role: "user", parts: [{ text: sysPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 250,
        },
      });

      const text = extractText(result);
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
