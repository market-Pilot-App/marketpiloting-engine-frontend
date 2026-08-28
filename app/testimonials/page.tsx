"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useCanAccess } from "@/lib/use-role-guard";

interface Testimonial {
  id: number;
  customer_email: string;
  customer_name: string;
  client_name: string | null;
  raw_text: string | null;
  formatted_post: string | null;
  rating: number | null;
  status: string;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-900/40 text-yellow-400",
  submitted: "bg-blue-900/40 text-blue-400",
  approved:  "bg-green-900/40 text-green-400",
  posted:    "bg-indigo-900/40 text-indigo-400",
};

export default function TestimonialsPage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-white font-semibold">Editor access required</p>
      <p className="text-gray-400 text-sm">Viewers cannot access Testimonials.</p>
    </div>
  );
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [formatting, setFormatting] = useState<Record<number, boolean>>({});
  const [scheduling, setScheduling] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = () => {
    api.get<Testimonial[]>("/testimonials/").then(setTestimonials).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sendRequest = async () => {
    if (!email.trim()) return;
    setSending(true); setSendMsg("");
    try {
      await api.post("/testimonials/request", { customer_email: email.trim(), customer_name: name.trim() });
      setSendMsg("✅ Review request sent!");
      setEmail(""); setName("");
      load();
    } catch (err: unknown) {
      setSendMsg(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const format = async (id: number) => {
    setFormatting((s) => ({ ...s, [id]: true }));
    try {
      await api.post(`/testimonials/${id}/format`);
      load();
    } finally {
      setFormatting((s) => ({ ...s, [id]: false }));
    }
  };

  const schedule = async (id: number) => {
    setScheduling((s) => ({ ...s, [id]: true }));
    try {
      await api.post(`/testimonials/${id}/schedule`);
      load();
    } finally {
      setScheduling((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Testimonials</h1>
      <p className="text-gray-400 text-sm mb-6">Collect reviews, AI-format them into social posts, schedule automatically.</p>

      {/* Request form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 space-y-3">
        <p className="text-sm font-medium text-gray-300">📨 Send Review Request</p>
        <div className="flex gap-3 flex-wrap">
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Customer name (optional)"
            className="flex-1 min-w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
            className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          <button onClick={sendRequest} disabled={sending || !email.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
            {sending ? "Sending..." : "Send Request"}
          </button>
        </div>
        {sendMsg && <p className="text-sm text-green-400">{sendMsg}</p>}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : testimonials.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-gray-400 text-sm">No testimonials yet. Send a review request above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {testimonials.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">{t.client_name || t.customer_name || t.customer_email}</p>
                  <p className="text-xs text-gray-500">{t.customer_email} · {new Date(t.created_at).toLocaleDateString()}</p>
                  {t.rating && <p className="text-sm mt-1">{"⭐".repeat(t.rating)}</p>}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[t.status] ?? "bg-gray-800 text-gray-400"}`}>
                  {t.status}
                </span>
              </div>

              {t.raw_text && (
                <p className="text-sm text-gray-300 italic mb-3 border-l-2 border-gray-700 pl-3">"{t.raw_text}"</p>
              )}

              {t.formatted_post && (
                <div className="bg-gray-800 rounded-lg p-3 mb-3">
                  <p className="text-xs text-indigo-400 font-semibold mb-1">✨ AI-Formatted Post</p>
                  <p className={`text-sm text-gray-200 whitespace-pre-line ${!expanded[t.id] ? "line-clamp-3" : ""}`}>
                    {t.formatted_post}
                  </p>
                  <button onClick={() => setExpanded((s) => ({ ...s, [t.id]: !s[t.id] }))}
                    className="text-xs text-indigo-400 mt-1 hover:underline">
                    {expanded[t.id] ? "Show less" : "Show more"}
                  </button>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {t.status === "submitted" && (
                  <button onClick={() => format(t.id)} disabled={formatting[t.id]}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                    {formatting[t.id] ? "Formatting..." : "✨ AI Format"}
                  </button>
                )}
                {t.formatted_post && t.status === "approved" && (
                  <button onClick={() => schedule(t.id)} disabled={scheduling[t.id]}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                    {scheduling[t.id] ? "Scheduling..." : "📅 Schedule Post"}
                  </button>
                )}
                {t.formatted_post && (
                  <button onClick={() => navigator.clipboard.writeText(t.formatted_post!)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition">
                    Copy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
