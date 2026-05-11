import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  project: "endless-memento-495505-f2",
  location: "asia-southeast2", // MIMIC REAL PRODUCTION VARIABLE!
});

async function runTest() {
  console.log("Testing EXACT production environment location='asia-southeast2'...");
  try {
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Tell me 1 Jakarta business trend",
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    console.log("✅ SUCCESS with asia-southeast2");
    console.log("Response:", resp.text);
  } catch (e) {
    console.error("❌ PRODUCTION SIMULATION FAILED!");
    console.error("Message:", (e as any).message);
  }
}
runTest();
