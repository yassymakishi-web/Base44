import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = '1vLe8YPqcsQ8vZojfDfEXujzSu9qAJKH9NJyPUOZpi1M';

const SERVICE_ACCOUNT_KEY = {
  type: "service_account",
  project_id: "soy-transducer-488407-b4",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4MAwBFFDSdzVv\nHIjxOrih6yLxDjMUuaU7Of4V7cClHTCmCRZCr8d/PUxfTOfZF2kDGo/2rOMIKlAE\nBsb1I7TpbAWvObUs64MNC0sgwYumi1OC3fwv7Evjft67KNFgRi0EgyMXGAyIPSj8\nCFKx4KLQDU23XnjHifU8kHhKu3FdKxgMLu25IiyFHg9fmoDbq2I7jsWjTnxGEG6Y\nA5eBd6G6fSAwvRMehhIDLpfWxE47Q6rT2frR9EUmzVrfPBbtxn2voTplmXfutTKU\nQutdmRZH3mwgOxqot21lNDd8H+FfCeqi5n/nk5r6YBwjVkt6xitXWI3JczfLd7/i\nHFK3pzmhAgMBAAECggEAAbgP6PPAkO9Jgjvb9r7kMwgpvsInJZmkM52Itq8N7UiS\nBWRYMadYSKfo0kqfzxEQAwY3YIoCvNcKwUKILrNj1x9xx+MarZSK3Vc9CbKpZU9K\nHa0pUxqXfHl+QLT1QSAUiq+ijHmQ1osWFTtAEik2hx6EVTqCV2/nstY7wNb3dv3E\nT+iYbh0R03ijESmB3+bmy9XXvyDcLlZsup6xhjnjMfFEHSdtahgEZC82Krh361Ab\nb9fiIdISs4hBpLP+23XcNwk6oovWywE/GTibPQG/oDvnyL9apT/5plMuTyxzyRW1\n2lpzDbtMfOq8cjVCl8uayMJBgQredHBfydp2vTlKkQKBgQDeDl09GMjul17mZ1ZY\nI6TQKptL1jnVVS7C1lE7bY7RvwEftVT0HoM3CN9dUG3riY/OpRx/NHPgb69ZR4dc\nPnYT1rhdSUijJwClCNWzp9iZM95KUF6fBG6bGL9QSksiossvoUXjFi7AYL/6AHdh\nUl0az8VRhObugCslg7N9NxnHsQKBgQDUV8rMlwk/PKqOk6C80Pzerrfr1Mvnyxt9\nOjVffGYhFc7MJ2/M9O5Tq09ejD67TrcCCa/qq6Ms9iAn/lAa/ol2Ys7cJA+bE+p3\nf1wt0W791vVodJ9BPNYfKKVuyy22FCHOrWiaBYnEplCSVD4EE1knHkk+bW0vOWz/\nSCoruND88QKBgBpSx5jLjF5EUXqsu16dcxc+RcSas6Znf7CXKXALD8grhV2V6Gk8\nCMAIbDoqo60tVH/hsNwfgrETbE0AHrq/qM23QYnFezfkEr59qp+ugQ3ASVSz7FOb\neeUm7N7+v6Nuevm9e4RtB8PEdF2VmpFN6z2XbcO5JosVZIgA8dEhLAwxAoGBAJZh\nWmlL6auUPkHdAS/XXc4itHRa7tFIgT5Nk/D8u6Ngu2TP5RikuYgdwYb3EZI7a9YQ\noDo0tcoowJsyOu7zJszlqxQyoa61Cw737oMwWEeDDaedOA/OkuHcOlTdpZDWbx7c\npkC1/Vx8YIFREd53CWNvynVgr7uLEss0A1GVgMQxAoGAU6yCoVmn2gVMC5AY6WTq\n8y5g03MtDs1uXHHhtv1GL1Sgz5KqdZCRagPhD7At1fmgho0V+NOKRXZKvCNGKuId\nX3PswSoyzfQnCC/QDeD2Yq1qfrDOiYubsyRwZAP/+iPdH4cdfAMIqYq+VwqO4fDm\nkWEVZkTsMosBFRZgueRZNhE=\n-----END PRIVATE KEY-----\n",
  client_email: "base44@soy-transducer-488407-b4.iam.gserviceaccount.com"
};

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:L', // L列(プラン価格)まで取得
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) return NextResponse.json([]);

    const items = rows.slice(1).map((row: any, index: number) => {
      const parsePrice = (val: any) => {
        if (!val) return null;
        const n = Number(String(val).replace(/[^-0-9.]/g, ''));
        return isNaN(n) ? null : n;
      };

      return {
        rowNumber: index + 2,
        description: row[1] || "",    // B列
        name: row[2] || "無題",       // C列
        priceDefault: parsePrice(row[3]) || 0, // D列
        type: row[4] || "",           // E列 (フード/ドリンク)
        category: row[6] || "未分類",  // G列
        attr: row[8] || "",           // I列 (画像名)
        availablePlans: row[7] || "", // H列 (利用可能プランの文字列)
        priceLight: parsePrice(row[9]),    // J列
        priceStandard: parsePrice(row[10]), // K列
        pricePremium: parsePrice(row[11]),  // L列
      };
    }).filter(i => i.name !== "無題");

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, tableNo, orderType } = body;

    const auth = new google.auth.GoogleAuth({
      credentials: SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    const values = cart.map((item: any) => [
      new Date().toLocaleString('ja-JP'),
      tableNo,
      item.name,
      item.quantity,
      item.price,
      orderType || '通常'
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Orders!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}