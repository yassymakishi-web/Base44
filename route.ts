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
    scopes: ['https://www.googleapis.com/spreadsheets'],
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
        const n = Number(String(val).replace(/[^-0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
      };
      const clean = (val: any) => String(val || "").trim();
      const toHalf = (str: string) => str.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
      const stockValue = clean(row[4]);

      return {
        rowNumber: index + 2,
        id: clean(row[0]),
        description: clean(row[1]),
        name: clean(row[2]),
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
