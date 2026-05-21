import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Serves local uploaded photos/videos to the UI
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 });
  }

  // Security: Allow files from both the persistent local upload folder and system temp folder (Vercel)
  const resolved = path.resolve(filePath);
  const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'));
  const tempDir = path.resolve(path.join(os.tmpdir(), 'postcraft-uploads'));

  const isAllowed =
    resolved.startsWith(uploadsDir) ||
    resolved.startsWith(tempDir) ||
    resolved.startsWith(os.tmpdir());

  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase().replace('.', '');
  const mimeMap = {
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    m4v: 'video/x-m4v',
  };
  const mimeType = mimeMap[ext] || 'image/jpeg';
  const buffer = fs.readFileSync(resolved);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
