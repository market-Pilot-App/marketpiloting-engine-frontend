import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/analytics/cron/aggregate`,
    {
      method: "POST",
      headers: { "X-Cron-Secret": process.env.CRON_SECRET ?? "" },
    }
  );
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { status: "ok", raw: text.slice(0, 200) }; }
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
