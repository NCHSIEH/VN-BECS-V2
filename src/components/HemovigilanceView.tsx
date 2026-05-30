/**
 * @fileoverview SOP 9: Hemovigilance / Adverse Reaction Module (T-404)
 * 8 reaction types per ISBT/CDC NHSN. Supports pause-all and lookback triggers.
 */
import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldAlert, 
  AlertOctagon, 
  Pause, 
  Eye, 
  CheckCircle2, 
  Activity, 
  Search, 
  Layers, 
  ShieldBan,
  Clock,
  User,
  ArrowRight
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { TraceabilityPanel } from "./TraceabilityPanel";
import type { AdverseReactionType, AlertSeverity, InventoryUnit } from "../types";

interface ReactionRecord {
  id: string;
  transfusionId: string;
  patientId: string;
  unitId?: string;
  batchId?: string;
  reactionType: AdverseReactionType;
  severity: AlertSeverity;
  description: string;
  actionsTaken: string;
  lookbackTriggered: boolean;
  allTransfusionsPaused: boolean;
  reportedBy: string;
  reportedAt: string;
}

const REACTION_LABELS: Record<AdverseReactionType, { label: string; desc: string }> = {
  FNHTR: { label: 'FNHTR', desc: 'Febrile Non-Hemolytic' },
  ALLERGIC: { label: 'Allergic', desc: 'Urticaria / Rash' },
  ANAPHYLACTIC: { label: 'Anaphylactic', desc: 'Severe Anaphylaxis' },
  AHTR: { label: 'AHTR', desc: 'Acute Hemolytic' },
  DHTR: { label: 'DHTR', desc: 'Delayed Hemolytic' },
  TACO: { label: 'TACO', desc: 'Circulatory Overload' },
  TRALI: { label: 'TRALI', desc: 'Lung Injury' },
  BACTERIAL: { label: 'Bacterial', desc: 'Bacterial Contamination' },
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  Low: 'text-emerald-600 bg-emerald-950/20 border-emerald-900/50',
  Medium: 'text-amber-400 bg-amber-950/20 border-amber-900/50',
  High: 'text-orange-600 bg-orange-950/20 border-orange-900/50',
  Critical: 'text-rose-500 bg-rose-950/20 border-rose-900/50',
};

export function HemovigilanceView() {
  const { t } = useI18n();
  const [records, setRecords] = useState<ReactionRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryUnit[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form
  const [transfusionId, setTransfusionId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [reactionType, setReactionType] = useState<AdverseReactionType>("FNHTR");
  const [severity, setSeverity] = useState<AlertSeverity>("Medium");
  const [description, setDescription] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [pauseAll, setPauseAll] = useState(false);
  const [triggerLookback, setTriggerLookback] = useState(false);

  const loadData = () => {
    fetch('/api/v1/adverse-reactions').then(res => res.json()).then(setRecords);
    fetch('/api/v1/inventory').then(res => res.json()).then(setInventory);
  };

  useEffect(() => { loadData(); }, []);

  const correlatedBatch = useMemo(() => {
    if (!unitId) return null;
    // Mock Batch Logic: Units with similar prefix or random batch assignment
    return `BATCH-${unitId.substring(1, 6)}`;
  }, [unitId]);

  const affectedUnits = useMemo(() => {
    if (!triggerLookback || !correlatedBatch) return [];
    return inventory.filter(u => u.status === 'AVAILABLE'); // Mock: In real app, match by batchId
  }, [triggerLookback, correlatedBatch, inventory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await fetch('/api/v1/adverse-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfusionId, patientId, unitId, batchId: correlatedBatch,
          reactionType, severity, description, actionsTaken, reportedBy, 
          pauseAll, triggerLookback
        })
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: t('hv_msg_reported', { batch: correlatedBatch || '' }) });
        setTransfusionId(""); setPatientId(""); setUnitId(""); setDescription(""); setActionsTaken(""); setReportedBy("");
        setPauseAll(false); setTriggerLookback(false);
        loadData();
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: t('hv_err_network') });
    }
  };

  const handleGlobalQuarantine = async () => {
    if (!correlatedBatch) return;
    if (confirm(t('hv_confirm_quarantine', { n: String(affectedUnits.length), batch: correlatedBatch }))) {
       // Mock API call
       setStatus({ type: 'success', msg: t('hv_isolation_success', { n: String(affectedUnits.length) }) });
    }
  };

  return (
    <div className="flex flex-col h-full gap-10 animate-in fade-in duration-1000">
      <div className="flex justify-between items-end border-b border-clinical-border pb-10">
         <div className="space-y-4">
            <div className="premium-subtitle">
               <ShieldAlert size={18} className="text-rose-500" />
               {t('hv_surveillance_sub')}
            </div>
            <h1 className="premium-heading">{t('hv_title')}</h1>
            <p className="text-clinical-muted text-[11px] font-black uppercase tracking-[0.3em] mt-4 opacity-80">{t('hv_subtitle')}</p>
         </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Report Form */}
        <div className="col-span-12 xl:col-span-4 bg-clinical-bg border border-clinical-border rounded-3xl p-8 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
          <h2 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] mb-8 border-b border-clinical-border pb-4">{t('hv_incident_reporting')}</h2>

          {status && (
            <div className={`p-4 rounded-2xl border mb-6 flex gap-3 items-start text-xs font-bold animate-in slide-in-from-top-4 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertOctagon size={18} />}
              {status.msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8 flex-1">
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="clinical-label">{t('hv_patient_mrn')}</label>
                  <input required value={patientId} onChange={e => setPatientId(e.target.value)}
                    placeholder="MRN-XXXX" className="clinical-input" />
               </div>
               <div>
                  <label className="clinical-label">{t('hv_unit_isbt')}</label>
                  <input required value={unitId} onChange={e => setUnitId(e.target.value)}
                    placeholder="=W0000..." className="clinical-input font-mono" />
               </div>
            </div>

            <div>
              <label className="clinical-label">{t('hv_reaction_class')}</label>
              <div className="grid grid-cols-4 gap-3">
                {(Object.keys(REACTION_LABELS) as AdverseReactionType[]).map(rt => (
                  <button key={rt} type="button" onClick={() => setReactionType(rt)}
                    className={`py-3 rounded-2xl text-[10px] font-black border transition-all uppercase tracking-tighter ${
                      reactionType === rt ? 'bg-rose-600 text-white border-rose-400 shadow-2xl scale-105' : 'bg-clinical-bg text-clinical-muted border-clinical-border hover:border-clinical-border'
                    }`}
                  >
                    {REACTION_LABELS[rt].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="clinical-label">{t('hv_severity')}</label>
              <div className="flex gap-3">
                {(['Low', 'Medium', 'High', 'Critical'] as AlertSeverity[]).map(s => (
                  <button key={s} type="button" onClick={() => setSeverity(s)}
                    className={`flex-1 py-3 rounded-2xl text-[11px] font-black border transition-all uppercase tracking-widest ${
                      severity === s ? SEVERITY_COLORS[s] + ' shadow-xl scale-105' : 'bg-clinical-bg text-clinical-muted border-clinical-border'
                    }`}
                  >
                    {t('hv_sev_' + s.toLowerCase())}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="clinical-label">{t('hv_clinical_narrative')}</label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)}
                placeholder={t('hv_narrative_placeholder')} className="clinical-input h-32 resize-none" />
            </div>

            <div className="p-8 bg-clinical-bg border border-clinical-border rounded-[32px] space-y-6 shadow-inner">
              <label className="flex items-center gap-4 text-clinical-muted text-[11px] font-black uppercase tracking-[0.2em] cursor-pointer hover:text-clinical-text transition-colors">
                <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${pauseAll ? 'bg-rose-600 border-rose-400 shadow-lg' : 'border-clinical-border'}`}>
                   {pauseAll && <Pause size={12} className="text-clinical-text" />}
                </div>
                <input type="checkbox" className="hidden" checked={pauseAll} onChange={e => setPauseAll(e.target.checked)} />
                {t('hv_lock_all')}
              </label>
              <label className="flex items-center gap-4 text-clinical-muted text-[11px] font-black uppercase tracking-[0.2em] cursor-pointer hover:text-clinical-text transition-colors">
                <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${triggerLookback ? 'bg-amber-500 border-amber-400 shadow-lg' : 'border-clinical-border'}`}>
                   {triggerLookback && <Eye size={12} className="text-clinical-text" />}
                </div>
                <input type="checkbox" className="hidden" checked={triggerLookback} onChange={e => setTriggerLookback(e.target.checked)} />
                {t('hv_trigger_lookback')}
              </label>
            </div>

            <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-5 rounded-[32px] transition-all shadow-xl shadow-rose-900/40 uppercase text-xs tracking-[0.3em] italic">
              {t('hv_transmit')}
            </button>
          </form>
        </div>

        {/* Analytics & Records */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6 min-h-0">
           {/* RTM-TRACE-01: donor<->recipient bidirectional lookback */}
           <TraceabilityPanel />

           {/* Lookback Intelligence Panel */}
           {triggerLookback && correlatedBatch && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 animate-in slide-in-from-right-8 duration-500 shadow-2xl">
                 <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                          <Layers size={28} />
                       </div>
                       <div>
                          <h3 className="text-xl font-black text-clinical-text uppercase italic tracking-tighter leading-none">{t('hv_lookback_engine')}</h3>
                          <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-widest mt-2">{t('hv_active_batch')}: <span className="text-amber-400">{correlatedBatch}</span></p>
                       </div>
                    </div>
                    <button 
                      onClick={handleGlobalQuarantine}
                      className="px-6 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/40 flex items-center gap-2"
                    >
                       <ShieldBan size={14} /> {t('hv_execute_isolation')}
                    </button>
                 </div>
                 <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {affectedUnits.slice(0, 5).map((u, i) => (
                       <div key={i} className="min-w-[140px] bg-clinical-bg border border-clinical-border p-4 rounded-2xl">
                          <div className="text-[10px] font-mono text-clinical-muted mb-2">{u.unitId}</div>
                          <div className="text-sm font-black text-clinical-text">{u.abo} {u.rhd === 'Positive' ? '+' : '-'}</div>
                          <div className="text-[9px] text-amber-500 font-black mt-2">{t('hv_linked_lot')}</div>
                       </div>
                    ))}
                    {affectedUnits.length > 5 && (
                       <div className="min-w-[100px] flex items-center justify-center text-clinical-muted font-black text-[10px] uppercase tracking-widest">
                          +{affectedUnits.length - 5} {t('hv_more')}
                       </div>
                    )}
                 </div>
              </div>
           )}

           <div className="flex-1 bg-clinical-bg border border-clinical-border rounded-3xl p-8 flex flex-col shadow-2xl min-h-0">
             <div className="flex justify-between items-center mb-8 border-b border-clinical-border pb-4">
                <h2 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] flex items-center gap-3">
                   <Clock size={16} className="text-sky-500" /> {t('hv_surveillance_log')}
                </h2>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                      <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t('hv_live_monitoring')}</span>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
               {records.map(r => (
                 <div key={r.id} className={`p-6 rounded-[32px] border transition-all hover:scale-[1.01] ${SEVERITY_COLORS[r.severity]}`}>
                   <div className="flex justify-between items-start mb-4">
                     <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-xl bg-clinical-bg flex items-center justify-center">
                           <ShieldAlert size={20} />
                        </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-clinical-text uppercase italic tracking-tight">{REACTION_LABELS[r.reactionType]?.label || r.reactionType}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{t('hv_txn_ref')}: {r.transfusionId}</span>
                       </div>
                       <div className="flex gap-2 ml-4">
                          {r.allTransfusionsPaused && <span className="text-[8px] bg-rose-950/50 text-rose-600 px-2 py-1 rounded-lg border border-rose-800/50 flex items-center gap-1 font-black uppercase tracking-widest"><Pause size={8} /> {t('hv_paused')}</span>}
                          {r.lookbackTriggered && <span className="text-[8px] bg-amber-950/50 text-amber-400 px-2 py-1 rounded-lg border border-amber-800/50 flex items-center gap-1 font-black uppercase tracking-widest"><Eye size={8} /> {t('hv_lookback')}</span>}
                       </div>
                     </div>
                     <div className="text-[10px] font-black text-clinical-muted opacity-60 font-mono tracking-widest">{r.id}</div>
                   </div>
                   <p className="text-xs text-clinical-text font-medium leading-relaxed mb-4 pl-13 italic opacity-80">"{r.description}"</p>
                   <div className="flex items-center justify-between pt-4 border-t border-black/5">
                      <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2">
                            <User size={12} className="opacity-40" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{t('hv_reporter')}: {r.reportedBy}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <ArrowRight size={12} className="opacity-40" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{t('hv_batch')}: {r.batchId || 'N/A'}</span>
                         </div>
                      </div>
                      <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{new Date(r.reportedAt).toLocaleTimeString()}</span>
                   </div>
                 </div>
               ))}
               {records.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-clinical-muted italic">
                   <Activity size={48} className="opacity-10 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">{t('hv_no_events')}</p>
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
