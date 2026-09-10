"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Tab = "inbox" | "conversations" | "knowledge" | "settings";

interface Handoff {
  id: number; conversation_id: number; reason: string; priority: string;
  contact_id: string; channel: string; temperature: string | null; created_at: string;
}
interface StalledConv {
  id: number; contact_id: string; channel: string;
  temperature: string | null; last_message_at: string;
}
interface HotLead {
  id: number; email: string; whatsapp: string | null; temperature: string; created_at: string;
}
interface DailyTasks {
  pending_handoffs: Handoff[]; stalled_conversations: StalledConv[]; hot_leads: HotLead[];
}
interface Conversation {
  id: number; channel: string; contact_id: string; status: string;
  temperature: string | null; started_at: string; last_message_at: string | null;
  last_message: string | null; message_count: number;
}
interface Knowledge {
  id: number; name: string; description: string | null; price_display: string | null;
  availability: string; service_area: string | null; booking_cta: string | null; active: boolean;
}
interface SalesRule {
  id: number; question: string; approved_answer: string;
  escalation_condition: string | null; active: boolean;
}

const TEMP_COLORS: Record<string, string> = {
  hot: "bg-red-100 text-red-700", warm: "bg-yellow-100 text-yellow-700",
  cold: "bg-blue-100 text-blue-700", incomplete: "bg-gray-100 text-gray-500",
};
const CH_ICON: Record<string, string> = {
  whatsapp: "📱", website: "🌐", facebook: "📘", instagram: "📸", telegram: "✈️",
};

export default function SalesAssistantPage() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [tasks, setTasks] = useState<DailyTasks | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convFilter, setConvFilter] = useState("");
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [rules, setRules] = useState<SalesRule[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [kForm, setKForm] = useState({ name: "", description: "", price_display: "", availability: "available", service_area: "", booking_cta: "" });
  const [kSaving, setKSaving] = useState(false);
  const [rForm, setRForm] = useState({ question: "", approved_answer: "", escalation_condition: "" });
  const [rSaving, setRSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    try { setTasks(await api.get<DailyTasks>("/sales-assistant/daily-tasks")); } catch {}
  }, []);

  const fetchConvs = useCallback(async () => {
    try {
      const p = convFilter ? `?status=${convFilter}` : "";
      setConversations(await api.get<Conversation[]>(`/sales-assistant/conversations${p}`));
    } catch {}
  }, [convFilter]);

  const fetchKnowledge = useCallback(async () => {
    try { setKnowledge(await api.get<Knowledge[]>("/sales-assistant/knowledge")); } catch {}
  }, []);

  const fetchRules = useCallback(async () => {
    try { setRules(await api.get<SalesRule[]>("/sales-assistant/rules")); } catch {}
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (tab === "conversations") fetchConvs(); }, [tab, fetchConvs]);
  useEffect(() => { if (tab === "knowledge") { fetchKnowledge(); fetchRules(); } }, [tab, fetchKnowledge, fetchRules]);

  const takeOver = async (convId: number) => {
    try { await api.post(`/sales-assistant/conversations/${convId}/handoff`); fetchTasks(); }
    catch (e: any) { alert(e.message); }
  };

  const syncCatalog = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const r = await api.post<{ synced: number }>("/sales-assistant/knowledge/sync-from-catalog");
      setSyncMsg(`✓ Synced ${r.synced} products`); fetchKnowledge();
    } catch (e: any) { setSyncMsg(e.message || "Sync failed"); }
    setSyncing(false);
  };

  const addKnowledge = async () => {
    if (!kForm.name) return;
    setKSaving(true);
    try {
      await api.post("/sales-assistant/knowledge", kForm);
      setKForm({ name: "", description: "", price_display: "", availability: "available", service_area: "", booking_cta: "" });
      fetchKnowledge();
    } catch (e: any) { alert(e.message); }
    setKSaving(false);
  };

  const addRule = async () => {
    if (!rForm.question || !rForm.approved_answer) return;
    setRSaving(true);
    try {
      await api.post("/sales-assistant/rules", rForm);
      setRForm({ question: "", approved_answer: "", escalation_condition: "" });
      fetchRules();
    } catch (e: any) { alert(e.message); }
    setRSaving(false);
  };

  const urgentCount = tasks?.pending_handoffs.filter(h => h.priority === "urgent").length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Sales Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">Qualifies leads, answers questions, escalates to you when it matters</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["inbox", "conversations", "knowledge", "settings"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "inbox" ? (
              <span className="flex items-center gap-1.5">
                Inbox
                {urgentCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{urgentCount}</span>}
              </span>
            ) : t === "knowledge" ? "Knowledge Base" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* INBOX TAB */}
      {tab === "inbox" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🚨 Needs Your Attention ({tasks?.pending_handoffs.length ?? 0})</h2>
            {!tasks?.pending_handoffs.length ? (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl p-6 text-center">No pending handoffs — the assistant is handling everything.</p>
            ) : (
              <div className="space-y-3">
                {tasks.pending_handoffs.map((h) => (
                  <div key={h.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between ${h.priority === "urgent" ? "border-red-300" : "border-gray-200"}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{CH_ICON[h.channel] ?? "💬"}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{h.contact_id}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {h.reason.replace(/_/g, " ")}
                          {h.priority === "urgent" && <span className="text-red-500 font-semibold"> · URGENT</span>}
                          {" · "}{new Date(h.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      {h.temperature && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TEMP_COLORS[h.temperature] ?? TEMP_COLORS.incomplete}`}>{h.temperature}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <a href={`/sales-assistant/${h.conversation_id}`} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">View Thread</a>
                      <button onClick={() => takeOver(h.conversation_id)} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Take Over</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!!tasks?.stalled_conversations.length && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">⏸ Stalled ({tasks.stalled_conversations.length})</h2>
              <div className="space-y-2">
                {tasks.stalled_conversations.map((c) => (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>{CH_ICON[c.channel] ?? "💬"}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.contact_id}</p>
                        <p className="text-xs text-gray-400">Last active {new Date(c.last_message_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <a href={`/sales-assistant/${c.id}`} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">View</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!tasks?.hot_leads.length && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">🔴 Hot Leads Ready to Close ({tasks.hot_leads.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tasks.hot_leads.map((l) => (
                  <div key={l.id} className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-900">{l.whatsapp || l.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Captured {new Date(l.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONVERSATIONS TAB */}
      {tab === "conversations" && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {["", "active", "qualified", "handed_off", "stalled", "closed"].map((s) => (
              <button key={s} onClick={() => setConvFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${convFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {s === "" ? "All" : s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12 border border-dashed border-gray-200 rounded-xl">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <a key={c.id} href={`/sales-assistant/${c.id}`} className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{CH_ICON[c.channel] ?? "💬"}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.contact_id}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{c.last_message || "No messages yet"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.temperature && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TEMP_COLORS[c.temperature] ?? TEMP_COLORS.incomplete}`}>{c.temperature}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "handed_off" ? "bg-orange-100 text-orange-700" :
                        c.status === "closed" ? "bg-gray-100 text-gray-500" : "bg-yellow-100 text-yellow-700"
                      }`}>{c.status.replace(/_/g, " ")}</span>
                      <span className="text-xs text-gray-400">{c.message_count} msgs</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KNOWLEDGE TAB */}
      {tab === "knowledge" && (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Product Knowledge ({knowledge.length})</h2>
              <button onClick={syncCatalog} disabled={syncing} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 font-medium disabled:opacity-50">
                {syncing ? "Syncing..." : "↻ Sync from Catalog"}
              </button>
            </div>
            {syncMsg && <p className={`text-xs mb-3 font-medium ${syncMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{syncMsg}</p>}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Entry</p>
              <div className="grid grid-cols-2 gap-3">
                <input value={kForm.name} onChange={e => setKForm(p => ({...p, name: e.target.value}))} placeholder="Product / Service name *" className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 bg-white text-gray-900 placeholder-gray-400" />
                <input value={kForm.price_display} onChange={e => setKForm(p => ({...p, price_display: e.target.value}))} placeholder='Price e.g. "From ₦50,000"' className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
                <select value={kForm.availability} onChange={e => setKForm(p => ({...p, availability: e.target.value}))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="by_request">By Request</option>
                </select>
                <textarea value={kForm.description} onChange={e => setKForm(p => ({...p, description: e.target.value}))} placeholder="Description" rows={2} className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 resize-none bg-white text-gray-900 placeholder-gray-400" />
                <input value={kForm.service_area} onChange={e => setKForm(p => ({...p, service_area: e.target.value}))} placeholder="Service area (optional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
                <input value={kForm.booking_cta} onChange={e => setKForm(p => ({...p, booking_cta: e.target.value}))} placeholder="Booking link (optional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
              </div>
              <button onClick={addKnowledge} disabled={kSaving || !kForm.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {kSaving ? "Saving..." : "+ Add Entry"}
              </button>
            </div>
            {knowledge.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">No entries yet. Add products or sync from catalog.</p>
            ) : (
              <div className="space-y-2">
                {knowledge.map((k) => (
                  <div key={k.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{k.name}</p>
                      {k.price_display && <p className="text-xs text-green-700 font-medium mt-0.5">{k.price_display}</p>}
                      {k.description && <p className="text-xs text-gray-500 mt-1 max-w-lg">{k.description}</p>}
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${k.availability === "available" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{k.availability}</span>
                        {k.service_area && <span className="text-xs text-gray-400">📍 {k.service_area}</span>}
                      </div>
                    </div>
                    <button onClick={async () => { if (confirm("Delete?")) { await api.del(`/sales-assistant/knowledge/${k.id}`); fetchKnowledge(); }}} className="text-gray-300 hover:text-red-400 text-lg ml-4 flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Approved Q&A Rules ({rules.length})</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
              <input value={rForm.question} onChange={e => setRForm(p => ({...p, question: e.target.value}))} placeholder='Question e.g. "Do you offer discounts?"' className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
              <textarea value={rForm.approved_answer} onChange={e => setRForm(p => ({...p, approved_answer: e.target.value}))} placeholder="Approved answer (used verbatim)" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none bg-white text-gray-900 placeholder-gray-400" />
              <select value={rForm.escalation_condition} onChange={e => setRForm(p => ({...p, escalation_condition: e.target.value}))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full bg-white text-gray-900">
                <option value="">No escalation</option>
                <option value="asks_for_human">Escalate: asks for human</option>
                <option value="strong_purchase_intent">Escalate: strong purchase intent</option>
                <option value="complaint">Escalate: complaint</option>
                <option value="regulated_question">Escalate: regulated question</option>
              </select>
              <button onClick={addRule} disabled={rSaving || !rForm.question || !rForm.approved_answer} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {rSaving ? "Saving..." : "+ Add Rule"}
              </button>
            </div>
            {rules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">No rules yet.</p>
            ) : (
              <div className="space-y-2">
                {rules.map((r) => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Q: {r.question}</p>
                      <p className="text-sm text-gray-600 mt-1">A: {r.approved_answer}</p>
                      {r.escalation_condition && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full mt-1.5 inline-block">⚡ Escalates: {r.escalation_condition.replace(/_/g, " ")}</span>
                      )}
                    </div>
                    <button onClick={async () => { if (confirm("Delete?")) { await api.del(`/sales-assistant/rules/${r.id}`); fetchRules(); }}} className="text-gray-300 hover:text-red-400 text-lg ml-4 flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

function SettingsTab() {
  const [name, setName] = useState("Default Qualification");
  const [questions, setQuestions] = useState(["What is your budget?", "Where are you located?", "How soon do you need this?"]);
  const [newQ, setNewQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get<{ qualification_rules: { name: string; questions: string[] }[] }>("/sales-assistant/settings")
      .then((data) => {
        const rule = data.qualification_rules[0];
        if (rule) {
          setName(rule.name);
          setQuestions(rule.questions || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await api.put("/sales-assistant/settings", { name, questions, hot_when: [], handoff_when: [] });
      setMsg("✓ Saved");
    } catch (e: any) { setMsg(e.message || "Failed"); }
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading settings...</div>;

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Qualification Questions</h2>
        <p className="text-xs text-gray-500 mb-4">The assistant asks these one at a time to qualify leads.</p>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Rule set name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 bg-white text-gray-900 placeholder-gray-400" />
        <div className="space-y-2 mb-4">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
              <input value={q} onChange={e => setQuestions(prev => prev.map((x, j) => j === i ? e.target.value : x))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900" />
              <button onClick={() => setQuestions(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 text-lg">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Add a question..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400"
            onKeyDown={e => { if (e.key === "Enter" && newQ) { setQuestions(p => [...p, newQ]); setNewQ(""); }}} />
          <button onClick={() => { if (newQ) { setQuestions(p => [...p, newQ]); setNewQ(""); }}} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Add</button>
        </div>
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {msg && <p className={`text-sm mt-2 font-medium ${msg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{msg}</p>}
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">How the assistant works</p>
        <ul className="space-y-1 text-xs list-disc list-inside text-blue-600">
          <li>Answers using only your approved Knowledge Base — never invents prices</li>
          <li>Asks qualification questions one at a time</li>
          <li>Escalates when a lead asks for a human or shows strong purchase intent</li>
          <li>Sends follow-ups to stalled conversations (max 3 times)</li>
        </ul>
      </div>
    </div>
  );
}
