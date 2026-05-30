import React, { useState } from "react";
import { GitBranch, Search, Loader2, ArrowRight, AlertTriangle, Droplet, UserCircle } from "lucide-react";
import { useI18n } from "../lib/i18n";

/**
 * RTM-TRACE-01 operator panel: donor<->recipient bidirectional lookback.
 * Calls GET /api/v1/trace (RBAC-restricted) and renders the report.
 */
export function TraceabilityPanel() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<null | "donor" | "unit">(null);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (mode: "donor" | "unit") => {
    if (!query.trim()) return;
    setLoading(mode);
    setError(null);
    setReport(null);
    try {
      const param = mode === "donor" ? "donorId" : "unitId";
      const res = await fetch(`/api/v1/trace?${param}=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || t("trace_err"));
        return;
      }
      setReport(data);
    } catch {
      setError(t("trace_err"));
    } finally {
      setLoading(null);
    }
  };

  const reactionBadge = (n: number) =>
    n > 0 ? (
      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
        <AlertTriangle size={9} /> {n} {t("trace_reactions")}
      </span>
    ) : null;

  return (
    <div className="bg-clinical-bg border border-clinical-border rounded-3xl p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-clinical-border pb-4">
        <GitBranch size={18} className="text-sky-500" />
        <div>
          <h2 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em]">{t("trace_title")}</h2>
          <p className="text-[9px] font-bold text-clinical-muted uppercase tracking-widest opacity-70 mt-0.5">{t("trace_subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("trace_placeholder")}
            className="clinical-input pl-11 w-full font-mono text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => run("donor")} disabled={!!loading}
            className="px-4 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center gap-2 transition-all">
            {loading === "donor" ? <Loader2 size={14} className="animate-spin" /> : <UserCircle size={14} />} {t("trace_btn_donor")}
          </button>
          <button onClick={() => run("unit")} disabled={!!loading}
            className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center gap-2 transition-all">
            {loading === "unit" ? <Loader2 size={14} className="animate-spin" /> : <Droplet size={14} />} {t("trace_btn_unit")}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-bold mb-4">{error}</div>
      )}

      {report && !report.found && (
        <div className="p-6 text-center text-clinical-muted text-[11px] font-black uppercase tracking-widest">{t("trace_not_found")}</div>
      )}

      {/* FORWARD: donor -> recipients */}
      {report?.found && report.direction === "forward" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-clinical-card p-4 rounded-2xl border border-clinical-border">
            <div>
              <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t("trace_donor")}</span>
              <p className="text-base font-black text-clinical-text uppercase italic">{report.donor?.name} <span className="text-sky-400 font-mono text-xs">{report.donor?.bloodType}{report.donor?.rhd === "Negative" ? "-" : "+"}</span></p>
              <p className="text-[10px] font-mono text-clinical-muted">{report.donor?.id} · {report.donor?.nationalId}</p>
            </div>
            <div className="flex gap-4 text-center">
              {(["donationCount", "unitCount", "recipientCount", "reactionCount"] as const).map((k, i) => (
                <div key={k}>
                  <p className={`text-2xl font-black ${k === "reactionCount" && report.summary[k] > 0 ? "text-rose-500" : "text-clinical-text"}`}>{report.summary[k]}</p>
                  <p className="text-[8px] font-black text-clinical-muted uppercase tracking-widest">{[t("trace_donation"), t("trace_units"), t("trace_recipients"), t("trace_reactions")][i]}</p>
                </div>
              ))}
            </div>
          </div>

          {report.donations.map((dn: any) => (
            <div key={dn.id} className="border border-clinical-border rounded-2xl overflow-hidden">
              <div className="bg-clinical-card px-4 py-2 text-[10px] font-black text-clinical-muted uppercase tracking-widest flex justify-between">
                <span>{t("trace_donation")}: <span className="text-clinical-text font-mono">{dn.id}</span></span>
                <span>{dn.collectedAt ? new Date(dn.collectedAt).toLocaleDateString() : ""} · {dn.volume}ml</span>
              </div>
              <div className="divide-y divide-clinical-border">
                {dn.units.map((u: any) => (
                  <div key={u.componentId} className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs font-black text-clinical-text">{u.componentId}</span>
                      <span className="text-[9px] bg-clinical-bg border border-clinical-border px-2 py-0.5 rounded-md text-clinical-muted font-black uppercase">{u.type}</span>
                      <span className="text-[9px] text-clinical-muted font-black uppercase">{u.status}</span>
                      {u.idmStatus && <span className="text-[9px] text-emerald-500 font-black uppercase">{t("trace_idm")}:{u.idmStatus}</span>}
                    </div>
                    {u.recipients.length === 0 ? (
                      <p className="text-[10px] text-clinical-muted italic">{t("trace_no_recipients")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {u.recipients.map((r: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-2 bg-clinical-bg border border-clinical-border rounded-xl px-3 py-1.5">
                            <ArrowRight size={10} className="text-clinical-muted" />
                            <span className="text-[10px] font-black text-clinical-text uppercase">{r.patientName || r.patientId}</span>
                            <span className="text-[8px] text-clinical-muted uppercase">{t("trace_via")} {r.via}</span>
                            {reactionBadge(r.reactions.length)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BACKWARD: unit -> donor */}
      {report?.found && report.direction === "backward" && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="bg-clinical-card p-4 rounded-2xl border border-clinical-border">
            <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t("trace_unit")}</span>
            <p className="font-mono text-sm font-black text-clinical-text">{report.unit?.componentId} <span className="text-clinical-muted">· {report.unit?.status} · {report.unit?.abo}{report.unit?.rhd === "Negative" ? "-" : "+"}</span></p>
          </div>
          <div className="flex items-center gap-3 text-clinical-muted">
            <ArrowRight size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t("trace_donation")}: <span className="text-clinical-text font-mono">{report.donation?.id || "—"}</span></span>
          </div>
          <div className="bg-clinical-card p-4 rounded-2xl border border-sky-500/30">
            <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t("trace_donor")}</span>
            <p className="text-base font-black text-clinical-text uppercase italic">{report.donor?.name || "—"} <span className="text-sky-400 font-mono text-xs">{report.donor?.bloodType}{report.donor?.rhd === "Negative" ? "-" : "+"}</span></p>
            <p className="text-[10px] font-mono text-clinical-muted">{report.donor?.id} · {report.donor?.nationalId}</p>
          </div>
        </div>
      )}
    </div>
  );
}
