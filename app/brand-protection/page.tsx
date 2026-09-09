"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Tab = "facts" | "rules" | "pause" | "log";

interface Fact {
  id: number; category: string; value: string; source: string | null;
  effective_at: string; expires_at: string | null; status: string;
}
interface Rule {
  id: number; rule_type: string; instruction: string; severity: string; active: boolean;
}
interface PauseState {
  id: number; scope: string; scope_value: string | null; reason: string;
  active: boolean; created_at: string;
}
interface ValidationResult {
  id: number; object_type: string; object_id: number; risk_level: string;
  findings: { type: string; message: string; severity?: string }[];
  action_taken: string; created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
  blocked: "bg-gray-900 text-white",
};

const CAT_COLORS: Record<string, string> = {
  price: "bg-green-100 text-green-700",
  contact: "bg-blue-100 text-blue-700",
  claim: "bg-purple-100 text-purple-700",
  phrase: "bg-indigo-100 text-indigo-700",
  policy: "bg-orange-100 text-orange-700",
  guarantee: "bg-pink-100 text-pink-700",
};

export default function BrandProtectionPage() {
  const [tab, setTab] = useState<Tab>("facts");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [pauses, setPauses] = useState<PauseState[]>([]);
  const [log, setLog] = useState<ValidationResult[]>([]);

  const [factForm, setFactForm] = useState({ category: "price", value: "", source: "", expires_at: "" });
  const [factSaving, setFactSaving] = useState(false);
  const [ruleForm, setRuleForm] = useState({ rule_type: "never_say", instruction: "", severity: "warning" });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [pauseModal, setPauseModal] = useState(false);
  const [pauseForm, setPauseForm] = useState({ scope: "all", scope_value: "", reason: "" });
  const [pauseSaving, setPauseSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchFacts = useCallback(async () => {
    try { setFacts(await api.get<Fact[]>("/brand-protection/facts")); } catch {}
  }, []);
  const fetchRules = useCallback(async () => {
    try { setRules(await api.get<Rule[]>("/brand-protection/rules")); } catch {}
  }, []);
  const fetchPauses = useCallback(async () => {
    try { setPauses(await api.get<PauseState[]>("/brand-protection/pause")); } catch {}
  }, []);
  const fetchLog = useCallback(async () => {
    try { setLog(await api.get<ValidationResult[]>("/brand-protection/validation-log")); } catch {}
  }, []);

  useEffect(() => {
    if (tab === "facts") fetchFacts();
    if (tab === "rules") fetchRules();
    if (tab === "pause") fetchPauses();
    if (tab === "log") fetchLog();
  }, [tab, fetchFacts, fetchRules, fetchPauses, fetchLog]);

  const addFact = async () => {
    if (!factForm.value) return;
    setFactSaving(true); setMsg("");
    try {
      await api.post("/brand-protection/facts", {
        ...factForm,
        expires_at: factForm.expires_at || null,
        source: factForm.source || null,
      });
      setFactForm({ category: "price", value: "", source: "", expires_at: "" });
      fetchFacts();
    } catch (e: any) { setMsg(e.message || "Failed"); }
    setFactSaving(false);
  };

  const addRule = async () => {
    if (!ruleForm.instruction) return;
    setRuleSaving(true); setMsg("");
    try {
      await api.post("/brand-protection/rules", ruleForm);
      setRuleForm({ rule_type: "never_say", instruction: "", severity: "warning" });
      fetchRules();
    } catch (e: any) { setMsg(e.message || "Failed"); }
    setRuleSaving(false);
  };

  const createPause = async () => {
    if (!pauseForm.reason) return;
    setPauseSaving(true); setMsg("");
    try {
      await api.post("/brand-protection/pause", {
        ...pauseForm,
        scope_value: pauseForm.scope_value || null,
      });
      setPauseModal(false);
      setPauseForm({ scope: "all", scope_value: "", reason: "" });
      fetchPauses();
    } catch (e: any) { setMsg(e.message || "Failed"); }
    setPauseSaving(false);
  };

  const deactivatePause = async (id: number) => {
    try { await api.del(`/brand-protection/pause/${id}`); fetchPauses(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Brand Protection</h1>
        <p className="text-sm text-gray-500 mt-1">Approved facts, brand rules, emergency pause, and content validation</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["facts", "rules", "pause", "log"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "facts" ? "Approved Facts" : t === "rules" ? "Brand Rules" : t === "pause" ? "⏸ Pause Controls" : "Validation Log"}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-red-500 mb-4">{msg}</p>}

      {/* APPROVED FACTS */}
      {tab === "facts" && (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Approved Fact</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={factForm.category} onChange={e => setFactForm(p => ({...p, category: e.target.value}))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                {["price", "contact", "claim", "phrase", "policy", "guarantee"].map(c => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
              <input value={factForm.source} onChange={e => setFactForm(p => ({...p, source: e.target.value}))}
                placeholder="Source (optional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
              <input value={factForm.value} onChange={e => setFactForm(p => ({...p, value: e.target.value}))}
                placeholder='Value e.g. "₦50,000" or "+2348012345678"'
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 bg-white text-gray-900 placeholder-gray-400" />
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Expires at (optional)</label>
                <input type="datetime-local" value={factForm.expires_at} onChange={e => setFactForm(p => ({...p, expires_at: e.target.value}))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 w-full" />
              </div>
            </div>
            <button onClick={addFact} disabled={factSaving || !factForm.value}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {factSaving ? "Saving..." : "+ Add Fact"}
            </button>
          </div>

          {facts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-xl">
              No approved facts yet. Add prices, contact details, and claims the AI is allowed to use.
            </p>
          ) : (
            <div className="space-y-2">
              {facts.map((f) => (
                <div key={f.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CAT_COLORS[f.category] ?? "bg-gray-100 text-gray-500"}`}>{f.category}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.value}</p>
                      {f.source && <p className="text-xs text-gray-400 mt-0.5">Source: {f.source}</p>}
                      {f.expires_at && (
                        <p className={`text-xs mt-0.5 ${new Date(f.expires_at) < new Date() ? "text-red-500" : "text-gray-400"}`}>
                          Expires: {new Date(f.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={async () => { if (confirm("Delete?")) { await api.del(`/brand-protection/facts/${f.id}`); fetchFacts(); }}}
                    className="text-gray-300 hover:text-red-400 text-lg ml-4 flex-shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BRAND RULES */}
      {tab === "rules" && (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Brand Rule</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={ruleForm.rule_type} onChange={e => setRuleForm(p => ({...p, rule_type: e.target.value}))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                <option value="never_say">Never Say</option>
                <option value="always_include">Always Include</option>
                <option value="tone_check">Tone Check</option>
                <option value="claim_check">Claim Check</option>
                <option value="contact_check">Contact Check</option>
              </select>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Severity:</span>
                <button onClick={() => setRuleForm(p => ({...p, severity: p.severity === "warning" ? "block" : "warning"}))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${ruleForm.severity === "block" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {ruleForm.severity === "block" ? "🚫 Block" : "⚠️ Warning"}
                </button>
              </div>
              <textarea value={ruleForm.instruction} onChange={e => setRuleForm(p => ({...p, instruction: e.target.value}))}
                placeholder='e.g. "guaranteed results" or "100% success rate"'
                rows={2} className="border border-gray-200 rounded-lg px-3 py-2 text-sm col-span-2 resize-none bg-white text-gray-900 placeholder-gray-400" />
            </div>
            <button onClick={addRule} disabled={ruleSaving || !ruleForm.instruction}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {ruleSaving ? "Saving..." : "+ Add Rule"}
            </button>
          </div>

          {rules.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-xl">
              No brand rules yet. Add phrases the AI must never say, or things it must always include.
            </p>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 capitalize whitespace-nowrap">
                      {r.rule_type.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.severity === "block" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {r.severity === "block" ? "🚫 Block" : "⚠️ Warning"}
                    </span>
                    <p className="text-sm text-gray-800">{r.instruction}</p>
                  </div>
                  <button onClick={async () => { if (confirm("Delete?")) { await api.del(`/brand-protection/rules/${r.id}`); fetchRules(); }}}
                    className="text-gray-300 hover:text-red-400 text-lg ml-4 flex-shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAUSE CONTROLS */}
      {tab === "pause" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Active pauses block all publishing in their scope immediately.</p>
            <button onClick={() => setPauseModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
              🚨 Emergency Pause
            </button>
          </div>

          {pauses.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-semibold text-green-800">All publishing is active</p>
              <p className="text-sm text-green-600 mt-1">No active pauses. Use Emergency Pause to stop publishing instantly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pauses.map((p) => (
                <div key={p.id} className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">{p.scope}</span>
                      {p.scope_value && <span className="text-xs text-red-600 font-medium">{p.scope_value}</span>}
                    </div>
                    <p className="text-sm font-semibold text-red-900">{p.reason}</p>
                    <p className="text-xs text-red-500 mt-1">Since {new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deactivatePause(p.id)}
                    className="px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 ml-4 flex-shrink-0">
                    Deactivate
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Emergency Pause Modal */}
          {pauseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="font-semibold text-gray-900 mb-4">🚨 Emergency Pause</h3>
                <div className="space-y-3">
                  <select value={pauseForm.scope} onChange={e => setPauseForm(p => ({...p, scope: e.target.value, scope_value: ""}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900">
                    <option value="all">All Publishing</option>
                    <option value="platform">Specific Platform</option>
                    <option value="feature">Specific Feature</option>
                  </select>
                  {pauseForm.scope !== "all" && (
                    <input value={pauseForm.scope_value} onChange={e => setPauseForm(p => ({...p, scope_value: e.target.value}))}
                      placeholder={pauseForm.scope === "platform" ? "e.g. facebook, instagram" : "e.g. auto_reply, scheduler"}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400" />
                  )}
                  <textarea value={pauseForm.reason} onChange={e => setPauseForm(p => ({...p, reason: e.target.value}))}
                    placeholder="Reason for pause (required)" rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none bg-white text-gray-900 placeholder-gray-400" />
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setPauseModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={createPause} disabled={pauseSaving || !pauseForm.reason}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    {pauseSaving ? "Pausing..." : "Activate Pause"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VALIDATION LOG */}
      {tab === "log" && (
        <div className="space-y-3">
          {log.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-xl">
              No validation results yet. Results appear when content is validated before publishing.
            </p>
          ) : (
            log.map((v) => (
              <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 capitalize">{v.object_type.replace(/_/g, " ")} #{v.object_id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RISK_COLORS[v.risk_level] ?? "bg-gray-100 text-gray-500"}`}>
                      {v.risk_level}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{v.action_taken}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                {v.findings.length > 0 ? (
                  <div className="space-y-1">
                    {v.findings.map((f, i) => (
                      <p key={i} className="text-xs text-gray-600">
                        <span className={`font-medium ${f.severity === "high" ? "text-red-600" : f.severity === "medium" ? "text-yellow-600" : "text-gray-500"}`}>
                          [{f.type.replace(/_/g, " ")}]
                        </span>{" "}
                        {f.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-green-600">✓ No issues found</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
