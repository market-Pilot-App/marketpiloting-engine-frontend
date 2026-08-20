"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, API_URL } from "@/lib/api";

const PLANS = [
  { key: "micro",   label: "Micro",   monthly: "₦5,999",   yearly: "₦4,199",   desc: "1 brand, Facebook only, 2 posts/day" },
  { key: "solo",    label: "Solo",    monthly: "₦15,000",  yearly: "₦10,499",  desc: "2 platforms (Facebook + X), 3 posts/day" },
  { key: "starter", label: "Starter", monthly: "₦35,000",  yearly: "₦24,499",  desc: "6 platforms, 5 posts/day + followers boost" },
  { key: "growth",  label: "Growth",  monthly: "₦75,000",  yearly: "₦52,499",  desc: "7 platforms, 8 posts/day + full automation" },
  { key: "pro",     label: "Pro",     monthly: "₦185,000", yearly: "₦129,499", desc: "9 platforms, 12 posts/day + max boost" },
  { key: "agency",  label: "Agency",  monthly: "₦495,000", yearly: "₦346,499", desc: "11 brands, everything included" },
];

const PLAN_ORDER = ["micro", "solo", "starter", "growth", "pro", "agency"];

export default function UpgradePage() {
  const { client } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ valid: boolean; message: string; discounted_amount_kobo?: number; original_amount_kobo?: number; plan?: string; billing?: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const validatePromo = async (planKey?: string) => {
    if (!promoCode.trim()) return;
    const targetPlan = planKey || selectedPlan;
    if (!targetPlan) return;
    setPromoLoading(true);
    setPromoStatus(null);
    try {
      const res = await fetch(`${API_URL}/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), plan: targetPlan, billing }),
      });
      const data = await res.json();
      setPromoStatus({ ...data, plan: targetPlan, billing });
    } catch {
      setPromoStatus({ valid: false, message: "Could not validate code" });
    } finally {
      setPromoLoading(false);
    }
  };

  const currentPlanIdx = PLAN_ORDER.indexOf(client?.plan || "");

  const handleSelect = async (planKey: string) => {
    setError("");
    setLoading(planKey);
    try {
      const data = await api.post<{ payment_url: string; type: string }>("/auth/upgrade", {
        plan: planKey,
        billing,
        promo_code: promoStatus?.valid && promoStatus.plan === planKey && promoStatus.billing === billing
          ? promoCode.trim()
          : undefined,
      });
      window.location.href = data.payment_url;
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upgrade Your Plan</h1>
        <p className="text-gray-400 mt-1">
          You're currently on <span className="text-indigo-400 font-semibold capitalize">{client?.plan}</span>.
          Choose a plan below to upgrade or resubscribe.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            billing === "monthly" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            billing === "yearly" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Yearly <span className="text-emerald-400 text-xs ml-1">30% off</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Promo Code */}
      <div className="mb-6 max-w-sm">
        <label className="block text-sm text-gray-400 mb-1">Promo Code <span className="text-gray-600">(optional)</span></label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus(null); }}
            placeholder="e.g. LAUNCH50"
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm uppercase"
          />
          <button
            type="button"
            onClick={() => validatePromo()}
            disabled={!promoCode.trim() || !selectedPlan || promoLoading}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm rounded-lg transition"
          >
            {promoLoading ? "…" : "Apply"}
          </button>
        </div>
        {!selectedPlan && promoCode.trim() && (
          <p className="text-xs text-gray-500 mt-1">Select a plan below first, then apply your code</p>
        )}
        {promoStatus && (
          <p className={`text-xs mt-1.5 ${promoStatus.valid ? "text-green-400" : "text-red-400"}`}>
            {promoStatus.valid ? "✓ " : "✗ "}{promoStatus.message}
            {promoStatus.valid && promoStatus.original_amount_kobo && promoStatus.discounted_amount_kobo && (
              <span className="ml-1 text-gray-400">
                (₦{(promoStatus.original_amount_kobo / 100).toLocaleString()} → <strong className="text-green-400">₦{(promoStatus.discounted_amount_kobo / 100).toLocaleString()}</strong>)
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan, idx) => {
          const isCurrent = plan.key === client?.plan;
          const isUpgrade = idx > currentPlanIdx;
          const isDowngrade = idx < currentPlanIdx;
          const isSelected = selectedPlan === plan.key;
          const price = billing === "yearly" ? plan.yearly : plan.monthly;

          return (
            <div
              key={plan.key}
              onClick={() => !isDowngrade && setSelectedPlan(plan.key)}
              className={`relative bg-gray-900 border rounded-2xl p-5 flex flex-col gap-4 transition ${
                isDowngrade
                  ? "border-gray-800 opacity-40 cursor-not-allowed"
                  : isSelected
                  ? "border-indigo-500 ring-2 ring-indigo-500 cursor-pointer"
                  : isCurrent
                  ? "border-indigo-500/50 cursor-pointer hover:border-indigo-400"
                  : "border-gray-700 cursor-pointer hover:border-indigo-400"
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full font-semibold">
                  Current Plan
                </span>
              )}
              {isUpgrade && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-3 py-0.5 rounded-full font-semibold">
                  Upgrade
                </span>
              )}
              <div>
                <p className="text-white font-bold text-lg">{plan.label}</p>
                <p className="text-gray-400 text-xs mt-1">{plan.desc}</p>
              </div>
              <div>
                <p className="text-white text-2xl font-bold">{price}</p>
                <p className="text-gray-500 text-xs">/{billing === "yearly" ? "mo, billed yearly" : "month"}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); !isDowngrade && agreedToTos && handleSelect(plan.key); }}
                disabled={isDowngrade || loading === plan.key || !agreedToTos || !isSelected}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                  isDowngrade
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : isSelected
                    ? isCurrent
                      ? "bg-indigo-900 hover:bg-indigo-800 text-indigo-300 disabled:opacity-40"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
                    : "bg-gray-800 text-gray-500 cursor-pointer"
                }`}
              >
                {loading === plan.key
                  ? "Redirecting…"
                  : !isSelected
                  ? "Select"
                  : isCurrent
                  ? "Resubscribe"
                  : isUpgrade
                  ? `Upgrade to ${plan.label}`
                  : "Unavailable"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs mt-8 text-center">
        Payments are processed securely by Paystack. Your card is saved for automatic renewal.
        Cancel anytime by contacting support.
      </p>

      {/* ToS Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer mt-4 max-w-lg mx-auto">
        <input
          type="checkbox"
          checked={agreedToTos}
          onChange={(e) => setAgreedToTos(e.target.checked)}
          className="mt-0.5 accent-indigo-500 w-4 h-4 flex-shrink-0"
        />
        <span className="text-xs text-gray-400 leading-relaxed">
          I agree to the{" "}
          <a href="https://marketpiloting.com/terms" target="_blank" className="text-indigo-400 hover:underline">Terms of Service</a>
          {" "}and{" "}
          <a href="https://marketpiloting.com/privacy" target="_blank" className="text-indigo-400 hover:underline">Privacy Policy</a>
          , including the 7-day guarantee and refund policy.
        </span>
      </label>
    </div>
  );
}
