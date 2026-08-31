"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function AffiliatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", ref_code: "", bank_name: "", account_number: "", account_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/affiliate/login" : "/affiliate/register";
      const body = mode === "login"
        ? { email: form.email.trim().toLowerCase(), password: form.password }
        : { ...form, email: form.email.trim().toLowerCase(), ref_code: form.ref_code.trim().toUpperCase() };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");

      if (mode === "login") {
        localStorage.setItem("mp_affiliate_token", data.access_token);
        localStorage.setItem("mp_affiliate_name", data.name);
        localStorage.setItem("mp_affiliate_ref", data.ref_code);
        router.push("/affiliate/dashboard");
      } else {
        setSuccess("Registration successful! Your account is pending admin approval. We'll notify you once approved.");
        setMode("login");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">MarketPilot Affiliates</h1>
          <p className="text-gray-400 mt-2">Earn 10% commission on every referral</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 space-y-4">
          <div className="flex gap-2 mb-2">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition capitalize ${mode === m ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
              >
                {m === "login" ? "Sign In" : "Join as Affiliate"}
              </button>
            ))}
          </div>

          {success && <p className="text-green-400 text-sm bg-green-950 px-4 py-3 rounded-lg">{success}</p>}

          {mode === "register" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full Name</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="John Doe" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm" />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min 8 characters" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm" />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Your Ref Code <span className="text-gray-600">(e.g. JOHN20 — this is your promo link)</span></label>
                <input value={form.ref_code} onChange={(e) => set("ref_code", e.target.value.toUpperCase())} placeholder="JOHN20" className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm uppercase" />
              </div>
              <p className="text-xs text-gray-500">Bank details (optional now, required before requesting payout)</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: "bank_name", label: "Bank Name", placeholder: "e.g. GTBank" },
                  { key: "account_number", label: "Account Number", placeholder: "0123456789" },
                  { key: "account_name", label: "Account Name", placeholder: "John Doe" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    <input value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm" />
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.email || !form.password || (mode === "register" && (!form.name || !form.ref_code))}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Affiliate Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}
