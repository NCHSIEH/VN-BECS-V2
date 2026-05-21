/**
 * @fileoverview SOP 7: Crossmatch Module (T-401)
 * Supports IS/AHG/EXM methods with clinical validation guards.
 */
import React, { useState, useEffect, useMemo } from "react";
import { FlaskConical, ShieldCheck, ShieldAlert, AlertCircle, CheckCircle2, Clock, Search } from "lucide-react";
import type { CrossmatchMethod, CrossmatchResult, Patient } from "../types";

interface CrossmatchRecord {
  id: string;
  componentId: string;
  patientId: string;
  method: CrossmatchMethod;
  result: CrossmatchResult;
  testedBy: string;
  specimenDate: string;
  createdAt: string;
}

export function CrossmatchView() {
  const [records, setRecords] = useState<CrossmatchRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form state
  const [componentId, setComponentId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [method, setMethod] = useState<CrossmatchMethod>("IS");
  const [specimenDate, setSpecimenDate] = useState(new Date().toISOString().split('T')[0]);
  const [testedBy, setTestedBy] = useState("");

  const loadData = () => {
    fetch('/api/v1/crossmatch').then(res => res.json()).then(setRecords).catch(console.error);
    fetch('/api/v1/mdm/patients').then(res => res.json()).then(setPatients).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  // Intelligence: Auto-lookup patient
  useEffect(() => {
    if (patientId.length >= 4) {
      const p = patients.find(p => p.mrn === patientId || p.id === patientId);
      setSelectedPatient(p || null);
    } else {
      setSelectedPatient(null);
    }
  }, [patientId, patients]);

  // Specimen validity: must be ≤3 days old
  const specimenAge = useMemo(() => {
    if (!specimenDate) return 99;
    return Math.floor((Date.now() - new Date(specimenDate).getTime()) / (24 * 60 * 60 * 1000));
  }, [specimenDate]);
  const specimenValid = specimenAge <= 3;

  // CDS logic: Anti-body matching
  const matchScore = useMemo(() => {
    if (!selectedPatient) return 0;
    // Simple score: starts at 100, drops if there are historical antibodies
    let score = 100;
    if (selectedPatient.antibodyHistory && selectedPatient.antibodyHistory.length > 0) score -= 30;
    return score;
  }, [selectedPatient]);

  const exmAllowed = method !== 'EXM' || !selectedPatient?.antibodyHistory?.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!specimenValid) {
      setStatus({ type: 'error', msg: 'Specimen expired (>3 days). Please collect a new sample.' });
      return;
    }
    if (!exmAllowed) {
      setStatus({ type: 'error', msg: 'EXM not allowed: patient has clinically significant antibodies. Use AHG instead.' });
      return;
    }

    try {
      const res = await fetch('/api/v1/crossmatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId, patientId, method, specimenDate, testedBy })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.message || data.error });
        return;
      }
      setStatus({ type: data.result === 'Incompatible' ? 'error' : 'success', msg: `Crossmatch result: ${data.result}` });
      loadData();
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Network Error' });
    }
  };

  return (
    <div className="flex flex-col h-full gap-8 max-w-7xl mx-auto w-full p-8 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Context */}
      <div className="flex items-center justify-between border-b border-clinical-border pb-8">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 italic">Clinical Protocol</span>
               <div className="h-px w-12 bg-clinical-bg"></div>
            </div>
            <h1 className="text-4xl font-black text-clinical-text tracking-tighter uppercase italic leading-none">Compatibility Intelligence</h1>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">System Confidence</span>
               <div className="flex items-center gap-3 mt-1">
                  <div className="h-1.5 w-40 bg-clinical-card rounded-full overflow-hidden p-0.5 border border-clinical-border shadow-inner">
                     <div className="h-full bg-purple-500 w-[98%] shadow-[0_0_10px_rgba(168,85,247,0.6)] rounded-full" />
                  </div>
                  <span className="text-[10px] font-black text-clinical-text">98%</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Form & Patient Context */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
           {/* Patient Discovery Card */}
           <div className={`clinical-card p-8 transition-all duration-500 ${selectedPatient ? 'border-purple-500/30 bg-purple-500/5 shadow-2xl shadow-purple-900/10' : 'bg-clinical-card/10'}`}>
              <div className="flex justify-between items-start mb-8">
                 <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] italic">Patient Interoperability (HIS)</h3>
                 {selectedPatient && <ShieldCheck className="text-emerald-500" size={20} />}
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className="block text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-2">Master Patient Index (MRN)</label>
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-purple-500 transition-colors" size={18} />
                       <input 
                         required 
                         value={patientId} 
                         onChange={e => setPatientId(e.target.value)}
                         placeholder="Enter MRN (e.g. MRN-1001)"
                         className="clinical-input pl-12 h-14 w-full" 
                       />
                    </div>
                 </div>

                 {selectedPatient ? (
                    <div className="p-6 bg-clinical-bg/80 border border-clinical-border rounded-[24px] animate-in zoom-in-95 duration-300">
                       <div className="flex justify-between mb-4">
                          <span className="text-lg font-black text-clinical-text uppercase italic">{selectedPatient.name}</span>
                          <span className="bg-emerald-500 text-clinical-text px-3 py-1 rounded-xl text-[10px] font-black uppercase">{selectedPatient.abo}{selectedPatient.rhd === 'Positive' ? '+' : '-'}</span>
                       </div>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] border-b border-clinical-border pb-2">
                             <span className="text-clinical-muted font-bold uppercase tracking-widest">Antibody History</span>
                             <span className={`font-black ${selectedPatient.antibodyHistory?.length ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {selectedPatient.antibodyHistory?.length ? selectedPatient.antibodyHistory.join(', ') : 'NEGATIVE'}
                             </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                             <span className="text-clinical-muted font-bold uppercase tracking-widest">Match Score</span>
                             <div className="flex items-center gap-2">
                                <span className="font-black text-clinical-text">{matchScore}%</span>
                                <div className="w-12 h-1 bg-clinical-card rounded-full overflow-hidden">
                                   <div className="h-full bg-purple-500" style={{ width: `${matchScore}%` }} />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : patientId.length >= 4 && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-bold italic">
                       <AlertCircle size={16} /> Patient Not Found in HIS Cache
                    </div>
                 )}
              </div>
           </div>

           {/* Test Configuration */}
           <div className="clinical-card p-8 bg-clinical-card/10">
              <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] mb-8 italic">Test Configuration</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                   <label className="block text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-2">Component Identifier (ISBT)</label>
                   <input required value={componentId} onChange={e => setComponentId(e.target.value)}
                     placeholder="DIN/Product (e.g. C-12345)"
                     className="clinical-input h-14 w-full font-mono" />
                </div>

                <div>
                   <label className="block text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-2">Methodological Protocol</label>
                   <div className="grid grid-cols-3 gap-3">
                     {(['IS', 'AHG', 'EXM'] as CrossmatchMethod[]).map(m => (
                       <button key={m} type="button" onClick={() => setMethod(m)}
                         className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                           method === m
                             ? 'bg-purple-600 text-clinical-text border-purple-500 shadow-lg shadow-purple-900/20 scale-105'
                             : 'bg-clinical-bg/50 text-clinical-muted border-clinical-border hover:border-slate-600'
                         }`}
                       >
                         {m}
                       </button>
                     ))}
                   </div>
                   <p className="text-[9px] text-clinical-muted mt-2 italic px-1">
                      {method === 'IS' && 'Immediate Spin: ABO incompatibility only.'}
                      {method === 'AHG' && 'Indirect Antiglobulin: Full antibody screen.'}
                      {method === 'EXM' && 'Electronic: System-validated matching.'}
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-2">Specimen Age</label>
                      <input type="date" value={specimenDate} onChange={e => setSpecimenDate(e.target.value)}
                        className={`clinical-input h-12 w-full text-xs ${specimenValid ? '' : 'border-rose-500 bg-rose-500/5'}`} />
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-2">Technician ID</label>
                      <input required value={testedBy} onChange={e => setTestedBy(e.target.value)}
                        placeholder="Auth Code"
                        className="clinical-input h-12 w-full text-xs" />
                   </div>
                </div>

                {status && (
                  <div className={`p-4 rounded-2xl border flex gap-3 items-center text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                    {status.msg}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={!specimenValid || !exmAllowed || !selectedPatient}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-20 disabled:cursor-not-allowed text-clinical-text font-black py-4 rounded-[24px] transition-all shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 uppercase tracking-[0.2em] italic text-xs"
                >
                  Authorize Crossmatch
                </button>
              </form>
           </div>
        </div>

        {/* Intelligence Ledger */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
           <div className="clinical-card p-8 bg-clinical-card/10 flex-1 flex flex-col min-h-[600px]">
              <div className="flex justify-between items-center mb-8 border-b border-clinical-border pb-6">
                 <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] italic">Historical Intelligence Ledger ({records.length})</h3>
                 <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {records.map(r => (
                  <div key={r.id} className={`p-6 rounded-[32px] border transition-all hover:scale-[1.01] flex justify-between items-center group ${
                    r.result === 'Compatible' ? 'border-emerald-500/20 bg-emerald-500/5' :
                    r.result === 'Incompatible' ? 'border-rose-500/20 bg-rose-500/5' :
                    'border-amber-500/20 bg-amber-500/5'
                  }`}>
                    <div className="flex items-center gap-6">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${
                          r.result === 'Compatible' ? 'bg-emerald-500/20 text-emerald-500' :
                          r.result === 'Incompatible' ? 'bg-rose-500/20 text-rose-500' :
                          'bg-amber-500/20 text-amber-500'
                       }`}>
                          {r.result === 'Compatible' ? <ShieldCheck size={28} /> :
                           r.result === 'Incompatible' ? <ShieldAlert size={28} /> :
                           <AlertCircle size={28} />}
                       </div>
                       <div>
                          <div className="flex gap-3 items-center mb-1">
                             <span className={`text-lg font-black italic tracking-tight uppercase ${
                               r.result === 'Compatible' ? 'text-emerald-500' :
                               r.result === 'Incompatible' ? 'text-rose-500' : 'text-amber-400'
                             }`}>{r.result}</span>
                             <span className="text-[9px] bg-clinical-card text-clinical-muted border border-clinical-border px-2 py-0.5 rounded-lg font-black uppercase tracking-widest">{r.method}</span>
                          </div>
                          <div className="text-[10px] text-clinical-muted font-bold uppercase tracking-widest">
                             Component: <span className="text-clinical-text font-mono">{r.componentId}</span> <span className="mx-2 text-clinical-text">|</span> MRN: <span className="text-clinical-text">{r.patientId}</span>
                          </div>
                       </div>
                    </div>
                    <div className="text-right space-y-1">
                       <div className="text-[10px] font-black text-clinical-text uppercase italic">{r.testedBy}</div>
                       <div className="flex items-center justify-end gap-2 text-[9px] text-clinical-muted font-bold uppercase tracking-widest">
                          <Clock size={12} /> {new Date(r.createdAt).toLocaleString()}
                       </div>
                    </div>
                  </div>
                ))}
                {records.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-clinical-text py-20 space-y-4">
                     <FlaskConical size={64} className="opacity-10" />
                     <p className="font-black uppercase tracking-[0.4em] text-xs italic">No Intelligence Found in Current Node</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
