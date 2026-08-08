"use client";
import { useState, useEffect } from "react";
import { api, API_URL } from "@/lib/api";
import HashtagSuggester from "@/components/HashtagSuggester";

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
];

interface ContentItem {
  id: number;
  platform: string;
  angle: string;
  language: string;
  text: string;
  image_url: string | null;
  used: boolean;
  is_story?: boolean;
  created_at: string;
}

interface ContentInsight {
  id: number;
  topic: string;
  frequency: number;
  suggested_angle: string;
  sample_messages: string[];
  content_generated: boolean;
}

type PostStatus = "idle" | "posting" | "posted" | "failed";

export default function ContentStudio() {
  const [plan, setPlan] = useState("solo");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [niche, setNiche] = useState("general");

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
  const [storyPlatform, setStoryPlatform] = useState<"instagram" | "facebook">("instagram");
  const [generatingStory, setGeneratingStory] = useState(false);
  const [insights, setInsights] = useState<ContentInsight[]>([]);
  const [generatingInsight, setGeneratingInsight] = useState<Record<number, boolean>>({});

  const [tab, setTab] = useState<"generate" | "repurpose" | "offer">("generate");
  // Offer Creator state
  const [offerProduct, setOfferProduct] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerCustomer, setOfferCustomer] = useState("");
  const [offerBenefit, setOfferBenefit] = useState("");
  const [offerCurrency, setOfferCurrency] = useState("NGN");
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [offerResult, setOfferResult] = useState<null | {
    headline: string; value_stack: string[]; price_anchor: string;
    guarantee: string; cta: string; social_post: string;
    email_subject: string; email_body: string;
    landing_page_html: string; landing_page_slug: string; social_content_id: number;
  }>(null);
  const [offerTab, setOfferTab] = useState<"landing" | "social" | "email">("landing");
  const [offerCopied, setOfferCopied] = useState("");

  const [repurposeSource, setRepurposeSource] = useState("");
  const [repurposeUrl, setRepurposeUrl] = useState("");
  const [repurposeLang, setRepurposeLang] = useState("en");
  const [repurposeResults, setRepurposeResults] = useState<ContentItem[]>([]);
  const [repurposeLoading, setRepurposeLoading] = useState(false);
  const [repurposeError, setRepurposeError] = useState("");

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
    const platforms = PLAN_PLATFORMS[JSON.parse(localStorage.getItem("mp_client") || "{}").plan ?? "solo"] ?? ["facebook"];
    setPlatform(platforms[0]);
    // Load campaign niche for hashtag suggestions
    api.get<{ niche?: string }>("/campaigns/me").then((d) => { if (d.niche) setNiche(d.niche); }).catch(() => {});
    // Load conversation insights
    api.get<ContentInsight[]>("/insights/").then(setInsights).catch(() => {});
  }, []);

  const getText = (item: ContentItem) =>
    editText[item.id] !== undefined ? editText[item.id] : item.text;

  const createOffer = async () => {
    if (!offerProduct.trim() || !offerPrice || !offerCustomer.trim() || !offerBenefit.trim()) {
      setOfferError("All 4 fields are required."); return;
    }
    setOfferError(""); setOfferLoading(true); setOfferResult(null);
    try {
      const data = await api.post<typeof offerResult>("/content/create-offer", {
        product_name: offerProduct.trim(),
        price: parseFloat(offerPrice),
        target_customer: offerCustomer.trim(),
        main_benefit: offerBenefit.trim(),
        currency: offerCurrency,
      });
      setOfferResult(data);
      setOfferTab("landing");
    } catch (e: unknown) {
      setOfferError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setOfferLoading(false);
    }
  };

  const offerCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setOfferCopied(key);
    setTimeout(() => setOfferCopied(""), 2000);
  };

  const runRepurpose = async () => {
    if (!repurposeSource.trim() && !repurposeUrl.trim()) {
      setRepurposeError("Paste some text or enter a URL."); return;
    }
    setRepurposeLoading(true); setRepurposeError(""); setRepurposeResults([]);
    try {
      const data = await api.post<ContentItem[]>("/content/repurpose", {
        source_text: repurposeSource.trim(),
        source_url: repurposeUrl.trim(),
        language: repurposeLang,
      });
      setRepurposeResults(data);
    } catch (err: unknown) {
      setRepurposeError(err instanceof Error ? err.message : "Repurpose failed");
    } finally {
      setRepurposeLoading(false);
    }
  };

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

  const generateFromInsight = async (insight: ContentInsight) => {
    setGeneratingInsight((s) => ({ ...s, [insight.id]: true }));
    try {
      const item = await api.post<ContentItem>(`/insights/generate-content/${insight.id}`);
      setResults((prev) => [item, ...prev]);
      setInsights((prev) => prev.map((i) => i.id === insight.id ? { ...i, content_generated: true } : i));
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Failed");
    } finally {
      setGeneratingInsight((s) => ({ ...s, [insight.id]: false }));
    }
  };

  const generateStory = async () => {
    setGeneratingStory(true);
    setGenError("");
    try {
      const item = await api.post<ContentItem>("/content/generate-story", { platform: storyPlatform });
      setResults((prev) => [item, ...prev]);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Story generation failed");
    } finally {
      setGeneratingStory(false);
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

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {(["generate", "repurpose", "offer"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}>
            {t === "generate" ? "✨ Generate" : t === "repurpose" ? "♻️ Repurpose" : "🎯 Offer Creator"}
          </button>
        ))}
      </div>

      {/* Repurpose tab */}
      {tab === "repurpose" && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-sm text-gray-400">Paste any text or URL — AI rewrites it for all your platforms simultaneously.</p>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Paste Text</label>
              <textarea value={repurposeSource} onChange={(e) => setRepurposeSource(e.target.value)}
                rows={5} placeholder="Paste a blog post, article, product description, idea..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Or URL</label>
                <input value={repurposeUrl} onChange={(e) => setRepurposeUrl(e.target.value)}
                  placeholder="https://yourblog.com/article"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Language</label>
                <select value={repurposeLang} onChange={(e) => setRepurposeLang(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            {repurposeError && <p className="text-red-400 text-sm">{repurposeError}</p>}
            <button onClick={runRepurpose} disabled={repurposeLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
              {repurposeLoading ? "Repurposing for all platforms..." : "♻️ Repurpose for All Platforms →"}
            </button>
          </div>

          {repurposeResults.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">{repurposeResults.length} platform versions generated — add to queue or post now.</p>
              {repurposeResults.map((item) => (
                <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex gap-4 p-4">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-indigo-400 font-semibold mb-1">
                        {PLATFORM_CONFIG[item.platform]?.emoji} {item.platform}
                      </p>
                      <textarea
                        defaultValue={item.text} rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div className="flex gap-2 px-4 pb-4">
                    <button onClick={() => postTo(item, item.platform)}
                      disabled={postStatus[item.id] === "posting" || postStatus[item.id] === "posted"}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition">
                      {postStatus[item.id] === "posted" ? "✓ Posted" : postStatus[item.id] === "posting" ? "Posting..." : `Post to ${item.platform}`}
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(item.text)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition">Copy</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "generate" && (<>
        {(plan === "growth" || plan === "agency" || plan === "admin") && (
          <div className="bg-gray-900 border border-purple-900/50 rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-purple-300">📱 Story Generator</span>
            <select
              value={storyPlatform}
              onChange={(e) => setStoryPlatform(e.target.value as "instagram" | "facebook")}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="instagram">📸 Instagram Story</option>
              <option value="facebook">📘 Facebook Story</option>
            </select>
            <button
              onClick={generateStory}
              disabled={generatingStory}
              className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
            >
              {generatingStory ? "Generating..." : "✨ Generate Story"}
            </button>
            <span className="text-xs text-gray-500">Vertical format · max 8 words · auto-scheduled at 7 AM</span>
          </div>
        )}

        {/* From Conversations */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-300">💬 From Conversations <span className="text-xs text-gray-500 ml-1">Top topics customers asked this week</span></p>
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem("mp_token");
                  await window.fetch(`${API_URL}/cron/analyze-conversations`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}`, "x-cron-secret": "cron-secret-change-me" },
                  });
                  const data = await api.get<ContentInsight[]>("/insights/");
                  setInsights(data);
                } catch { setGenError("Analysis failed — check if you have conversation messages."); }
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              ↻ Run Analysis
            </button>
          </div>
          {insights.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">No insights yet. Click ↻ Run Analysis to scan this week's incoming messages.</p>
          ) : (
            <div className="space-y-2">
              {insights.map((insight) => (
                <div key={insight.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{insight.topic}</p>
                    <p className="text-xs text-gray-500">{insight.frequency}x this week · {insight.suggested_angle}</p>
                  </div>
                  <button
                    onClick={() => generateFromInsight(insight)}
                    disabled={generatingInsight[insight.id] || insight.content_generated}
                    className="shrink-0 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                  >
                    {insight.content_generated ? "✓ Done" : generatingInsight[insight.id] ? "..." : "Generate Post"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
                status === "posted" ? "border-green-700" : status === "failed" ? "border-red-700" : item.is_story ? "border-purple-800" : "border-gray-800"
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
                    <HashtagSuggester
                      niche={niche}
                      content={text}
                      onInsert={(tag) => setEditText((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? item.text) + " " + tag }))}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${over ? "text-red-400" : "text-gray-500"}`}>
                        {text.length} / {charLimit} chars{over ? " — over limit" : ""}
                      </span>
                      <span className="text-xs text-gray-600">
                        {item.is_story && <span className="text-purple-400 mr-2">📱 Story</span>}
                        {item.angle} · {item.language}
                      </span>
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
      </>
      )}
      {tab === "offer" && (
        <div className="space-y-6">
          {/* Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <p className="text-sm text-gray-400">Answer 4 questions — AI writes your complete offer: landing page, social post, and email.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Product / Service Name</label>
                <input value={offerProduct} onChange={(e) => setOfferProduct(e.target.value)}
                  placeholder="e.g. 6-Week Business Bootcamp"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex gap-2">
                <div className="w-24">
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Currency</label>
                  <select value={offerCurrency} onChange={(e) => setOfferCurrency(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    {["NGN","USD","GHS","KES","ZAR"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Price</label>
                  <input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="45000"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Target Customer</label>
                <input value={offerCustomer} onChange={(e) => setOfferCustomer(e.target.value)}
                  placeholder="e.g. Small business owners in Lagos"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Main Benefit</label>
                <input value={offerBenefit} onChange={(e) => setOfferBenefit(e.target.value)}
                  placeholder="e.g. Double their revenue in 6 weeks"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            {offerError && <p className="text-red-400 text-sm">{offerError}</p>}
            <button onClick={createOffer} disabled={offerLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
              {offerLoading ? "Building your offer..." : "🎯 Create Irresistible Offer →"}
            </button>
          </div>

          {/* Results */}
          {offerResult && (
            <div className="space-y-4">
              {/* Headline + value stack summary */}
              <div className="bg-gray-900 border border-indigo-800 rounded-xl p-5">
                <p className="text-xs text-indigo-400 uppercase tracking-wide mb-2">Your Offer</p>
                <h2 className="text-xl font-bold text-white mb-3">{offerResult.headline}</h2>
                <ul className="space-y-1 mb-3">
                  {offerResult.value_stack.map((b, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>{b}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-gray-400">💰 {offerResult.price_anchor}</span>
                  <span className="text-green-400">🛡️ {offerResult.guarantee}</span>
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-semibold text-xs">{offerResult.cta}</span>
                </div>
              </div>

              {/* Output tabs */}
              <div className="flex gap-2">
                {(["landing", "social", "email"] as const).map((t) => (
                  <button key={t} onClick={() => setOfferTab(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      offerTab === t ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}>
                    {t === "landing" ? "🌐 Landing Page" : t === "social" ? "📱 Social Post" : "📧 Email"}
                  </button>
                ))}
              </div>

              {offerTab === "landing" && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <span className="text-xs text-gray-400">Landing page saved · slug: <code className="text-indigo-400">{offerResult.landing_page_slug}</code></span>
                    <a href={`/offer/${offerResult.landing_page_slug}`} target="_blank"
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition font-medium">Open Page ↗</a>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-sm text-gray-300"><span className="text-gray-500">Headline:</span> {offerResult.headline}</p>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Value Stack</p>
                      <ul className="space-y-1">
                        {offerResult.value_stack.map((b, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-green-400">✓</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm text-gray-300"><span className="text-gray-500">Price anchor:</span> {offerResult.price_anchor}</p>
                    <p className="text-sm text-gray-300"><span className="text-gray-500">Guarantee:</span> {offerResult.guarantee}</p>
                  </div>
                </div>
              )}

              {offerTab === "social" && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Social Post · saved to Content Studio</p>
                    <button onClick={() => offerCopy(offerResult.social_post, "social")}
                      className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
                      {offerCopied === "social" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-gray-200 text-sm whitespace-pre-wrap">{offerResult.social_post}</p>
                </div>
              )}

              {offerTab === "email" && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
                    <button onClick={() => offerCopy(`Subject: ${offerResult.email_subject}\n\n${offerResult.email_body}`, "email")}
                      className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
                      {offerCopied === "email" ? "✓ Copied" : "Copy All"}
                    </button>
                  </div>
                  <div className="bg-gray-800 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">Subject</p>
                    <p className="text-white font-semibold text-sm">{offerResult.email_subject}</p>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{offerResult.email_body}</p>
                  <button
                    onClick={async () => {
                      try {
                        await api.post("/leads/broadcast/send", {
                          subject: offerResult.email_subject,
                          body: offerResult.email_body,
                        });
                        alert("✓ Sent to all leads");
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : "Send failed");
                      }
                    }}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition">
                    📨 Send to All Leads
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
