"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessInner() {
  const params = useSearchParams();

  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    const location = params.get("location") || "";
    setTimeout(() => {
      if (window.opener) {
        if (connected) {
          window.opener.postMessage({ type: "gbp_connected", location }, "*");
        } else {
          window.opener.postMessage({ type: "gbp_error", error: error || "unknown" }, "*");
        }
      }
      window.close();
    }, 500);
  }, [params]);

  const connected = params.get("connected");
  const error = params.get("error");

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {connected ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-white text-lg font-semibold">Google Business Connected!</p>
            <p className="text-gray-400 text-sm mt-2">Closing window…</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>
            <p className="text-white text-lg font-semibold">Connection failed</p>
            <p className="text-gray-400 text-sm mt-2">{error || "Unknown error"} — closing window…</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GBPSuccess() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
