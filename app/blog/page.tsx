"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

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
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [publishing, setPublishing] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await api.get<BlogPost[]>("/blog/?limit=20");
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

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
        <h1 className="text-2xl font-bold mb-4">Blog</h1>

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
                    {publishing ? "Publishing..." : "Publish"}
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
