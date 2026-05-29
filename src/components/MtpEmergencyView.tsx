import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, Zap, History, ClipboardCheck, Barcode, UserCircle, Activity, AlertTriangle, FileWarning, ArrowRight, ChevronDown } from 'lucide-react';
import { useI18n } from '../lib/i18n';


export function MtpEmergencyView() {
  const { t } = useI18n();
  const [mtpCases, setMtpCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivate, setShowActivate] = useState(false);
  const [showBreakGlass, setShowBreakGlass] = useState(false);
  
  // Patient Selection State
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Form state
  const [location, setLocation] = useState('ER - Trauma Bay 1');
  const [doctor, setDoctor] = useState('Dr. Nguyen (ER Lead)');
  
  // CDSS State
  const [showCdssAlert, setShowCdssAlert] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Break-glass state
  const [bgReason, setBgReason] = useState('Massive Hemorrhage - Unidentified Patient');
  const [bgDoctor, setBgDoctor] = useState('Dr. Tran');

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/v1/mtp-cases');
      const data = await res.json();
      setMtpCases(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/v1/patients');
      const data = await res.json();
      setPatientsList(data);
      if (data && data.length > 0) {
        setSelectedPatient(data[0]); // Select first patient by default
      }
    } catch (e) {
      console.error('Failed to fetch patients:', e);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchPatients();
    const interval = setInterval(fetchCases, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleActivate = async () => {
    // 實作 CDSS 攔截點：動態檢查病患身上的高風險標籤
    if (selectedPatient.specimenExpired || selectedPatient.hasAntibody) {
      setShowCdssAlert(true);
      return; // 致命攔截：不允許送出 API
    }

    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/mtp-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientIdentifier: selectedPatient.id,
          authorizedClinician: doctor,
          clinicalScenario: location,
          status: 'ACTIVE'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowActivate(false);
        fetchCases();
      } else {
        setErrorMsg(`ACTIVATION FAILED: ${data.error || data.message || 'Access Denied'}`);
      }
    } catch (e) {
      setErrorMsg("Network Error");
    }
  };

  const handleBreakGlass = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/mtp-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientIdentifier: 'UNKNOWN_EMERGENCY_' + Math.floor(Math.random()*1000),
          authorizedClinician: bgDoctor,
          clinicalScenario: 'EMERGENCY_RELEASE',
          notes: bgReason,
          status: 'ACTIVE',
          isBreakGlass: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowBreakGlass(false);
        fetchCases();
      } else {
        setErrorMsg(`BREAK-GLASS FAILED: ${data.error || data.message || 'Access Denied'}`);
      }
    } catch (e) {
      setErrorMsg("Network Error");
    }
  };

  const handleIssueUnit = async (caseId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/mtp-cases/${caseId}/issue`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchCases();
      } else {
        setErrorMsg(`ISSUE FAILED: ${data.error || data.message || 'Access Denied'}`);
      }
    } catch (e) {
      setErrorMsg("Network Error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 p-6">
      {errorMsg && (
        <div className="bg-rose-950/20 p-4 rounded-[20px] border border-rose-900/30 text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-pulse shadow-lg">
          <ShieldAlert size={16} />
          {errorMsg}
        </div>
      )}
      {/* Strategic MTP Command Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-clinical-card p-8 rounded-[24px] border-l-4 border-l-rose-600 border border-clinical-border shadow-sm relative overflow-hidden">
         <div className="absolute -top-10 -right-10 opacity-5">
            <ShieldAlert size={200} className="text-rose-600" />
         </div>
         <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                  <Zap size={24} />
               </div>
               <div>
                  <h1 className="text-3xl font-bold text-clinical-text uppercase tracking-tight">{t('mtp_title') || 'Massive Transfusion Protocol'}</h1>
                  <p className="text-rose-600 font-semibold uppercase tracking-wider text-xs mt-1">Circular 26/2013/TT-BYT Compliant &middot; Rapid Release</p>
               </div>
            </div>
         </div>
         <div className="flex gap-4 relative z-10 w-full md:w-auto">
           <button
             onClick={() => setShowBreakGlass(true)}
             className="flex-1 md:flex-none px-6 py-4 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs border border-orange-200"
           >
             <FileWarning size={18} /> Break-Glass (O-Neg)
           </button>
           <button
             onClick={() => setShowActivate(true)}
             className="flex-1 md:flex-none px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
           >
             <ShieldAlert size={18} /> {t('mtp_activate_btn') || 'Activate MTP'}
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Active Resuscitation Streams */}
        <div className="xl:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold text-clinical-text uppercase tracking-wider flex items-center gap-2">
                 <Activity size={18} className="text-rose-600" /> {t('mtp_monitor') || 'Active Protocol Monitor'}
              </h2>
              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                 {mtpCases.length} {t('national_surveillance') || 'Active Cases'}
              </span>
           </div>
           
           {mtpCases.length === 0 ? (
             <div className="clinical-card p-16 flex flex-col items-center justify-center text-clinical-muted border-dashed border-2 bg-clinical-bg">
                <ShieldAlert size={48} className="opacity-20 mb-4 text-clinical-muted" />
                <p className="font-bold uppercase tracking-wider text-sm">{t('mtp_no_active') || 'No active MTP cases'}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-6">
                {mtpCases.map(mtp => (
                  <MtpCaseCard key={mtp.id} mtp={mtp} onIssue={() => handleIssueUnit(mtp.id)} />
                ))}
             </div>
           )}
        </div>

        {/* Tactical Guidelines & Triage */}
        <div className="xl:col-span-1 space-y-6">
           <div className="flex items-center gap-2 px-2">
              <ClipboardCheck className="text-clinical-text" size={18} />
              <h2 className="text-sm font-bold text-clinical-text uppercase tracking-wider">Circular 26/2013/TT-BYT Guidelines</h2>
           </div>
           
           <div className="clinical-card p-6 bg-clinical-card border-clinical-border space-y-6">
              <div className="space-y-4">
                 <GuidelineItem step="1" title="Immediate Release (O-)" desc="Issue uncrossmatched O- PRBCs immediately upon physician approval (SOP 10)." active />
                 <GuidelineItem step="2" title="Retrospective Sample" desc="Collect patient sample for crossmatch as soon as possible." active={mtpCases.some(c => c.currentRound >= 1)} />
                 <GuidelineItem step="3" title="Ratio Transfusion (1:1:1)" desc="Maintain balanced ratio of PRBC:FFP:PLT to prevent coagulopathy." active={mtpCases.some(c => c.unitsIssued >= 4)} />
                 <GuidelineItem step="4" title="Mandatory Documentation" desc="Update all records post-emergency. Retrospective testing mandatory within 24h." />
              </div>

              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-start gap-3">
                 <AlertTriangle size={20} className="text-orange-600 shrink-0 mt-0.5" />
                 <div>
                    <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wide">Compliance Alert</h4>
                    <p className="text-xs text-orange-700 mt-1 leading-relaxed">Emergency uncrossmatched blood release requires documented authorization by the attending physician per Article 17, Circular 26.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Activation Portal */}
      {showActivate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-clinical-bg backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="clinical-card max-w-lg w-full bg-clinical-card border-clinical-border p-8 shadow-2xl">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-bold text-clinical-text uppercase tracking-tight">Initiate MTP</h3>
                   <p className="text-rose-600 text-xs font-bold uppercase tracking-wider mt-1">Standard Protocol</p>
                </div>
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                   <Zap size={24} />
                </div>
             </div>
             
             <div className="space-y-5">
                 <div className="space-y-1.5 relative">
                   <label className="text-xs font-bold text-clinical-muted uppercase tracking-wider">Patient Profile (MRN)</label>
                   
                   <div 
                     onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                     className="clinical-input flex items-center justify-between cursor-pointer bg-clinical-bg/80 border-clinical-border/80 hover:border-rose-500/50 transition-colors"
                   >
                      <div className="flex flex-col gap-0.5">
                         {selectedPatient ? (
                           <>
                             <span className="font-bold text-clinical-text uppercase tracking-widest">{selectedPatient.id}</span>
                             <span className="text-clinical-muted text-[10px] font-bold uppercase">{selectedPatient.name}</span>
                           </>
                         ) : (
                           <span className="font-bold text-clinical-muted uppercase tracking-widest">Loading patients...</span>
                         )}
                      </div>
                      <ChevronDown size={18} className={`text-clinical-muted transition-transform ${showPatientDropdown ? 'rotate-180' : ''}`} />
                   </div>
                   
                   {showPatientDropdown && selectedPatient && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto">
                        {patientsList.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => { setSelectedPatient(p); setShowPatientDropdown(false); }}
                            className={`p-4 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors ${selectedPatient.id === p.id ? 'bg-slate-800/50 border-l-2 border-l-rose-500' : 'border-l-2 border-l-transparent'}`}
                          >
                             <div>
                                <div className="font-bold text-white text-sm uppercase tracking-widest">{p.id}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5 font-bold uppercase">{p.name} <span className="text-slate-600 mx-1">•</span> <span className="text-blue-400">{p.bloodType}</span></div>
                             </div>
                             <div className="flex gap-2">
                                {p.specimenExpired && <span title="Specimen Expired"><ShieldAlert size={16} className="text-rose-500" /></span>}
                                {p.hasAntibody && <span title="Antibodies Present"><AlertTriangle size={16} className="text-orange-500" /></span>}
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                 </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-clinical-muted uppercase tracking-wider">Location</label>
                   <input value={location} onChange={e=>setLocation(e.target.value)} className="clinical-input" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-clinical-muted uppercase tracking-wider">Authorized Clinician</label>
                   <input value={doctor} onChange={e=>setDoctor(e.target.value)} className="clinical-input" />
                </div>
             </div>
             
             <div className="mt-8 flex gap-4">
                <button onClick={() => setShowActivate(false)} className="flex-1 py-3 text-sm font-bold text-clinical-muted hover:text-clinical-text transition-colors bg-clinical-bg rounded-xl">Cancel</button>
                <button onClick={handleActivate} className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-md transition-all uppercase tracking-wide text-sm">
                   Initiate Protocol
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Break Glass Portal */}
      {showBreakGlass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-clinical-bg backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="clinical-card max-w-lg w-full bg-clinical-card border-orange-300 p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500"></div>

             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-bold text-orange-600 uppercase tracking-tight">Break-Glass Release</h3>
                   <p className="text-clinical-muted text-xs font-bold uppercase tracking-wider mt-1">Uncrossmatched O-Negative</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                   <FileWarning size={24} />
                </div>
             </div>

             <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mb-6 text-sm text-orange-800 font-medium">
                You are authorizing the emergency release of uncrossmatched blood. A retrospective crossmatch and formal documentation must be completed within 24 hours per SOP 10.
             </div>

             <div className="space-y-5">
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-clinical-muted uppercase tracking-wider">Authorizing Clinician (Mandatory)</label>
                   <input value={bgDoctor} onChange={e=>setBgDoctor(e.target.value)} className="clinical-input border-orange-200 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-clinical-muted uppercase tracking-wider">Emergency Reason</label>
                   <input value={bgReason} onChange={e=>setBgReason(e.target.value)} className="clinical-input border-orange-200 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
             </div>

             <div className="mt-8 flex gap-4">
                <button onClick={() => setShowBreakGlass(false)} className="flex-1 py-3 text-sm font-bold text-clinical-muted hover:text-clinical-text transition-colors bg-clinical-bg rounded-xl">Cancel</button>
                <button onClick={handleBreakGlass} className="flex-[2] bg-orange-600 hover:bg-orange-700 text-clinical-text font-bold py-3 rounded-xl shadow-md transition-all uppercase tracking-wide text-sm flex justify-center items-center gap-2">
                   Authorize Release <ArrowRight size={18} />
                </button>
             </div>
          </div>
        </div>
      )}

      {/* CDSS Dual Alert Interception Overlay */}
      {showCdssAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95 duration-300">
           <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-rose-900/20 relative overflow-hidden">
              {/* Patient Profile Header */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-800">
                 <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center">
                    <UserCircle size={32} className="text-slate-400" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight uppercase">{selectedPatient.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedPatient.id}</span>
                       <span className="px-2 py-0.5 rounded-md bg-blue-900/50 text-blue-400 text-[10px] font-bold uppercase border border-blue-800/50">{selectedPatient.bloodType}</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 {/* Fatal Error 1: Specimen Expired */}
                 {selectedPatient.specimenExpired && (
                   <div className="bg-rose-950/40 border border-rose-900/50 rounded-2xl p-6 flex gap-5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600"></div>
                      <div className="mt-1">
                         <div className="w-10 h-10 rounded-full bg-rose-900/50 flex items-center justify-center text-rose-500">
                            <ShieldAlert size={20} />
                         </div>
                      </div>
                      <div>
                         <h4 className="text-lg font-bold text-rose-500 tracking-tight">Fatal Error: Specimen Expired</h4>
                         <p className="text-slate-300 text-sm mt-1 leading-relaxed">The latest patient blood specimen was drawn <strong className="text-white">{selectedPatient.specimenHours} hours ago</strong>. Per Circular 26/2013/TT-BYT, specimens for crossmatching must not exceed 72 hours.</p>
                         <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-900/30">
                            <AlertCircle size={14} className="text-rose-400" />
                            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Action Required: New Draw Required</span>
                         </div>
                      </div>
                   </div>
                 )}

                 {/* Warning 2: Antibody Blocking */}
                 {selectedPatient.hasAntibody && (
                   <div className="bg-orange-950/40 border border-orange-900/50 rounded-2xl p-6 flex gap-5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
                      <div className="mt-1">
                         <div className="w-10 h-10 rounded-full bg-orange-900/50 flex items-center justify-center text-orange-500">
                            <AlertTriangle size={20} />
                         </div>
                      </div>
                      <div>
                         <h4 className="text-lg font-bold text-orange-500 tracking-tight">Clinical Block: Irregular Antibody</h4>
                         <p className="text-slate-300 text-sm mt-1 leading-relaxed">FHIR historical records indicate the presence of <strong className="text-white">{selectedPatient.antibodyType}</strong> antibodies. To prevent hemolytic transfusion reactions (HTR), automated electronic crossmatching is strictly disabled.</p>
                         <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-950/50 border border-orange-900/30">
                            <History size={14} className="text-orange-400" />
                            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Protocol Switch: Manual AHG Enforced</span>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-4">
                 <button 
                   onClick={() => setShowCdssAlert(false)} 
                   className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-sm uppercase tracking-wider"
                 >
                    Acknowledge & Cancel Order
                 </button>
                 {/* 故意移除強制送出按鈕，展現 Hard Stop 邏輯 */}
                 <button 
                   disabled
                   className="px-6 py-3 bg-rose-900/20 border border-rose-900/30 text-rose-900/50 font-bold rounded-xl cursor-not-allowed text-sm uppercase tracking-wider flex items-center gap-2"
                 >
                    Override (Disabled)
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function MtpCaseCard({ mtp, onIssue }: { mtp: any, onIssue: () => void }) {
  const isEmergency = mtp.isBreakGlass;
  const progress = Math.min(((mtp.unitsIssued || 0) / (mtp.unitsTarget || 6)) * 100, 100);
  
  return (
    <div className={`clinical-card p-6 bg-clinical-card border ${isEmergency ? 'border-orange-300 shadow-orange-100' : 'border-clinical-border'} transition-all relative`}>
       {isEmergency && (
         <div className="absolute top-0 right-0 bg-orange-500 text-clinical-text text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
            Uncrossmatched / Break-Glass
         </div>
       )}
       
       <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-6 flex-1">
             <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isEmergency ? 'bg-orange-100 text-orange-600' : 'bg-rose-100 text-rose-600'}`}>
                   <UserCircle size={32} />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-clinical-text tracking-tight uppercase">{mtp.patientIdentifier}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active &middot; Round {mtp.currentRound || 1}</span>
                   </div>
                </div>
             </div>
             
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-clinical-bg rounded-xl border border-clinical-border">
                <MtpStat label="Clinician" value={mtp.authorizedClinician} />
                <MtpStat label="Location" value={mtp.clinicalScenario} />
                <MtpStat label="Time Active" value="14:22" highlight={!isEmergency} />
                <MtpStat label="Round Goal" value={`Pack ${mtp.currentRound || 1}`} highlight={isEmergency} />
             </div>

             {(mtp.unitsIssued || 0) >= 4 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                   <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                   <div>
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Ratio Warning</p>
                      <p className="text-xs text-amber-700 mt-0.5">Ensure 1:1:1 ratio (PRBC:FFP:PLT) is maintained per protocol.</p>
                   </div>
                </div>
             )}
          </div>

          <div className="w-full md:w-[280px] space-y-4">
             <div className="bg-clinical-bg rounded-xl p-5 border border-clinical-border">
                <div className="flex justify-between items-end mb-3">
                   <span className="text-xs font-bold text-clinical-muted uppercase tracking-wider">Units Issued</span>
                   <span className="text-3xl font-bold text-clinical-text leading-none">
                      {mtp.unitsIssued || 0}
                      <span className="text-xs text-clinical-muted ml-1">/{mtp.unitsTarget || 6}</span>
                   </span>
                </div>
                <div className="h-2 w-full bg-clinical-border rounded-full overflow-hidden">
                   <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isEmergency ? 'bg-orange-500' : 'bg-rose-500'}`}
                      style={{ width: `${progress}%` }} 
                   />
                </div>
             </div>

             <button 
               onClick={onIssue}
               className={`w-full text-clinical-text font-bold py-4 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide text-xs ${isEmergency ? 'bg-orange-600 hover:bg-orange-700' : 'bg-rose-600 hover:bg-rose-700'}`}
             >
                <Barcode size={18} /> Record Issue
             </button>

             {isEmergency && (
                 <button className="w-full bg-clinical-card border border-clinical-border hover:bg-clinical-bg text-clinical-text font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2">
                     <ClipboardCheck size={16}/> Submit Retro-Crossmatch
                 </button>
             )}
          </div>
       </div>
    </div>
  );
}

function MtpStat({ label, value, highlight }: any) {
   return (
      <div className="flex flex-col gap-1">
         <span className="text-[10px] font-bold text-clinical-muted uppercase tracking-wider">{label}</span>
         <p className={`text-sm font-bold ${highlight ? 'text-orange-600' : 'text-clinical-text'} truncate`} title={value}>{value}</p>
      </div>
   );
}


function GuidelineItem({ step, title, desc, active }: { step: string, title: string, desc: string, active?: boolean }) {
  return (
    <div className={`flex gap-3 p-3 rounded-xl border transition-all ${active ? 'bg-rose-50 border-rose-200' : 'bg-clinical-bg border-clinical-border opacity-60'}`}>
       <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${active ? 'bg-rose-600 text-white' : 'bg-slate-300 text-clinical-muted'}`}>
          {step}
       </div>
       <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${active ? 'text-clinical-text' : 'text-clinical-muted'}`}>{title}</h4>
          <p className="text-[10px] text-clinical-muted leading-tight">{desc}</p>
       </div>
    </div>
  );
}
