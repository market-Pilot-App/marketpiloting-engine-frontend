"use client";
import { useSearchParams, Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
        <p className="text-gray-400">
          Your MarketPiloting Engine account is being activated. You'll receive a welcome email at{" "}
          <span className="text-indigo-400">{email}</span> shortly.
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 text-left space-y-2">
          <p className="text-gray-300 text-sm flex items-center gap-2"><span className="text-green-400">✓</span> Account created</p>
          <p className="text-gray-300 text-sm flex items-center gap-2"><span className="text-green-400">✓</span> Payment confirmed</p>
          <p className="text-gray-300 text-sm flex items-center gap-2"><span className="text-yellow-400">⏳</span> Account activation in progress</p>
          <p className="text-gray-300 text-sm flex items-center gap-2"><span className="text-yellow-400">⏳</span> Welcome email on the way</p>
        </div>
        <Link
          href="/login"
          className="inline-block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
        >
          Go to Login →
        </Link>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <SuccessContent />
    </Suspense>
  );
}
