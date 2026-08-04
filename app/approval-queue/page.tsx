"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface PendingPost {
  id: number;
  campaign_id: number;
  platform: string;
  scheduled_time: string;
  text: string;
  image_url: string | null;
  campaign_name: string;
}

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼",
  twitter: "🐦", telegram: "✈️",
};

export default function ApprovalQueuePage() {
  const { client } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<number, string>>({});

  useEffect(() => {
    const plan = client?.plan || "";
    if (!["agency", "admin"].includes(plan)) { router.push("/"); return; }
    api.get<PendingPost[]>("/agency/approval-queue").then((d) => {
      setPosts(d);
      setLoading(false);
    });
  }, [client, router]);

  const approve = async (id: number) => {
    await api.post(`/agency/posts/${id}/approve`, {});
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const reject = async (id: number) => {
    await api.post(`/agency/posts/${id}/reject`, { feedback: feedback[id] || "" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading approval queue…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        <p className="text-gray-400 text-sm mt-1">
          {posts.length} post{posts.length !== 1 ? "s" : ""} pending your approval
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 rounded-2xl">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-400 text-sm">All caught up — no posts pending approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                {p.image_url && (
                  <img src={p.image_url} alt="" className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-lg">{PLATFORM_EMOJI[p.platform] || "📄"}</span>
                    <span className="text-sm font-semibold text-white capitalize">{p.platform}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">{p.campaign_name}</span>
                    <span className="text-xs text-gray-500 ml-auto">{new Date(p.scheduled_time).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">{p.text}</p>
                  <textarea
                    rows={2}
                    placeholder="Optional feedback for rejection…"
                    value={feedback[p.id] || ""}
                    onChange={(e) => setFeedback((f) => ({ ...f, [p.id]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(p.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => reject(p.id)}
                      className="bg-red-900/50 hover:bg-red-900 text-red-400 text-xs font-semibold px-4 py-2 rounded-lg transition"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
