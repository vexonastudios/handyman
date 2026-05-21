import { NextResponse } from 'next/server';

// GET /api/settings
// Returns only server-side config the client needs to know about.
// No database used — settings are now in browser localStorage.
export async function GET() {
  return NextResponse.json({
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
}
