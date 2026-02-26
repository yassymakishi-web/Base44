import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('ID is required', { status: 400 });
  }

  // Googleドライブの画像を中継するためのURL
  const googleImageUrl = `https://drive.google.com/thumbnail?sz=w1000&id=${id}`;
  
  try {
    const response = await fetch(googleImageUrl);
    if (!response.ok) throw new Error('Google Drive access failed');

    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error("画像読み込みエラー:", error);
    return new NextResponse('Image Load Error', { status: 500 });
  }
}