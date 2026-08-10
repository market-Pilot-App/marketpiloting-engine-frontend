"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Connections {
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
  twitter: boolean;
  telegram: boolean;
  whatsapp: boolean;
  blog: boolean;
  youtube: boolean;
  website: boolean;
}

interface AutoReplySettings {
  auto_reply_enabled: boolean;
  auto_reply_platforms: string[];
  confidence_threshold: number;
  escalation_keywords: string[];
}

interface PaymentForm {
  payment_method: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  payment_link: string;
  payment_instructions: string;
}

interface PlatformForm {
  fb_access_token?: string;
  fb_page_id?: string;
  instagram_account_id?: string;
  linkedin_access_token?: string;
  linkedin_person_id?: string;
  twitter_api_key?: string;
  twitter_api_secret?: string;
  twitter_access_token?: string;
  twitter_access_secret?: string;
  telegram_bot_token?: string;
  telegram_channel_id?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  blog_api_url?: string;
  blog_api_key?: string;
  youtube_client_id?: string;
  youtube_client_secret?: string;
  youtube_refresh_token?: string;
  website_url?: string;
}

const PLAN_RANK: Record<string, number> = { solo: 1, starter: 2, growth: 3, agency: 4, admin: 4 };

const PLATFORM_MIN_PLAN: Record<string, string> = {
  facebook: "solo",
  instagram: "starter",
  linkedin: "growth",
  twitter: "growth",
  telegram: "starter",
  whatsapp: "starter",
  blog: "starter",
  youtube: "growth",
  website: "growth",
};

const PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: "📘",
    hint: "Requires a Facebook Page Access Token and Page ID. Get these from developers.facebook.com → your app → Graph API Explorer.",
    fields: [
      { name: "fb_page_id", label: "Page ID", placeholder: "123456789" },
      { name: "fb_access_token", label: "Page Access Token", placeholder: "EAABwz...", secret: true },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "📸",
    hint: "Instagram uses the same Facebook Access Token. You also need your Instagram Business Account ID (not username).",
    fields: [
      { name: "fb_access_token", label: "Facebook Access Token", placeholder: "EAABwz...", secret: true },
      { name: "instagram_account_id", label: "Instagram Account ID", placeholder: "17841400..." },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "💼",
    hint: "Requires a LinkedIn OAuth access token and your Person URN. Get these from developer.linkedin.com.",
    fields: [
      { name: "linkedin_person_id", label: "Person URN", placeholder: "urn:li:person:abc123" },
      { name: "linkedin_access_token", label: "Access Token", placeholder: "AQV...", secret: true },
    ],
  },
  {
    key: "twitter",
    label: "X / Twitter",
    icon: "🐦",
    hint: "Requires API Key, API Secret, Access Token, and Access Secret from developer.x.com.",
    fields: [
      { name: "twitter_api_key", label: "API Key", placeholder: "xvz1evFS..." },
      { name: "twitter_api_secret", label: "API Secret", placeholder: "L8qq9PZy...", secret: true },
      { name: "twitter_access_token", label: "Access Token", placeholder: "1234567890-..." },
      { name: "twitter_access_secret", label: "Access Secret", placeholder: "garHmw...", secret: true },
    ],
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: "✈️",
    hint: "Create a bot via @BotFather on Telegram to get a Bot Token. Add the bot as admin to your channel and get the Channel ID.",
    fields: [
      { name: "telegram_bot_token", label: "Bot Token", placeholder: "123456:ABC-DEF...", secret: true },
      { name: "telegram_channel_id", label: "Channel ID", placeholder: "@yourchannel or -100123456789" },
    ],
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    hint: "Connect via Meta Cloud API. Go to developers.facebook.com → your app → WhatsApp → API Setup. You need your Phone Number ID and a permanent System User Access Token. Set your webhook URL to: https://marketpiloting-engine-backend.onrender.com/whatsapp/webhook — Verify Token: mp_whatsapp_verify",
    fields: [
      { name: "whatsapp_phone_number_id", label: "Phone Number ID", placeholder: "123456789012345" },
      { name: "whatsapp_access_token", label: "System User Access Token", placeholder: "EAABwz...", secret: true },
    ],
  },
  {
    key: "blog",
    label: "Blog / Website",
    icon: "📝",
    hint: "Connect your WordPress or custom blog API to auto-publish blog posts.",
    fields: [
      { name: "blog_api_url", label: "Blog API URL", placeholder: "https://yourblog.com/wp-json/wp/v2" },
      { name: "blog_api_key", label: "API Key / App Password", placeholder: "xxxx xxxx xxxx...", secret: true },
    ],
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: "▶️",
    hint: "Connect your YouTube channel via OAuth. Get credentials from console.cloud.google.com → YouTube Data API v3. You need Client ID, Client Secret, and a Refresh Token.",
    fields: [
      { name: "youtube_client_id", label: "Client ID", placeholder: "123456789-abc.apps.googleusercontent.com" },
      { name: "youtube_client_secret", label: "Client Secret", placeholder: "GOCSPX-...", secret: true },
      { name: "youtube_refresh_token", label: "Refresh Token", placeholder: "1//0g...", secret: true },
    ],
  },
  {
    key: "website",
    label: "Website Traffic Boost",
    icon: "🌐",
    hint: "Enter your website URL to enable automated traffic boost. We send real visitors to your site after every post cycle.",
    fields: [
      { name: "website_url", label: "Website URL", placeholder: "https://yourbusiness.com" },
    ],
  },
];

function RecyclingSettings() {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(10.0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ recycling_enabled: boolean; recycle_threshold: number }>("/campaigns/me")
      .then((d) => {
        setEnabled((d as Record<string, unknown>).recycling_enabled as boolean ?? false);
        setThreshold((d as Record<string, unknown>).recycle_threshold as number ?? 10.0);
      }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/campaigns/me/recycling", { recycling_enabled: enabled, recycle_threshold: threshold });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium text-sm">Enable Content Recycling</p>
          <p className="text-gray-500 text-xs mt-0.5">Top-performing posts will be automatically re-queued after their interval expires.</p>
        </div>
        <button
          onClick={() => setEnabled((e) => !e)}
          className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-indigo-600" : "bg-gray-700"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
      </div>
      {enabled && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-medium text-sm">Minimum Engagement Score</p>
            <span className="text-indigo-400 text-sm font-bold">{threshold.toFixed(0)}</span>
          </div>
          <p className="text-gray-500 text-xs mb-2">
            Score = likes + (comments × 3) + (reach × 0.05) + (clicks × 2). Only posts above this score get recycled.
          </p>
          <input
            type="range" min={5} max={50} step={5}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>5 (recycle more)</span>
            <span>50 (only viral posts)</span>
          </div>
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
      >
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save Recycling Settings"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [plan, setPlan] = useState("solo");
  const [connections, setConnections] = useState<Connections | null>(null);
  const [forms, setForms] = useState<Record<string, PlatformForm>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});

  // Auto-reply state
  const [arSettings, setArSettings] = useState<AutoReplySettings>({
    auto_reply_enabled: false,
    auto_reply_platforms: [],
    confidence_threshold: 0.75,
    escalation_keywords: [],
  });
  const [arSaving, setArSaving] = useState(false);
  const [arSaved, setArSaved] = useState(false);
  const [kwInput, setKwInput] = useState("");
  const canAutoReply = ["starter", "growth", "agency", "admin"].includes(plan);
  // WhatsApp state
  const [waSettings, setWaSettings] = useState({ whatsapp_phone_number_id: "", whatsapp_access_token: "", whatsapp_business_account_id: "", whatsapp_enabled: false });
  const [waTokenHint, setWaTokenHint] = useState("");
  const [waConnected, setWaConnected] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [waError, setWaError] = useState("");
  const canWhatsApp = ["starter", "growth", "agency", "admin"].includes(plan);

  // Delete account state
  const [deleteStep, setDeleteStep] = useState(0); // 0=hidden, 1=warn, 2=password, 3=confirm-text
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Payment state
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    payment_method: "", bank_name: "", account_number: "",
    account_name: "", payment_link: "", payment_instructions: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [savedPayment, setSavedPayment] = useState(false);

  // Revenue tracking state
  const [paystackKey, setPaystackKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [revKeySet, setRevKeySet] = useState(false);
  const [revKeyHint, setRevKeyHint] = useState("");
  const [savingRev, setSavingRev] = useState(false);
  const [savedRev, setSavedRev] = useState(false);
  const [revError, setRevError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mp_client");
    if (stored) setPlan(JSON.parse(stored).plan ?? "solo");
    api.get<Connections>("/campaigns/me/connections").then(setConnections);
    api.get<AutoReplySettings>("/auto-reply/settings").then(setArSettings).catch(() => {});
    api.get<{ whatsapp_phone_number_id: string; whatsapp_access_token_hint: string; whatsapp_business_account_id: string; whatsapp_enabled: boolean; connected: boolean }>("/whatsapp/settings")
      .then((d) => {
        setWaSettings((s) => ({ ...s, whatsapp_phone_number_id: d.whatsapp_phone_number_id, whatsapp_business_account_id: d.whatsapp_business_account_id, whatsapp_enabled: d.whatsapp_enabled }));
        setWaTokenHint(d.whatsapp_access_token_hint);
        setWaConnected(d.connected);
      }).catch(() => {});
    api.get<{ paystack_secret_key_set: boolean; paystack_secret_key_hint: string }>("/revenue/settings")
      .then((d) => { setRevKeySet(d.paystack_secret_key_set); setRevKeyHint(d.paystack_secret_key_hint); })
      .catch(() => {});
    api.get<{ webhook_url: string }>("/revenue/webhook-url")
      .then((d) => setWebhookUrl(d.webhook_url))
      .catch(() => {});
    api.get<PaymentForm>("/brand-dna/").then((d) => {
      setPaymentForm({
        payment_method: (d as unknown as Record<string, string>).payment_method || "",
        bank_name: (d as unknown as Record<string, string>).bank_name || "",
        account_number: (d as unknown as Record<string, string>).account_number || "",
        account_name: (d as unknown as Record<string, string>).account_name || "",
        payment_link: (d as unknown as Record<string, string>).payment_link || "",
        payment_instructions: (d as unknown as Record<string, string>).payment_instructions || "",
      });
    }).catch(() => {});
  }, []);

  const saveRevenue = async () => {
    setRevError("");
    if (!paystackKey.startsWith("sk_")) { setRevError("Key must start with sk_live_ or sk_test_"); return; }
    setSavingRev(true);
    try {
      await api.patch("/revenue/settings", { paystack_secret_key: paystackKey });
      setRevKeySet(true);
      setRevKeyHint(`sk_...${paystackKey.slice(-4)}`);
      setPaystackKey("");
      setSavedRev(true);
      setTimeout(() => setSavedRev(false), 3000);
    } catch (e: unknown) {
      setRevError(e instanceof Error ? e.message : "Save failed");
    } finally { setSavingRev(false); }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const savePayment = async () => {
    setSavingPayment(true);
    try {
      await api.patch("/brand-dna/", paymentForm);
      setSavedPayment(true);
      setTimeout(() => setSavedPayment(false), 3000);
    } catch {}
    finally { setSavingPayment(false); }
  };

  const saveAutoReply = async () => {
    setArSaving(true);
    try {
      await api.patch("/auto-reply/settings", arSettings);
      setArSaved(true);
      setTimeout(() => setArSaved(false), 3000);
    } catch {}
    finally { setArSaving(false); }
  };

  const toggleArPlatform = (p: string) => {
    setArSettings((s) => ({
      ...s,
      auto_reply_platforms: s.auto_reply_platforms.includes(p)
        ? s.auto_reply_platforms.filter((x) => x !== p)
        : [...s.auto_reply_platforms, p],
    }));
  };

  const addKeyword = () => {
    const kw = kwInput.trim().toLowerCase();
    if (!kw || arSettings.escalation_keywords.includes(kw)) return;
    setArSettings((s) => ({ ...s, escalation_keywords: [...s.escalation_keywords, kw] }));
    setKwInput("");
  };

  const removeKeyword = (kw: string) => {
    setArSettings((s) => ({ ...s, escalation_keywords: s.escalation_keywords.filter((k) => k !== kw) }));
  };

  const deleteAccount = async () => {
    setDeleteError("");
    if (deleteConfirmText !== "DELETE MY ACCOUNT") {
      setDeleteError("Type exactly: DELETE MY ACCOUNT");
      return;
    }
    setDeleteLoading(true);
    try {
      await api.del("/auth/account", { password: deletePassword, confirmation: deleteConfirmText });
      localStorage.clear();
      window.location.href = "/login";
    } catch (e: any) {
      setDeleteError(e.message || "Failed. Check your password.");
      setDeleteLoading(false);
    }
  };

  const canUsePlatform = (key: string) =>
    (PLAN_RANK[plan] ?? 1) >= (PLAN_RANK[PLATFORM_MIN_PLAN[key] ?? "solo"] ?? 1);

  const setField = (platform: string, field: string, value: string) => {
    setForms((f) => ({ ...f, [platform]: { ...f[platform], [field]: value } }));
  };

  const save = async (platform: string) => {
    const form = forms[platform] || {};
    setSaving((s) => ({ ...s, [platform]: true }));
    setErrors((e) => ({ ...e, [platform]: "" }));
    try {
      let body: Record<string, unknown> = { ...form };
      // Twitter fields get merged into twitter_credentials object
      if (platform === "twitter") {
        body = {
          twitter_credentials: {
            api_key: form.twitter_api_key,
            api_secret: form.twitter_api_secret,
            access_token: form.twitter_access_token,
            access_secret: form.twitter_access_secret,
          },
        };
      }
      if (platform === "youtube") {
        body = {
          youtube_credentials: {
            client_id: form.youtube_client_id,
            client_secret: form.youtube_client_secret,
            refresh_token: form.youtube_refresh_token,
          },
        };
      }
      await api.patch("/campaigns/me", body);
      const updated = await api.get<Connections>("/campaigns/me/connections");
      setConnections(updated);
      setSaved((s) => ({ ...s, [platform]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [platform]: false })), 3000);
      setForms((f) => ({ ...f, [platform]: {} }));
    } catch (err: unknown) {
      setErrors((e) => ({ ...e, [platform]: err instanceof Error ? err.message : "Save failed" }));
    } finally {
      setSaving((s) => ({ ...s, [platform]: false }));
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Social Connections</h1>
      <p className="text-gray-400 text-sm mb-8">
        Connect your social media accounts so MarketPilot can post automatically on your behalf.
        Your credentials are encrypted and stored securely — never shared.
      </p>

      <div className="space-y-4">
        {PLATFORMS.map((p) => {
          const connected = connections?.[p.key as keyof Connections];
          const isOpen = show[p.key];
          const locked = !canUsePlatform(p.key);
          const minPlan = PLATFORM_MIN_PLAN[p.key];
          return (
            <div key={p.key} className={`bg-gray-900 border rounded-xl overflow-hidden ${locked ? "border-gray-700 opacity-60" : "border-gray-800"}`}>
              {/* Header */}
              <div
                className={`flex items-center justify-between px-5 py-4 transition ${locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-800"}`}
                onClick={() => !locked && setShow((s) => ({ ...s, [p.key]: !s[p.key] }))}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <span className="font-medium text-white">{p.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {locked ? (
                    <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">🔒 {minPlan}+ plan</span>
                  ) : connected ? (
                    <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">✅ Connected</span>
                  ) : (
                    <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">⚠️ Not connected</span>
                  )}
                  {!locked && <span className="text-gray-500 text-xs">{isOpen ? "▲" : "▼"}</span>}
                </div>
              </div>

              {/* Expandable form */}
              {!locked && isOpen && (
                <div className="px-5 pb-5 border-t border-gray-800">
                  <p className="text-xs text-gray-400 mt-4 mb-4 leading-relaxed">{p.hint}</p>
                  <div className="space-y-3">
                    {p.fields.map((f) => (
                      <div key={f.name}>
                        <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                        <input
                          type={f.secret ? "password" : "text"}
                          placeholder={f.placeholder}
                          value={forms[p.key]?.[f.name as keyof PlatformForm] || ""}
                          onChange={(e) => setField(p.key, f.name, e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                  {errors[p.key] && <p className="text-red-400 text-xs mt-3">{errors[p.key]}</p>}
                  <button
                    onClick={() => save(p.key)}
                    disabled={saving[p.key]}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
                  >
                    {saving[p.key] ? "Saving..." : saved[p.key] ? "✓ Saved" : "Save"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Revenue Tracking ── */}
      <div id="revenue-tracking" className="mt-10">
        <h1 className="text-2xl font-bold mb-2">💵 Revenue Tracking</h1>
        <p className="text-gray-400 text-sm mb-6">
          Connect your Paystack account so MarketPilot can track which posts are driving real sales.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div>
            <p className="text-white font-medium text-sm mb-1">Step 1 — Paste your Paystack Secret Key</p>
            <p className="text-gray-500 text-xs mb-3">
              Go to <span className="text-indigo-400">dashboard.paystack.com → Settings → API Keys</span> and copy your Secret Key.
              We use it only to verify that webhook events are genuinely from Paystack.
            </p>
            {revKeySet && (
              <p className="text-green-400 text-xs mb-2">✅ Key saved: <span className="font-mono">{revKeyHint}</span> — paste a new key below to update</p>
            )}
            <input
              type="password"
              placeholder={revKeySet ? "Paste new key to update" : "sk_live_... or sk_test_..."}
              value={paystackKey}
              onChange={(e) => setPaystackKey(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {revError && <p className="text-red-400 text-xs mt-2">{revError}</p>}
            <button
              onClick={saveRevenue}
              disabled={savingRev || !paystackKey}
              className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {savingRev ? "Saving..." : savedRev ? "✓ Saved" : "Save Secret Key"}
            </button>
          </div>
          {webhookUrl && (
            <div className="border-t border-gray-800 pt-5">
              <p className="text-white font-medium text-sm mb-1">Step 2 — Add this webhook URL to your Paystack dashboard</p>
              <p className="text-gray-500 text-xs mb-3">
                Go to <span className="text-indigo-400">dashboard.paystack.com → Settings → Webhooks</span> and paste this URL.
                Every successful payment will be attributed to the post that drove it.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono truncate">
                  {webhookUrl}
                </code>
                <button
                  onClick={copyWebhook}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition whitespace-nowrap"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment Details ── */}
      <div className="mt-10">
        <h1 className="text-2xl font-bold mb-2">💳 Payment Details</h1>
        <p className="text-gray-400 text-sm mb-6">
          Auto-replies will include these details when customers ask about payment.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Payment Method</p>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select method</option>
              <option value="bank">Bank Transfer Only</option>
              <option value="link">Payment Link Only</option>
              <option value="both">Both</option>
            </select>
          </div>
          {(paymentForm.payment_method === "bank" || paymentForm.payment_method === "both") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["bank_name", "account_number", "account_name"] as const).map((field) => (
                <div key={field}>
                  <p className="text-xs text-gray-500 mb-1 capitalize">{field.replace("_", " ")}</p>
                  <input
                    value={paymentForm[field]}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={field === "bank_name" ? "GTBank" : field === "account_number" ? "0123456789" : "Adunola Stores"}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}
          {(paymentForm.payment_method === "link" || paymentForm.payment_method === "both") && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Payment Link</p>
              <input
                value={paymentForm.payment_link}
                onChange={(e) => setPaymentForm((f) => ({ ...f, payment_link: e.target.value }))}
                placeholder="https://paystack.com/pay/your-store"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
          {paymentForm.payment_method && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Payment Instructions</p>
              <textarea
                value={paymentForm.payment_instructions}
                onChange={(e) => setPaymentForm((f) => ({ ...f, payment_instructions: e.target.value }))}
                placeholder="e.g. Send proof of payment to this DM after transfer"
                rows={2}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
          <button
            onClick={savePayment}
            disabled={savingPayment}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            {savingPayment ? "Saving..." : savedPayment ? "✓ Saved" : "Save Payment Info"}
          </button>
        </div>
      </div>

      {/* ── Auto-Reply Settings ── */}
      <div className="mt-10">
        <h1 className="text-2xl font-bold mb-2">Auto-Reply Settings</h1>
        <p className="text-gray-400 text-sm mb-6">
          Configure AI-powered automatic replies to incoming messages in your brand voice.
        </p>

        {!canAutoReply ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <p className="text-gray-400 text-sm">🔒 Auto-reply is available on Starter plan and above.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">Enable Auto-Reply</p>
                <p className="text-gray-500 text-xs mt-0.5">AI will automatically reply to incoming messages</p>
              </div>
              <button onClick={() => setArSettings((s) => ({ ...s, auto_reply_enabled: !s.auto_reply_enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  arSettings.auto_reply_enabled ? "bg-indigo-600" : "bg-gray-700"
                }`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  arSettings.auto_reply_enabled ? "translate-x-6" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* Platforms */}
            <div>
              <p className="text-white font-medium text-sm mb-2">Active Platforms</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "telegram", label: "✈️ Telegram", available: true },
                  { key: "whatsapp", label: "💬 WhatsApp", available: true },
                  { key: "facebook", label: "📘 Facebook", available: false },
                  { key: "instagram", label: "📸 Instagram", available: false },
                ].map((p) => (
                  <button key={p.key}
                    onClick={() => p.available && toggleArPlatform(p.key)}
                    disabled={!p.available}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      !p.available
                        ? "border-gray-700 text-gray-600 cursor-not-allowed"
                        : arSettings.auto_reply_platforms.includes(p.key)
                        ? "border-indigo-500 bg-indigo-900 text-indigo-300"
                        : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}>
                    {p.label}
                    {!p.available && <span className="ml-1 text-xs text-gray-600">Pending Meta</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence threshold */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-medium text-sm">Auto-Send Confidence Threshold</p>
                <span className="text-indigo-400 text-sm font-bold">{Math.round(arSettings.confidence_threshold * 100)}%</span>
              </div>
              <p className="text-gray-500 text-xs mb-2">Replies above this score send automatically. Below it goes to your inbox for approval.</p>
              <input type="range" min={0.5} max={1.0} step={0.05}
                value={arSettings.confidence_threshold}
                onChange={(e) => setArSettings((s) => ({ ...s, confidence_threshold: parseFloat(e.target.value) }))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>50% (more auto-sends)</span>
                <span>100% (always manual)</span>
              </div>
            </div>

            {/* Escalation keywords */}
            <div>
              <p className="text-white font-medium text-sm mb-1">Escalation Keywords</p>
              <p className="text-gray-500 text-xs mb-2">Messages containing these words always go to your inbox — never auto-replied.</p>
              <div className="flex gap-2 mb-2">
                <input value={kwInput} onChange={(e) => setKwInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  placeholder="e.g. refund, cancel, complaint"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                <button onClick={addKeyword}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {arSettings.escalation_keywords.map((kw) => (
                  <span key={kw} className="flex items-center gap-1.5 bg-red-950 text-red-300 border border-red-800 px-3 py-1 rounded-full text-xs font-medium">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="text-red-500 hover:text-red-300">×</button>
                  </span>
                ))}
              </div>
            </div>

            <button onClick={saveAutoReply} disabled={arSaving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
              {arSaving ? "Saving..." : arSaved ? "✓ Saved" : "Save Auto-Reply Settings"}
            </button>
          </div>
        )}
      </div>
      {/* WhatsApp Business */}
      <div className="mt-10">
        <h1 className="text-2xl font-bold mb-2">📱 WhatsApp Business</h1>
        <p className="text-gray-400 text-sm mb-6">
          Connect your WhatsApp Business account to auto-reply to messages and broadcast to leads.
        </p>
        {!canWhatsApp ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
            <p className="text-gray-400 text-sm">🔒 WhatsApp integration is available on Starter plan and above.</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">Enable WhatsApp Auto-Reply</p>
                <p className="text-gray-500 text-xs mt-0.5">AI will reply to incoming WhatsApp messages in your brand voice</p>
              </div>
              <button onClick={() => setWaSettings((s) => ({ ...s, whatsapp_enabled: !s.whatsapp_enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${waSettings.whatsapp_enabled ? "bg-indigo-600" : "bg-gray-700"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${waSettings.whatsapp_enabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone Number ID</label>
              <input value={waSettings.whatsapp_phone_number_id}
                onChange={(e) => setWaSettings((s) => ({ ...s, whatsapp_phone_number_id: e.target.value }))}
                placeholder="e.g. 123456789012345"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Access Token {waTokenHint && <span className="text-gray-600 ml-1">current: ...{waTokenHint}</span>}
              </label>
              <input type="password" value={waSettings.whatsapp_access_token}
                onChange={(e) => setWaSettings((s) => ({ ...s, whatsapp_access_token: e.target.value }))}
                placeholder="Paste new token to update"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Business Account ID</label>
              <input value={waSettings.whatsapp_business_account_id}
                onChange={(e) => setWaSettings((s) => ({ ...s, whatsapp_business_account_id: e.target.value }))}
                placeholder="e.g. 987654321098765"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
            <p className="text-xs text-gray-600">Get these from Meta Business Suite → WhatsApp → API Setup. Webhook URL: <span className="text-indigo-400 break-all">https://marketpiloting-engine-backend.onrender.com/whatsapp/webhook</span></p>
            {waConnected && <p className="text-xs text-green-400">✅ WhatsApp connected</p>}
            {waError && <p className="text-red-400 text-xs">{waError}</p>}
            <button onClick={async () => {
              setWaSaving(true); setWaError("");
              try {
                await api.post("/whatsapp/settings", waSettings);
                setWaSaved(true); setWaConnected(true);
                setTimeout(() => setWaSaved(false), 3000);
              } catch (e: unknown) { setWaError(e instanceof Error ? e.message : "Save failed"); }
              finally { setWaSaving(false); }
            }} disabled={waSaving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
              {waSaving ? "Saving..." : waSaved ? "✓ Saved" : "Save WhatsApp Settings"}
            </button>
          </div>
        )}
      </div>



      {/* ── Content Recycling ── */}
      <div className="mt-10">
        <h1 className="text-2xl font-bold mb-2">🔄 Content Recycling</h1>
        <p className="text-gray-400 text-sm mb-6">
          Automatically re-queue top-performing posts after a set interval. Enable recycling per post from the Scheduler page.
        </p>
        <RecyclingSettings />
      </div>

      {/* ── Danger Zone ── */}}
      <div className="mt-10 mb-10">
        <h2 className="text-xl font-bold text-red-400 mb-2">⚠️ Danger Zone</h2>
        <p className="text-gray-500 text-sm mb-4">
          Deleting your account is permanent after 30 days. All your data, campaigns, content, and posts will be erased.
          You have a 30-day grace period — contact support to recover your account before then.
        </p>

        <div className="bg-gray-900 border border-red-900/50 rounded-xl p-5">
          {deleteStep === 0 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">Delete My Account</p>
                <p className="text-gray-500 text-xs mt-0.5">Permanently removes all your data after 30 days.</p>
              </div>
              <button
                onClick={() => setDeleteStep(1)}
                className="px-4 py-2 bg-red-900/40 hover:bg-red-900/70 border border-red-700/50 text-red-400 text-sm font-medium rounded-lg transition"
              >
                Delete Account
              </button>
            </div>
          )}

          {deleteStep === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-lg">
                <p className="text-red-300 text-sm font-semibold mb-1">Before you continue — understand what happens:</p>
                <ul className="text-red-400/80 text-xs space-y-1 list-disc list-inside">
                  <li>Your account is immediately deactivated and login is blocked</li>
                  <li>All campaigns, content, posts, leads, and analytics are preserved for 30 days</li>
                  <li>After 30 days, everything is permanently and irreversibly deleted</li>
                  <li>Your Paystack subscription will be cancelled immediately</li>
                  <li>Contact support within 30 days to recover your account</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteStep(2)}
                  className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition"
                >
                  I understand, continue
                </button>
                <button
                  onClick={() => setDeleteStep(0)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === 2 && (
            <div className="space-y-4">
              <p className="text-white text-sm font-medium">Step 2 of 3 — Confirm your password</p>
              <input
                type="password"
                placeholder="Enter your current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { if (deletePassword.length >= 6) setDeleteStep(3); else setDeleteError("Enter your password first."); }}
                  className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition"
                >
                  Continue
                </button>
                <button
                  onClick={() => { setDeleteStep(0); setDeletePassword(""); setDeleteError(""); }}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
              {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
            </div>
          )}

          {deleteStep === 3 && (
            <div className="space-y-4">
              <p className="text-white text-sm font-medium">Step 3 of 3 — Final confirmation</p>
              <p className="text-gray-400 text-xs">Type <span className="text-red-400 font-mono font-bold">DELETE MY ACCOUNT</span> to confirm.</p>
              <input
                type="text"
                placeholder="DELETE MY ACCOUNT"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-gray-800 border border-red-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 font-mono"
              />
              {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={deleteLoading || deleteConfirmText !== "DELETE MY ACCOUNT"}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
                >
                  {deleteLoading ? "Deleting..." : "Permanently Delete My Account"}
                </button>
                <button
                  onClick={() => { setDeleteStep(0); setDeletePassword(""); setDeleteConfirmText(""); setDeleteError(""); }}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
