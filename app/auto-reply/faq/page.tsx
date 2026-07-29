"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

interface FAQ { id: number; question: string; answer: string; active: boolean; }

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const fetch = async () => {
    const data = await api.get<FAQ[]>("/auto-reply/faq");
    setFaqs(data);
  };

  useEffect(() => { fetch(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const save = async () => {
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/auto-reply/faq/${editId}`, { question, answer, active: true });
        flash("✅ Updated");
      } else {
        await api.post("/auto-reply/faq", { question, answer });
        flash("✅ Added");
      }
      setQuestion(""); setAnswer(""); setEditId(null);
      fetch();
    } catch { flash("❌ Failed"); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    await api.del(`/auto-reply/faq/${id}`);
    fetch();
  };

  const toggleActive = async (faq: FAQ) => {
    await api.patch(`/auto-reply/faq/${faq.id}`, { question: faq.question, answer: faq.answer, active: !faq.active });
    fetch();
  };

  const startEdit = (faq: FAQ) => {
    setEditId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">FAQ Knowledge Base</h1>
          <p className="text-gray-400 text-sm mt-1">
            The AI uses these to answer common questions in your brand voice. Add pricing, hours, policies — anything customers ask repeatedly.
          </p>
        </div>
        <Link href="/auto-reply" className="text-sm text-indigo-400 hover:underline">← Back to Inbox</Link>
      </div>

      {msg && <div className="mb-4 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">{msg}</div>}

      {/* Add / Edit form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">{editId ? "Edit FAQ" : "Add New FAQ"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Question</label>
            <input value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are your prices?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Answer</label>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. Our plans start from ₦50,000/month. Visit our website for full pricing."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !question.trim() || !answer.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
              {saving ? "Saving..." : editId ? "Update" : "Add FAQ"}
            </button>
            {editId && (
              <button onClick={() => { setEditId(null); setQuestion(""); setAnswer(""); }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FAQ list */}
      <div className="space-y-3">
        {faqs.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No FAQ entries yet. Add your first one above.</p>
        )}
        {faqs.map((faq) => (
          <div key={faq.id} className={`bg-gray-900 border rounded-xl p-4 ${faq.active ? "border-gray-800" : "border-gray-800 opacity-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium mb-1">{faq.question}</p>
                <p className="text-gray-400 text-sm">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(faq)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition ${faq.active ? "bg-green-900 text-green-400 hover:bg-green-800" : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}>
                  {faq.active ? "Active" : "Off"}
                </button>
                <button onClick={() => startEdit(faq)} className="text-xs text-indigo-400 hover:text-indigo-300 transition">Edit</button>
                <button onClick={() => remove(faq.id)} className="text-xs text-gray-600 hover:text-red-400 transition">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
