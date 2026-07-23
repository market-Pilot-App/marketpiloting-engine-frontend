"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClientRow {
  client: {
    id: number;
    name: string;
    email: string;
    plan: string;
    active: boolean;
    managed_by_admin: boolean;
  };
  campaign_id: number | null;
  posts_today: number;
  boost_spend_mtd: number;
  leads_7d: number;
}

export default function AdminPage() {
  const { isAdmin, startImpersonation } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { router.push("/"); return; }
    api.get<ClientRow[]>("/admin/clients").then(setRows).finally(() => setLoading(false));
  }, [isAdmin, router]);

  const sendReport = async (clientId: number) => {
    await api.post(`/admin/reports/send/${clientId}`);
    alert("Report sent!");
  };

  if (loading) return <p className="text-gray-400">Loading clients...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Link
          href="/admin/clients/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Register Client
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800 text-left">
              <th className="pb-3 pr-4">Client</th>
              <th className="pb-3 pr-4">Plan</th>
              <th className="pb-3 pr-4">Managed</th>
              <th className="pb-3 pr-4">Posts Today</th>
              <th className="pb-3 pr-4">Boost (MTD)</th>
              <th className="pb-3 pr-4">Leads (7d)</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client, posts_today, boost_spend_mtd, leads_7d }) => (
              <tr key={client.id} className="border-b border-gray-800 hover:bg-gray-900">
                <td className="py-3 pr-4">
                  <p className="text-white font-medium">{client.name}</p>
                  <p className="text-gray-500 text-xs">{client.email}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className="capitalize bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">
                    {client.plan}
                  </span>
                </td>
                <td className="py-3 pr-4 text-center">
                  {client.managed_by_admin ? "✅" : "—"}
                </td>
                <td className="py-3 pr-4 text-white">{posts_today}</td>
                <td className="py-3 pr-4 text-white">${boost_spend_mtd.toFixed(2)}</td>
                <td className="py-3 pr-4 text-white">{leads_7d}</td>
                <td className="py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => startImpersonation(client.id)}
                      className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs px-3 py-1 rounded transition"
                    >
                      Manage Dashboard
                    </button>
                    <button
                      onClick={() => sendReport(client.id)}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded transition"
                    >
                      Send Report
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="text-gray-500 text-center py-12">No clients yet. Register your first client.</p>
        )}
      </div>
    </div>
  );
}
