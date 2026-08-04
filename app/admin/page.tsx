"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClientRow {
  client: {
    id: number;
    name: string;
    email: string;
    plan: string;
    active: boolean;
    managed_by_admin: boolean;
    report_email: string | null;
    subscription_status: string | null;
    subscription_expires_at: string | null;
    created_at: string | null;
    first_payment_at: string | null;
  };
  campaign_id: number | null;
  posts_today: number;
  boost_spend_mtd: number;
  boost_credit_usd: number;
  leads_7d: number;
}

interface AuditLog {
  id: number;
  admin_id: number;
  client_id: number;
  action: string;
  created_at: string;
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-gray-100 text-gray-600",
  growth: "bg-blue-100 text-blue-700",
  agency: "bg-purple-100 text-purple-700",
};

function expiryBadge(expiresAt: string | null): string {
  if (!expiresAt) return "—";
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days <= 0) return "🔴 Expired";
  if (days <= 7) return `🔴 ${days}d`;
  if (days <= 14) return `🟡 ${days}d`;
  return `✅ ${days}d`;
}

export default function AdminPage() {
  const { isAdmin, startImpersonation } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<"clients" | "audit" | "leads" | "approvals">("clients");
  const [loading, setLoading] = useState(true);
  const [editBudget, setEditBudget] = useState<Record<number, string>>({});
  const [editBoost, setEditBoost] = useState<Record<number, string>>({});
  const [reportStatus, setReportStatus] = useState<Record<number, string>>({});
  const [renewStatus, setRenewStatus] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [grantModal, setGrantModal] = useState<number | null>(null);
  const [grantPlan, setGrantPlan] = useState("starter");
  const [grantDays, setGrantDays] = useState(30);
  const [actionStatus, setActionStatus] = useState<Record<number, string>>({});
  const [usageModal, setUsageModal] = useState<null | { name: string; email: string; plan: string; created_at: string | null; first_payment_at: string | null; ai_posts: number; published: number; refund_eligible: boolean; refund_note: string }>(null);

  const [leadMagnetCount, setLeadMagnetCount] = useState<number | null>(null);
  const [pendingPosts, setPendingPosts] = useState<{ id: number; client_name: string; platform: string; scheduled_time: string; text: string; image_url: string | null }[]>([]);
  const [peakerrBalance, setPeakerrBalance] = useState<{ balance: string; currency: string } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    const data = await api.get("/admin/clients");
    setRows(data);
    setLoading(false);
  }, []);

  const fetchAuditLog = useCallback(async () => {
    const data = await api.get("/admin/audit-log");
    setLogs(data);
  }, []);

  useEffect(() => {
    if (!isAdmin) { router.push("/"); return; }
    fetchClients();
  }, [isAdmin, router, fetchClients]);

  useEffect(() => {
    if (tab === "approvals") {
      api.get<typeof pendingPosts>("/admin/pending-approvals").then(setPendingPosts);
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "leads") {
      api.get<{ count: number }>("/admin/lead-magnet/count").then((d) => setLeadMagnetCount(d.count));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "audit") fetchAuditLog();
  }, [tab, fetchAuditLog]);

  const sendReport = async (clientId: number) => {
    setReportStatus((s) => ({ ...s, [clientId]: "sending" }));
    const data = await api.post(`/admin/reports/send/${clientId}`, {});
    setReportStatus((s) => ({ ...s, [clientId]: data.sent ? "sent" : "error" }));
    setTimeout(() => setReportStatus((s) => ({ ...s, [clientId]: "" })), 3000);
  };

const saveBudget = async (clientId: number) => {
    const val = parseFloat(editBudget[clientId]);
    if (isNaN(val)) return;
    await api.patch(`/admin/clients/${clientId}/budget`, { boost_monthly_budget: val });
    setEditBudget((b) => ({ ...b, [clientId]: "" }));
    fetchClients();
  };

  const saveBoostCredit = async (clientId: number) => {
    const val = parseFloat(editBoost[clientId]);
    if (isNaN(val) || val <= 0) return;
    await api.patch(`/admin/clients/${clientId}/budget`, { boost_credit_usd: val });
    setEditBoost((b) => ({ ...b, [clientId]: "" }));
    fetchClients();
  };

  const renewSubscription = async (clientId: number) => {
    setRenewStatus((s) => ({ ...s, [clientId]: "renewing" }));
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);
    await api.patch(`/admin/clients/${clientId}`, {
      subscription_status: "active",
      subscription_expires_at: newExpiry.toISOString(),
    });
    setRenewStatus((s) => ({ ...s, [clientId]: "done" }));
    setTimeout(() => setRenewStatus((s) => ({ ...s, [clientId]: "" })), 2000);
    fetchClients();
  };

  const doAction = async (clientId: number, action: string) => {
    setActionStatus((s) => ({ ...s, [clientId]: action }));
    try {
      if (action === "delete") {
        if (!confirm("Delete this client? This cannot be undone.")) return;
        if (!confirm("Are you absolutely sure?")) return;
        await api.del(`/admin/clients/${clientId}`);
      } else {
        await api.post(`/admin/clients/${clientId}/${action}`, {});
      }
      fetchClients();
    } finally {
      setTimeout(() => setActionStatus((s) => ({ ...s, [clientId]: "" })), 1500);
    }
  };

  const grantAccess = async (clientId: number) => {
    await api.post(`/admin/clients/${clientId}/grant-access`, { plan: grantPlan, days: grantDays });
    setGrantModal(null);
    fetchClients();
  };

  const viewUsage = async (clientId: number) => {
    const data = await api.get<any>(`/admin/clients/${clientId}/usage`);
    setUsageModal({
      name: data.name, email: data.email, plan: data.plan,
      created_at: data.account_creation_date,
      first_payment_at: data.first_payment_at,
      ai_posts: data.ai_posts_generated,
      published: data.total_posts_published,
      refund_eligible: data.refund_eligible,
      refund_note: data.refund_note,
    });
  };

  const filtered = rows.filter(
    ({ client }) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading clients…</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">{rows.length} clients registered</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Register Client
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: "Total Clients", value: rows.length },
          { label: "Active", value: rows.filter((r) => r.client.active).length },
          { label: "Admin-Managed", value: rows.filter((r) => r.client.managed_by_admin).length },
          {
            label: "Total Boost (MTD)",
            value: `$${rows.reduce((s, r) => s + r.boost_spend_mtd, 0).toFixed(2)}`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Peakerr Balance */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Peakerr Provider Balance</p>
            {peakerrBalance ? (
              <p className="text-xl font-bold text-gray-900">${peakerrBalance.balance} <span className="text-sm font-normal text-gray-400">{peakerrBalance.currency}</span></p>
            ) : (
              <p className="text-sm text-gray-400">{balanceLoading ? "Checking…" : "Click to check"}</p>
            )}
          </div>
        </div>
        <button
          onClick={async () => {
            setBalanceLoading(true);
            try {
              const data = await api.get<{ balance: string; currency: string }>("/admin/boosts/balance");
              setPeakerrBalance(data);
            } finally {
              setBalanceLoading(false);
            }
          }}
          disabled={balanceLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {balanceLoading ? "Checking…" : peakerrBalance ? "↻ Refresh" : "Check Balance"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(["clients", "audit", "leads", "approvals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "clients" ? "All Clients" : t === "audit" ? "Audit Log" : t === "leads" ? "Lead Magnet" : "Approvals"}
          </button>
        ))}
      </div>

      {/* Clients Tab */}
      {tab === "clients" && (
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
          />

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              No clients yet.{" "}
              <Link href="/admin/clients/new" className="text-indigo-600 hover:underline">
                Register your first client →
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Plan</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Subscription</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Managed</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Posts Today</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Boost MTD</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Leads 7d</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Budget / Credits</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(({ client, posts_today, boost_spend_mtd, boost_credit_usd, leads_7d }) => (
                    <tr
                      key={client.id}
                      className={`hover:bg-gray-50 transition-colors ${!client.active ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.email}</p>
                        {client.report_email && (
                          <p className="text-xs text-indigo-400">→ {client.report_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${PLAN_COLORS[client.plan] ?? "bg-gray-100 text-gray-600"}`}>
                          {client.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium">{expiryBadge(client.subscription_expires_at)}</p>
                        <p className="text-xs text-gray-400 capitalize">{client.subscription_status ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.managed_by_admin ? "✅" : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{posts_today}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">${boost_spend_mtd.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{leads_7d}</td>
                      <td className="px-4 py-3">
                        {/* Budget top-up */}
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs text-gray-400 w-12">Budget</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="$"
                            value={editBudget[client.id] ?? ""}
                            onChange={(e) => setEditBudget((b) => ({ ...b, [client.id]: e.target.value }))}
                            className="w-16 border border-gray-200 rounded px-2 py-1 text-xs"
                          />
                          {editBudget[client.id] && (
                            <button onClick={() => saveBudget(client.id)} className="text-xs text-indigo-600 hover:underline">
                              Save
                            </button>
                          )}
                        </div>
                        {/* Boost credit top-up */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 w-12">
                            Boost <span className="text-gray-300">(${(boost_credit_usd ?? 0).toFixed(2)})</span>
                          </span>
                          <input
                            type="number"
                            min={0}
                            placeholder="+$"
                            value={editBoost[client.id] ?? ""}
                            onChange={(e) => setEditBoost((b) => ({ ...b, [client.id]: e.target.value }))}
                            className="w-16 border border-gray-200 rounded px-2 py-1 text-xs"
                          />
                          {editBoost[client.id] && (
                            <button onClick={() => saveBoostCredit(client.id)} className="text-xs text-green-600 hover:underline">
                              Add
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={() => startImpersonation(client.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => { setGrantModal(client.id); setGrantPlan(client.plan); setGrantDays(30); }}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Grant Access
                          </button>
                          <button
                            onClick={() => renewSubscription(client.id)}
                            disabled={renewStatus[client.id] === "renewing"}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {renewStatus[client.id] === "renewing" ? "…" : renewStatus[client.id] === "done" ? "✓ Renewed" : "Renew"}
                          </button>
                          <button
                            onClick={() => sendReport(client.id)}
                            disabled={reportStatus[client.id] === "sending"}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {reportStatus[client.id] === "sending" ? "Sending…" : reportStatus[client.id] === "sent" ? "✓ Sent" : reportStatus[client.id] === "error" ? "✗ Error" : "Report"}
                          </button>
                          {!client.active && (
                            <button
                              onClick={() => doAction(client.id, "activate")}
                              className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-3 py-1.5 rounded-lg transition"
                            >
                              Activate
                            </button>
                          )}
                          {client.active && (
                            <button
                              onClick={() => doAction(client.id, "deactivate")}
                              className="text-orange-500 hover:text-orange-700 text-xs px-2 py-1.5 transition"
                            >
                              Deactivate
                            </button>
                          )}
                          {client.subscription_status !== "suspended" ? (
                            <button
                              onClick={() => doAction(client.id, "suspend")}
                              className="text-yellow-600 hover:text-yellow-800 text-xs px-2 py-1.5 transition"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => doAction(client.id, "unsuspend")}
                              className="text-emerald-600 hover:text-emerald-800 text-xs px-2 py-1.5 transition"
                            >
                              Unsuspend
                            </button>
                          )}
                          <button
                            onClick={() => viewUsage(client.id)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            Usage
                          </button>
                          <button
                            onClick={() => doAction(client.id, "delete")}
                            className="text-red-400 hover:text-red-600 text-xs px-2 py-1.5 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Audit Log Tab */}
      {tab === "audit" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">No impersonation events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Admin ID</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Client ID</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        log.action === "impersonate_start"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">#{log.admin_id}</td>
                    <td className="px-4 py-3 text-gray-600">#{log.client_id}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Approvals Tab */}
      {tab === "approvals" && (
        <div className="space-y-3">
          {pendingPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              No posts pending approval.
            </div>
          ) : pendingPosts.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-start">
              {p.image_url && <img src={p.image_url} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-900">{p.client_name}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">{p.platform}</span>
                  <span className="text-xs text-gray-400">{new Date(p.scheduled_time).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{p.text}</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={async () => { await api.post(`/admin/approve-post/${p.id}`, {}); setPendingPosts((prev) => prev.filter((x) => x.id !== p.id)); }}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-lg transition"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={async () => { await api.post(`/admin/reject-post/${p.id}`, {}); setPendingPosts((prev) => prev.filter((x) => x.id !== p.id)); }}
                  className="bg-red-50 hover:bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg transition"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lead Magnet Tab */}
      {tab === "leads" && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📧</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{leadMagnetCount ?? "…"} emails collected</p>
          <p className="text-sm text-gray-500 mb-6">From the landing page lead magnet form</p>
          <button
            onClick={async () => {
              const token = localStorage.getItem("mp_token");
              const base = process.env.NEXT_PUBLIC_API_URL || "";
              const res = await fetch(`${base}/admin/lead-magnet/export`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "lead_magnet_emails.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            ⬇ Export CSV
          </button>
        </div>
      )}

      {/* Usage Modal */}
      {usageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setUsageModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Usage — {usageModal.name}</h2>
              <button onClick={() => setUsageModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-900 font-medium">{usageModal.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="capitalize text-gray-900 font-medium">{usageModal.plan}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Registered</span><span className="text-gray-900">{usageModal.created_at ? new Date(usageModal.created_at).toLocaleDateString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">First Payment</span><span className="text-gray-900">{usageModal.first_payment_at ? new Date(usageModal.first_payment_at).toLocaleDateString() : "—"}</span></div>
              <hr className="border-gray-100" />
              <div className="flex justify-between"><span className="text-gray-500">AI Posts Generated</span><span className="text-gray-900 font-bold">{usageModal.ai_posts}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Posts Published</span><span className="text-gray-900 font-bold">{usageModal.published}</span></div>
              <hr className="border-gray-100" />
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${usageModal.refund_eligible ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                <span className="text-lg">{usageModal.refund_eligible ? "✅" : "⚠️"}</span>
                <span className="text-xs font-medium">{usageModal.refund_note}</span>
              </div>
            </div>
            <button onClick={() => setUsageModal(null)} className="mt-5 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded-lg transition">Close</button>
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {grantModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Grant Access</h2>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Plan</label>
              <select
                value={grantPlan}
                onChange={(e) => setGrantPlan(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {["solo", "starter", "growth", "agency"].map((p) => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Duration</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {[7, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    onClick={() => setGrantDays(d)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      grantDays === d ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-400"
                    }`}
                  >
                    {d === 365 ? "1yr" : `${d}d`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={grantDays}
                onChange={(e) => setGrantDays(parseInt(e.target.value) || 30)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Custom days"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => grantAccess(grantModal)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition"
              >
                Grant
              </button>
              <button
                onClick={() => setGrantModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
