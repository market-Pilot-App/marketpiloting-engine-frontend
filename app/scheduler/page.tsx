"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface QueuedPost {
  id: number;
  platform: string;
  scheduled_time: string;
  status: string;
  post_url: string | null;
  error_message: string | null;
  likes: number;
  reach: number;
  posted_at: string | null;
  is_story?: boolean;
  is_recyclable?: boolean;
  recycle_interval_days?: number;
  engagement_score?: number;
}

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-yellow-900 text-yellow-300",
  posted: "bg-green-900 text-green-400",
  failed: "bg-red-900 text-red-400",
};

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼",
  twitter: "🐦", telegram: "✈️", youtube: "▶️", website: "🌐",
};

const PLAN_LIMITS: Record<string, number> = {
  solo: 3, starter: 5, growth: 8, agency: 12, admin: 12,
};

export default function SchedulerPage() {
  const { client } = useAuth();
  const dailyLimit = PLAN_LIMITS[client?.plan || "starter"] ?? 5;
  const [posts, setPosts] = useState<QueuedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filling, setFilling] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [fillResult, setFillResult] = useState<string>("");
  const [recycleModal, setRecycleModal] = useState<{ postId: number; enabled: boolean; interval: number } | null>(null);
  const [recycleSaving, setRecycleSaving] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [approvalSaving, setApprovalSaving] = useState(false);

  useEffect(() => {
    api.get<{ require_post_approval: boolean }>("/campaigns/me/approval")
      .then((d) => setApprovalRequired(d.require_post_approval))
      .catch(() => {});
  }, []);

  const toggleApproval = async () => {
    setApprovalSaving(true);
    try {
      const next = !approvalRequired;
      await api.patch("/campaigns/me/approval", { require_post_approval: next });
      setApprovalRequired(next);
    } catch {}
    finally { setApprovalSaving(false); }
  };

  const fetchQueue = async (status?: string) => {
    setLoading(true);
    try {
      const url = status && status !== "all"
        ? `/scheduler/queue?status=${status}&limit=50`
        : "/scheduler/queue?limit=50";
      const data = await api.get<QueuedPost[]>(url);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleFilter = (f: string) => {
    setFilter(f);
    fetchQueue(f === "all" ? undefined : f);
  };

  const fillNow = async () => {
    setFilling(true);
    setFillResult("");
    try {
      const result = await api.post<{ scheduled: number; for_date: string }>("/scheduler/fill-now");
      setFillResult(`✅ Scheduled ${result.scheduled} posts for ${result.for_date}`);
      await fetchQueue();
    } catch (err: unknown) {
      setFillResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setFilling(false);
    }
  };

  const deletePost = async (id: number) => {
    await api.del(`/scheduler/${id}`);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const saveRecycle = async () => {
    if (!recycleModal) return;
    setRecycleSaving(true);
    try {
      await api.patch(`/scheduler/${recycleModal.postId}/recycle-settings`, {
        is_recyclable: recycleModal.enabled,
        recycle_interval_days: recycleModal.interval,
      });
      setPosts((prev) => prev.map((p) =>
        p.id === recycleModal.postId
          ? { ...p, is_recyclable: recycleModal.enabled, recycle_interval_days: recycleModal.interval }
          : p
      ));
      setRecycleModal(null);
    } catch {}
    finally { setRecycleSaving(false); }
  };

  return (
    <div>
      {/* Recycle settings modal */}
      {recycleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 space-y-4">
            <h3 className="text-white font-semibold">🔄 Content Recycling</h3>
            <p className="text-gray-400 text-xs">When enabled, this post will be automatically re-queued after the interval if it performed well.</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Enable recycling</span>
              <button
                onClick={() => setRecycleModal((m) => m ? { ...m, enabled: !m.enabled } : m)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  recycleModal.enabled ? "bg-indigo-600" : "bg-gray-700"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  recycleModal.enabled ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </div>
            {recycleModal.enabled && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Recycle interval</p>
                <div className="flex gap-2">
                  {[14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setRecycleModal((m) => m ? { ...m, interval: d } : m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                        recycleModal.interval === d
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveRecycle}
                disabled={recycleSaving}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
              >
                {recycleSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setRecycleModal(null)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Scheduler</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Post queue and history · <span className="text-indigo-400 font-medium">{dailyLimit} posts/day</span> on your plan
          </p>
        </div>
        <button
          onClick={fillNow}
          disabled={filling}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          {filling ? "Filling..." : "Fill Tomorrow's Queue"}
        </button>
      </div>

      {fillResult && (
        <p className="text-sm text-green-400 mb-4">{fillResult}</p>
      )}

      {/* Approval toggle */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Require Post Approval</p>
          <p className="text-xs text-gray-400 mt-0.5">When on, new scheduled posts wait for your approval before going live</p>
        </div>
        <button
          onClick={toggleApproval}
          disabled={approvalSaving}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
            approvalRequired ? "bg-indigo-600" : "bg-gray-700"
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            approvalRequired ? "translate-x-5" : "translate-x-0.5"
          }`} />
        </button>
      </div>
      <div className="flex gap-2 mb-5">
        {["all", "queued", "posted", "failed"].map((f) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading queue...</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📅</p>
          <p>No posts in queue. Click &quot;Fill Tomorrow&apos;s Queue&quot; to schedule posts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-xl">{PLATFORM_EMOJI[post.platform] || "📄"}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium capitalize">{post.platform}</span>
                    {post.is_story && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-300">📱 Story</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[post.status] || "bg-gray-800 text-gray-400"}`}>
                      {post.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {new Date(post.scheduled_time).toLocaleString()}
                  </p>
                  {post.error_message && (
                    <p className="text-red-400 text-xs mt-1">{post.error_message}</p>
                  )}
                  {post.status === "posted" && (
                    <p className="text-gray-500 text-xs mt-1">
                      👍 {post.likes} likes · 👁 {post.reach} reach
                      {post.post_url && (
                        <> · <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">View post ↗</a></>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {post.status === "queued" && (
                <button
                  onClick={() => deletePost(post.id)}
                  className="text-gray-600 hover:text-red-400 text-xs transition"
                >
                  Remove
                </button>
              )}
              {post.status === "posted" && (
                <button
                  onClick={() => setRecycleModal({
                    postId: post.id,
                    enabled: post.is_recyclable ?? false,
                    interval: post.recycle_interval_days ?? 30,
                  })}
                  className={`text-xs transition ${
                    post.is_recyclable ? "text-indigo-400 hover:text-indigo-300" : "text-gray-600 hover:text-gray-400"
                  }`}
                  title="Content recycling"
                >
                  {post.is_recyclable ? "🔄 Recycling on" : "🔄"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
