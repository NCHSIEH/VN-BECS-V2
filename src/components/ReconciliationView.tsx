import React, { useState, useEffect } from "react";
import { FileCheck, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Tooltip } from "./Tooltip";

export function ReconciliationView() {
  const { t } = useI18n();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadReports = () => {
    setLoading(true);
    fetch('/api/v1/reconciliation')
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, []);

  const handleGenerate = async () => {
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/reconciliation/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: 'success', msg: `Generated ${data.reports.length} new daily reports.` });
      loadReports();
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setStatus(null);
    try {
      const res = await fetch(`/api/v1/reconciliation/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'System Admin' })
      });
      if (!res.ok) throw new Error('Failed to resolve');
      loadReports();
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-6xl mx-auto w-full p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-[#020617] border border-slate-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <FileCheck className="text-purple-400" />
            SOP 10: Daily Reconciliation Reports
          </h2>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Trigger Daily Job (06:00)
          </button>
        </div>

        {status && (
          <div className={`p-3 rounded-lg border mb-4 flex items-center gap-2 text-sm font-medium ${status.type === 'success' ? 'bg-lime-950/40 border-lime-900 text-lime-400' : 'bg-rose-950/40 border-rose-900 text-rose-500'}`}>
            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {status.msg}
          </div>
        )}

        <div className="space-y-4">
          {reports.map((r, i) => {
            const conflicts = JSON.parse(r.conflicts || '[]');
            const borrowed = JSON.parse(r.borrowedUnits || '[]');
            const hasConflicts = conflicts.length > 0;
            const resolved = !!r.resolvedAt;

            return (
              <div key={i} className={`p-4 rounded-xl border ${
                resolved ? 'bg-[#0b1120] border-slate-800' :
                hasConflicts ? 'bg-rose-950/20 border-rose-900/50' :
                'bg-[#020617] border-slate-700'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-slate-300 font-bold">{r.id}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        resolved ? 'bg-lime-950/30 text-lime-400 border-lime-900' :
                        hasConflicts ? 'bg-rose-950/30 text-rose-400 border-rose-900' :
                        'bg-blue-950/30 text-blue-400 border-blue-900'
                      }`}>
                        {resolved ? 'Resolved' : hasConflicts ? 'Needs Review' : 'Pending Review'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">Date: {r.date} | Hospital: {r.hospitalId}</div>
                  </div>
                  {!resolved && (
                    <button 
                      onClick={() => handleResolve(r.id)}
                      className="bg-[#0b1120] border border-slate-700 hover:border-slate-500 text-slate-300 px-3 py-1.5 rounded text-xs font-bold transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0b1120] p-3 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Borrowed Units ({borrowed.length})</div>
                    <div className="text-xs text-slate-400 font-mono flex flex-wrap gap-1">
                      {borrowed.map((u: string, idx: number) => (
                        <span key={idx} className="bg-slate-900 px-1.5 py-0.5 rounded">{u}</span>
                      ))}
                      {borrowed.length === 0 && 'None'}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${hasConflicts ? 'bg-rose-950/30 border-rose-900/50' : 'bg-[#0b1120] border-slate-800'}`}>
                    <div className={`text-[10px] uppercase font-bold mb-2 ${hasConflicts ? 'text-rose-400' : 'text-slate-500'}`}>
                      Conflicts Detected ({conflicts.length})
                    </div>
                    <div className="text-xs font-mono flex flex-wrap gap-1">
                      {conflicts.map((c: string, idx: number) => (
                        <span key={idx} className="bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-900">{c}</span>
                      ))}
                      {conflicts.length === 0 && <span className="text-lime-500">No conflicts</span>}
                    </div>
                  </div>
                </div>

                {resolved && (
                  <div className="mt-3 text-[10px] text-slate-500 border-t border-slate-800 pt-2 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-lime-500" />
                    Resolved by {r.resolvedBy} at {new Date(r.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
          {reports.length === 0 && !loading && (
            <div className="text-center p-8 text-slate-500 text-sm">No reconciliation reports found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
