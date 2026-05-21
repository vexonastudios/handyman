import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { setSetting } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/settings?auth=error&reason=' + (error || 'no_code'), request.url)
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/google/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      setSetting('google_refresh_token', tokens.refresh_token);
    }
    if (tokens.access_token) {
      setSetting('google_access_token', tokens.access_token);
    }
    if (tokens.expiry_date) {
      setSetting('google_token_expiry', String(tokens.expiry_date));
    }

    return NextResponse.redirect(new URL('/settings?auth=success', request.url));
  } catch (err) {
    console.error('[OAuth Callback]', err);
    return NextResponse.redirect(
      new URL('/settings?auth=error&reason=' + encodeURIComponent(err.message), request.url)
    );
  }
}
