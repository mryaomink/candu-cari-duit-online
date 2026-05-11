import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  project: "endless-memento-495505-f2",
  location: "us-central1", // explicitly use a stable vertex region
});

async function runTest() {
  console.log("Starting direct Gemini + Google Search Grounding test...");
  try {
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "What are two business trends in Jakarta right now? Return as Trend1; Trend2",
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    console.log("✅ SUCCESS!");
    console.log("Model responded:", resp.text);
  } catch (e) {
    console.error("❌ ERROR CAPTURED:");
    console.error(e);
  }
}

runTest();
