"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useCanAccess } from "@/lib/use-role-guard";
import { useRouter, useSearchParams } from "next/navigation";

const PAGES = [
  { id: "home", label: "Home" },
  { id: "about", label: "About Us" },
  { id: "services", label: "Services / Products" },
  { id: "contact", label: "Contact" },
  { id: "faq", label: "FAQ" },
  { id: "blog", label: "Blog" },
];

const BUSINESS_TYPES = [
  "Restaurant / Food",
  "Consulting / Coaching",
  "E-commerce / Retail",
  "Healthcare / Wellness",
  "Education / Training",
  "Real Estate",
  "Fashion / Beauty",
  "Tech / Software",
  "Events / Entertainment",
  "Other",
];

const STEPS = [
  "Analyzing your brief",
  "Designing your website",
  "Writing your pages",
  "Finalizing content",
  "Saving your website",
];

const PUBLIC_BASE = "https://dashboard.marketpiloting.com/sites";

interface Website {
  id: number;
  slug: string;
  pages_config: string[];
  is_published: boolean;
  status: string;
}

export default function BuildWebsite() {
  const canAccess = useCanAccess("editor");
  const router = useRouter();
  const searchParams = useSearchParams();
  const regenerateId = searchParams.get("regenerate");

  const [pages, setPages] = useState<string[]>(["home", "services", "contact"]);
  const [businessType, setBusinessType] = useState("Other");
  const [description, setDescription] = useState("");
  const [building, setBuilding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<Website | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (stepTimer.current) clearInterval(stepTimer.current); };
  }, []);

  if (!canAccess) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">🔒</span>
      <p className="text-white font-semibold">Editor access required</p>
    </div>
  );

  const togglePage = (id: string) => {
    // home and contact are always required
    if (id === "home" || id === "contact") return;
    setPages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const startStepTimer = () => {
    setCurrentStep(0);
    const STEP_DURATIONS = [3000, 8000, 15000, 5000, 3000];
    let step = 0;
    stepTimer.current = setInterval(() => {
      step++;
      if (step < STEPS.length) {
        setCurrentStep(step);
      } else {
        if (stepTimer.current) clearInterval(stepTimer.current);
      }
    }, STEP_DURATIONS[step] || 3000);
  };

  const build = async () => {
    if (!description.trim()) {
      setError("Please describe your business.");
      return;
    }
    setError("");
    setBuilding(true);
    setResult(null);
    startStepTimer();

    try {
      const data = await api.post<Website>("/websites/generate", {
        pages_needed: pages,
        business_type: businessType,
        description: description.trim(),
      });
      if (stepTimer.current) clearInterval(stepTimer.current);
      setCurrentStep(STEPS.length - 1);
      setResult(data);
    } catch (e: unknown) {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setBuilding(false);
    }
  };

  const copyLink = () => {
    if (!result) return;
    navigator.clipboard.writeText(`${PUBLIC_BASE}/${result.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Success state
  if (result) {
    const url = `${PUBLIC_BASE}/${result.slug}`;
    const previewUrl = result.is_published ? url : `/sites/${result.slug}?preview=${result.id}`;
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-2">Your website is ready!</h1>
        <p className="text-gray-400 text-sm mb-8">
          {result.pages_config.length} pages generated · Publish it to make it live
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6 text-left">
          <p className="text-gray-400 text-xs mb-1">Your website URL</p>
          <p className="text-white font-mono text-sm break-all">{url}</p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition text-sm"
          >
            Preview Website ↗
          </a>
          <button
            onClick={copyLink}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            {copied ? "✅ Copied!" : "Copy Link"}
          </button>
          <button
            onClick={() => router.push("/websites")}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition text-sm"
          >
            Go to My Websites
          </button>
        </div>
      </div>
    );
  }

  // Build form
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          {regenerateId ? "Regenerate Website" : "Build Your Website"}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          AI generates your full website from your Brand DNA in under 60 seconds.
        </p>
      </div>

      {/* Building progress */}
      {building && (
        <div className="bg-gray-900 border border-indigo-700/50 rounded-xl p-6 mb-6">
          <p className="text-white font-semibold mb-5 text-center">Building your website...</p>
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  i < currentStep
                    ? "bg-green-600 text-white"
                    : i === currentStep
                    ? "bg-indigo-600 text-white animate-pulse"
                    : "bg-gray-800 text-gray-600"
                }`}>
                  {i < currentStep ? "✓" : i === currentStep ? "●" : "○"}
                </div>
                <span className={`text-sm ${
                  i < currentStep ? "text-green-400"
                  : i === currentStep ? "text-white"
                  : "text-gray-600"
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!building && (
        <div className="space-y-5">
          {/* Business type */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-white text-sm font-semibold block mb-3">
              Business Type
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-white text-sm font-semibold block mb-1">
              Describe Your Business & Website Goals
            </label>
            <p className="text-gray-500 text-xs mb-3">
              What does your business do? What do you want visitors to do on your website?
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="e.g. I run a catering business in Lagos. I need a website to showcase my menu, take bookings, and display customer reviews."
              rows={4}
              className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
            />
            <p className="text-gray-600 text-xs mt-1 text-right">{description.length}/500</p>
          </div>

          {/* Pages */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-white text-sm font-semibold block mb-1">
              Pages to Include
            </label>
            <p className="text-gray-500 text-xs mb-3">
              Home and Contact are always included.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAGES.map((p) => {
                const required = p.id === "home" || p.id === "contact";
                const selected = pages.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      required
                        ? "border-indigo-700/50 bg-indigo-950/30 cursor-default"
                        : selected
                        ? "border-indigo-500 bg-indigo-950/40"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePage(p.id)}
                      disabled={required}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm text-white">{p.label}</span>
                    {required && (
                      <span className="text-xs text-indigo-400 ml-auto">required</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Brand DNA note */}
          <div className="bg-indigo-950/30 border border-indigo-700/30 rounded-xl p-4">
            <p className="text-indigo-300 text-xs">
              🧬 Your website will use your Brand DNA — tone, keywords, audience, and value proposition.
              Make sure your Brand DNA is complete for best results.
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={build}
            disabled={building || !description.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-sm"
          >
            ✨ Generate My Website
          </button>
        </div>
      )}
    </div>
  );
}
