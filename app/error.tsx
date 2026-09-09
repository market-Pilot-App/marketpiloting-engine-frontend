"use client";

import { useEffect } from "react";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (error?.name === "ChunkLoadError" || error?.message?.includes("Loading chunk")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-gray-500">Something went wrong. Reloading...</p>
    </div>
  );
}
