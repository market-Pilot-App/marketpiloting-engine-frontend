import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cron/check-abandoned-leads`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { status: "ok", raw: text.slice(0, 200) }; }
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
