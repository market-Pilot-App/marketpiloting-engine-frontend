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
  const [tab, setTab] = useState<"clients" | "audit">("clients");
  const [loading, setLoading] = useState(true);
  const [editBudget, setEditBudget] = useState<Record<number, string>>({});
  const [editBoost, setEditBoost] = useState<Record<number, string>>({});
  const [reportStatus, setReportStatus] = useState<Record<number, string>>({});
  const [renewStatus, setRenewStatus] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");

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
    if (tab === "audit") fetchAuditLog();
  }, [tab, fetchAuditLog]);

  const sendReport = async (clientId: number) => {
    setReportStatus((s) => ({ ...s, [clientId]: "sending" }));
    const data = await api.post(`/admin/reports/send/${clientId}`, {});
    setReportStatus((s) => ({ ...s, [clientId]: data.sent ? "sent" : "error" }));
    setTimeout(() => setReportStatus((s) => ({ ...s, [clientId]: "" })), 3000);
  };

  const deactivate = async (clientId: number) => {
    if (!confirm("Deactivate this client?")) return;
    await api.post(`/admin/clients/${clientId}/deactivate`, {});
    fetchClients();
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
      <div className="grid grid-cols-4 gap-4 mb-8">
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

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {(["clients", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "clients" ? "All Clients" : "Audit Log"}
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
                            {reportStatus[client.id] === "sending"
                              ? "Sending…"
                              : reportStatus[client.id] === "sent"
                              ? "✓ Sent"
                              : reportStatus[client.id] === "error"
                              ? "✗ Error"
                              : "Report"}
                          </button>
                          {client.active && (
                            <button
                              onClick={() => deactivate(client.id)}
                              className="text-red-400 hover:text-red-600 text-xs px-2 py-1.5 transition"
                            >
                              Deactivate
                            </button>
                          )}
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
    </div>
  );
}
