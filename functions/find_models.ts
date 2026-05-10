import { GoogleAuth } from "google-auth-library";

async function listAvailableModels() {
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
  const projectId = "endless-memento-495505-f2";
  const client = await auth.getClient();
  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models`;

  try {
    console.log("Querying models in us-central1...");
    const res = await client.request<any>({ url, method: "GET" });
    const models = res.data.models || [];
    console.log(`Found ${models.length} models.`);
    models.slice(0, 10).forEach((m: any) => {
      console.log(`MODEL ID: ${m.name.split("/").pop()}  -> Full: ${m.name}`);
    });
  } catch (err: any) {
    console.error("ERROR QUERYING:", err.response?.data || err.message);
  }
}

listAvailableModels();
