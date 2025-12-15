// backend/list-models.mjs
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ No GEMINI_API_KEY found in .env");
  process.exit(1);
}

const url = "https://generativelanguage.googleapis.com/v1beta/models";
const headers = { Authorization: `Bearer ${apiKey}` };

try {
  const res = await fetch(`${url}?key=${apiKey}`);
  const data = await res.json();
  console.dir(data, { depth: null });
} catch (err) {
  console.error("❌ Error fetching model list:", err);
}
