"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PLATFORMS = ["facebook", "instagram", "linkedin", "twitter", "telegram"];

function decode(text: string) {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
const ANGLES = ["product_launch", "tips", "testimonial", "sale", "behind_the_scenes", "news_hijack", "question", "motivation"];

interface ContentItem {
  id: number;
  platform: string;
  angle: string;
  text: string;
  used: boolean;
  created_at: string;
}

export default function ContentPage() {
  const { client } = useAuth();
  const [library, setLibrary] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [platform, setPlatform] = useState("instagram");
  const [angle, setAngle] = useState("tips");
  const [language, setLanguage] = useState("en");

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkPlatforms, setBulkPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [bulkAngles, setBulkAngles] = useState<string[]>(["tips", "product_launch"]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const data = await api.get<ContentItem[]>("/content/?limit=30");
      setLibrary(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLibrary(); }, []);

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      if (bulkMode) {
        await api.post("/content/generate/bulk", {
          platforms: bulkPlatforms,
          angles: bulkAngles,
          language,
        });
      } else {
        await api.post("/content/generate", { platform, angle, language });
      }
      await fetchLibrary();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const deleteContent = async (id: number) => {
    await api.del(`/content/${id}`);
    setLibrary((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleBulkItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const platformEmoji: Record<string, string> = {
    facebook: "📘", instagram: "📸", linkedin: "💼",
    twitter: "🐦", telegram: "✈️", tiktok: "🎵",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI Content Studio</h1>

      {/* Generator */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Generate Posts</h2>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(e) => setBulkMode(e.target.checked)}
              className="accent-indigo-500"
            />
            Bulk mode
          </label>
        </div>

        {!bulkMode ? (
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Angle</label>
              <select
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
              >
                {ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="en">English</option>
                <option value="yo">Yoruba</option>
                <option value="ha">Hausa</option>
                <option value="ig">Igbo</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleBulkItem(bulkPlatforms, p, setBulkPlatforms)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      bulkPlatforms.includes(p)
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {platformEmoji[p]} {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Angles</label>
              <div className="flex flex-wrap gap-2">
                {ANGLES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleBulkItem(bulkAngles, a, setBulkAngles)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      bulkAngles.includes(a)
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Will generate {bulkPlatforms.length * bulkAngles.length} posts (max 12)
            </p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <button
          onClick={generate}
          disabled={generating}
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
        >
          {generating ? "Generating with Brand DNA..." : "✨ Generate"}
        </button>
      </div>

      {/* Library */}
      <h2 className="font-semibold text-white mb-3">Content Library</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : library.length === 0 ? (
        <p className="text-gray-500 text-sm">No content yet. Generate your first post above.</p>
      ) : (
        <div className="grid gap-4">
          {library.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{platformEmoji[item.platform] || "📄"}</span>
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded capitalize">
                    {item.platform}
                  </span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {item.angle}
                  </span>
                  {item.used && (
                    <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded">
                      posted
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteContent(item.id)}
                  className="text-gray-600 hover:text-red-400 text-xs transition"
                >
                  delete
                </button>
              </div>
              <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                {decode(item.text)}
              </p>
              <p className="text-gray-600 text-xs mt-2">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
