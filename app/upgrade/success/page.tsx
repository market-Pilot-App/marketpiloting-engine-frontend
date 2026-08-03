"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpgradeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-3">Payment Successful!</h1>
        <p className="text-gray-400 mb-2">
          Your plan has been updated. Your subscription will auto-renew — no action needed.
        </p>
        <p className="text-gray-600 text-sm mb-8">Redirecting to dashboard in 5 seconds…</p>
        <button
          onClick={() => router.push("/")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
