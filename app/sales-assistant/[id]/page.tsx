"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Message {
  id: number; sender_type: string; content: string;
  timestamp: string; moderation_status: string;
}
interface ConvDetail {
  id: number; channel: string; contact_id: string; status: string;
  temperature: string | null; intent_summary: string | null;
  qualification_data: Record<string, string>;
  started_at: string; last_message_at: string | null;
  handoff_requested_at: string | null;
  messages: Message[];
}

const TEMP_COLORS: Record<string, string> = {
  hot: "bg-red-100 text-red-700", warm: "bg-yellow-100 text-yellow-700",
  cold: "bg-blue-100 text-blue-700", incomplete: "bg-gray-100 text-gray-500",
};

const EVENT_TYPES = ["enquiry", "qualified", "booking_sent", "quote_sent", "catalog_sent", "payment_link_sent", "converted", "lost"];

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const convId = params.id as string;

  const [conv, setConv] = useState<ConvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [takingOver, setTakingOver] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showConvModal, setShowConvModal] = useState(false);
  const [convForm, setConvForm] = useState({ event_type: "converted", value: "", currency: "NGN", source: "" });
  const [convSaving, setConvSaving] = useState(false);
  const [convMsg, setConvMsg] = useState("");

  const fetchConv = async () => {
    try {
      setConv(await api.get<ConvDetail>(`/sales-assistant/conversations/${convId}`));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchConv(); }, [convId]);

  const takeOver = async () => {
    setTakingOver(true);
    try {
      await api.post(`/sales-assistant/conversations/${convId}/handoff`);
      fetchConv();
    } catch (e: any) { alert(e.message); }
    setTakingOver(false);
  };

  const resolve = async () => {
    setResolving(true);
    try {
      await api.post(`/sales-assistant/conversations/${convId}/resolve`);
      fetchConv();
    } catch (e: any) { alert(e.message); }
    setResolving(false);
  };

  const recordConversion = async () => {
    setConvSaving(true); setConvMsg("");
    try {
      await api.post("/sales-assistant/conversion-events", {
        conversation_id: parseInt(convId),
        event_type: convForm.event_type,
        value: convForm.value ? parseFloat(convForm.value) : null,
        currency: convForm.currency,
        source: convForm.source || null,
      });
      setConvMsg("✓ Recorded");
      setShowConvModal(false);
    } catch (e: any) { setConvMsg(e.message || "Failed"); }
    setConvSaving(false);
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading...</div>;
  if (!conv) return <div className="p-6 text-gray-400 text-sm">Conversation not found.</div>;

  const isHandedOff = conv.status === "handed_off";
  const isClosed = conv.status === "closed";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/sales-assistant")} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{conv.contact_id}</h1>
            <p className="text-xs text-gray-500">{conv.channel} · Started {new Date(conv.started_at).toLocaleDateString()}</p>
          </div>
          {conv.temperature && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TEMP_COLORS[conv.temperature] ?? TEMP_COLORS.incomplete}`}>{conv.temperature}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            conv.status === "active" ? "bg-green-100 text-green-700" :
            conv.status === "handed_off" ? "bg-orange-100 text-orange-700" :
            conv.status === "closed" ? "bg-gray-100 text-gray-500" : "bg-yellow-100 text-yellow-700"
          }`}>{conv.status.replace(/_/g, " ")}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConvModal(true)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            + Record Conversion
          </button>
          {!isHandedOff && !isClosed && (
            <button onClick={takeOver} disabled={takingOver} className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50">
              {takingOver ? "Taking over..." : "🙋 Take Over"}
            </button>
          )}
          {!isClosed && (
            <button onClick={resolve} disabled={resolving} className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50">
              {resolving ? "Resolving..." : "✓ Mark Resolved"}
            </button>
          )}
        </div>
      </div>

      {isHandedOff && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-sm text-orange-700 font-medium">
          🙋 You have taken over this conversation. AI assistant is paused.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat thread */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{conv.messages.length} messages</p>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {conv.messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No messages yet.</p>
              ) : (
                conv.messages.map((m) => {
                  const isLead = m.sender_type === "lead";
                  const isHuman = m.sender_type === "human";
                  return (
                    <div key={m.id} className={`flex ${isLead ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm ${
                        isLead ? "bg-gray-100 text-gray-800 rounded-tl-sm" :
                        isHuman ? "bg-indigo-600 text-white rounded-tr-sm" :
                        "bg-green-600 text-white rounded-tr-sm"
                      }`}>
                        {!isLead && (
                          <p className="text-xs opacity-70 mb-0.5 font-medium">{isHuman ? "You" : "Assistant"}</p>
                        )}
                        <p className="leading-relaxed">{m.content}</p>
                        <p className={`text-xs mt-1 ${isLead ? "text-gray-400" : "opacity-60"}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Qualification panel */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Qualification Data</h3>
            {Object.keys(conv.qualification_data).length === 0 ? (
              <p className="text-xs text-gray-400">Not yet qualified.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(conv.qualification_data).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-400 capitalize">{k}</p>
                    <p className="text-sm font-medium text-gray-800">{String(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {conv.intent_summary && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Intent Summary</h3>
              <p className="text-sm text-gray-700">{conv.intent_summary}</p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h3>
            <div className="space-y-1.5 text-xs text-gray-500">
              <p>Started: {new Date(conv.started_at).toLocaleString()}</p>
              {conv.last_message_at && <p>Last message: {new Date(conv.last_message_at).toLocaleString()}</p>}
              {conv.handoff_requested_at && <p className="text-orange-600">Escalated: {new Date(conv.handoff_requested_at).toLocaleString()}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Record Conversion Modal */}
      {showConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Record Conversion Event</h2>
            <div className="space-y-3">
              <select value={convForm.event_type} onChange={e => setConvForm(p => ({...p, event_type: e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={convForm.value} onChange={e => setConvForm(p => ({...p, value: e.target.value}))} placeholder="Value (optional)" type="number" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={convForm.currency} onChange={e => setConvForm(p => ({...p, currency: e.target.value}))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <input value={convForm.source} onChange={e => setConvForm(p => ({...p, source: e.target.value}))} placeholder="Source (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            {convMsg && <p className={`text-sm mt-3 font-medium ${convMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{convMsg}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowConvModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              <button onClick={recordConversion} disabled={convSaving} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {convSaving ? "Saving..." : "Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
