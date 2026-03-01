import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { items, total } = await req.json();

    // 認証設定（POST関数の中で定義することで重複エラーを回避）
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // ここで一回だけ定義
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log("--- Order Received for Printing ---");
    console.log("Total:", total);

    // プリンターへの送信処理はここに追加
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Print API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}