"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

const PLANS = [
  { id: "solo",    label: "Solo",    price: "₦29,999/mo",  yearlyPrice: "₦20,999/mo", features: ["2 platforms", "3 posts/day", "AI content", "Basic boost", "1 blog/week"] },
  { id: "starter", label: "Starter", price: "₦75,000/mo",  yearlyPrice: "₦52,500/mo", features: ["3 platforms", "5 posts/day", "AI content", "Auto boost", "2 blogs/week"] },
  { id: "growth",  label: "Growth",  price: "₦150,000/mo", yearlyPrice: "₦105,000/mo", features: ["6 platforms", "8 posts/day", "Video posting", "Full boost", "3 blogs/week"], popular: true },
  { id: "agency",  label: "Agency",  price: "₦450,000/mo", yearlyPrice: "₦315,000/mo", features: ["11 brands", "12 posts/day", "Unlimited video", "Max boost", "Daily blog"] },
];

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<"plan" | "details" | "processing">("plan");
  const [plan, setPlan] = useState(searchParams.get("plan") || "growth");
  const [billing, setBilling] = useState(searchParams.get("billing") || "monthly");
  const [form, setForm] = useState({ name: "", email: "", password: "", business_name: "", niche: "", website_url: "", target_audience: "", tone: "professional" });
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    setError("");
    setStep("processing");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      // Redirect to Paystack
      window.location.href = data.payment_url;
    } catch (e: any) {
      setError(e.message);
      setStep("details");
    }
  };

  if (step === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">⚙️</div>
          <p className="text-white text-xl font-semibold">Setting up your account...</p>
          <p className="text-gray-400 text-sm">Extracting brand identity & redirecting to payment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Marketpiloting Engine</h1>
          <p className="text-gray-400 mt-2">Autonomous marketing on autopilot</p>
        </div>

        {/* Step 1 — Plan Selection */}
        {step === "plan" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center mb-4">Choose your plan</h2>
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className={`text-sm font-medium ${billing === "monthly" ? "text-white" : "text-gray-500"}`}>Monthly</span>
              <button
                onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
                className={`relative w-12 h-6 rounded-full transition-colors ${billing === "yearly" ? "bg-indigo-600" : "bg-gray-700"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${billing === "yearly" ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-sm font-medium ${billing === "yearly" ? "text-white" : "text-gray-500"}`}>
                Yearly <span className="text-green-400 text-xs font-bold">Save 30%</span>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  className={`relative cursor-pointer rounded-2xl border-2 p-5 transition ${
                    plan === p.id ? "border-indigo-500 bg-indigo-950" : "border-gray-700 bg-gray-900 hover:border-gray-500"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <p className="text-white font-bold text-lg">{p.label}</p>
                  <p className="text-indigo-400 font-semibold mt-1">
                    {billing === "yearly" ? p.yearlyPrice : p.price}
                    {billing === "yearly" && <span className="text-green-400 text-xs ml-1">billed yearly</span>}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {p.features.map((f) => (
                      <li key={f} className="text-gray-400 text-sm flex items-center gap-2">
                        <span className="text-green-400">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep("details")}
              className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition"
            >
              Continue with {PLANS.find((p) => p.id === plan)?.label} →
            </button>
            <p className="text-center text-gray-500 text-sm mt-2">
              Already have an account?{" "}
              <a href="/login" className="text-indigo-400 hover:underline">Sign in</a>
            </p>
          </div>
        )}

        {/* Step 2 — Account Details */}
        {step === "details" && (
          <div className="bg-gray-900 rounded-2xl p-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-white">Account Details</h2>
              <span className="text-xs bg-indigo-900 text-indigo-300 px-3 py-1 rounded-full capitalize">{plan} plan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Your Name", type: "text", required: true },
                { key: "email", label: "Email Address", type: "email", required: true },
                { key: "password", label: "Password", type: "password", required: true },
                { key: "business_name", label: "Business Name", type: "text", required: true },
                { key: "niche", label: "Industry / Niche", type: "text", required: true },
                { key: "target_audience", label: "Target Audience", type: "text", required: true },
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={(form as any)[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Website URL <span className="text-gray-600">(optional — we'll extract your brand identity automatically)</span>
              </label>
              <input
                type="url"
                value={form.website_url}
                onChange={(e) => set("website_url", e.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep("plan")}
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition text-sm"
              >
                ← Back
              </button>
              <button
                onClick={handleRegister}
                disabled={!form.name || !form.email || !form.password || !form.business_name || !form.niche || !form.target_audience}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
              >
                Create Account & Pay →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <RegisterContent />
    </Suspense>
  );
}
