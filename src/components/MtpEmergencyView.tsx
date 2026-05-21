import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, Zap, History, ClipboardCheck, Barcode, UserCircle, Activity, AlertTriangle, FileWarning, ArrowRight } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function MtpEmergencyView() {
  const { t } = useI18n();
  const [mtpCases, setMtpCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivate, setShowActivate] = useState(false);
  const [showBreakGlass, setShowBreakGlass] = useState(false);
  
  // Form state
  const [patientId, setPatientId] = useState('TRAUMA-' + Math.floor(Math.random()*9000 + 1000));
  const [location, setLocation] = useState('ER - Trauma Bay 1');
  const [doctor, setDoctor] = useState('Dr. Nguyen (ER Lead)');

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

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleActivate = async () => {
    await fetch('/api/v1/mtp-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientIdentifier: patientId,
        authorizedClinician: doctor,
        clinicalScenario: location,
        status: 'ACTIVE'
      })
    });
    setShowActivate(false);
    fetchCases();
  };

  const handleBreakGlass = async () => {
    await fetch('/api/v1/mtp-cases', {
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
    setShowBreakGlass(false);
    fetchCases();
  };

  const handleIssueUnit = async (id: string) => {
    try {
      await fetch(`/api/v1/mtp-cases/${id}/issue`, { method: 'POST' });
      fetchCases();
    } catch (e) {}
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 p-6">
      
      {/* Strategic MTP Command Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[24px] border-l-4 border-l-rose-600 border border-slate-200 shadow-sm relative overflow-hidden">
         <div className="absolute -top-10 -right-10 opacity-5">
            <ShieldAlert size={200} className="text-rose-600" />
         </div>
         <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                  <Zap size={24} />
               </div>
               <div>
                  <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">{t('mtp_title') || 'Massive Transfusion Protocol'}</h1>
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
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                 <Activity size={18} className="text-rose-600" /> {t('mtp_monitor') || 'Active Protocol Monitor'}
              </h2>
              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                 {mtpCases.length} {t('national_surveillance') || 'Active Cases'}
              </span>
           </div>
           
           {mtpCases.length === 0 ? (
             <div className="clinical-card p-16 flex flex-col items-center justify-center text-slate-600 border-dashed border-2 bg-slate-50">
                <ShieldAlert size={48} className="opacity-20 mb-4 text-slate-600" />
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
              <ClipboardCheck className="text-slate-700" size={18} />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Circular 26/2013/TT-BYT Guidelines</h2>
           </div>
           
           <div className="clinical-card p-6 bg-white border-slate-200 space-y-6">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="clinical-card max-w-lg w-full bg-white border-slate-200 p-8 shadow-2xl">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Initiate MTP</h3>
                   <p className="text-rose-600 text-xs font-bold uppercase tracking-wider mt-1">Standard Protocol</p>
                </div>
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                   <Zap size={24} />
                </div>
             </div>
             
             <div className="space-y-5">
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Patient Identifier (CCCD/MRN)</label>
                   <input 
                     value={patientId} 
                     onChange={e=>setPatientId(e.target.value)} 
                     className="clinical-input"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Location</label>
                   <input value={location} onChange={e=>setLocation(e.target.value)} className="clinical-input" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Authorized Clinician</label>
                   <input value={doctor} onChange={e=>setDoctor(e.target.value)} className="clinical-input" />
                </div>
             </div>
             
             <div className="mt-8 flex gap-4">
                <button onClick={() => setShowActivate(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-slate-700 transition-colors bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={handleActivate} className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-md transition-all uppercase tracking-wide text-sm">
                   Initiate Protocol
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Break Glass Portal */}
      {showBreakGlass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="clinical-card max-w-lg w-full bg-white border-orange-300 p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500"></div>

             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-bold text-orange-600 uppercase tracking-tight">Break-Glass Release</h3>
                   <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mt-1">Uncrossmatched O-Negative</p>
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
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Authorizing Clinician (Mandatory)</label>
                   <input value={bgDoctor} onChange={e=>setBgDoctor(e.target.value)} className="clinical-input border-orange-200 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Emergency Reason</label>
                   <input value={bgReason} onChange={e=>setBgReason(e.target.value)} className="clinical-input border-orange-200 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
             </div>

             <div className="mt-8 flex gap-4">
                <button onClick={() => setShowBreakGlass(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 hover:text-slate-700 transition-colors bg-slate-100 rounded-xl">Cancel</button>
                <button onClick={handleBreakGlass} className="flex-[2] bg-orange-600 hover:bg-orange-700 text-slate-800 font-bold py-3 rounded-xl shadow-md transition-all uppercase tracking-wide text-sm flex justify-center items-center gap-2">
                   Authorize Release <ArrowRight size={18} />
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
    <div className={`clinical-card p-6 bg-white border ${isEmergency ? 'border-orange-300 shadow-orange-100' : 'border-slate-200'} transition-all relative`}>
       {isEmergency && (
         <div className="absolute top-0 right-0 bg-orange-500 text-slate-800 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
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
                   <h3 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">{mtp.patientIdentifier}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active &middot; Round {mtp.currentRound || 1}</span>
                   </div>
                </div>
             </div>
             
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
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
             <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="flex justify-between items-end mb-3">
                   <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Units Issued</span>
                   <span className="text-3xl font-bold text-slate-800 leading-none">
                      {mtp.unitsIssued || 0}
                      <span className="text-xs text-slate-600 ml-1">/{mtp.unitsTarget || 6}</span>
                   </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                   <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isEmergency ? 'bg-orange-500' : 'bg-rose-500'}`}
                      style={{ width: `${progress}%` }} 
                   />
                </div>
             </div>

             <button 
               onClick={onIssue}
               className={`w-full text-slate-800 font-bold py-4 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide text-xs ${isEmergency ? 'bg-orange-600 hover:bg-orange-700' : 'bg-rose-600 hover:bg-rose-700'}`}
             >
                <Barcode size={18} /> Record Issue
             </button>

             {isEmergency && (
                 <button className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2">
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
         <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
         <p className={`text-sm font-bold ${highlight ? 'text-orange-600' : 'text-slate-700'} truncate`} title={value}>{value}</p>
      </div>
   );
}


function GuidelineItem({ step, title, desc, active }: { step: string, title: string, desc: string, active?: boolean }) {
  return (
    <div className={`flex gap-3 p-3 rounded-xl border transition-all ${active ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
       <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${active ? 'bg-rose-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
          {step}
       </div>
       <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${active ? 'text-slate-800' : 'text-slate-600'}`}>{title}</h4>
          <p className="text-[10px] text-slate-600 leading-tight">{desc}</p>
       </div>
    </div>
  );
}
