import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/scheduler/cron/fill-schedule`,
    {
      method: "POST",
      headers: {
        "X-Cron-Secret": process.env.CRON_SECRET ?? "",
      },
    }
  );
  const data = await res.json();
  return NextResponse.json(data);
}
