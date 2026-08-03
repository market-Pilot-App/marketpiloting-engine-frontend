"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface BoostOrder {
  id: number;
  platform: string;
  service_type: string;
  quantity: number;
  cost: number;
  status: string;
  provider_order_id: string | null;
  ordered_at: string;
}

interface Budget { spent: number; budget: number; remaining: number; boost_credit_usd: number; }

const STATUS_STYLES: Record<string, string> = {
  pending_admin: "bg-yellow-900 text-yellow-300",
  ordered: "bg-blue-900 text-blue-300",
  completed: "bg-green-900 text-green-400",
  failed: "bg-red-900 text-red-400",
};

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘", instagram: "📸", linkedin: "💼",
  twitter: "🐦", telegram: "✈️", tiktok: "🎵",
  youtube: "▶️", website: "🌐",
};

export default function BoostsPage() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<BoostOrder[]>([]);
  const [pending, setPending] = useState<BoostOrder[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, budgetData] = await Promise.all([
        api.get<BoostOrder[]>("/boosts?limit=30"),
        api.get<Budget>("/boosts/budget"),
      ]);
      setOrders(ordersData);
      setBudget(budgetData);

      if (isAdmin) {
        const pendingData = await api.get<BoostOrder[]>("/admin/boosts/pending");
        setPending(pendingData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [isAdmin]);

  const approveOrder = async (id: number) => {
    await api.post(`/admin/boosts/${id}/approve`);
    await fetchData();
  };

  const rejectOrder = async (id: number) => {
    await api.post(`/admin/boosts/${id}/reject`);
    await fetchData();
  };

  const budgetPct = budget
    ? Math.min((budget.spent / budget.budget) * 100, 100)
    : 0;

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Boosts</h1>

      {/* Budget meter */}
      {budget && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-white font-semibold">Monthly Boost Budget</p>
            {isAdmin ? (
              <p className="text-white font-bold">
                ${budget.spent.toFixed(2)}
                <span className="text-gray-500 font-normal"> / ${budget.budget.toFixed(2)}</span>
              </p>
            ) : (
              <p className="text-sm font-medium text-gray-400">
                {budgetPct >= 100 ? "Boost Full" : "Boost Active"}
              </p>
            )}
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-yellow-500" : "bg-green-500"
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          {isAdmin ? (
            <p className="text-gray-400 text-xs mt-2">${budget.remaining.toFixed(2)} remaining this month</p>
          ) : (
            <p className="text-gray-400 text-xs mt-2">
              {budgetPct >= 100
                ? `Boost Full — resets next month`
                : `Resets in ${Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime() - Date.now()) / 86400000)} days`}
            </p>
          )}
          {budget.boost_credit_usd > 0 && (
            <p className="text-emerald-400 text-xs mt-1">
              {isAdmin ? `💳 Boost credit: $${budget.boost_credit_usd.toFixed(2)} available` : "💳 Extra boost credit available"}
            </p>
          )}
          {budget.remaining <= 0 && budget.boost_credit_usd <= 0 && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
              <span className="text-yellow-400 text-sm">🔒 Monthly boost budget exhausted</span>
              <a href="/upgrade" className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs font-medium text-white">Upgrade Plan</a>
            </div>
          )}
        </div>
      )}

      {/* Pending admin approvals */}
      {isAdmin && pending.length > 0 && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-yellow-300 mb-3">
            ⚠️ Pending Approval ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((order) => (
              <div key={order.id} className="flex items-center justify-between bg-gray-900 rounded-lg p-3">
                <div>
                  <p className="text-white text-sm">
                    {PLATFORM_EMOJI[order.platform]} {order.platform} — {order.service_type} × {order.quantity}
                  </p>
                  <p className="text-yellow-400 text-xs mt-0.5">Cost: ${order.cost.toFixed(4)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveOrder(order.id)}
                    className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectOrder(order.id)}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders list */}
      <h2 className="font-semibold text-white mb-3">Boost Orders</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-sm">No boost orders yet. Posts are auto-boosted after publishing.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{PLATFORM_EMOJI[order.platform] || "📄"}</span>
                <div>
                  <p className="text-white text-sm capitalize">
                    {order.platform} — {order.service_type} × {order.quantity.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    ${order.cost.toFixed(4)} · {new Date(order.ordered_at).toLocaleDateString()}
                    {order.provider_order_id && (
                      <span className="text-gray-600"> · #{order.provider_order_id}</span>
                    )}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[order.status] || "bg-gray-800 text-gray-400"}`}>
                {order.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
