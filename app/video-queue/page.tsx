"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VideoQueueRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/video"); }, [router]);
  return null;
}
