"use client";
import { Suspense } from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

function FacebookSuccess() {
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        error ? { type: "facebook_error", error } : "facebook_connected",
        window.location.origin
      );
      window.close();
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white text-sm">
        {error ? `❌ ${error}` : "✅ Connected! Closing..."}
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
