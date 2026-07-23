"use client";
import { useAuth } from "@/lib/auth-context";

export default function ImpersonationBanner() {
  const { isImpersonating, impersonatedName, endImpersonation } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="w-full bg-amber-500 text-black text-sm font-semibold px-4 py-2 flex items-center justify-between z-50">
      <span>⚠️ You are managing: <strong>{impersonatedName}</strong></span>
      <button
        onClick={endImpersonation}
        className="bg-black text-amber-400 px-3 py-1 rounded text-xs font-bold hover:bg-gray-900 transition"
      >
        Exit → Back to Admin
      </button>
    </div>
  );
}
