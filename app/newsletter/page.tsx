"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Newsletter {
  id: number;
  subject: string;
  status: "draft" | "sent";
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
  html_body?: string;
}

export default function NewsletterPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [preview, setPreview] = useState<Newsletter | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api.get<Newsletter[]>("/newsletter/");
      setNewsletters(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      await api.post("/newsletter/generate", {});
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    }
    setGenerating(false);
  };

  const send = async (id: number) => {
    setSending(id);
    setError("");
    try {
      const result = await api.post<{ sent: number }>(`/newsletter/${id}/send`, {});
      await load();
      if (preview?.id === id) setPreview((p) => p ? { ...p, status: "sent" } : p);
      alert(`Sent to ${result.sent} leads`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Send failed");
    }
    setSending(null);
  };

  const openPreview = async (nl: Newsletter) => {
    if (nl.html_body) { setPreview(nl); return; }
    try {
      const full = await api.get<Newsletter>(`/newsletter/${nl.id}`);
      setPreview(full);
    } catch {}
  };

  const del = async (id: number) => {
    if (!confirm("Delete this newsletter?")) return;
    await api.del(`/newsletter/${id}`);
    setNewsletters((n) => n.filter((x) => x.id !== id));
    if (preview?.id === id) setPreview(null);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📬 Weekly Newsletter</h1>
          <p className="text-gray-400 text-sm mt-1">AI-generated newsletters sent to your leads every Monday.</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {generating ? "Generating..." : "✨ Generate Now"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : newsletters.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-400 text-sm">No newsletters yet.</p>
          <p className="text-gray-600 text-xs mt-1">Click "Generate Now" to create your first AI newsletter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <div key={nl.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{nl.subject}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nl.status === "sent" ? "bg-green-900 text-green-400" : "bg-yellow-900 text-yellow-400"}`}>
                    {nl.status === "sent" ? "✅ Sent" : "📝 Draft"}
                  </span>
                  {nl.status === "sent" && (
                    <span className="text-xs text-gray-500">{nl.recipient_count} recipients</span>
                  )}
                  <span className="text-xs text-gray-600">{new Date(nl.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openPreview(nl)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition"
                >
                  Preview
                </button>
                {nl.status === "draft" && (
                  <button
                    onClick={() => send(nl.id)}
                    disabled={sending === nl.id}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {sending === nl.id ? "Sending..." : "Send"}
                  </button>
                )}
                <button
                  onClick={() => del(nl.id)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-red-900 text-gray-500 hover:text-red-400 text-xs rounded-lg transition"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <p className="font-semibold text-gray-800 text-sm truncate">{preview.subject}</p>
              <div className="flex items-center gap-2">
                {preview.status === "draft" && (
                  <button
                    onClick={() => send(preview.id)}
                    disabled={sending === preview.id}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {sending === preview.id ? "Sending..." : "Send to Leads"}
                  </button>
                )}
                <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
            </div>
            <div className="p-2" dangerouslySetInnerHTML={{ __html: preview.html_body || "" }} />
          </div>
        </div>
      )}
    </div>
  );
}
