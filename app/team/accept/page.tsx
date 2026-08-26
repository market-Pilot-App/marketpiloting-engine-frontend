"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api";

interface InviteInfo {
  email: string;
  role: string;
  inviter_name: string;
}

interface AuthClient {
  access_token: string;
  client_id: number;
  campaign_id: number | null;
  plan: string;
  name: string;
  role?: string;
}

function AcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "form" | "submitting" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");

  // Load invite info on mount (public — no auth needed)
  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Invalid invite link — no token found."); return; }

    fetch(`${API_URL}/team/invite-info?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setStatus("error"); setMessage(data.detail); return; }
        setInvite(data);
        setStatus("form");
      })
      .catch(() => { setStatus("error"); setMessage("Could not load invite. The link may be invalid or expired."); });
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (password.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setPwError("Passwords do not match"); return; }

    setStatus("submitting");
    try {
      const res = await fetch(`${API_URL}/team/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data: AuthClient & { detail?: string } = await res.json();
      if (!res.ok) { setStatus("form"); setPwError(data.detail || "Failed to set password"); return; }

      // Save session exactly like normal login
      localStorage.setItem("mp_token", data.access_token);
      localStorage.setItem("mp_client", JSON.stringify(data));
      document.cookie = "mp_session=1; path=/; SameSite=Lax; max-age=86400";
      setSession(data as Parameters<typeof setSession>[0]);
      setStatus("success");
      setTimeout(() => router.push("/"), 1500);
    } catch {
      setStatus("form");
      setPwError("Network error — please try again.");
    }
  };

  const ROLE_COLOR: Record<string, string> = {
    admin: "bg-red-900 text-red-300",
    editor: "bg-blue-900 text-blue-300",
    viewer: "bg-gray-800 text-gray-400",
  };

  const ROLE_DESC: Record<string, string> = {
    admin: "Everything except billing",
    editor: "Create & edit content, cannot delete campaigns",
    viewer: "Read-only, no posting",
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full space-y-5">

        {status === "loading" && (
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white font-semibold">Loading invite…</p>
          </div>
        )}

        {(status === "form" || status === "submitting") && invite && (
          <>
            <div className="text-center space-y-2">
              <p className="text-4xl">🎉</p>
              <p className="text-white font-bold text-lg">You&apos;ve been invited!</p>
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium">{invite.inviter_name}</span> has invited you to collaborate on their MarketPiloting workspace.
              </p>
            </div>

            {/* Invite details */}
            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">Your email</span>
                <span className="text-white text-sm font-mono">{invite.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">Your role</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLOR[invite.role] || "bg-gray-700 text-gray-300"}`}>
                  {invite.role}
                </span>
              </div>
              {ROLE_DESC[invite.role] && (
                <p className="text-gray-500 text-xs pt-1 border-t border-gray-700">{ROLE_DESC[invite.role]}</p>
              )}
            </div>

            {/* Password form */}
            <form onSubmit={submit} className="space-y-4">
              <p className="text-gray-400 text-sm">Create a password to access the dashboard:</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300" tabIndex={-1}>
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Confirm Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition"
              >
                {status === "submitting" ? "Setting up your account…" : "✅ Accept & Set Password"}
              </button>
            </form>
          </>
        )}

        {status === "success" && (
          <div className="text-center space-y-3">
            <p className="text-4xl">🎊</p>
            <p className="text-white font-bold text-lg">You&apos;re in!</p>
            <p className="text-gray-400 text-sm">Redirecting to your dashboard…</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-3">
            <p className="text-4xl">❌</p>
            <p className="text-white font-bold">Invite failed</p>
            <p className="text-gray-400 text-sm">{message}</p>
            <a href="/login" className="inline-block mt-2 text-indigo-400 hover:underline text-sm">Go to login →</a>
          </div>
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
