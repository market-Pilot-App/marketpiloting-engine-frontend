"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useCanAccess } from "@/lib/use-role-guard";

interface BlogSettings {
  blog_platform: string;
  blog_api_url: string;
  blog_api_key_set: boolean;
  shopify_blog_id: string;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image: string | null;
  tags: string[];
  status: string;
  remote_url: string | null;
  created_at: string;
  published_at: string | null;
}

export default function BlogPage() {
  const canAccess = useCanAccess("editor");
  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-white font-semibold">Editor access required</p>
      <p className="text-gray-400 text-sm">Viewers cannot access Blog.</p>
    </div>
  );
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<BlogSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({ blog_platform: "wordpress", blog_api_url: "", blog_api_key: "", shopify_blog_id: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await api.get<BlogPost[]>("/blog/?limit=20");
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    api.get<BlogSettings>("/blog/settings").then((s) => {
      setSettings(s);
      setSettingsForm((f) => ({ ...f, blog_platform: s.blog_platform || "wordpress", blog_api_url: s.blog_api_url || "", shopify_blog_id: s.shopify_blog_id || "" }));
    }).catch(() => {});
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      await api.post("/blog/settings", settingsForm);
      setSettingsMsg("✅ Saved!");
      setSettings((s) => s ? { ...s, blog_platform: settingsForm.blog_platform, blog_api_url: settingsForm.blog_api_url, blog_api_key_set: !!settingsForm.blog_api_key || (s?.blog_api_key_set ?? false), shopify_blog_id: settingsForm.shopify_blog_id } : null);
    } catch { setSettingsMsg("❌ Save failed"); }
    finally { setSavingSettings(false); }
  };

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const post = await api.post<BlogPost>("/blog/generate", { topic: topic || null });
      setPosts((prev) => [post, ...prev]);
      setSelected(post);
      setTopic("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const generateFromNews = async () => {
    setGenerating(true);
    setError("");
    try {
      const post = await api.post<BlogPost>("/blog/generate-from-news");
      setPosts((prev) => [post, ...prev]);
      setSelected(post);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "News generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const publish = async (id: number) => {
    setPublishing(true);
    try {
      const updated = await api.post<BlogPost>(`/blog/${id}/publish`);
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setSelected(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const deletePost = async (id: number) => {
    await api.del(`/blog/${id}`);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left panel — list */}
      <div className="w-72 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Blog</h1>
          <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-gray-400 hover:text-white transition">⚙️ Settings</button>
        </div>

        {/* Blog Settings Panel */}
        {showSettings && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-white mb-3">Blog Publisher Settings</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Platform</label>
                <select value={settingsForm.blog_platform} onChange={(e) => setSettingsForm((f) => ({ ...f, blog_platform: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="wordpress">WordPress</option>
                  <option value="shopify">Shopify</option>
                  <option value="custom">Custom / Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  {settingsForm.blog_platform === "wordpress" ? "WordPress Site URL" : settingsForm.blog_platform === "shopify" ? "Shopify Store URL (e.g. mystore.myshopify.com)" : "API Endpoint URL"}
                </label>
                <input value={settingsForm.blog_api_url} onChange={(e) => setSettingsForm((f) => ({ ...f, blog_api_url: e.target.value }))}
                  placeholder={settingsForm.blog_platform === "wordpress" ? "https://yourblog.com" : settingsForm.blog_platform === "shopify" ? "https://mystore.myshopify.com" : "https://api.yourblog.com/posts"}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  {settingsForm.blog_platform === "wordpress" ? "Application Password (user:password)" : settingsForm.blog_platform === "shopify" ? "Shopify Admin API Access Token" : "API Key / Bearer Token"}
                </label>
                <input type="password" value={settingsForm.blog_api_key} onChange={(e) => setSettingsForm((f) => ({ ...f, blog_api_key: e.target.value }))}
                  placeholder={settings?.blog_api_key_set ? "••••••••  (set — enter new to change)" : "Paste your key here"}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              {settingsForm.blog_platform === "shopify" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Shopify Blog ID (from Admin → Online Store → Blog Posts)</label>
                  <input value={settingsForm.shopify_blog_id} onChange={(e) => setSettingsForm((f) => ({ ...f, shopify_blog_id: e.target.value }))}
                    placeholder="e.g. 241253187" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              {settingsForm.blog_platform === "wordpress" && (
                <p className="text-xs text-gray-500">In WordPress: Users → Your Profile → Application Passwords → Add New. Format: <span className="text-gray-400">username:xxxx xxxx xxxx</span></p>
              )}
              <div className="flex items-center gap-3">
                <button onClick={saveSettings} disabled={savingSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
                {settingsMsg && <span className="text-sm">{settingsMsg}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Generate */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
          <input
            type="text"
            placeholder="Topic (optional)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500 mb-3"
          />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition mb-2"
          >
            {generating ? "Writing with Brand DNA..." : "✨ Generate Article"}
          </button>
          <button
            onClick={generateFromNews}
            disabled={generating}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition"
          >
            {generating ? "Fetching trends..." : "📰 Write from Trending News"}
          </button>
        </div>

        {/* Post list */}
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelected(post)}
                className={`w-full text-left bg-gray-900 border rounded-xl p-3 transition ${
                  selected?.id === post.id
                    ? "border-indigo-500"
                    : "border-gray-800 hover:border-gray-600"
                }`}
              >
                <p className="text-white text-sm font-medium line-clamp-2">{post.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {post.tags?.includes("trending") && (
                    <span className="text-xs bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded-full">🔥 trending</span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    post.status === "published"
                      ? "bg-green-900 text-green-400"
                      : "bg-gray-800 text-gray-400"
                  }`}>
                    {post.status}
                  </span>
                  <span className="text-gray-600 text-xs">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
            {posts.length === 0 && (
              <p className="text-gray-500 text-sm">No articles yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Right panel — article view */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex items-center justify-center h-64 text-gray-600">
            <p>Select an article or generate a new one</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            {selected.cover_image && (
              <img
                src={selected.cover_image}
                alt={selected.title}
                className="w-full h-48 object-cover rounded-lg mb-5"
              />
            )}

            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 mr-4">
                <h2 className="text-xl font-bold text-white mb-1">{selected.title}</h2>
                <p className="text-gray-400 text-sm">{selected.excerpt}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {selected.status === "draft" && (
                  <button
                    onClick={() => publish(selected.id)}
                    disabled={publishing}
                    className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
                  >
                    {publishing ? "Publishing..." : `Publish${settings?.blog_platform && settings.blog_platform !== "custom" ? ` to ${settings.blog_platform.charAt(0).toUpperCase() + settings.blog_platform.slice(1)}` : ""}`}
                  </button>
                )}
                {selected.remote_url && (
                  <a
                    href={selected.remote_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-1.5 rounded-lg transition"
                  >
                    View Live ↗
                  </a>
                )}
                <button
                  onClick={() => deletePost(selected.id)}
                  className="text-gray-600 hover:text-red-400 text-sm transition px-2"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Tags */}
            {selected.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {selected.tags.map((tag) => (
                  <span key={tag} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed font-sans">
                {selected.body}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
