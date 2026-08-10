"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Member {
  id: number;
  email: string;
  role: string;
  accepted: boolean;
  invited_at: string;
  accepted_at: string | null;
  member_client_id: number | null;
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-900 text-purple-300",
  admin: "bg-red-900 text-red-300",
  editor: "bg-blue-900 text-blue-300",
  viewer: "bg-gray-800 text-gray-400",
};

const ROLE_DESC: Record<string, string> = {
  admin: "Everything except billing",
  editor: "Create & edit content, cannot delete campaigns",
  viewer: "Read-only, no posting",
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = () =>
    api.get<Member[]>("/team/").then(setMembers).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setInviting(true);
    try {
      await api.post("/team/invite", { email, role });
      setSuccess(`Invite sent to ${email}`);
      setEmail(""); setRole("viewer");
      load();
    } catch (err: any) {
      setError(err.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (id: number, newRole: string) => {
    try {
      await api.patch(`/team/${id}/role`, { role: newRole });
      setMembers((m) => m.map((x) => x.id === id ? { ...x, role: newRole } : x));
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  const remove = async (id: number, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from your workspace?`)) return;
    try {
      await api.del(`/team/${id}`);
      setMembers((m) => m.filter((x) => x.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Members</h1>
        <p className="text-gray-400 text-sm mt-1">Invite collaborators and control what they can access.</p>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(ROLE_DESC).map(([r, desc]) => (
          <div key={r} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[r]}`}>{r}</span>
            <p className="text-gray-400 text-xs mt-2">{desc}</p>
          </div>
        ))}
      </div>

      {/* Invite form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Invite a Team Member</h2>
        <form onSubmit={invite} className="flex gap-3 flex-wrap">
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-48 bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition"
          >
            {inviting ? "Sending…" : "Send Invite"}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mt-3">✅ {success}</p>}
      </div>

      {/* Members list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Members ({members.length})</h2>
        </div>
        {loading ? (
          <p className="text-gray-400 text-sm p-5">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-gray-500 text-sm p-5">No team members yet. Send your first invite above.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{m.email}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {m.accepted
                      ? `Joined ${new Date(m.accepted_at!).toLocaleDateString()}`
                      : `Invited ${new Date(m.invited_at).toLocaleDateString()} · Pending`}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.accepted ? "bg-green-900 text-green-400" : "bg-yellow-900 text-yellow-400"}`}>
                  {m.accepted ? "Active" : "Pending"}
                </span>
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value)}
                  className="bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => remove(m.id, m.email)}
                  className="text-gray-600 hover:text-red-400 transition text-sm"
                  title="Remove member"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
