"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function TwitterSuccess() {
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (error) {
      window.opener?.postMessage("twitter_error", "*");
    } else {
      window.opener?.postMessage("twitter_connected", "*");
    }
    window.close();
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">{error ? "Connection failed. You can close this window." : "Connected! Closing..."}</p>
    </div>
  );
}
