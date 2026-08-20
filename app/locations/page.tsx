"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Location {
  id: number;
  name: string;
  location_name: string;
  location_address: string | null;
  active: boolean;
  created_at: string;
  posts_count: number;
}

const PLAN_LIMITS: Record<string, number> = { growth: 3, pro: 5, agency: 999, admin: 999 };

export default function LocationsPage() {
  const { client, setSession } = useAuth();
  const plan = client?.plan ?? "";
  const limit = PLAN_LIMITS[plan] ?? 0;

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [switching, setSwitching] = useState<number | null>(null);

  useEffect(() => {
    if (!limit) { setLoading(false); return; }
    api.get<Location[]>("/campaigns/locations")
      .then(setLocations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [limit]);

  const createLocation = async () => {
    if (!locName.trim()) { setCreateError("Location name is required."); return; }
    setCreating(true); setCreateError("");
    try {
      const data = await api.post<{ id: number; location_name: string; location_address: string | null }>(
        "/campaigns/locations",
        { location_name: locName.trim(), location_address: locAddress.trim() || null }
      );
      setLocations((prev) => [...prev, {
        id: data.id, name: "", location_name: data.location_name,
        location_address: data.location_address,
        active: true, created_at: new Date().toISOString(), posts_count: 0,
      }]);
      setLocName(""); setLocAddress(""); setShowForm(false);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create location");
    } finally {
      setCreating(false);
    }
  };

  const switchToLocation = async (loc: Location) => {
    setSwitching(loc.id);
    try {
      const data = await api.post<{
        access_token: string; campaign_id: number;
        campaign_name: string; location_name: string; plan: string;
      }>(`/campaigns/locations/${loc.id}/switch`);
      const stored = localStorage.getItem("mp_client");
      const base = stored ? JSON.parse(stored) : {};
      setSession({
        ...base,
        access_token: data.access_token,
        campaign_id: data.campaign_id,
        campaign_name: data.campaign_name,
        location_name: data.location_name,
        plan: data.plan,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Switch failed");
    } finally {
      setSwitching(null);
    }
  };

  if (!limit) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <p className="text-4xl mb-4">📍</p>
        <h2 className="text-xl font-bold text-white mb-2">Multi-Location</h2>
        <p className="text-gray-400 text-sm mb-6">
          Available on Growth plan and above. Manage multiple branches under one account,
          each posting with location-specific content.
        </p>
        <a href="/upgrade"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition">
          Upgrade to Growth →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Locations</h1>
        {locations.length < limit && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition">
            + Add Location
          </button>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">
        Manage branch locations under your brand. Each location posts with location-specific context.
        <span className="ml-2 text-indigo-400">
          {locations.length}/{limit === 999 ? "∞" : limit} used
        </span>
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Add location form */}
      {showForm && (
        <div className="bg-gray-900 border border-indigo-800 rounded-xl p-5 mb-6 space-y-4">
          <p className="text-sm font-semibold text-white">New Location Branch</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Branch Name *</label>
              <input value={locName} onChange={(e) => setLocName(e.target.value)}
                placeholder="e.g. Lekki Branch, Abuja HQ"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Address (optional)</label>
              <input value={locAddress} onChange={(e) => setLocAddress(e.target.value)}
                placeholder="e.g. 14 Adeola Odeku St, Lagos"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          {createError && <p className="text-red-400 text-sm">{createError}</p>}
          <div className="flex gap-3">
            <button onClick={createLocation} disabled={creating}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition">
              {creating ? "Creating..." : "Create Location"}
            </button>
            <button onClick={() => { setShowForm(false); setCreateError(""); }}
              className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Locations list */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading locations...</p>
      ) : locations.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-white font-semibold mb-1">No locations yet</p>
          <p className="text-gray-500 text-sm mb-4">
            Add your first branch to start posting location-specific content.
          </p>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition">
            + Add First Location
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
              <div className="text-2xl">📍</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{loc.location_name}</p>
                {loc.location_address && (
                  <p className="text-gray-500 text-xs mt-0.5">{loc.location_address}</p>
                )}
                <p className="text-gray-600 text-xs mt-1">{loc.posts_count} posts published</p>
              </div>
              <button
                onClick={() => switchToLocation(loc)}
                disabled={switching === loc.id}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition shrink-0">
                {switching === loc.id ? "Switching..." : "Switch to →"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-2">How locations work</p>
        <ul className="space-y-1.5 text-sm text-gray-400">
          <li>• Each location inherits your brand DNA — same tone, same keywords</li>
          <li>• AI automatically adds location context to every generated post</li>
          <li>• Switch to a location to manage its schedule and analytics independently</li>
          <li>• Each location has its own posting schedule and analytics</li>
          <li>• {plan === "growth" ? "Growth plan: up to 3 locations" : plan === "pro" ? "Pro plan: up to 5 locations" : "Agency plan: unlimited locations"}</li>
        </ul>
      </div>
    </div>
  );
}
