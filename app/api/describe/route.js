import { NextResponse } from 'next/server';
import { describeImage } from '@/lib/gemini';
import { getSetting } from '@/lib/db';

export async function POST(request) {
  try {
    const { imagePath } = await request.json();
    if (!imagePath) {
      return NextResponse.json({ error: 'imagePath is required' }, { status: 400 });
    }

    const apiKey = getSetting('gemini_api_key') || process.env.GEMINI_API_KEY;
    const description = await describeImage(imagePath, apiKey);

    return NextResponse.json({ success: true, description });
  } catch (err) {
    console.error('[Describe]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
