import { NextResponse } from "next/server";

export async function GET() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const SECRET = process.env.CRON_SECRET || "";
  try {
    const res = await fetch(`${API}/cron/enforce-campaign-expiry`, {
      method: "POST",
      headers: { "x-cron-secret": SECRET },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
