"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

interface Message {
  id: number;
  platform: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  status: string;
  sentiment: string;
  received_at: string;
  reply_id: number | null;
  reply_content: string | null;
  confidence: number | null;
  reply_status: string | null;
}

interface Analytics {
  total_received: number;
  auto_sent: number;
  escalated: number;
  pending_approval: number;
  rejected: number;
  failed: number;
}

const PLATFORM_ICON: Record<string, string> = {
  telegram: "✈️", facebook: "📘", instagram: "📸", whatsapp: "💬",
};

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-green-900 text-green-400",
  pending: "bg-yellow-900 text-yellow-300",
  escalated: "bg-red-900 text-red-400",
  ignored: "bg-gray-800 text-gray-500",
  failed: "bg-red-900 text-red-400",
  processing: "bg-blue-900 text-blue-400",
};

const SENTIMENT_BADGE: Record<string, string> = {
  positive: "😊", neutral: "😐", negative: "😠",
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-green-400", neutral: "text-gray-400", negative: "text-red-400",
};

export default function AutoReplyPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selected, setSelected] = useState<Message | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [overrideText, setOverrideText] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPlatform) params.set("platform", filterPlatform);
    if (filterSentiment) params.set("sentiment", filterSentiment);
    const data = await api.get<Message[]>(`/auto-reply/inbox?${params}`);
    setMessages(data);
    setSelected((prev) => (prev ? (data.find((m) => m.id === prev.id) ?? null) : null));
  }, [filterStatus, filterPlatform, filterSentiment]);

  const fetchAnalytics = async () => {
    const data = await api.get<Analytics>("/auto-reply/analytics");
    setAnalytics(data);
  };

  const fetchSettings = async () => {
    try {
      const data = await api.get<{ confidence_threshold: number }>("/auto-reply/settings");
      setRequireApproval(data.confidence_threshold >= 1.0);
    } catch { /* silently ignore */ }
  };

  useEffect(() => { fetchMessages(); fetchAnalytics(); fetchSettings(); }, [fetchMessages]);

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const approve = async (id: number) => {
    setLoading(true);
    try {
      await api.post(`/auto-reply/inbox/${id}/approve`, {});
      flash("✅ Reply sent!");
      fetchMessages(); fetchAnalytics();
    } catch (e: unknown) {
      flash("❌ " + (e instanceof Error ? e.message : "Failed"));
    } finally { setLoading(false); }
  };

  const reject = async (id: number) => {
    setLoading(true);
    try {
      await api.post(`/auto-reply/inbox/${id}/reject`, {});
      flash("Rejected.");
      fetchMessages(); fetchAnalytics();
    } catch { flash("❌ Failed"); }
    finally { setLoading(false); }
  };

  const override = async (id: number) => {
    if (!overrideText.trim()) return;
    setLoading(true);
    try {
      await api.post(`/auto-reply/inbox/${id}/override`, { content: overrideText });
      flash("✅ Custom reply sent!");
      setOverrideText("");
      fetchMessages(); fetchAnalytics();
    } catch { flash("❌ Failed"); }
    finally { setLoading(false); }
  };

  const toggleRequireApproval = async () => {
    setToggleLoading(true);
    const next = !requireApproval;
    try {
      await api.patch("/auto-reply/settings", { confidence_threshold: next ? 1.0 : 0.75 });
      setRequireApproval(next);
      flash(next ? "🔒 Manual approval ON — all replies need your sign-off" : "⚡ Auto-send ON — replies above 75% send automatically");
    } catch { flash("❌ Failed to update setting"); }
    finally { setToggleLoading(false); }
  };

  const confidenceColor = (c: number | null) => {
    if (!c) return "text-gray-500";
    if (c >= 0.75) return "text-green-400";
    if (c >= 0.5) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Auto-Reply Inbox</h1>
          <p className="text-gray-400 text-sm mt-1">AI-generated replies to incoming messages — review, approve, or override</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Require Approval quick-toggle */}
          <button
            onClick={toggleRequireApproval}
            disabled={toggleLoading}
            title={requireApproval ? "Click to switch back to auto-send" : "Click to require manual approval for every reply"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
              requireApproval
                ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                : "bg-gray-800 hover:bg-gray-700 text-gray-300"
            }`}>
            {requireApproval ? "🔒 Approval Required" : "⚡ Auto-Send ON"}
          </button>
          <Link href="/auto-reply/faq" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition">
            📚 Manage FAQ
          </Link>
        </div>
      </div>

      {/* Analytics bar */}
      {analytics && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Received", value: analytics.total_received, color: "text-white" },
            { label: "Auto-Sent", value: analytics.auto_sent, color: "text-green-400" },
            { label: "Pending", value: analytics.pending_approval, color: "text-yellow-400" },
            { label: "Escalated", value: analytics.escalated, color: "text-red-400" },
            { label: "Rejected", value: analytics.rejected, color: "text-gray-400" },
            { label: "Failed", value: analytics.failed, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {actionMsg && (
        <div className="mb-4 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">{actionMsg}</div>
      )}

      <div className="flex gap-4">
        {/* Left: message list */}
        <div className="w-1/2">
          <div className="flex flex-wrap gap-2 mb-3">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white">
              <option value="">All statuses</option>
              <option value="pending">Pending approval</option>
              <option value="sent">Sent</option>
              <option value="escalated">Escalated</option>
              <option value="ignored">Rejected</option>
              <option value="failed">Failed</option>
            </select>
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
              className="text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white">
              <option value="">All platforms</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
            <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)}
              className="text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white">
              <option value="">All sentiments</option>
              <option value="negative">😠 Negative</option>
              <option value="neutral">😐 Neutral</option>
              <option value="positive">😊 Positive</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                No messages yet. Enable auto-reply in Settings to start receiving.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} onClick={() => { setSelected(m); setOverrideText(""); }}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selected?.id === m.id ? "border-indigo-500 bg-indigo-950" : "border-gray-800 bg-gray-900 hover:border-gray-700"
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{PLATFORM_ICON[m.platform] || "💬"}</span>
                    <span className="text-white text-sm font-medium">{m.sender_name || m.sender_id}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm ${SENTIMENT_COLOR[m.sentiment] || "text-gray-400"}`} title={m.sentiment}>
                      {SENTIMENT_BADGE[m.sentiment] || "😐"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[m.status] || "bg-gray-800 text-gray-400"}`}>
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs truncate">{m.content}</p>
                <p className="text-gray-600 text-xs mt-1">{new Date(m.received_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div className="w-1/2">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl">
              Select a message to review
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span>{PLATFORM_ICON[selected.platform] || "💬"}</span>
                <span className="text-white font-semibold">{selected.sender_name || selected.sender_id}</span>
                <span className={`text-sm ml-1 ${SENTIMENT_COLOR[selected.sentiment] || "text-gray-400"}`}>
                  {SENTIMENT_BADGE[selected.sentiment] || "😐"} {selected.sentiment}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${STATUS_STYLE[selected.status] || "bg-gray-800 text-gray-400"}`}>
                  {selected.status.replace("_", " ")}
                </span>
              </div>

              {/* Incoming message */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Incoming message</p>
                <div className="bg-gray-800 rounded-lg p-3 text-sm text-white">{selected.content}</div>
              </div>

              {/* AI reply */}
              {selected.reply_content && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">AI-generated reply</p>
                    {selected.confidence !== null && (
                      <span className={`text-xs font-semibold ${confidenceColor(selected.confidence)}`}>
                        {Math.round(selected.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <div className="bg-indigo-950 border border-indigo-800 rounded-lg p-3 text-sm text-white">
                    {selected.reply_content}
                  </div>
                </div>
              )}

              {/* Sent automatically banner */}
              {selected.status === "sent" && (
                <div className="bg-green-950 border border-green-800 rounded-lg p-3 text-sm text-green-300 flex items-center gap-2">
                  ✅ Sent automatically — AI replied with {selected.confidence !== null ? `${Math.round(selected.confidence * 100)}% confidence` : "high confidence"}
                </div>
              )}

              {/* Actions for pending */}
              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => approve(selected.id)} disabled={loading}
                    className="flex-1 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
                    ✅ Send Reply
                  </button>
                  <button onClick={() => reject(selected.id)} disabled={loading}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-semibold rounded-lg transition">
                    ✗ Reject
                  </button>
                </div>
              )}

              {/* Override — pending, escalated, and sent (follow-up correction) */}
              {(selected.status === "pending" || selected.status === "escalated" || selected.status === "sent") && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {selected.status === "sent" ? "Send a follow-up or correction" : "Or send a custom reply instead"}
                  </p>
                  <textarea
                    value={overrideText}
                    onChange={(e) => setOverrideText(e.target.value)}
                    placeholder={selected.status === "sent" ? "Type a follow-up message..." : "Type your custom reply..."}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <button onClick={() => override(selected.id)} disabled={loading || !overrideText.trim()}
                    className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
                    {selected.status === "sent" ? "📤 Send Follow-up" : "✏️ Send Custom Reply"}
                  </button>
                </div>
              )}

              {selected.status === "escalated" && (
                <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-sm text-red-300">
                  ⚠️ This message was escalated — it contains a sensitive keyword. Review and reply manually above.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
