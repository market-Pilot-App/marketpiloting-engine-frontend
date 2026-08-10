"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface Newsletter {
  id: number;
  subject: string;
  status: string;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
}

interface NewsletterDetail extends Newsletter {
  html_body: string;
}

export default function NewsletterPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const [preview, setPreview] = useState<NewsletterDetail | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const [sendMsg, setSendMsg] = useState<Record<number, string>>({});

  const fetchNewsletters = useCallback(async () => {
    const data = await api.get<Newsletter[]>("/newsletter/");
    setNewsletters(data);
  }, []);

  useEffect(() => { fetchNewsletters(); }, [fetchNewsletters]);

  const generate = async () => {
    setGenerating(true);
    setGenMsg("");
    try {
      await api.post("/newsletter/generate", {});
      setGenMsg("✓ Newsletter generated");
      await fetchNewsletters();
    } catch (e: unknown) {
      setGenMsg(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const openPreview = async (id: number) => {
    const data = await api.get<NewsletterDetail>(`/newsletter/${id}`);
    setPreview(data);
  };

  const send = async (id: number) => {
    setSending(id);
    setSendMsg((m) => ({ ...m, [id]: "" }));
    try {
      const res = await api.post<{ sent: number }>(`/newsletter/${id}/send`, {});
      setSendMsg((m) => ({ ...m, [id]: `✓ Sent to ${res.sent} recipients` }));
      await fetchNewsletters();
    } catch (e: unknown) {
      setSendMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Send failed" }));
    } finally {
      setSending(null);
    }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this newsletter?")) return;
    await api.del(`/newsletter/${id}`);
    await fetchNewsletters();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📬 Weekly Newsletter</h1>
          <p className="text-sm text-gray-400 mt-1">AI-generated newsletters sent to your leads every Monday.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generate}
            disabled={generating}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? "Generating…" : "✨ Generate Now"}
          </button>
        </div>
      </div>

      {genMsg && (
        <p className={`text-sm mb-4 font-medium ${genMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
          {genMsg}
        </p>
      )}

      {newsletters.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm border border-dashed border-gray-700 rounded-xl">
          No newsletters yet. Click <strong className="text-white">Generate Now</strong> to create your first one.
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((n) => (
            <div key={n.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{n.subject}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      n.status === "sent"
                        ? "bg-green-900 text-green-400"
                        : "bg-gray-800 text-gray-400"
                    }`}>
                      {n.status === "sent" ? "✅ Sent" : "📝 Draft"}
                    </span>
                    {n.status === "sent" && (
                      <span className="text-xs text-gray-500">{n.recipient_count} recipients</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(n.created_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {sendMsg[n.id] && (
                    <p className={`text-xs mt-2 font-medium ${sendMsg[n.id].startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
                      {sendMsg[n.id]}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openPreview(n.id)}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700 transition"
                  >
                    Preview
                  </button>
                  {n.status !== "sent" && (
                    <button
                      onClick={() => send(n.id)}
                      disabled={sending === n.id}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {sending === n.id ? "Sending…" : "Send"}
                    </button>
                  )}
                  <button
                    onClick={() => del(n.id)}
                    className="px-3 py-1.5 bg-red-950 text-red-400 rounded-lg text-xs font-medium hover:bg-red-900 transition"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <p className="font-bold text-gray-900 text-sm">{preview.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {preview.status === "sent" ? `✅ Sent · ${preview.recipient_count} recipients` : "📝 Draft"}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto px-6 py-4 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.html_body || "<p>No content</p>" }}
            />
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              {preview.status !== "sent" && (
                <button
                  onClick={() => { send(preview.id); setPreview(null); }}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Send Now
                </button>
              )}
              <button
                onClick={() => setPreview(null)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
