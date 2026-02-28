import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1vLe8YPqcsQ8vZojfDfEXujzSu9qAJKH9NJyPUOZpi1M';

const SERVICE_ACCOUNT_KEY = {
  project_id: "soy-transducer-488407-b4",
  client_email: "base44@soy-transducer-488407-b4.iam.gserviceaccount.com",
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\\\n/g, '\n'),
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

    const items = rows.slice(1).map((row: any, index: number) => {
      const parsePrice = (val: any) => {
        if (val === undefined || val === null || val === "") return null;
        const n = parseInt(String(val).replace(/[^-0-9.]/g, ''));
        return isNaN(n) ? null : n;
      };
      return {
        rowNumber: index + 2,
        description: row[1] || "",
        name: row[2] || "無題",
        priceDefault: parsePrice(row[3]) || 0,
        type: row[5] || "その他",
        category: row[6] || "未分類",
        isDrinkOption: String(row[7]) === "1",
        image: row[8] || "",
        planLimit: String(row[9] || "").trim().toUpperCase(), // J列
        priceL: parsePrice(row[10]),
        priceS: parsePrice(row[11]),
        priceP: parsePrice(row[12]),
        priceGlass: parsePrice(row[13]),
        priceBottle: parsePrice(row[14]),
      };
    }).filter(i => i.name !== "無題");

    return NextResponse.json(items);
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsClient();
    const values = body.cart.map((item: any) => [
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      body.tableNo,
      item.name,
      item.quantity,
      item.price,
      body.orderType
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet2!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}