// lib/db.js
// Post queue stored in Upstash Redis (replaces SQLite for Vercel compatibility)
// Settings are now stored in browser localStorage - this file only handles the post queue.

import { Redis } from '@upstash/redis';

let _redis = null;

export function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables. ' +
      'Please create a free Redis database at upstash.com and add these to your Vercel project settings.'
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const POSTS_KEY = 'handyman:posts';
const COUNTER_KEY = 'handyman:post_id_counter';

// ─── Post CRUD ────────────────────────────────────────────────────────────────

export async function getAllPosts() {
  const redis = getRedis();
  const raw = await redis.hgetall(POSTS_KEY);
  if (!raw) return [];
  return Object.values(raw)
    .map(v => (typeof v === 'string' ? JSON.parse(v) : v))
    .sort((a, b) => (a.scheduled_date > b.scheduled_date ? 1 : -1));
}

export async function getPostById(id) {
  const redis = getRedis();
  const raw = await redis.hget(POSTS_KEY, String(id));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function getTodayPost() {
  const posts = await getAllPosts();
  const today = new Date().toISOString().split('T')[0];
  return posts.find(p => p.scheduled_date === today && p.status === 'pending') || null;
}

export async function getNextAvailableDate() {
  const posts = await getAllPosts();
  const activePosts = posts.filter(p => ['pending', 'published'].includes(p.status));

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (activePosts.length === 0) {
    return tomorrow.toISOString().split('T')[0];
  }

  const lastDate = activePosts.reduce((max, p) =>
    p.scheduled_date > max ? p.scheduled_date : max, '');

  const lastDateObj = new Date(lastDate + 'T12:00:00Z');
  const nextDate = new Date(lastDateObj);
  nextDate.setDate(nextDate.getDate() + 1);

  // Ensure at minimum tomorrow
  const result = new Date(Math.max(nextDate.getTime(), tomorrow.getTime()));
  return result.toISOString().split('T')[0];
}

export async function createPost({ image_path, description, scheduled_date }) {
  const redis = getRedis();
  const id = await redis.incr(COUNTER_KEY);
  const post = {
    id,
    image_path,
    description,
    scheduled_date,
    status: 'pending',
    published_at: null,
    error: null,
    created_at: new Date().toISOString(),
  };
  await redis.hset(POSTS_KEY, { [String(id)]: JSON.stringify(post) });
  return post;
}

export async function updatePost(id, fields) {
  const redis = getRedis();
  const existing = await getPostById(id);
  if (!existing) throw new Error(`Post ${id} not found`);
  const allowed = ['description', 'scheduled_date', 'status', 'published_at', 'error'];
  const updated = { ...existing };
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) updated[k] = v;
  }
  await redis.hset(POSTS_KEY, { [String(id)]: JSON.stringify(updated) });
  return updated;
}

export async function deletePost(id) {
  const redis = getRedis();
  await redis.hdel(POSTS_KEY, String(id));
}
