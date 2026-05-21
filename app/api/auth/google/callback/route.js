import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// After the user grants permission, Google redirects here with ?code=...
// We exchange the code for tokens and redirect to /settings with tokens in the URL
// so the browser can pick them up and store them in localStorage.
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

    // Build redirect URL with tokens so the browser can store them in localStorage
    const redirectUrl = new URL('/settings', process.env.NEXTAUTH_URL || request.url);
    redirectUrl.searchParams.set('auth', 'success');
    if (tokens.access_token) {
      redirectUrl.searchParams.set('google_access_token', tokens.access_token);
    }
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('google_refresh_token', tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      redirectUrl.searchParams.set('google_token_expiry', String(tokens.expiry_date));
    }

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('[OAuth Callback]', err);
    return NextResponse.redirect(
      new URL('/settings?auth=error&reason=' + encodeURIComponent(err.message), request.url)
    );
  }
}
