"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api";

const STEPS = [
  {
    key: "connect",
    icon: "🔌",
    title: "Connect a Platform",
    desc: "Link Facebook, Instagram, Telegram or any platform so the engine can post on your behalf.",
    action: "Go to Settings →",
    href: "/settings",
  },
  {
    key: "brand",
    icon: "🧬",
    title: "Set Up Your Brand DNA",
    desc: "Tell the engine your brand voice, keywords, and what to avoid. This powers every post it writes.",
    action: "Set Up Brand DNA →",
    href: "/brand-dna",
  },
  {
    key: "product",
    icon: "🛍️",
    title: "Add a Product or Service",
    desc: "Add what you sell so the engine can promote it automatically in posts and auto-replies.",
    action: "Add Product →",
    href: "/catalog",
  },
  {
    key: "done",
    icon: "🚀",
    title: "You're Live!",
    desc: "Your autonomous marketing engine is active. It will generate and post content on autopilot from now on.",
    action: "Go to Dashboard →",
    href: "/",
  },
];

function SuccessContent() {
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const email = searchParams.get("email") || "";
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollingRef = useRef(false);

  useEffect(() => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    const pendingEmail = sessionStorage.getItem("mp_pending_email");
    const pendingPassword = sessionStorage.getItem("mp_pending_password");
    if (!pendingEmail || !pendingPassword) {
      // No credentials in storage — came from a direct URL visit, allow manual navigation
      setReady(true);
      return;
    }
    let attempts = 0;
    const maxAttempts = 20; // 20 × 3s = 60s max
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: pendingEmail, password: pendingPassword }),
        });
        if (res.ok) {
          const data = await res.json();
          clearInterval(interval);
          sessionStorage.removeItem("mp_pending_email");
          sessionStorage.removeItem("mp_pending_password");
          setSession(data);
          setReady(true);
          // Auto-redirect to dashboard after session is set
          window.location.href = "/";
        }
      } catch { /* keep polling */ }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setTimedOut(true);
        setReady(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [setSession]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step) / (STEPS.length - 1)) * 100;

  const handleAction = () => {
    if (isLast) {
      window.location.href = "/";
    } else {
      window.location.href = current.href;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-white">Payment Confirmed!</h1>
          {email && (
            <p className="text-gray-400 text-sm mt-1">
              Receipt sent to <span className="text-indigo-400">{email}</span>
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Setup Progress</span>
            <span>{step}/{STEPS.length - 1} steps</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step cards */}
        <div className="space-y-3 mb-6">
          {STEPS.map((s, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <div
                key={s.key}
                className={`flex items-start gap-4 p-4 rounded-xl border transition ${
                  isCurrent
                    ? "bg-indigo-950 border-indigo-500"
                    : isDone
                    ? "bg-green-950/30 border-green-800/40"
                    : "bg-gray-900 border-gray-800 opacity-50"
                }`}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{isDone ? "✅" : s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${isCurrent ? "text-white" : isDone ? "text-green-400" : "text-gray-400"}`}>
                    {s.title}
                  </p>
                  {isCurrent && (
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">{s.desc}</p>
                  )}
                </div>
                {isDone && <span className="text-green-400 text-xs flex-shrink-0">Done</span>}
              </div>
            );
          })}
        </div>

        {/* Activation status */}
        {!ready && (
          <div className="flex items-center justify-center gap-3 mb-6 py-3 px-4 bg-indigo-950 border border-indigo-800 rounded-xl">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-indigo-300 text-sm">Activating your account... this takes a few seconds</p>
          </div>
        )}

        {timedOut && (
          <div className="mb-6 py-3 px-4 bg-yellow-950 border border-yellow-800 rounded-xl text-center">
            <p className="text-yellow-300 text-sm">Taking longer than expected.</p>
            <a href="/login" className="text-indigo-400 text-sm hover:underline mt-1 inline-block">Login manually →</a>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!isLast && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!ready}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 text-sm rounded-xl transition"
            >
              Skip for now
            </button>
          )}
          <button
            onClick={handleAction}
            disabled={!ready}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition"
          >
            {!ready ? "Activating..." : current.action}
          </button>
        </div>

        {/* Skip all */}
        {step < STEPS.length - 1 && ready && (
          <p className="text-center mt-4">
            <Link href="/" className="text-gray-600 text-xs hover:text-gray-400 transition">
              Skip setup — go straight to dashboard
            </Link>
          </p>
        )}
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
