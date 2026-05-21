import { NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';

const PUBLIC_KEYS = ['post_time', 'gbp_account_name', 'gbp_location_name'];
const SECRET_KEYS = ['gemini_api_key'];
const READ_ONLY_KEYS = ['google_refresh_token', 'google_access_token'];

export async function GET() {
  try {
    const settings = {};
    [...PUBLIC_KEYS, ...SECRET_KEYS].forEach(k => {
      settings[k] = getSetting(k) || '';
    });
    // Indicate if Google is connected (don't expose token)
    settings.google_connected = !!(getSetting('google_refresh_token'));
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const allowed = [...PUBLIC_KEYS, ...SECRET_KEYS];
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key)) {
        setSetting(key, value);
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
