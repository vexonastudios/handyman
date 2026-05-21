import { NextResponse } from 'next/server';
import { describeImage } from '@/lib/gemini';

// POST /api/describe
// Accepts: { imagePath }
// Uses the admin-supplied GEMINI_API_KEY from server environment variables.
export async function POST(request) {
  try {
    const { imagePath } = await request.json();
    if (!imagePath) {
      return NextResponse.json({ error: 'imagePath is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'Gemini is not configured. Please contact the app administrator.',
      }, { status: 500 });
    }

    const description = await describeImage(imagePath, apiKey);
    return NextResponse.json({ success: true, description });
  } catch (err) {
    console.error('[Describe]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
