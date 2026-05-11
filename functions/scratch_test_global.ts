import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  vertexai: true,
  project: "endless-memento-495505-f2",
  location: "global", // Simulate production setting!
});

async function runTest() {
  console.log("Testing simulation of production setting location='global'...");
  try {
    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Jakarta trend?",
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    console.log("✅ SUCCESS with global?");
  } catch (e) {
    console.error("❌ GLOBAL FAILED AS PREDICTED!");
    console.error("Error details:", (e as any).message || e);
  }
}
runTest();
