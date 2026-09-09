"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Tab = "overview" | "reviews" | "settings";

interface GBPStatus {
  connected: boolean;
  location_name?: string;
  location_title?: string;
  account_name?: string;
}

interface Review {
  review_id: string;
  reviewer: string;
  rating: string;
  comment: string;
  create_time: string;
  reply?: string;
}

const STAR_MAP: Record<string, string> = {
  FIVE: "⭐⭐⭐⭐⭐",
  FOUR: "⭐⭐⭐⭐",
  THREE: "⭐⭐⭐",
  TWO: "⭐⭐",
  ONE: "⭐",
};

export default function GoogleBusinessPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<GBPStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [replySaving, setReplySaving] = useState<Record<string, boolean>>({});
  const [replyMsg, setReplyMsg] = useState<Record<string, string>>({});
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<GBPStatus>("/google-business/status");
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (tab === "reviews" && status?.connected) loadReviews();
  }, [tab, status]);

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const data = await api.get<{ reviews: Review[] }>("/google-business/reviews");
      setReviews(data.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const data = await api.get<{ auth_url: string }>("/google-business/connect");
      const popup = window.open(data.auth_url, "gbp_oauth", "width=600,height=700");
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "gbp_connected") {
          window.removeEventListener("message", handler);
          popup?.close();
          fetchStatus();
        } else if (e.data?.type === "gbp_error") {
          window.removeEventListener("message", handler);
          alert(`Connection failed: ${e.data.error}`);
        }
      };
      window.addEventListener("message", handler);
    } catch (err: any) {
      alert(err?.message || "Failed to start connection");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Google Business Profile?")) return;
    await api.del("/google-business/disconnect");
    setStatus({ connected: false });
  };

  const generateAiReply = async (review: Review) => {
    setAiLoading((p) => ({ ...p, [review.review_id]: true }));
    try {
      const data = await api.post<{ reply: string }>(`/google-business/reviews/${review.review_id}/ai-reply`, {
        review_text: review.comment,
        rating: review.rating,
        reviewer: review.reviewer,
      });
      setReplyDrafts((p) => ({ ...p, [review.review_id]: data.reply }));
    } catch {
      alert("AI reply generation failed");
    } finally {
      setAiLoading((p) => ({ ...p, [review.review_id]: false }));
    }
  };

  const sendReply = async (review_id: string) => {
    const reply = replyDrafts[review_id]?.trim();
    if (!reply) return;
    setReplySaving((p) => ({ ...p, [review_id]: true }));
    try {
      await api.post(`/google-business/reviews/${review_id}/reply`, { reply });
      setReplyMsg((p) => ({ ...p, [review_id]: "Reply sent ✓" }));
      setReviews((prev) => prev.map((r) => r.review_id === review_id ? { ...r, reply } : r));
    } catch {
      setReplyMsg((p) => ({ ...p, [review_id]: "Failed to send reply" }));
    } finally {
      setReplySaving((p) => ({ ...p, [review_id]: false }));
    }
  };

  const postUpdate = async () => {
    if (!postText.trim()) return;
    setPosting(true);
    setPostMsg("");
    try {
      await api.post("/google-business/post", { text: postText });
      setPostMsg("✓ Posted to Google Business Profile");
      setPostText("");
    } catch (err: any) {
      setPostMsg(err?.message || "Post failed");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-gray-400">Loading…</div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Google Business Profile</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your Google listing, reviews, and local posts</p>
        </div>
        {status?.connected ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              Connected
            </span>
            <button onClick={disconnect} className="text-xs text-gray-500 hover:text-red-400 transition">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "🔗 Connect Google Business"}
          </button>
        )}
      </div>

      {!status?.connected && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📍</div>
          <h2 className="text-white font-semibold text-lg mb-2">Connect your Google Business Profile</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
            Once connected, MarketPilot will automatically mirror your social posts to your Google listing and let you manage reviews with AI-generated replies.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "Connect Now"}
          </button>
        </div>
      )}

      {status?.connected && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit">
            {(["overview", "reviews", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  tab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {t === "overview" ? "📊 Overview" : t === "reviews" ? "⭐ Reviews" : "⚙️ Settings"}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-1">Connected Location</h3>
                <p className="text-indigo-300 font-medium">{status.location_title || "—"}</p>
                <p className="text-gray-500 text-xs mt-1">{status.location_name}</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                <h3 className="text-white font-semibold">Post an Update</h3>
                <p className="text-gray-400 text-sm">Manually post an update to your Google Business listing.</p>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={4}
                  placeholder="Write your Google Business update…"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={postUpdate}
                    disabled={posting || !postText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {posting ? "Posting…" : "Post to Google Business"}
                  </button>
                  {postMsg && <span className="text-sm text-green-400">{postMsg}</span>}
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2">Auto-Posting</h3>
                <p className="text-gray-400 text-sm">
                  Every post published by the scheduler is automatically mirrored to your Google Business Profile listing. No extra setup needed.
                </p>
                <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Active — posts mirror automatically
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {tab === "reviews" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Customer Reviews</h3>
                <button onClick={loadReviews} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                  ↻ Refresh
                </button>
              </div>

              {reviewsLoading && <p className="text-gray-400 text-sm">Loading reviews…</p>}

              {!reviewsLoading && reviews.length === 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">
                  No reviews found yet.
                </div>
              )}

              {reviews.map((review) => (
                <div key={review.review_id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">{review.reviewer}</p>
                      <p className="text-yellow-400 text-sm">{STAR_MAP[review.rating] || review.rating}</p>
                    </div>
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {review.create_time ? new Date(review.create_time).toLocaleDateString() : ""}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-gray-300 text-sm">{review.comment}</p>
                  )}

                  {review.reply && (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Your reply:</p>
                      <p className="text-gray-300 text-sm">{review.reply}</p>
                    </div>
                  )}

                  {!review.reply && (
                    <div className="space-y-2">
                      <textarea
                        value={replyDrafts[review.review_id] || ""}
                        onChange={(e) => setReplyDrafts((p) => ({ ...p, [review.review_id]: e.target.value }))}
                        rows={3}
                        placeholder="Write a reply…"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => generateAiReply(review)}
                          disabled={aiLoading[review.review_id]}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                        >
                          {aiLoading[review.review_id] ? "Generating…" : "✨ AI Reply"}
                        </button>
                        <button
                          onClick={() => sendReply(review.review_id)}
                          disabled={replySaving[review.review_id] || !replyDrafts[review.review_id]?.trim()}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                        >
                          {replySaving[review.review_id] ? "Sending…" : "Send Reply"}
                        </button>
                        {replyMsg[review.review_id] && (
                          <span className="text-xs text-green-400">{replyMsg[review.review_id]}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Settings Tab */}
          {tab === "settings" && (
            <div className="space-y-4">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                <h3 className="text-white font-semibold">Connection Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Location</span>
                    <span className="text-white">{status.location_title || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account</span>
                    <span className="text-gray-300 text-xs truncate max-w-xs">{status.account_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Auto-post mirroring</span>
                    <span className="text-green-400">Enabled</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 border border-red-900/40 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2">Disconnect</h3>
                <p className="text-gray-400 text-sm mb-3">
                  Removes the Google Business connection. Posts will no longer mirror to your listing.
                </p>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-700/40 text-red-300 rounded-lg text-sm font-medium transition"
                >
                  Disconnect Google Business
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
