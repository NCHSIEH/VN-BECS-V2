/**
 * @fileoverview SOP 8: Blood Issue & Return Module (T-402)
 * Tracks issue events with timestamps and enforces 30-min return window.
 */
import React, { useState, useEffect, useMemo } from "react";
import { Package, Undo2, Clock, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useI18n } from "../lib/i18n";

interface IssueRecord {
  id: string;
  componentId: string;
  patientId: string;
  issuedTo: string;
  issuedBy: string;
  issuedAt: string;
  returnedAt?: string;
  returnStatus?: string;
}

export function IssueReturnView() {
  const { t } = useI18n();
  const [records, setRecords] = useState<IssueRecord[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Issue form
  const [componentId, setComponentId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  // Return form
  const [returnId, setReturnId] = useState<string | null>(null);
  const [coldChainOk, setColdChainOk] = useState(true);
  const [visualOk, setVisualOk] = useState(true);

  const loadData = () => {
    fetch('/api/v1/issue')
      .then(res => res.json())
      .then(setRecords)
      .catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  // Calculate time since issue for active records
  const activeRecords = useMemo(() => {
    return records
      .filter(r => !r.returnedAt && r.returnStatus !== 'WASTED')
      .map(r => {
        const elapsed = (Date.now() - new Date(r.issuedAt).getTime()) / 60000;
        return { ...r, elapsedMinutes: Math.floor(elapsed) };
      });
  }, [records]);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await fetch('/api/v1/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId, patientId, issuedTo, issuedBy })
      });
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', msg: data.message || data.error }); return; }
      setStatus({ type: 'success', msg: `Blood unit ${componentId} issued successfully.` });
      setComponentId(""); setPatientId(""); setIssuedTo(""); setIssuedBy("");
      loadData();
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Network Error' });
    }
  };

  const handleReturn = async (recordId: string) => {
    setStatus(null);
    try {
      const res = await fetch(`/api/v1/issue/${recordId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coldChainOk, visualOk })
      });
      const data = await res.json();
      setStatus({ type: data.returnStatus === 'ColdChainOK' ? 'success' : 'error', msg: `Return status: ${data.returnStatus}` });
      setReturnId(null);
      loadData();
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Network Error' });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-6xl mx-auto w-full p-4 overflow-y-auto">
      <div className="grid grid-cols-12 gap-4">
        {/* Issue Form */}
        <div className="col-span-12 lg:col-span-5 bg-[#020617] border border-slate-700 rounded-xl p-5 flex flex-col">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4 flex items-center gap-2">
            <Package size={16} className="text-cyan-400" /> {t('iss_title')}
          </h2>

          {status && (
            <div className={`p-3 rounded-lg border mb-4 flex gap-2 items-center text-sm font-medium ${status.type === 'success' ? 'bg-lime-950/40 border-lime-900 text-lime-400' : 'bg-rose-950/40 border-rose-900 text-rose-500'}`}>
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
              {status.msg}
            </div>
          )}

          <form onSubmit={handleIssue} className="flex flex-col gap-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('iss_form_unit')}</label>
              <input required value={componentId} onChange={e => setComponentId(e.target.value)}
                placeholder="Scan barcode..." className="w-full bg-[#0b1120] border border-slate-700 rounded-lg px-4 py-2 text-slate-700 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('iss_form_patient')}</label>
              <input required value={patientId} onChange={e => setPatientId(e.target.value)}
                placeholder="MRN-XXXX" className="w-full bg-[#0b1120] border border-slate-700 rounded-lg px-4 py-2 text-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('iss_form_ward')}</label>
                <input required value={issuedTo} onChange={e => setIssuedTo(e.target.value)}
                  placeholder="e.g. ICU-3" className="w-full bg-[#0b1120] border border-slate-700 rounded-lg px-4 py-2 text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('mdm_user_name')}</label>
                <input required value={issuedBy} onChange={e => setIssuedBy(e.target.value)}
                  placeholder="Staff name" className="w-full bg-[#0b1120] border border-slate-700 rounded-lg px-4 py-2 text-slate-700" />
              </div>
            </div>
            <button type="submit" className="mt-auto bg-cyan-600 hover:bg-cyan-500 text-slate-800 font-bold py-3 rounded-xl transition shadow-lg">
              {t('iss_issue_btn')}
            </button>
          </form>
        </div>

        {/* Active Issues & Returns */}
        <div className="col-span-12 lg:col-span-7 bg-[#020617] border border-slate-700 rounded-xl p-5 flex flex-col">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4 flex justify-between">
            <span>Active Issues ({activeRecords.length})</span>
            <span className="text-[10px] text-amber-400 bg-amber-950/50 px-2 py-1 rounded">30-min return window</span>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {activeRecords.map(r => {
              const overTime = r.elapsedMinutes > 30;
              const warning = r.elapsedMinutes > 20 && !overTime;
              return (
                <div key={r.id} className={`p-3 rounded-lg border ${overTime ? 'border-rose-900/50 bg-rose-950/10 animate-pulse' : warning ? 'border-amber-900/50 bg-amber-950/10' : 'border-slate-700 bg-[#0b1120]'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-mono text-slate-700 font-bold">{r.componentId}</span>
                      <span className="text-xs text-slate-600 ml-2">→ {r.patientId}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-mono font-bold ${overTime ? 'text-rose-500' : warning ? 'text-amber-400' : 'text-lime-400'}`}>
                      <Clock size={12} />
                      {r.elapsedMinutes}m
                      {overTime && <span className="text-[10px] bg-rose-950/50 px-1.5 rounded ml-1">TIMEOUT</span>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 flex justify-between">
                    <span>Ward: {r.issuedTo} | By: {r.issuedBy}</span>
                    {returnId === r.id ? (
                      <div className="flex gap-2 items-center">
                        <label className="flex items-center gap-1 text-[10px]">
                          <input type="checkbox" checked={coldChainOk} onChange={e => setColdChainOk(e.target.checked)} /> {t('iss_lbl_coldchain')}
                        </label>
                        <label className="flex items-center gap-1 text-[10px]">
                          <input type="checkbox" checked={visualOk} onChange={e => setVisualOk(e.target.checked)} /> {t('iss_lbl_visual')}
                        </label>
                        <button onClick={() => handleReturn(r.id)} className="text-[10px] bg-amber-600 text-slate-800 px-2 py-0.5 rounded font-bold">{t('lims_form_submit')}</button>
                      </div>
                    ) : (
                      <button onClick={() => { setReturnId(r.id); setColdChainOk(true); setVisualOk(true); }}
                        className="text-[10px] bg-[#020617] border border-amber-800 text-amber-400 px-2 py-0.5 rounded font-bold hover:bg-amber-900/30 transition">
                        <Undo2 size={10} className="inline mr-1" />{t('iss_btn_return')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {activeRecords.length === 0 && (
              <div className="text-slate-600 text-sm text-center py-8">No active issues.</div>
            )}

            {/* Completed/Returned Records */}
            {records.filter(r => r.returnedAt || r.returnStatus === 'WASTED').length > 0 && (
              <>
                <div className="border-t border-slate-700 mt-4 pt-3">
                  <h3 className="text-xs font-bold text-slate-600 uppercase mb-2">History</h3>
                </div>
                {records.filter(r => r.returnedAt || r.returnStatus === 'WASTED').map(r => (
                  <div key={r.id} className="p-2 rounded border border-slate-800 bg-[#020617] flex justify-between items-center text-xs text-slate-600">
                    <span className="font-mono">{r.componentId} → {r.patientId}</span>
                    <span className={`font-bold ${r.returnStatus === 'ColdChainOK' ? 'text-lime-400' : 'text-rose-600'}`}>
                      {r.returnStatus || 'Returned'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
