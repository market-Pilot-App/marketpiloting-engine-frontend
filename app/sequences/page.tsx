"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface Sequence {
  id: number;
  name: string;
  active: boolean;
  step_count: number;
  pending_count: number;
  sent_count: number;
  created_at: string;
}

interface Step {
  day_offset: number;
  subject: string;
  body: string;
}

interface Lead {
  id: number;
  name: string | null;
  email: string;
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [tab, setTab] = useState<"list" | "create">("list");
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ day_offset: 0, subject: "", body: "" }]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [creatingRecovery, setCreatingRecovery] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState("");

  // Enroll modal
  const [enrollSeq, setEnrollSeq] = useState<Sequence | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState("");

  const fetchSequences = useCallback(async () => {
    const data = await api.get<Sequence[]>("/sequences/");
    setSequences(data);
  }, []);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  const addStep = () =>
    setSteps((s) => [...s, { day_offset: (s[s.length - 1]?.day_offset ?? 0) + 1, subject: "", body: "" }]);

  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));

  const updateStep = (i: number, field: keyof Step, value: string | number) =>
    setSteps((s) => s.map((st, idx) => idx === i ? { ...st, [field]: value } : st));

  const saveSequence = async () => {
    if (!name || steps.some((s) => !s.subject || !s.body)) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await api.post("/sequences/", { name, steps });
      setSaveMsg("✓ Sequence created");
      setName("");
      setSteps([{ day_offset: 0, subject: "", body: "" }]);
      await fetchSequences();
      setTab("list");
    } catch {
      setSaveMsg("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteSequence = async (id: number) => {
    if (!confirm("Delete this sequence?")) return;
    await api.del(`/sequences/${id}`);
    await fetchSequences();
  };

  const createAbandonedRecovery = async () => {
    setCreatingRecovery(true); setRecoveryMsg("");
    try {
      const r = await api.post<{ id: number; status: string }>("/sequences/create-abandoned-recovery");
      setRecoveryMsg(r.status === "already_exists" ? "✓ Already set up" : "✓ Abandoned Recovery sequence created!");
      await fetchSequences();
    } catch {
      setRecoveryMsg("Failed to create");
    } finally {
      setCreatingRecovery(false);
    }
  };

  const openEnroll = async (seq: Sequence) => {
    setEnrollSeq(seq);
    setEnrollMsg("");
    setSelectedLeads([]);
    const data = await api.get<Lead[]>("/leads/scored");
    setLeads(data);
  };

  const doEnroll = async () => {
    if (!enrollSeq) return;
    setEnrolling(true);
    setEnrollMsg("");
    try {
      const res = await api.post<{ enrolled: number; emails_queued: number }>("/sequences/enroll", {
        sequence_id: enrollSeq.id,
        lead_ids: selectedLeads,
      });
      setEnrollMsg(`✓ Enrolled ${res.enrolled} leads, ${res.emails_queued} emails queued`);
      await fetchSequences();
    } catch {
      setEnrollMsg("Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const toggleLead = (id: number) =>
    setSelectedLeads((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Sequences</h1>
          <p className="text-sm text-gray-500 mt-1">Automated email drip campaigns for your leads</p>
        </div>
        <button
          onClick={() => setTab(tab === "create" ? "list" : "create")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          {tab === "create" ? "← Back" : "+ New Sequence"}
        </button>
      </div>

      {tab === "list" && (
        <>
          {/* Abandoned Lead Recovery system card */}
          <div className="bg-gray-900 border border-orange-800/40 rounded-xl p-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-orange-400 mb-1">🔄 Abandoned Lead Recovery</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Auto-enroll leads who haven’t purchased within 24hrs into a 3-email recovery sequence.
                  Day 1 check-in · Day 3 social proof · Day 7 scarcity close. Runs daily on autopilot.
                </p>
                {recoveryMsg && <p className="text-xs text-green-400 mt-2">{recoveryMsg}</p>}
              </div>
              <button onClick={createAbandonedRecovery} disabled={creatingRecovery}
                className="shrink-0 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition">
                {creatingRecovery ? "Setting up..." : sequences.some(s => s.name === "Abandoned Lead Recovery") ? "✓ Active" : "Activate"}
              </button>
            </div>
          </div>

          {sequences.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
              No sequences yet. Create one to start automating your lead nurturing.
            </div>
          ) : (
            <div className="space-y-3">
              {sequences.map((seq) => (
                <div key={seq.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{seq.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {seq.step_count} steps · {seq.sent_count} sent · {seq.pending_count} pending
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEnroll(seq)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                    >
                      Enroll Leads
                    </button>
                    <button
                      onClick={() => deleteSequence(seq.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "create" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sequence Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome Series, Product Launch"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-4 mb-5">
            {steps.map((step, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Step {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500">
                      Send on day{" "}
                      <input
                        type="number"
                        min={0}
                        value={step.day_offset}
                        onChange={(e) => updateStep(i, "day_offset", parseInt(e.target.value) || 0)}
                        className="w-14 border border-gray-200 rounded px-2 py-0.5 text-xs ml-1"
                      />
                    </label>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(i)} className="text-xs text-red-400 hover:text-red-600">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <input
                  value={step.subject}
                  onChange={(e) => updateStep(i, "subject", e.target.value)}
                  placeholder="Email subject"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"
                />
                <textarea
                  value={step.body}
                  onChange={(e) => updateStep(i, "body", e.target.value)}
                  placeholder="Email body"
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addStep}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              + Add Step
            </button>
            <button
              onClick={saveSequence}
              disabled={saving || !name}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Sequence"}
            </button>
            {saveMsg && (
              <span className={`text-sm font-medium ${saveMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {enrollSeq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-gray-900 mb-1">Enroll Leads</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select leads to enroll in <strong>{enrollSeq.name}</strong>, or leave all unselected to enroll everyone.
            </p>

            <div className="max-h-52 overflow-y-auto border border-gray-100 rounded-xl mb-4">
              {leads.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 text-center">No leads found</p>
              ) : (
                leads.map((lead) => (
                  <label key={lead.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleLead(lead.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{lead.name || lead.email}</span>
                    <span className="text-xs text-gray-400 ml-auto">{lead.email}</span>
                  </label>
                ))
              )}
            </div>

            <p className="text-xs text-gray-400 mb-4">
              {selectedLeads.length === 0
                ? `Will enroll all ${leads.length} leads`
                : `${selectedLeads.length} lead(s) selected`}
            </p>

            {enrollMsg && (
              <p className={`text-sm font-medium mb-3 ${enrollMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {enrollMsg}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEnrollSeq(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={doEnroll}
                disabled={enrolling}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {enrolling ? "Enrolling…" : "Enroll"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
