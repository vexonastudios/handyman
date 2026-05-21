import { NextResponse } from 'next/server';
import { describeImage, describeImageFromBase64 } from '@/lib/gemini';

// POST /api/describe
// Accepts: { imagePath } OR { base64, mimeType }
// base64 is preferred — avoids filesystem reads on Vercel (ephemeral /tmp).
// Uses the admin-supplied GEMINI_API_KEY from server environment variables.
export async function POST(request) {
  try {
    const body = await request.json();
    const { imagePath, base64, mimeType } = body;

    if (!imagePath && !base64) {
      return NextResponse.json({ error: 'imagePath or base64 is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'Gemini is not configured. Please contact the app administrator.',
      }, { status: 500 });
    }

    let description;
    if (base64 && mimeType) {
      // Preferred path: use inline base64 — no disk I/O needed
      description = await describeImageFromBase64(base64, mimeType, apiKey);
    } else {
      // Fallback: read from filesystem path (local dev only)
      description = await describeImage(imagePath, apiKey);
    }

    return NextResponse.json({ success: true, description });
  } catch (err) {
    console.error('[Describe]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
