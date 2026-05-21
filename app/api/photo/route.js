import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Serves local uploaded photos to the UI
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 });
  }

  // Security: Only serve files from the uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(uploadsDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const buffer = fs.readFileSync(resolved);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
