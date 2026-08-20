"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface WASettings {
  whatsapp_phone_number_id: string;
  whatsapp_access_token_hint: string;
  whatsapp_business_account_id: string;
  whatsapp_enabled: boolean;
  connected: boolean;
}

interface BroadcastResult {
  sent: number;
  failed: number;
  message?: string;
}

export default function WhatsAppBroadcastPage() {
  const [settings, setSettings] = useState<WASettings | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    api.get<WASettings>("/whatsapp/settings").then(setSettings).catch(() => {});
  }, []);

  const send = async () => {
    if (!message.trim()) { setError("Message cannot be empty."); return; }
    setSending(true);
    setError("");
    setResult(null);
    try {
      const r = await api.post<BroadcastResult>("/whatsapp/broadcast", { message: message.trim() });
      setResult(r);
      setMessage("");
      setCharCount(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📲 WhatsApp Broadcast</h1>
        <p className="text-gray-400 text-sm mt-1">Send a message to all leads with WhatsApp numbers</p>
      </div>

      {/* Connection status */}
      <div className={`rounded-xl p-4 mb-6 border ${settings?.connected ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{settings?.connected ? "✅" : "⚠️"}</span>
          <div>
            <p className={`text-sm font-semibold ${settings?.connected ? "text-green-400" : "text-yellow-400"}`}>
              {settings?.connected ? "WhatsApp Connected" : "WhatsApp Not Connected"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {settings?.connected
                ? `Phone ID: ${settings.whatsapp_phone_number_id}`
                : "Connect your WhatsApp Business account in Settings first"}
            </p>
          </div>
          {!settings?.connected && (
            <a href="/settings" className="ml-auto text-xs text-indigo-400 hover:underline">Go to Settings →</a>
          )}
        </div>
      </div>

      {/* Compose */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
        <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Message</label>
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setCharCount(e.target.value.length); }}
          rows={6}
          maxLength={1024}
          placeholder="Type your broadcast message here..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">{charCount}/1024 characters</p>
          <p className="text-xs text-gray-500">Plain text only — no HTML</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
          <p className="text-green-400 font-semibold text-sm">Broadcast complete!</p>
          {result.message ? (
            <p className="text-gray-400 text-sm mt-1">{result.message}</p>
          ) : (
            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{result.sent}</p>
                <p className="text-xs text-gray-400">Sent</p>
              </div>
              {result.failed > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                  <p className="text-xs text-gray-400">Failed</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !settings?.connected || !message.trim()}
        className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition"
      >
        {sending ? "Sending..." : "📲 Send Broadcast"}
      </button>

      <p className="text-xs text-gray-600 text-center mt-3">
        Only leads with saved WhatsApp numbers will receive this message.
        Available on Starter plan and above.
      </p>
    </div>
  );
}
