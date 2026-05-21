import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const config = { api: { bodyParser: false } };

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `photo_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      imagePath: filePath,
      filename,
      size: buffer.length,
    });
  } catch (err) {
    console.error('[Upload]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
