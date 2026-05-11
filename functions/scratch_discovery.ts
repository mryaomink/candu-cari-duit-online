import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  vertexai: true,
  project: "placeholder",
  location: "global",
});

console.log("KEYS on ai instance:");
console.log(Object.keys(ai));

// Checking submodules
if ((ai as any).caches) console.log("✅ caches present");
if ((ai as any).files) console.log("✅ files present");
if ((ai as any).models) console.log("✅ models present");
if ((ai as any).rag) console.log("✅ rag present (RAG Engine detected!)");
if ((ai as any).agents) console.log("✅ agents present");
