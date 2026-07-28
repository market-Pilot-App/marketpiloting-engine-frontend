"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api";

const PLATFORMS = ["facebook", "instagram", "linkedin", "twitter", "telegram", "youtube", "website"];

type PostResult = {
  platform: string;
  status: "posted" | "failed";
  post_url?: string;
  error?: string;
};

type VideoResult = {
  video_url: string;
  transcript_preview: string;
  results: PostResult[];
};

export default function VideoPage() {
  const { client } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("mp_token") : "";
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(["facebook"]);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "transcribing" | "posting" | "done" | "error">("idle");
  const [result, setResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState("");

  const isPlanAllowed = client?.plan === "growth" || client?.plan === "agency" || client?.plan === "admin";

  if (!isPlanAllowed) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold text-white mb-2">Video Posting</h2>
        <p className="text-gray-400 mb-6">
          Video posting is available on{" "}
          <span className="text-indigo-400 font-semibold">Growth</span> and{" "}
          <span className="text-indigo-400 font-semibold">Agency</span> plans.
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-300 text-sm">
            Your current plan:{" "}
            <span className="capitalize font-semibold text-white">{client?.plan}</span>
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Upgrade to unlock video upload, AI transcription, and multi-platform video posting.
          </p>
        </div>
      </div>
    );
  }

  const togglePlatform = (p: string) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file || platforms.length === 0) return;
    setError("");
    setResult(null);
    try {
      setStage("uploading");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platforms", platforms.join(","));

      setStage("transcribing");
      const res = await fetch(`${API_URL}/video/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setStage("posting");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data: VideoResult = await res.json();
      setResult(data);
      setStage("done");
    } catch (e: any) {
      setError(e.message);
      setStage("error");
    }
  };

  const stageLabel: Record<string, string> = {
    uploading: "Uploading to Cloudinary...",
    transcribing: "Transcribing audio with Groq Whisper...",
    posting: "Generating captions & posting to platforms...",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🎬 Video Studio</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload a video → AI transcribes it → generates brand captions → posts to your platforms
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          dragging ? "border-indigo-500 bg-indigo-950" : "border-gray-700 hover:border-gray-500"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div>
            <p className="text-white font-semibold">{file.name}</p>
            <p className="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-4xl mb-2">📹</p>
            <p className="text-gray-300">Drag & drop your video here or click to browse</p>
            <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI, MKV, WebM — max 100MB</p>
          </div>
        )}
      </div>

      {/* Platform selection */}
      <div>
        <p className="text-sm text-gray-400 mb-2">Post to platforms:</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize ${
                platforms.includes(p)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Submit / Progress */}
      {stage === "idle" || stage === "error" ? (
        <button
          onClick={handleSubmit}
          disabled={!file || platforms.length === 0}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
        >
          Upload & Post Video
        </button>
      ) : stage !== "done" ? (
        <div className="w-full py-3 bg-gray-800 text-indigo-400 font-semibold rounded-xl text-center animate-pulse">
          {stageLabel[stage] || "Processing..."}
        </div>
      ) : null}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Transcript preview</p>
            <p className="text-gray-300 text-sm">{result.transcript_preview}...</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400">Platform</th>
                  <th className="text-left px-4 py-2 text-gray-400">Status</th>
                  <th className="text-left px-4 py-2 text-gray-400">Link</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.platform} className="border-t border-gray-800">
                    <td className="px-4 py-3 text-white capitalize">{r.platform}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "posted"
                          ? "bg-green-900 text-green-400"
                          : "bg-red-900 text-red-400"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.post_url ? (
                        <a href={r.post_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs">
                          View post →
                        </a>
                      ) : r.error ? (
                        <span className="text-red-400 text-xs">{r.error}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => { setFile(null); setResult(null); setStage("idle"); }}
            className="text-sm text-gray-500 hover:text-white transition"
          >
            ← Upload another video
          </button>
        </div>
      )}
    </div>
  );
}
