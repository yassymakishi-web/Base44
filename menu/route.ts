import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1vLe8YPqcsQ8vZojfDfEXujzSu9qAJKH9NJyPUOZpi1M';

const SERVICE_ACCOUNT_KEY = {
  project_id: "soy-transducer-488407-b4",
  client_email: "base44@soy-transducer-488407-b4.iam.gserviceaccount.com",
  private_key: process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/\n/g, '\n').replace(/"/g, '').trim()
    : undefined,
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
        const n = Number(String(val || "").replace(/[^-0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
      };
      return {
        rowNumber: index + 2,
        description: row[1] || "",           // B列
        name: row[2] || "無題",              // C列
        priceDefault: parsePrice(row[3]),    // D列
        type: row[5] || "その他",            // F列
        category: row[6] || "未分類",        // G列
        optionType: String(row[7] || "0").trim(), // H列
        image: row[8] || "",                 // I列
        planLimit: row[9] || "",             // J列
        priceS: parsePrice(row[10]),         // K列
        priceL: parsePrice(row[11]),         // L列
        priceP: parsePrice(row[12]),         // M列
        isSoldOut: row[13] === "TRUE",       // N列
        extraPrice: parsePrice(row[14])      // O列
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
      body.orderType,
      item.price * item.quantity
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Orders!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}