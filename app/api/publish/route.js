import { NextResponse } from 'next/server';
import { getTodayPost, updatePost, getSetting } from '@/lib/db';
import { publishPost } from '@/lib/gbp';

export async function GET(request) {
  return handlePublish(request);
}

export async function POST(request) {
  return handlePublish(request);
}

async function handlePublish(request) {
  // Verify this came from the scheduler or an authorized source
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const post = getTodayPost();
    if (!post) {
      return NextResponse.json({ message: 'No post scheduled for today.' });
    }

    const locationName = getSetting('gbp_location_name');

    await publishPost({
      description: post.description,
      imagePath: post.image_path,
      locationName,
    });

    updatePost(post.id, {
      status: 'published',
      published_at: new Date().toISOString(),
    });

    console.log(`[Publish] Successfully published post #${post.id}`);
    return NextResponse.json({ success: true, postId: post.id });
  } catch (err) {
    console.error('[Publish] Error:', err);

    // If we found a post, mark it as failed
    try {
      const post = getTodayPost();
      if (post) {
        updatePost(post.id, { status: 'failed', error: err.message });
      }
    } catch (_) {}

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function verifySecret(request) {
  const expectedSecret = process.env.SCHEDULER_SECRET || 'handyman-scheduler';
  const cronSecret = process.env.CRON_SECRET;

  // 1. Check x-scheduler-secret header
  const schedulerHeader = request.headers.get('x-scheduler-secret');
  if (schedulerHeader === expectedSecret) return true;

  // 2. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === expectedSecret || (cronSecret && token === cronSecret)) {
      return true;
    }
  }

  // 3. Check query parameter
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  if (querySecret === expectedSecret) return true;

  return false;
}

