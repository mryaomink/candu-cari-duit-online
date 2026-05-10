import { GoogleAuth } from "google-auth-library";

async function run() {
  const projectId = "endless-memento-495505-f2";
  const location = "us-central1";
  
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });

  const client = await auth.getClient();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models`;
  
  try {
    const res = await client.request<any>({ url, method: "GET" });
    console.log("AVAILABLE MODELS:");
    const models = res.data.models || [];
    models.forEach((m: any) => {
      console.log(` - ${m.name}`);
    });
  } catch (err) {
    console.error("Failed listing models", err);
  }
}

run();
