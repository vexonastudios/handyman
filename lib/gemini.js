import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const HANDYMAN_PROMPT = `You are a professional social media writer for a local handyman business.
Look at this job photo and write a short, compelling Google Business Profile post.

Rules:
- 2–4 sentences max
- Mention the type of work visible (e.g., plumbing repair, cabinet installation, drywall patching, deck building, etc.)
- Sound friendly, professional, and local
- End with a subtle call to action like "Call us for a free quote!" or "We're here to help with all your home repair needs."
- Do NOT use hashtags
- Keep it under 1,500 characters
- Do NOT include a title or heading, just the post body text`;

function getModel(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// Preferred: describe from inline base64 — works on Vercel with no filesystem access
export async function describeImageFromBase64(base64, mimeType, apiKey) {
  if (!apiKey) throw new Error('Gemini API key is not configured. Please add it in Settings.');
  const model = getModel(apiKey);
  const imagePart = { inlineData: { data: base64, mimeType } };
  const result = await model.generateContent([HANDYMAN_PROMPT, imagePart]);
  return result.response.text().trim();
}

// Fallback: describe from a local file path (local dev only)
export async function describeImage(imagePath, apiKey) {
  if (!apiKey) throw new Error('Gemini API key is not configured. Please add it in Settings.');
  const model = getModel(apiKey);
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const imagePart = { inlineData: { data: base64, mimeType } };
  const result = await model.generateContent([HANDYMAN_PROMPT, imagePart]);
  return result.response.text().trim();
}
