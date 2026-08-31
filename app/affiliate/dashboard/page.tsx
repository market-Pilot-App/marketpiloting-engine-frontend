"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

interface AffiliateMe {
  id: number; name: string; email: string; ref_code: string; ref_link: string;
  bank_name: string | null; account_number: string | null; account_name: string | null;
  status: string; total_referrals: number;
  pending_earnings_ngn: number; approved_earnings_ngn: number; total_paid_ngn: number;
  can_request_payout: boolean; min_payout_ngn: number;
}

interface Earning {
  id: number; plan: string; billing: string;
  client_paid_ngn: number; commission_ngn: number; status: string; created_at: string | null;
}

interface Payout {
  id: number; amount_ngn: number; status: string;
  requested_at: string | null; paid_at: string | null; admin_note: string | null;
}

function authHeaders() {
  const token = localStorage.getItem("mp_affiliate_token") || "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<AffiliateMe | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [tab, setTab] = useState<"overview" | "earnings" | "payouts" | "bank">("overview");
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", account_number: "", account_name: "" });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMsg, setBankMsg] = useState("");

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("mp_affiliate_token");
    if (!token) { router.push("/affiliate"); return; }
    try {
      const res = await fetch(`${API_URL}/affiliate/me`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) { router.push("/affiliate"); return; }
      const data = await res.json();
      setMe(data);
      setBankForm({ bank_name: data.bank_name || "", account_number: data.account_number || "", account_name: data.account_name || "" });
    } catch { router.push("/affiliate"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  useEffect(() => {
    if (tab === "earnings") {
      fetch(`${API_URL}/affiliate/earnings`, { headers: authHeaders() }).then((r) => r.json()).then(setEarnings).catch(() => {});
    }
    if (tab === "payouts") {
      fetch(`${API_URL}/affiliate/payouts`, { headers: authHeaders() }).then((r) => r.json()).then(setPayouts).catch(() => {});
    }
  }, [tab]);

  const copyLink = () => {
    if (!me) return;
    navigator.clipboard.writeText(me.ref_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requestPayout = async () => {
    setPayoutLoading(true); setPayoutMsg("");
    try {
      const res = await fetch(`${API_URL}/affiliate/payout-request`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setPayoutMsg(`✅ ${data.message}`);
      fetchMe();
    } catch (e: any) {
      setPayoutMsg(`❌ ${e.message}`);
    } finally {
      setPayoutLoading(false);
    }
  };

  const saveBank = async () => {
    setBankSaving(true); setBankMsg("");
    try {
      const res = await fetch(`${API_URL}/affiliate/bank`, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify(bankForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      setBankMsg("✅ Bank details saved");
      fetchMe();
    } catch (e: any) {
      setBankMsg(`❌ ${e.message}`);
    } finally {
      setBankSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("mp_affiliate_token");
    localStorage.removeItem("mp_affiliate_name");
    localStorage.removeItem("mp_affiliate_ref");
    router.push("/affiliate");
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading…</p></div>;
  if (!me) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">MarketPilot Affiliates</h1>
          <p className="text-xs text-gray-400">Hi {me.name} · <span className={`font-medium ${me.status === "active" ? "text-green-400" : me.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>{me.status}</span></p>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 transition">Sign out</button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Ref link card */}
        <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-6">
          <p className="text-xs text-indigo-300 mb-1">Your referral link</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-indigo-200 text-sm bg-indigo-900 px-4 py-2.5 rounded-lg truncate">{me.ref_link}</code>
            <button onClick={copyLink} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2.5 rounded-lg transition font-medium flex-shrink-0">
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="text-xs text-indigo-400 mt-2">Share this link — anyone who signs up gets 5% off, you earn 10% commission on their payment.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Referrals", value: me.total_referrals, color: "text-white" },
            { label: "Pending Earnings", value: `₦${me.pending_earnings_ngn.toLocaleString()}`, color: "text-yellow-400" },
            { label: "Approved", value: `₦${me.approved_earnings_ngn.toLocaleString()}`, color: "text-blue-400" },
            { label: "Total Paid Out", value: `₦${me.total_paid_ngn.toLocaleString()}`, color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Payout request */}
        {me.status === "active" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Request Payout</p>
              <p className="text-xs text-gray-400 mt-0.5">Minimum ₦{me.min_payout_ngn.toLocaleString()} · Paid manually to your bank account</p>
              {payoutMsg && <p className={`text-xs mt-1 ${payoutMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{payoutMsg}</p>}
            </div>
            <button
              onClick={requestPayout}
              disabled={!me.can_request_payout || payoutLoading}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition flex-shrink-0"
            >
              {payoutLoading ? "Requesting…" : me.can_request_payout ? "Request Payout" : `Need ₦${me.min_payout_ngn.toLocaleString()} min`}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800">
          {(["overview", "earnings", "payouts", "bank"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
              {t === "bank" ? "Bank Details" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3 text-sm">
            <p className="font-semibold text-gray-200 mb-2">How it works</p>
            <div className="space-y-2 text-gray-400">
              <p>1. Share your link: <code className="text-indigo-300 bg-gray-800 px-2 py-0.5 rounded text-xs">{me.ref_link}</code></p>
              <p>2. Someone clicks your link → they get <strong className="text-white">5% off</strong> their plan</p>
              <p>3. They pay → you earn <strong className="text-green-400">10% commission</strong> automatically</p>
              <p>4. Once you hit ₦{me.min_payout_ngn.toLocaleString()}, request a payout → we transfer to your bank</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500">
              Ref code: <span className="font-mono text-gray-300">{me.ref_code}</span> · Commission on first payment only · Payouts processed within 3 business days
            </div>
          </div>
        )}

        {/* Earnings tab */}
        {tab === "earnings" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {earnings.length === 0 ? (
              <p className="text-center py-12 text-gray-500 text-sm">No earnings yet. Share your link to start earning!</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Plan</th>
                    <th className="text-right px-5 py-3 text-gray-400 font-medium">Client Paid</th>
                    <th className="text-right px-5 py-3 text-gray-400 font-medium">Your Commission</th>
                    <th className="text-center px-5 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-right px-5 py-3 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {earnings.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-800/50">
                      <td className="px-5 py-3 capitalize text-gray-300">{e.plan} · {e.billing}</td>
                      <td className="px-5 py-3 text-right text-gray-400">₦{e.client_paid_ngn.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-semibold text-green-400">₦{e.commission_ngn.toLocaleString()}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${e.status === "paid" ? "bg-green-900 text-green-400" : e.status === "approved" ? "bg-blue-900 text-blue-400" : "bg-yellow-900 text-yellow-400"}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Payouts tab */}
        {tab === "payouts" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {payouts.length === 0 ? (
              <p className="text-center py-12 text-gray-500 text-sm">No payout requests yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="text-right px-5 py-3 text-gray-400 font-medium">Amount</th>
                    <th className="text-center px-5 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-right px-5 py-3 text-gray-400 font-medium">Requested</th>
                    <th className="text-right px-5 py-3 text-gray-400 font-medium">Paid</th>
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-800/50">
                      <td className="px-5 py-3 text-right font-semibold text-white">₦{p.amount_ngn.toLocaleString()}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === "paid" ? "bg-green-900 text-green-400" : p.status === "approved" ? "bg-blue-900 text-blue-400" : "bg-yellow-900 text-yellow-400"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-500">{p.requested_at ? new Date(p.requested_at).toLocaleDateString() : "—"}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-500">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{p.admin_note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Bank details tab */}
        {tab === "bank" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <p className="text-sm font-semibold text-gray-200">Bank Details for Payouts</p>
            {[
              { key: "bank_name", label: "Bank Name", placeholder: "e.g. GTBank" },
              { key: "account_number", label: "Account Number", placeholder: "0123456789" },
              { key: "account_name", label: "Account Name", placeholder: "John Doe" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  value={(bankForm as any)[key]}
                  onChange={(e) => setBankForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            ))}
            {bankMsg && <p className={`text-xs ${bankMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{bankMsg}</p>}
            <button
              onClick={saveBank}
              disabled={bankSaving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition"
            >
              {bankSaving ? "Saving…" : "Save Bank Details"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
