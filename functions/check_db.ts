import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp(); 
const db = getFirestore("candu");

async function checkCreators() {
  console.log("Checking 'creators' collection status...");
  const snap = await db.collection("creators").get();
  console.log(`Found ${snap.docs.length} docs.`);
  
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Creator ID: ${doc.id}`);
    console.log(`Name: ${data.displayName || 'Unnamed'}`);
    console.log(`Has embedding: ${!!data.embedding}`);
    console.log(`Is Available: ${data.isAvailable === true}`);
  });
}

checkCreators().catch(console.error);
