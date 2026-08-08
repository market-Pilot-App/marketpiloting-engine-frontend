"use client";
import { useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://marketpiloting-engine-backend.onrender.com";

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim() || !text.trim()) { setError("Please fill in your name and review."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`${API_URL}/testimonials/submit/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: name.trim(), raw_text: text.trim(), rating }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Submission failed"); }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <p className="text-6xl mb-4">🙏</p>
          <h1 className="text-2xl font-bold text-white mb-2">Thank you!</h1>
          <p className="text-gray-400">Your review has been submitted. We really appreciate your feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Leave a Review ⭐</h1>
        <p className="text-gray-400 text-sm mb-6">Your feedback means a lot to us. It only takes 30 seconds.</p>

        {/* Star rating */}
        <div className="mb-5">
          <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)}
                className={`text-3xl transition ${s <= rating ? "opacity-100" : "opacity-30"}`}>
                ⭐
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Your Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Your Review</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              rows={4} placeholder="Tell us about your experience..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button onClick={submit} disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
          {submitting ? "Submitting..." : "Submit Review →"}
        </button>
      </div>
    </div>
  );
}
