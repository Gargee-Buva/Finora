// backend/src/config/google-ai.config.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import Env from "./env.config.js"; // your existing env helper

if (!Env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not set in env.config. AI calls will fail.");
}

export const genAI = new GoogleGenerativeAI(Env.GEMINI_API_KEY);

// full model IDs from the model list you ran
export const candidateModels = [
  "models/gemini-2.5-flash",
  "models/gemini-2.5-pro"
];

// prefer the first; ensure it's a full model id string
export const defaultModel: string = candidateModels[0] ?? "models/gemini-2.5-flash";

// helper that returns the model instance
export const getModel = (modelName: string = defaultModel) => {
  return genAI.getGenerativeModel({ model: modelName });
};
