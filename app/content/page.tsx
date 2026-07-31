"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const PLATFORM_CONFIG: Record<string, { emoji: string; limit: number }> = {
  facebook:  { emoji: "📘", limit: 500 },
  instagram: { emoji: "📸", limit: 300 },
  linkedin:  { emoji: "💼", limit: 700 },
  twitter:   { emoji: "🐦", limit: 280 },
  telegram:  { emoji: "✈️", limit: 1000 },
  tiktok:    { emoji: "🎵", limit: 300 },
};

const PLAN_PLATFORMS: Record<string, string[]> = {
  solo:    ["facebook", "instagram"],
  starter: ["facebook", "instagram", "telegram"],
  growth:  ["facebook", "instagram", "linkedin", "twitter", "telegram", "tiktok"],
  agency:  ["facebook", "instagram", "linkedin", "twitter", "telegram", "tiktok"],
  admin:   ["facebook", "instagram", "linkedin", "twitter", "telegram", "tiktok"],
};

const PLAN_DAILY_LIMIT: Record<string, number | null> = {
  solo: 5, starter: 15, growth: null, agency: null, admin: null,
};

const ANGLE_SUGGESTIONS = [
  "💰 Earn Money", "🚀 Product Launch", "💡 Tips & Tricks", "⭐ Testimonial",
  "🔥 Flash Sale", "🎬 Behind the Scenes", "📰 News Hijack", "❓ Question",
  "🤝 Community", "🎓 Education", "🎯 Promotion", "💪 Motivation",
];

const LANGUAGES = [
  { value: "en", label: "🇬🇧 English" },
  { value: "fr", label: "🇫🇷 French" },
  { value: "yo", label: "Yoruba" },
  { value: "ha", label: "Hausa" },
  { value: "ig", label: "Igbo" },
];

interface ContentItem {
  id: number;
  platform: string;
  angle: string;
  language: string;
  text: string;
  image_url: string | null;
  used: boolean;
  created_at: string;
}

type PostStatus = "idle" | "posting" | "posted" | "failed";

export default function ContentStudio() {
  const [plan, setPlan] = useState("solo");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");

  const [platform, setPlatform] = useState("facebook");
  const [angle, setAngle] = useState("");
  const [language, setLanguage] = useState("en");
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [newsMode, setNewsMode] = useState(false);

  const [results, setResults] = useState<ContentItem[]>([]);
  const [editText, setEditText] = useState<Record<number, string>>({});
  const [postStatus, setPostStatus] = useState<Record<number, PostStatus>>({});
  const [postError, setPostError] = useState<Record<number, string>>({});
  const [repurposePlatform, setRepurposePlatform] = useState<Record<number, string>>({});
  const [repurposing, setRepurposing] = useState<Record<number, boolean>>({});

  const availablePlatforms = PLAN_PLATFORMS[plan] ?? PLAN_PLATFORMS.solo;
  const dailyLimit = PLAN_DAILY_LIMIT[plan];
  const maxCount = dailyLimit ? Math.min(10, dailyLimit) : 10;
  const charLimit = PLATFORM_CONFIG[platform]?.limit ?? 500;
  const isInactive = subscriptionStatus && !["active", "trial"].includes(subscriptionStatus) && plan !== "admin";

  useEffect(() => {
    const stored = localStorage.getItem("mp_client");
    if (stored) {
      const c = JSON.parse(stored);
      setPlan(c.plan ?? "solo");
      setSubscriptionStatus(c.subscription_status ?? "active");
    }
    // Default platform to first available for this plan
    const platforms = PLAN_PLATFORMS[JSON.parse(localStorage.getItem("mp_client") || "{}").plan ?? "solo"] ?? ["facebook"];
    setPlatform(platforms[0]);
  }, []);

  const getText = (item: ContentItem) =>
    editText[item.id] !== undefined ? editText[item.id] : item.text;

  const generate = async () => {
    if (!newsMode && !angle.trim()) { setGenError("Please enter a topic or angle."); return; }
    setGenerating(true);
    setGenError("");
    setResults([]);
    setPostStatus({});
    setEditText({});
    try {
      if (newsMode) {
        const data = await api.post<ContentItem[]>("/content/generate-from-news", {
          platform, language,
        });
        setResults(data);
      } else {
        const data = await api.post<ContentItem[]>("/content/generate", {
          platform, angle: angle.trim(), language, count,
        });
        setResults(data);
      }
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const repurpose = async (item: ContentItem) => {
    const target = repurposePlatform[item.id];
    if (!target) return;
    setRepurposing((s) => ({ ...s, [item.id]: true }));
    try {
      const newItem = await api.post<ContentItem>(`/content/${item.id}/repurpose?target_platform=${target}`);
      setResults((prev) => [newItem, ...prev]);
    } catch (err: unknown) {
      setPostError((s) => ({ ...s, [item.id]: err instanceof Error ? err.message : "Repurpose failed" }));
    } finally {
      setRepurposing((s) => ({ ...s, [item.id]: false }));
    }
  };

  const postTo = async (item: ContentItem, targetPlatform: string | null) => {
    const key = item.id;
    setPostStatus((s) => ({ ...s, [key]: "posting" }));
    setPostError((s) => ({ ...s, [key]: "" }));
    try {
      const url = targetPlatform
        ? `/content/post-now/${item.id}?platform=${targetPlatform}`
        : `/content/post-now/${item.id}`;
      const res = await api.post<{ results: Record<string, { status: string; error?: string }> }>(url);
      const allFailed = Object.values(res.results).every((r) => r.status === "failed");
      if (allFailed) {
        const firstError = Object.values(res.results)[0]?.error ?? "Post failed";
        setPostStatus((s) => ({ ...s, [key]: "failed" }));
        setPostError((s) => ({ ...s, [key]: firstError }));
      } else {
        setPostStatus((s) => ({ ...s, [key]: "posted" }));
        setResults((prev) => prev.map((r) => r.id === item.id ? { ...r, used: true } : r));
      }
    } catch (err: unknown) {
      setPostStatus((s) => ({ ...s, [key]: "failed" }));
      setPostError((s) => ({ ...s, [key]: err instanceof Error ? err.message : "Post failed" }));
    }
  };

  if (isInactive) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-bold text-white mb-2">Subscription Inactive</h2>
        <p className="text-gray-400 text-sm">Renew your subscription to use Content Studio.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Content Studio</h1>
      <p className="text-gray-400 text-sm mb-6">
        Generate AI posts in your brand voice and publish instantly.
        {dailyLimit && <span className="ml-1 text-indigo-400">{dailyLimit} generations/day on {plan} plan.</span>}
      </p>

      {/* Generator controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 space-y-4">
        {/* Platform */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Platform</label>
          <div className="flex flex-wrap gap-2">
            {availablePlatforms.map((p) => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  platform === p
                    ? "border-indigo-500 bg-indigo-900 text-indigo-300"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}>
                {PLATFORM_CONFIG[p]?.emoji} {p}
              </button>
            ))}
          </div>
        </div>

        {/* Angle — free text + suggestions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Topic / Angle</label>
            <button
              onClick={() => { setNewsMode((v) => !v); setAngle(""); setGenError(""); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                newsMode
                  ? "border-orange-500 bg-orange-900/40 text-orange-400"
                  : "border-gray-700 text-gray-500 hover:border-gray-500"
              }`}
            >
              🔥 {newsMode ? "Trending News ON" : "From Trending News"}
            </button>
          </div>
          {newsMode ? (
            <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg px-4 py-3 text-sm text-orange-300">
              Will fetch your top trending keyword and rewrite it as a brand post with CTA.
            </div>
          ) : (
            <>
              <input
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="e.g. How our product saves time, Black Friday deal, Customer success story..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {ANGLE_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setAngle(s.replace(/^[^\s]+ /, ""))}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-xs rounded-full transition">
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language + Count */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          {!newsMode && (
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Count</label>
              <input type="number" value={count} min={1} max={maxCount}
                onChange={(e) => setCount(Math.min(maxCount, Math.max(1, Number(e.target.value))))}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            </div>
          )}
        </div>

        {genError && <p className="text-red-400 text-sm">{genError}</p>}

        <button onClick={generate} disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition">
          {generating
            ? (newsMode ? "Fetching trends..." : "Generating...")
            : (newsMode ? "🔥 Generate from Trending News" : "✨ Generate Content")}
        </button>
        {results.length > 0 && !generating && (
          <span className="text-xs text-gray-500 ml-3">{results.length} post{results.length > 1 ? "s" : ""} generated</span>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((item) => {
            const text = getText(item);
            const over = text.length > charLimit;
            const status = postStatus[item.id] ?? "idle";
            return (
              <div key={item.id} className={`bg-gray-900 border rounded-xl overflow-hidden transition ${
                status === "posted" ? "border-green-700" : status === "failed" ? "border-red-700" : "border-gray-800"
              }`}>
                <div className="flex gap-4 p-4">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-24 h-24 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={text}
                      onChange={(e) => setEditText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${over ? "text-red-400" : "text-gray-500"}`}>
                        {text.length} / {charLimit} chars{over ? " — over limit" : ""}
                      </span>
                      <span className="text-xs text-gray-600">{item.angle} · {item.language}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
                  <button
                    onClick={() => postTo(item, platform)}
                    disabled={status === "posting" || status === "posted"}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                    {status === "posting" ? "Posting..." : status === "posted" ? "✓ Posted" : `Post to ${PLATFORM_CONFIG[platform]?.emoji} ${platform}`}
                  </button>
                  <button
                    onClick={() => postTo(item, null)}
                    disabled={status === "posting" || status === "posted"}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                    Post to All
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition">
                    Copy
                  </button>
                  {/* Repurpose */}
                  <div className="flex items-center gap-1 ml-auto">
                    <select
                      value={repurposePlatform[item.id] ?? ""}
                      onChange={(e) => setRepurposePlatform((s) => ({ ...s, [item.id]: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none">
                      <option value="">Repurpose for…</option>
                      {availablePlatforms.filter((p) => p !== item.platform).map((p) => (
                        <option key={p} value={p}>{PLATFORM_CONFIG[p]?.emoji} {p}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => repurpose(item)}
                      disabled={!repurposePlatform[item.id] || repurposing[item.id]}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition">
                      {repurposing[item.id] ? "…" : "♻️"}
                    </button>
                  </div>
                  {status === "failed" && (
                    <span className="text-xs text-red-400">{postError[item.id] || "Failed"}</span>
                  )}
                  {status === "posted" && (
                    <span className="text-xs text-green-400">✓ Live</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
