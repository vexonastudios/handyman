import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/db';

// POST /api/auth/save-token
// Called by the browser after Google OAuth to store the refresh token and location
// in Redis so the server-side cron job can use them later.
// Body: { refreshToken, accessToken, expiryDate, locationName? }
export async function POST(request) {
  try {
    const { refreshToken, accessToken, expiryDate, locationName } = await request.json();
    const redis = getRedis();

    if (refreshToken) {
      await redis.set('handyman:google_refresh_token', refreshToken);
    }
    if (accessToken) {
      await redis.set('handyman:google_access_token', accessToken);
    }
    if (expiryDate) {
      await redis.set('handyman:google_token_expiry', String(expiryDate));
    }
    if (locationName) {
      await redis.set('handyman:gbp_location_name', locationName);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[SaveToken]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
