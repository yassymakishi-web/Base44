import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1vLe8YPqcsQ8vZojfDfEXujzSu9qAJKH9NJyPUOZpi1M';

// 環境変数の改行コードをデプロイ環境に合わせて安全に処理
const privateKey = process.env.GOOGLE_PRIVATE_KEY 
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : undefined;

const SERVICE_ACCOUNT_KEY = {
  project_id: "soy-transducer-488407-b4",
  client_email: "base44@soy-transducer-488407-b4.iam.gserviceaccount.com",
  private_key: privateKey,
};

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function GET() {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:O',
    });
    const rows = res.data.values;
    if (!rows) return NextResponse.json([]);

    const clean = (v: any) => (v ? String(v).trim() : "");
    const toHalf = (v: string) => v.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
    const parsePrice = (v: any) => {
      const p = parseInt(toHalf(clean(v)).replace(/[^0-9]/g, ""), 10);
      return isNaN(p) ? null : p;
    };

    // 2行目からデータ取得
    const items = rows.slice(1).map((row, index) => {
      const stockValue = clean(row[4]);
      return {
        rowNumber: index + 2,
        name: clean(row[1]),
        priceDefault: parsePrice(row[3]) || 0,
        isSoldOut: stockValue === "0" || stockValue.toUpperCase() === "FALSE" || stockValue === "売切",
        type: clean(row[5]),
        category: clean(row[6]),
        optionType: toHalf(clean(row[7])),
        image: clean(row[8]),
        planLimit: clean(row[9]).toUpperCase(),
        priceS: parsePrice(row[10]),
        priceL: parsePrice(row[11]),
        priceP: parsePrice(row[12]),
        extraPrice: parsePrice(row[14])
      };
    }).filter(i => i.name !== "" && i.name !== "無題");

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("GET Error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsClient();
    
    // シートへの書き込みデータ作成
    const values = body.cart.map((item: any) => [
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      body.tableNo,
      item.name,
      item.quantity,
      item.price,
      body.orderType,
      item.price * item.quantity,
      body.hasFood ? "FOODあり" : "", // プリンタ鳴り分け用ヒント
      body.hasDrink ? "DRINKあり" : ""
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Orders!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST Error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
