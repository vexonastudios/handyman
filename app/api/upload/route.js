import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use /tmp — the only writable directory in Vercel serverless
    const uploadsDir = path.join(os.tmpdir(), 'postcraft-uploads');
    await mkdir(uploadsDir, { recursive: true });

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filename = `photo_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    // Also return base64 so /api/describe can use it directly
    // without needing the file to persist (Vercel /tmp is ephemeral)
    const base64 = buffer.toString('base64');
    
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

    return NextResponse.json({
      success: true,
      imagePath: filePath,
      filename,
      size: buffer.length,
      base64,
      mimeType,
    });
  } catch (err) {
    console.error('[Upload]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
