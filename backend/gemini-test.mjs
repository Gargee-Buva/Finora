import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("No GEMINI_API_KEY in env");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

const run = async () => {
  try {
    const res = await model.generateContent("Say hi");
    console.log(await res.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
};
run();
