"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  niche: string;
  content: string;
  onInsert: (tag: string) => void;
}

export default function HashtagSuggester({ niche, content, onInsert }: Props) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSeed = async () => {
    try {
      const data = await api.get<{ hashtags: string[] }>(`/hashtags/seed?niche=${encodeURIComponent(niche)}`);
      setTags(data.hashtags);
    } catch { /* silent */ }
  };

  const fetchSuggest = async (text: string) => {
    setLoading(true);
    try {
      const data = await api.get<{ hashtags: string[] }>(
        `/hashtags/suggest?niche=${encodeURIComponent(niche)}&content=${encodeURIComponent(text.slice(0, 200))}`
      );
      setTags(data.hashtags);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  // On mount: load seed instantly
  useEffect(() => { fetchSeed(); }, [niche]);

  // On content change: debounce 800ms then fetch AI suggestions
  useEffect(() => {
    if (!content.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggest(content), 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [content, niche]);

  if (tags.length === 0 && !loading) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-gray-500"># Hashtags</span>
        {loading && <span className="text-xs text-indigo-400 animate-pulse">Generating…</span>}
        <button
          type="button"
          onClick={() => fetchSuggest(content)}
          className="ml-auto text-xs text-gray-600 hover:text-gray-400 transition"
        >
          ↻ Refresh
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onInsert(tag)}
            className="px-2 py-0.5 bg-gray-800 hover:bg-indigo-900 border border-gray-700 hover:border-indigo-600 text-gray-400 hover:text-indigo-300 text-xs rounded-full transition"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
