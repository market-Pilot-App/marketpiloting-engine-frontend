import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cron/weekly-ai-report`, {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
