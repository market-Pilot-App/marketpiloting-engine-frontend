"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

function AcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Invalid invite link."); return; }
    api.post("/team/accept", { token })
      .then(() => { setStatus("success"); setTimeout(() => router.push("/"), 2000); })
      .catch((err: any) => { setStatus("error"); setMessage(err.message || "Failed to accept invite."); });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white font-semibold">Accepting your invite…</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-4xl">🎉</p>
            <p className="text-white font-bold text-lg">You're in!</p>
            <p className="text-gray-400 text-sm">Redirecting to your dashboard…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-4xl">❌</p>
            <p className="text-white font-bold">Invite failed</p>
            <p className="text-gray-400 text-sm">{message}</p>
            <a href="/login" className="inline-block mt-2 text-indigo-400 hover:underline text-sm">Go to login →</a>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <AcceptContent />
    </Suspense>
  );
}
