"use client";
import { Suspense } from "react";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function FacebookSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get("error");

  useEffect(() => {
    if (window.opener) {
      // Desktop popup flow
      window.opener.postMessage(
        error ? { type: "facebook_error", error } : "facebook_connected",
        "*"
      );
      setTimeout(() => window.close(), 500);
    } else {
      // Mobile full-page redirect flow
      setTimeout(() => router.push("/settings?fb=" + (error ? "error" : "connected")), 800);
    }
  }, [error, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white text-sm">
        {error ? `❌ ${error}` : "✅ Connected! Redirecting..."}
      </p>
    </div>
  );
}

export default function FacebookOAuthSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <FacebookSuccess />
    </Suspense>
  );
}
