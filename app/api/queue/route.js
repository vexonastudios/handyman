import { NextResponse } from 'next/server';
import {
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  getNextAvailableDate,
} from '@/lib/db';

// GET /api/queue — list all posts
export async function GET() {
  try {
    const posts = await getAllPosts();
    return NextResponse.json({ posts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/queue — add a new post
export async function POST(request) {
  try {
    const { image_path, description, scheduled_date } = await request.json();
    if (!image_path || !description) {
      return NextResponse.json({ error: 'image_path and description are required' }, { status: 400 });
    }
    const date = scheduled_date || (await getNextAvailableDate());
    const post = await createPost({ image_path, description, scheduled_date: date });
    return NextResponse.json({ success: true, post });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/queue — edit a post
export async function PATCH(request) {
  try {
    const { id, ...fields } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const post = await updatePost(id, fields);
    return NextResponse.json({ success: true, post });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/queue — remove a post
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await deletePost(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
