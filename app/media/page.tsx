"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const PLATFORMS = ["facebook", "instagram", "twitter", "linkedin", "telegram", "tiktok"];

interface BrandImage {
  id: number;
  public_url: string;
  filename: string;
  file_size: number;
  platforms: string[];
  created_at: string;
}

export default function MediaPage() {
  const [images, setImages] = useState<BrandImage[]>([]);
  const [total, setTotal] = useState(0);
  const [filterPlatform, setFilterPlatform] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (platform = filterPlatform) => {
    const params = platform ? `?platform=${platform}` : "";
    const data = await api.get<{ total: number; max: number; images: BrandImage[] }>(`/media/images${params}`);
    setImages(data.images);
    setTotal(data.total);
  };

  useEffect(() => { load(); }, []);

  const togglePlatform = (p: string) =>
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const uploadFile = async (file: File) => {
    setError("");
    if (file.size > 5 * 1024 * 1024) { setError("File exceeds 5MB"); return; }
    if (!file.type.startsWith("image/")) { setError("Only image files allowed"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = localStorage.getItem("mp_token");
      const params = selectedPlatforms.length ? `?platforms=${selectedPlatforms.join(",")}` : "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/upload${params}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      await load();
      setSelectedPlatforms([]);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  };

  const deleteImage = async (id: number) => {
    if (!confirm("Delete this image?")) return;
    await api.del(`/media/images/${id}`);
    await load();
  };

  const MAX = 50;
  const usedPct = Math.round((total / MAX) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🖼️ Brand Image Library</h1>
          <p className="text-gray-400 text-sm mt-0.5">Upload your product images — AI uses them automatically when posting</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">{total} / {MAX} images</span>
      </div>

      {/* Usage bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Library usage</span>
          <span>{usedPct}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${usedPct >= 90 ? "bg-red-500" : usedPct >= 60 ? "bg-yellow-500" : "bg-indigo-500"}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>

      {/* Upload zone */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h3 className="font-semibold mb-4">Upload Image</h3>

        {/* Platform tag selector */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Tag for platforms (optional — leave blank to use on all)</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition capitalize ${
                  selectedPlatforms.includes(p)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 hover:border-gray-500"
          }`}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          {uploading ? (
            <p className="text-gray-400 text-sm">Uploading...</p>
          ) : (
            <>
              <p className="text-3xl mb-2">📁</p>
              <p className="text-gray-300 text-sm">Drag & drop or click to upload</p>
              <p className="text-gray-500 text-xs mt-1">JPEG, PNG, WebP, GIF · Max 5MB</p>
            </>
          )}
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-400">Filter:</span>
        <button
          onClick={() => { setFilterPlatform(""); load(""); }}
          className={`px-3 py-1 rounded-full text-xs transition ${!filterPlatform ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
        >
          All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => { setFilterPlatform(p); load(p); }}
            className={`px-3 py-1 rounded-full text-xs capitalize transition ${filterPlatform === p ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Image grid */}
      {images.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-gray-300 font-medium mb-1">No images yet</p>
          <p className="text-gray-500 text-sm">Upload your first product image above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((img) => (
            <div key={img.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group relative">
              <div className="aspect-square relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.public_url} alt={img.filename} className="w-full h-full object-cover" />
                <button
                  onClick={() => deleteImage(img.id)}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
              <div className="p-2">
                <p className="text-xs text-gray-400 truncate">{img.filename}</p>
                {img.platforms && img.platforms.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {img.platforms.map((p) => (
                      <span key={p} className="text-xs bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded capitalize">{p}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-600">All platforms</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
