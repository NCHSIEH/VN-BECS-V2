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

  const handleAutoCorrect = async (id: string) => {
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/reconciliation/${id}/autocorrect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'System Auto-Correction' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to auto-correct');
      setStatus({ type: 'success', msg: `Successfully resolved ${data.correctedCount} inconsistencies for report ${id}.` });
      loadReports();
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-6xl mx-auto w-full p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-clinical-bg border border-clinical-border rounded-xl p-6">
        <div className="flex justify-between items-center mb-6 border-b border-clinical-border pb-4">
          <h2 className="text-lg font-bold text-clinical-text flex items-center gap-2">
            <FileCheck className="text-purple-600" />
            SOP 10: Daily Reconciliation Reports
          </h2>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-clinical-text px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
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
                resolved ? 'bg-clinical-bg border-clinical-border' :
                hasConflicts ? 'bg-rose-950/20 border-rose-900/50' :
                'bg-clinical-bg border-clinical-border'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-clinical-text font-bold">{r.id}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        resolved ? 'bg-lime-950/30 text-lime-400 border-lime-900' :
                        hasConflicts ? 'bg-rose-950/30 text-rose-600 border-rose-900' :
                        'bg-blue-50 text-blue-600 border-blue-900'
                      }`}>
                        {resolved ? 'Resolved' : hasConflicts ? 'Needs Review' : 'Pending Review'}
                      </span>
                    </div>
                    <div className="text-xs text-clinical-muted">Date: {r.date} | Hospital: {r.hospitalId}</div>
                  </div>
                  {!resolved && (
                    <div className="flex gap-2">
                      {hasConflicts && (
                        <button 
                          onClick={() => handleAutoCorrect(r.id)}
                          disabled={loading}
                          className="bg-purple-950/40 border border-purple-800 hover:border-purple-600 text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-900/10 disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.982-11.795H14l1-6-8.982 11.795h5.813z" />
                          </svg>
                          Auto-Correct Data
                        </button>
                      )}
                      <button 
                        onClick={() => handleResolve(r.id)}
                        disabled={loading}
                        className="bg-clinical-bg border border-clinical-border hover:border-slate-500 text-clinical-text px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-clinical-bg p-3 rounded-lg border border-clinical-border">
                    <div className="text-[10px] text-clinical-muted uppercase font-bold mb-2">Borrowed Units ({borrowed.length})</div>
                    <div className="text-xs text-clinical-muted font-mono flex flex-wrap gap-1">
                      {borrowed.map((u: string, idx: number) => (
                        <span key={idx} className="bg-clinical-card px-1.5 py-0.5 rounded">{u}</span>
                      ))}
                      {borrowed.length === 0 && 'None'}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${hasConflicts ? 'bg-rose-950/30 border-rose-900/50' : 'bg-clinical-bg border-clinical-border'}`}>
                    <div className={`text-[10px] uppercase font-bold mb-2 ${hasConflicts ? 'text-rose-600' : 'text-clinical-muted'}`}>
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
                  <div className="mt-3 text-[10px] text-clinical-muted border-t border-clinical-border pt-2 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-lime-500" />
                    Resolved by {r.resolvedBy} at {new Date(r.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
          {reports.length === 0 && !loading && (
            <div className="text-center p-8 text-clinical-muted text-sm">No reconciliation reports found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
