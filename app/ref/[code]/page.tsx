"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RefPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    if (code) {
      // Set cookie for 30 days
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `mp_ref=${code.toUpperCase()}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }
    router.replace("/register");
  }, [code, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Redirecting…</p>
    </div>
  );
}
