import { NextResponse } from 'next/server';
import { getTodayPost, updatePost } from '@/lib/db';
import { publishPost, refreshAccessToken } from '@/lib/gbp';
import { getRedis } from '@/lib/db';

// This endpoint is called by the Vercel Cron job daily.
// Google token is stored in Redis (written once when user connects their Google account via /api/auth/save-token).
// Gemini key is in the GEMINI_API_KEY environment variable (or not needed for publish).

export async function GET(request) {
  return handlePublish(request);
}

export async function POST(request) {
  return handlePublish(request);
}

async function handlePublish(request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const post = await getTodayPost();
    if (!post) {
      return NextResponse.json({ message: 'No post scheduled for today.' });
    }

    // Get stored Google tokens from Redis
    const redis = getRedis();
    const refreshToken = await redis.get('handyman:google_refresh_token');
    const locationName = await redis.get('handyman:gbp_location_name');

    if (!refreshToken) {
      return NextResponse.json({ error: 'Google account not connected. User must connect via Settings.' }, { status: 400 });
    }
    if (!locationName) {
      return NextResponse.json({ error: 'No GBP location configured. User must set it in Settings.' }, { status: 400 });
    }

    // Refresh the access token
    const credentials = await refreshAccessToken(refreshToken);

    await publishPost({
      description: post.description,
      imagePath: post.image_path,
      locationName,
      accessToken: credentials.access_token,
    });

    await updatePost(post.id, {
      status: 'published',
      published_at: new Date().toISOString(),
    });

    console.log(`[Publish] Successfully published post #${post.id}`);
    return NextResponse.json({ success: true, postId: post.id });
  } catch (err) {
    console.error('[Publish] Error:', err);
    try {
      const post = await getTodayPost();
      if (post) {
        await updatePost(post.id, { status: 'failed', error: err.message });
      }
    } catch (_) {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function verifySecret(request) {
  const expectedSecret = process.env.SCHEDULER_SECRET || 'handyman-scheduler';
  const cronSecret = process.env.CRON_SECRET;

  const schedulerHeader = request.headers.get('x-scheduler-secret');
  if (schedulerHeader === expectedSecret) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === expectedSecret || (cronSecret && token === cronSecret)) return true;
  }

  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  if (querySecret === expectedSecret) return true;

  return false;
}
