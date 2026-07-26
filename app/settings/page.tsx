"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Connections {
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
  twitter: boolean;
  telegram: boolean;
  blog: boolean;
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
  blog_api_url?: string;
  blog_api_key?: string;
}

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
    key: "blog",
    label: "Blog / Website",
    icon: "📝",
    hint: "Connect your WordPress or custom blog API to auto-publish blog posts.",
    fields: [
      { name: "blog_api_url", label: "Blog API URL", placeholder: "https://yourblog.com/wp-json/wp/v2" },
      { name: "blog_api_key", label: "API Key / App Password", placeholder: "xxxx xxxx xxxx...", secret: true },
    ],
  },
];

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [forms, setForms] = useState<Record<string, PlatformForm>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<Connections>("/campaigns/me/connections").then(setConnections);
  }, []);

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
          return (
            <div key={p.key} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-800 transition"
                onClick={() => setShow((s) => ({ ...s, [p.key]: !s[p.key] }))}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <span className="font-medium text-white">{p.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {connected ? (
                    <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">✅ Connected</span>
                  ) : (
                    <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">⚠️ Not connected</span>
                  )}
                  <span className="text-gray-500 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expandable form */}
              {isOpen && (
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
    </div>
  );
}
