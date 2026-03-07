import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import path from 'path';
import net from 'net';
import iconv from 'iconv-lite';

const SPREADSHEET_ID = '1vLe8YPqcsQ8vZojfDfEXujzSu9qAJKH9NJyPUOZpi1M';
const KEY_FILE_PATH = path.join(process.cwd(), 'soy-transducer-488407-b4-64eee260529f.json');
const PRINTER_IP = '192.168.151.196';
const PRINTER_PORT = 9100;

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function printTicket(title: string, tableNo: string, orderType: string, items: any[]) {
  if (items.length === 0) return;
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(5000);
    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      const chunks: Buffer[] = [];
      const sjis = (text: string) => iconv.encode(text, 'Shift_JIS');

      // --- StarLineモード専用コマンド定義 ---
      const INITIALIZE = Buffer.from([0x1b, 0x40]);
      const SOUND = Buffer.from([0x07]); // BEL (音)
      
      // 文字サイズ変更 (ESC i n1 n2) 
      // n1:縦倍率(1=2倍, 2=3倍), n2:横倍率(1=2倍, 2=3倍)
      const SIZE_DOUBLE = Buffer.from([0x1b, 0x69, 0x01, 0x01]); // 縦横2倍
      const SIZE_TALL   = Buffer.from([0x1b, 0x69, 0x01, 0x00]); // 縦のみ2倍
      const SIZE_NORMAL = Buffer.from([0x1b, 0x69, 0x00, 0x00]); // 標準
      
      const BOLD_ON  = Buffer.from([0x1b, 0x45]);
      const BOLD_OFF = Buffer.from([0x1b, 0x46]);
      
      const CENTER = Buffer.from([0x1b, 0x1d, 0x61, 0x01]); // StarLine 中央
      const LEFT   = Buffer.from([0x1b, 0x1d, 0x61, 0x00]); // StarLine 左
      
      // オートカット命令 (StarLine独自形式)
      const FEED_AND_CUT = Buffer.from([0x1b, 0x64, 0x03, 0x1b, 0x07]); // 3行送り + カット

      // 1. 初期化と音
      chunks.push(INITIALIZE, SOUND);

      // 2. タイトル (中央・2倍)
      chunks.push(CENTER, SIZE_DOUBLE, sjis(`\r\n[ ${title} ]\r\n\r\n`));
      
      // 3. 席番号・プラン (左・2倍・太字)
      chunks.push(LEFT, SIZE_DOUBLE, BOLD_ON, sjis(`席:${tableNo}\r\n`));
      chunks.push(sjis(`プラン:${orderType}\r\n`));
      chunks.push(BOLD_OFF, SIZE_NORMAL);
      
      chunks.push(sjis(`================================\r\n`));

      // 4. 商品名 (縦のみ2倍で大きく見せる)
      items.forEach((item: any) => {
        chunks.push(SIZE_TALL, sjis(`${item.name}\r\n`));
        chunks.push(SIZE_NORMAL, sjis(`      x ${item.quantity}   ${item.price.toLocaleString()}円\r\n`));
      });

      chunks.push(sjis(`--------------------------------\r\n`));
      const totalCount = items.reduce((s, i) => s + i.quantity, 0);
      chunks.push(SIZE_TALL, sjis(`合計: ${totalCount}点\r\n`), SIZE_NORMAL);
      
      // 5. 時刻と最終送り・カット
      chunks.push(sjis(`\r\n時刻: ${new Date().toLocaleTimeString('ja-JP')}\r\n`));
      chunks.push(FEED_AND_CUT);

      client.write(Buffer.concat(chunks), () => {
        setTimeout(() => { client.destroy(); resolve(true); }, 1000);
      });
    });
    client.on('error', (err) => { client.destroy(); reject(err); });
  });
}

// GET, POST は前回のものを維持
export async function GET() {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A:O' });
    const rows = res.data.values;
    if (!rows || rows.length <= 1) return NextResponse.json([]);
    const clean = (val: any) => (val !== undefined && val !== null ? String(val).trim() : "");
    const toNum = (val: any) => { const s = clean(val).replace(/[^0-9]/g, ""); return s === "" ? null : Number(s); };
    const items = rows.slice(1).map((row, index) => {
      if (!row[2]) return null;
      return {
        id: index, description: clean(row[1]), name: clean(row[2]), priceDefault: toNum(row[3]),
        isSoldOut: clean(row[4]), type: clean(row[5]), category: clean(row[6]), optionType: clean(row[7]),
        image: clean(row[8]), planLimit: clean(row[9]), priceS: toNum(row[10]), priceL: toNum(row[11]),
        priceP: toNum(row[12]), glassPrice: toNum(row[13]), extraPrice: toNum(row[14]),
      };
    }).filter(Boolean);
    return NextResponse.json(items);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsClient();
    const values = body.cart.map((item: any) => [
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      String(body.tableNo), String(item.name), Number(item.quantity),
      Number(item.price), String(body.orderType), Number(item.quantity * item.price)
    ]);
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: 'Order!A:G', valueInputOption: 'USER_ENTERED', requestBody: { values } });
    
    const drinks = body.cart.filter((item: any) => item.type === 'ドリンク');
    const foods = body.cart.filter((item: any) => item.type === 'フード');

    if (drinks.length > 0) await printTicket('ドリンク伝票', body.tableNo, body.orderType, drinks);
    if (foods.length > 0) {
      if (drinks.length > 0) await new Promise(r => setTimeout(r, 1500));
      await printTicket('フード伝票', body.tableNo, body.orderType, foods);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
