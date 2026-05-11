import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod"; // Untuk validasi schema produksi

/**
 * PRODUCTION SCHEMAS
 * Memastikan output LLM sesuai kontrak data aplikasi.
 */
const QueryIntentSchema = z.object({
  cleanPrompt: z.string(),
  budgetLimit: z.number().nullable().default(null),
  isUrgent: z.boolean().default(false),
  skills: z.array(z.string()).default([]),
  industry: z.string().default("General"),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

/**
 * REGIONAL TRENDS SCHEMA
 */
export interface RegionalTrends {
  trends: string[];
  matchReasoning: string;
  detectedIndustry: string;
  strategicTip?: string;
  marketPulse?: string;
}

/**
 * AGENT CONFIGURATION
 */
const CONFIG = {
  PROJECT: process.env.GOOGLE_CLOUD_PROJECT || "endless-memento-495505-f2",
  LOCATION: "us-central1",
  MODEL: "gemini-2.5-flash",
  RETRY_ATTEMPTS: 2
};

const ai = new GoogleGenAI({
  vertexai: true,
  project: CONFIG.PROJECT,
  location: CONFIG.LOCATION,
});

export class CanduSearchAgent {
  private model;

  constructor() {
    this.model = ai.models;
  }

  /**
   * Helper: Membersihkan output AI dari karakter sampah/markdown
   */
  private cleanRawResponse(text: string): string {
    return text.replace(/```json|```/g, "").trim();
  }

  /**
   * PRODUCTION INTENT PARSER
   */
  async parseQueryIntent(prompt: string): Promise<QueryIntent> {
    const sysPrompt = `Analyze and extract structured search intent for the CANDU hyperlocal marketplace.
User Query: "${prompt}"
You MUST invoke the 'output_intent' function with the parsed data.`;

    try {
      const response = await this.model.generateContent({
        model: CONFIG.MODEL,
        contents: sysPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          // Menggunakan Tools untuk memaksa output terstruktur
          tools: [{
            functionDeclarations: [{
              name: "output_intent",
              description: "Save structured search metadata",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  cleanPrompt: { type: Type.STRING, description: "Essential cleaned search query" },
                  budgetLimit: { type: Type.NUMBER, description: "Budget if specified, null if not" },
                  isUrgent: { type: Type.BOOLEAN, description: "True if user states immediate need" },
                  skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Extracted raw skill tags" },
                  industry: { type: Type.STRING, description: "Detected macro category" }
                },
                required: ["cleanPrompt"]
              }
            }]
          }]
        },
      });

      // Check if response has text, if not, manual salvage from response object
      let rawText = response.text || "{}";
      
      // Check for common response shapes
      if (!response.text && (response as any).candidates?.[0]?.content?.parts?.[0]?.functionCall) {
         const fc = (response as any).candidates[0].content.parts[0].functionCall;
         if (fc.args) {
            return QueryIntentSchema.parse(fc.args);
         }
      }

      const cleaned = this.cleanRawResponse(rawText);
      const parsed = JSON.parse(cleaned);
      
      return QueryIntentSchema.parse(parsed);

    } catch (err) {
      console.error(`[Agent.Error] Intent Parsing failed for prompt: ${prompt}`, err);
      // Safe Fallback
      return {
        cleanPrompt: prompt,
        budgetLimit: null,
        isUrgent: false,
        skills: [],
        industry: "General",
      };
    }
  }

  /**
   * PRODUCTION RAG SYNTHESIS
   * Menggunakan robust split logic dan grounding yang membumi.
   */
  async generateRegionalTrends(
    prompt: string,
    city: string,
    creators: Array<{ displayName: string; bio: string; skills: string[] }>
  ): Promise<RegionalTrends> {
    const context = creators.length > 0 
      ? creators.map(c => `${c.displayName} (${c.skills.join(",")})`).join(" | ")
      : "Tidak ada profil kreator spesifik ditemukan.";

    // We keep the friendly tone that was accepted earlier but follow the User's structural pattern
    const sysPrompt = `Anda Asisten Lokal CANDU. Lokasi: "${city}". Pencarian: "${prompt}". Kreator Ditemukan: "${context}".
Gunakan bahasa Indonesia santai dan sederhana yang relevan dengan daerah lokal.

TUGAS:
1. Tulis 2 tren lokal/pasar nyata dipisah koma.
2. Tulis 1 kalimat alasan ramah kenapa mereka cocok.
3. Nama Kategori Simpel.
4. 1 Tips ringan.
5. Status Pasar (Ramah/Rame/Santai).

WAJIB FORMAT SATU BARIS, pisahkan tiap segmen HANYA dengan tanda "||SPLIT||":
Tren 1, Tren 2||SPLIT||Alasan||SPLIT||Kategori||SPLIT||Tips Ringan||SPLIT||Status Pasar`;

    try {
      const result = await this.model.generateContent({
        model: CONFIG.MODEL,
        contents: sysPrompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 400,
          tools: [{ googleSearch: {} }] // Grounding untuk data real-time
        }
      });

      const text = result.text?.trim() || "";
      const parts = text.split("||SPLIT||").map(p => p.trim());

      if (parts.length < 3) {
         // Fallback parsing logic for unformatted response
         const cleanLines = text.split(/[\n.]/).filter(l => l.length > 3);
         return {
            trends: cleanLines.length > 1 ? [cleanLines[0].substring(0, 80), cleanLines[1].substring(0, 80)] : ["Permintaan digital lokal", "Potensi konten"],
            matchReasoning: text.length > 200 ? text.substring(0, 200) + "..." : text,
            detectedIndustry: "Jasa Umum",
            strategicTip: "Cek profile lengkap mereka di CANDU.",
            marketPulse: "Ramah"
         };
      }

      return {
        trends: parts[0].split(/[;,]/).map(t => t.trim()).filter(Boolean),
        matchReasoning: parts[1] || "Tersedia profil yang sesuai dengan kriteria.",
        detectedIndustry: parts[2] || "Jasa Umum",
        strategicTip: parts[3] || "Silakan cek profil lengkap mereka.",
        marketPulse: parts[4] || "Stabil",
      };

    } catch (err) {
      console.error("[Agent.Error] Trends Synthesis failed", err);
      return {
        trends: ["Kebutuhan jasa lokal bertumbuh", "Pemanfaatan media sosial meningkat"],
        matchReasoning: "Ada beberapa kandidat di database yang memiliki dasar skill yang Anda cari.",
        detectedIndustry: "Jasa Umum",
        strategicTip: "Mulai diskusi via chat untuk detail project.",
        marketPulse: "Ramah"
      };
    }
  }
}
