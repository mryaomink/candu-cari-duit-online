function cleanJson(str: string): string {
  // 1. Extract only text between first { and last }
  const match = str.match(/\{[\s\S]*\}/);
  if (!match) return str;
  let cleaned = match[0];

  // 2. Remove newlines within JSON values, but preserve actual escaped sequences.
  // Replace raw control characters with simple escape equivalents
  cleaned = cleaned.replace(/[\u0000-\u001F]+/g, (m) => " "); 
  return cleaned;
}

const badJson = `{
  "trends": [
    "Trend 1
    with newline",
    "Trend 2"
  ],
  "matchReasoning": "karena..."
}`;

try {
  const result = cleanJson(badJson);
  console.log("Cleaned result attempt:");
  console.log(result);
  JSON.parse(result);
  console.log("✅ Parse successful!");
} catch (e) {
  console.log("❌ Still failed:", (e as any).message);
}
