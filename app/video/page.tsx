"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api";

const PLATFORMS = ["facebook", "instagram", "linkedin", "telegram", "youtube"];
const CAPTION_ONLY_PLATFORMS = ["twitter", "tiktok"];

type PostResult = { platform: string; status: string; post_url?: string; error?: string };
type VideoResult = { video_url: string; transcript_preview: string; results: PostResult[] };

type JobResult = { platform: string; status: string; post_url?: string; error?: string };
type VideoJob = {
  id: number;
  platforms: string[];
  youtube_title: string | null;
  status: "queued" | "processing" | "posted" | "partial_failure" | "failed";
  scheduled_time: string;
  created_at: string;
  processed_at: string | null;
  results: JobResult[] | null;
  error_message: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  queued:          "bg-blue-900 text-blue-300",
  processing:      "bg-yellow-900 text-yellow-300 animate-pulse",
  posted:          "bg-green-900 text-green-400",
  partial_failure: "bg-orange-900 text-orange-300",
  failed:          "bg-red-900 text-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  queued:          "Queued",
  processing:      "Processing...",
  posted:          "Posted",
  partial_failure: "Partial Failure",
  failed:          "Failed",
};

export default function VideoPage() {
  const { client } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("mp_token") : "";
  const [tab, setTab] = useState<"now" | "schedule">("now");

  const isPlanAllowed = ["solo", "starter", "growth", "pro", "agency", "admin"].includes(client?.plan ?? "");
  const isScheduleAllowed = ["growth", "pro", "agency", "admin"].includes(client?.plan ?? "");

  if (!isPlanAllowed) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold text-white mb-2">Video</h2>
        <p className="text-gray-400 mb-6">
          Video posting is available on{" "}
          <span className="text-indigo-400 font-semibold">Solo</span>,{" "}
          <span className="text-indigo-400 font-semibold">Starter</span>,{" "}
          <span className="text-indigo-400 font-semibold">Growth</span>,{" "}
          <span className="text-indigo-400 font-semibold">Pro</span> and{" "}
          <span className="text-indigo-400 font-semibold">Agency</span> plans.
        </p>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <p className="text-gray-300 text-sm">
            Current plan: <span className="capitalize font-semibold text-white">{client?.plan}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🎬 Video</h1>
        <p className="text-gray-400 text-sm mt-1">
          Post immediately or schedule for later — AI transcribes and generates captions automatically
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("now")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
            tab === "now" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          ⚡ Post Now
        </button>
        <button
          onClick={() => setTab("schedule")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
            tab === "schedule" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          📅 Schedule
        </button>
      </div>

      {tab === "now" ? (
        <PostNowTab token={token} />
      ) : isScheduleAllowed ? (
        <ScheduleTab token={token} />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-white font-semibold mb-2">Video Scheduling requires Growth plan or above</p>
          <p className="text-gray-400 text-sm">
            Current plan: <span className="capitalize font-semibold text-white">{client?.plan}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Post Now Tab ──────────────────────────────────────────────────────────────

function PostNowTab({ token }: { token: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(["facebook"]);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "transcribing" | "posting" | "done" | "error">("idle");
  const [result, setResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState("");

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

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
      setResult(await res.json());
      setStage("done");
    } catch (e: any) {
      setError(e.message);
      setStage("error");
    }
  };

  const stageLabel: Record<string, string> = {
    uploading:   "Uploading to Cloudinary...",
    transcribing: "Transcribing audio with Groq Whisper...",
    posting:     "Generating captions & posting to platforms...",
  };

  return (
    <div className="space-y-5">
      <p className="text-gray-400 text-sm">Upload a video → AI transcribes → generates brand captions → posts immediately</p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          dragging ? "border-indigo-500 bg-indigo-950" : "border-gray-700 hover:border-gray-500"
        }`}
      >
        <input ref={fileRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {file ? (
          <div>
            <p className="text-white font-semibold">{file.name}</p>
            <p className="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-4xl mb-2">📹</p>
            <p className="text-gray-300">Drag & drop your video here or click to browse</p>
            <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI, MKV, WebM — max 50MB</p>
          </div>
        )}
      </div>

      {/* Platforms */}
      <div>
        <p className="text-sm text-gray-400 mb-2">Post to platforms:</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button key={p} onClick={() => togglePlatform(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize ${
                platforms.includes(p) ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}>{p}</button>
          ))}
          {CAPTION_ONLY_PLATFORMS.map((p) => (
            <div key={p} className="relative group">
              <button disabled className="px-4 py-1.5 rounded-full text-sm font-medium capitalize bg-gray-800/50 text-gray-600 cursor-not-allowed">{p}</button>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                Caption generated for manual posting
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1">*X/Twitter & TikTok: caption generated for manual posting only</p>
      </div>

      {stage === "idle" || stage === "error" ? (
        <button onClick={handleSubmit} disabled={!file || platforms.length === 0}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition">
          Upload & Post Video
        </button>
      ) : stage !== "done" ? (
        <div className="w-full py-3 bg-gray-800 text-indigo-400 font-semibold rounded-xl text-center animate-pulse">
          {stageLabel[stage] || "Processing..."}
        </div>
      ) : null}

      {error && <p className="text-red-400 text-sm">{error}</p>}

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
                        r.status === "posted" ? "bg-green-900 text-green-400"
                        : r.status === "caption_saved" ? "bg-yellow-900 text-yellow-400"
                        : "bg-red-900 text-red-400"
                      }`}>
                        {r.status === "caption_saved" ? "caption saved" : r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.post_url ? (
                        <a href={r.post_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline text-xs">View post →</a>
                      ) : r.error ? (
                        <span className="text-red-400 text-xs">{r.error}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => { setFile(null); setResult(null); setStage("idle"); }}
            className="text-sm text-gray-500 hover:text-white transition">
            ← Upload another video
          </button>
        </div>
      )}
    </div>
  );
}

// ── Schedule Tab ──────────────────────────────────────────────────────────────

function ScheduleTab({ token }: { token: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(["facebook"]);
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledTime, setScheduledTime] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "uploading" | "scheduling" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_URL}/video-queue/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setJobs(await res.json());
    } catch {}
    setLoadingJobs(false);
  }, [token]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    const active = jobs.some(j => j.status === "queued" || j.status === "processing");
    if (!active) return;
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const togglePlatform = (p: string) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file || platforms.length === 0) return;
    setError("");
    setUploadProgress(0);
    try {
      setStage("uploading");
      const presignRes = await fetch(
        `${API_URL}/video-queue/presign?filename=${encodeURIComponent(file.name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.detail || "Failed to get upload URL");
      }
      const { presign_url, r2_key } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
        xhr.open("PUT", presign_url);
        xhr.setRequestHeader("Content-Type", "video/*");
        xhr.send(file);
      });

      setStage("scheduling");
      const scheduleRes = await fetch(`${API_URL}/video-queue/schedule`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          r2_key,
          platforms,
          youtube_title: youtubeTitle || null,
          scheduled_time: scheduleMode === "later" && scheduledTime ? scheduledTime : null,
        }),
      });
      if (!scheduleRes.ok) {
        const err = await scheduleRes.json();
        throw new Error(err.detail || "Failed to schedule video");
      }

      setStage("done");
      setFile(null);
      setYoutubeTitle("");
      setUploadProgress(0);
      await fetchJobs();
    } catch (e: any) {
      setError(e.message);
      setStage("error");
    }
  };

  const handleCancel = async (jobId: number) => {
    try {
      await fetch(`${API_URL}/video-queue/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchJobs();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">Upload a video → auto-posts to your platforms at the scheduled time</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragging ? "border-indigo-500 bg-indigo-950" : "border-gray-700 hover:border-gray-500"
          }`}
        >
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file ? (
            <div>
              <p className="text-white font-semibold">{file.name}</p>
              <p className="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-2">📁</p>
              <p className="text-gray-300">Drag & drop your video or click to browse</p>
              <p className="text-gray-500 text-sm mt-1">MP4, MOV, AVI, MKV, WebM — max 50MB</p>
            </div>
          )}
        </div>

        {/* Platforms */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Post to platforms:</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => togglePlatform(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize ${
                  platforms.includes(p) ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}>{p}</button>
            ))}
            <div className="relative group">
              <button disabled className="px-4 py-1.5 rounded-full text-sm font-medium capitalize bg-gray-800/50 text-gray-600 cursor-not-allowed">twitter</button>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">Coming soon</span>
            </div>
          </div>
        </div>

        {/* YouTube title */}
        {platforms.includes("youtube") && (
          <div>
            <label className="text-sm text-gray-400 block mb-1">YouTube title <span className="text-gray-600">(optional)</span></label>
            <input type="text" value={youtubeTitle} onChange={(e) => setYoutubeTitle(e.target.value)}
              placeholder="Enter a compelling YouTube title..." maxLength={100}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        )}

        {/* Schedule time */}
        <div>
          <p className="text-sm text-gray-400 mb-2">When to post:</p>
          <div className="flex gap-3">
            {(["now", "later"] as const).map((m) => (
              <button key={m} onClick={() => setScheduleMode(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  scheduleMode === m ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}>
                {m === "now" ? "Post Now" : "Schedule for Later"}
              </button>
            ))}
          </div>
          {scheduleMode === "later" && (
            <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
              className="mt-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          )}
        </div>

        {/* Progress */}
        {stage === "uploading" && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Uploading to storage...</span><span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
        {stage === "scheduling" && <p className="text-indigo-400 text-sm animate-pulse">Scheduling job...</p>}
        {stage === "done" && <p className="text-green-400 text-sm">✅ Video scheduled successfully!</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {(stage === "idle" || stage === "done" || stage === "error") && (
          <button onClick={handleSubmit} disabled={!file || platforms.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition">
            {stage === "done" ? "Schedule Another Video" : "Upload & Schedule"}
          </button>
        )}
      </div>

      {/* Jobs dashboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Scheduled Jobs</h2>
          <button onClick={fetchJobs} className="text-xs text-gray-500 hover:text-white transition">↻ Refresh</button>
        </div>
        {loadingJobs && jobs.length === 0 ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-gray-600 text-sm">No scheduled jobs yet. Upload your first video above.</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400">Scheduled</th>
                  <th className="text-left px-4 py-2 text-gray-400">Platforms</th>
                  <th className="text-left px-4 py-2 text-gray-400">Status</th>
                  <th className="text-left px-4 py-2 text-gray-400">Results</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-gray-800">
                    <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                      {new Date(job.scheduled_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {job.platforms.map(p => (
                          <span key={p} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full capitalize">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[job.status] || "bg-gray-800 text-gray-400"}`}>
                        {STATUS_LABEL[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {job.results ? (
                        <div className="flex gap-2 flex-wrap">
                          {job.results.map(r => (
                            <span key={r.platform} title={r.error || r.status} className="text-xs">
                              {r.status === "posted" || r.status === "caption_saved" ? "✅" : "❌"} {r.platform}
                            </span>
                          ))}
                        </div>
                      ) : job.error_message ? (
                        <span className="text-red-400 text-xs">{job.error_message.slice(0, 60)}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {job.status === "queued" && (
                        <button onClick={() => handleCancel(job.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
