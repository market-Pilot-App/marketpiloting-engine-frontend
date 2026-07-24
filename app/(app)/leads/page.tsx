"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface Lead {
  id: number;
  name: string | null;
  email: string;
  whatsapp: string | null;
  source: string;
  created_at: string;
}

interface Stats {
  total: number;
  by_source: Record<string, number>;
}

const SOURCE_LABELS: Record<string, string> = {
  landing_page: "Landing Page",
  subscribe_page: "Subscribe Page",
  referral: "Referral Link",
};

const SOURCE_COLORS: Record<string, string> = {
  landing_page: "bg-indigo-100 text-indigo-700",
  subscribe_page: "bg-green-100 text-green-700",
  referral: "bg-purple-100 text-purple-700",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [source, setSource] = useState("");
  const [tab, setTab] = useState<"leads" | "broadcast">("leads");
  const [broadcastGoal, setBroadcastGoal] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const params = source ? `?source=${source}` : "";
    const data = await api.get(`/leads${params}`);
    setLeads(data);
  }, [source]);

  const fetchStats = async () => {
    const data = await api.get("/leads/stats");
    setStats(data);
  };

  useEffect(() => { fetchLeads(); fetchStats(); }, [fetchLeads]);

  const exportCSV = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/leads/export`, "_blank");
  };

  const draftBroadcast = async () => {
    if (!broadcastGoal) return;
    setDrafting(true);
    const data = await api.post("/leads/broadcast/draft", { goal: broadcastGoal });
    setBody(data.draft);
    setDrafting(false);
  };

  const sendBroadcast = async () => {
    if (!subject || !body) return;
    setSending(true);
    setSendResult(null);
    const data = await api.post("/leads/broadcast/send", { subject, body });
    setSendResult(data.sent !== undefined ? `✓ Sent to ${data.sent} leads` : data.error ?? "Failed");
    setSending(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads & CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Everyone who raised their hand for your brand</p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5 md:col-span-1">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total Leads</p>
          </div>
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <div key={key} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-3xl font-bold text-gray-900">{stats.by_source[key] ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["leads", "broadcast"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "leads" ? "Lead List" : "Email Broadcast"}
          </button>
        ))}
      </div>

      {/* Lead List Tab */}
      {tab === "leads" && (
        <>
          <div className="flex gap-2 mb-4">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All sources</option>
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400 self-center">{leads.length} leads</span>
          </div>

          {leads.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              No leads yet. They'll appear here when someone submits your landing page or subscribe form.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">WhatsApp</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Source</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{lead.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                      <td className="px-4 py-3 text-gray-500">{lead.whatsapp || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${SOURCE_COLORS[lead.source] ?? "bg-gray-100 text-gray-600"}`}>
                          {SOURCE_LABELS[lead.source] ?? lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Broadcast Tab */}
      {tab === "broadcast" && (
        <div className="max-w-2xl">
          <p className="text-sm text-gray-500 mb-6">
            Send an email to all {stats?.total ?? 0} leads. Use AI to draft the message, then review before sending.
          </p>

          {/* AI Draft */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">1. AI Draft (optional)</h3>
            <div className="flex gap-2">
              <input
                value={broadcastGoal}
                onChange={(e) => setBroadcastGoal(e.target.value)}
                placeholder="e.g. Announce our new product launch, offer 20% discount"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && draftBroadcast()}
              />
              <button
                onClick={draftBroadcast}
                disabled={drafting || !broadcastGoal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {drafting ? "Drafting…" : "✨ Draft"}
              </button>
            </div>
          </div>

          {/* Compose */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">2. Review & Send</h3>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body — paste your draft here or write manually"
              rows={10}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none mb-4"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Will send to {stats?.total ?? 0} leads
              </p>
              <button
                onClick={sendBroadcast}
                disabled={sending || !subject || !body}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send Broadcast"}
              </button>
            </div>
            {sendResult && (
              <p className={`text-sm mt-3 font-medium ${sendResult.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {sendResult}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
