"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, API_URL } from "@/lib/api";

interface InviteInfo {
  email: string;
  role: string;
  inviter_name: string;
}

function AcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "preview" | "accepting" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Step 1 — load invite info (public, no auth needed) and check login state
  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Invalid invite link — no token found."); return; }

    const loggedIn = !!localStorage.getItem("mp_token");
    setIsLoggedIn(loggedIn);

    fetch(`${API_URL}/team/invite-info?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.detail) { setStatus("error"); setMessage(data.detail); return; }
        setInvite(data);
        setStatus("preview");
      })
      .catch(() => { setStatus("error"); setMessage("Could not load invite details. The link may be invalid or expired."); });
  }, [token]);

  // Step 2 — accept (only called when user is logged in and clicks Accept)
  const accept = async () => {
    setStatus("accepting");
    try {
      await api.post("/team/accept", { token });
      setStatus("success");
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to accept invite.");
    }
  };

  // Step 2 (alt) — not logged in: redirect to login, come back after
  const goLogin = () => {
    const next = encodeURIComponent(`/team/accept?token=${token}`);
    router.push(`/login?next=${next}`);
  };

  const ROLE_COLOR: Record<string, string> = {
    admin: "bg-red-900 text-red-300",
    editor: "bg-blue-900 text-blue-300",
    viewer: "bg-gray-800 text-gray-400",
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-5">

        {status === "loading" && (
          <>
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white font-semibold">Loading invite…</p>
          </>
        )}

        {status === "preview" && invite && (
          <>
            <p className="text-4xl">🎉</p>
            <div>
              <p className="text-white font-bold text-lg">You&apos;ve been invited!</p>
              <p className="text-gray-400 text-sm mt-1">
                <span className="text-white font-medium">{invite.inviter_name}</span> has invited you to collaborate on their MarketPiloting workspace.
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">Invited email</span>
                <span className="text-white text-sm font-mono">{invite.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">Your role</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLOR[invite.role] || "bg-gray-700 text-gray-300"}`}>
                  {invite.role}
                </span>
              </div>
            </div>

            {isLoggedIn ? (
              <button
                onClick={accept}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
              >
                ✅ Accept Invitation
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-yellow-400 text-sm">
                  ⚠️ You need to log in (or create an account) with <span className="font-mono font-bold">{invite.email}</span> to accept this invite.
                </p>
                <button
                  onClick={goLogin}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
                >
                  Log in to Accept →
                </button>
                <a
                  href={`/register?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/team/accept?token=${token}`)}`}
                  className="block w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition"
                >
                  Create an account instead →
                </a>
              </div>
            )}
          </>
        )}

        {status === "accepting" && (
          <>
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white font-semibold">Joining workspace…</p>
          </>
        )}

        {status === "success" && (
          <>
            <p className="text-4xl">🎊</p>
            <p className="text-white font-bold text-lg">You&apos;re in!</p>
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
