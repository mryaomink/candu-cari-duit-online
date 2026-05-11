import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary server-side with secrets
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// 10 MB cap for raw documents (CVs). Image uploads remain Cloudinary's default.
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file found' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const lowerName = (file.name || '').toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

    if (isPdf && buffer.length > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: `PDF too large (max ${MAX_PDF_BYTES / 1024 / 1024} MB).` },
        { status: 413 },
      );
    }

    // PDFs must be uploaded as `raw` so Cloudinary preserves the original
    // bytes. The default image pipeline would rasterize page 1 only and
    // break Gemini Vision's ability to read the document.
    const uploadOptions: Record<string, unknown> = isPdf
      ? {
          folder: 'candu_documents',
          resource_type: 'raw',
        }
      : {
          folder: 'candu_portfolio',
          transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
        };

    // Upload promise wrapper for Cloudinary streaming
    const result = await new Promise<{
      public_id: string;
      secure_url: string;
      width?: number;
      height?: number;
      format?: string;
      bytes?: number;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, uploadResult) => {
          if (error) return reject(error);
          if (!uploadResult) return reject(new Error('Empty upload result'));
          resolve(uploadResult);
        },
      );
      uploadStream.end(buffer);
    });

    if (isPdf) {
      return NextResponse.json({
        publicId: result.public_id,
        url: result.secure_url,
        format: 'pdf',
        bytes: result.bytes ?? buffer.length,
        filename: file.name || 'document.pdf',
      });
    }

    // Transform to the frontend defined CloudinaryImage type
    return NextResponse.json({
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      thumbnailUrl: cloudinary.url(result.public_id, {
        width: 400,
        height: 400,
        crop: 'fill',
        quality: 'auto',
      }),
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    const message =
      error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
