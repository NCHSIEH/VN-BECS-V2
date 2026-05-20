import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, Zap, History, ClipboardCheck, Barcode, UserCircle, Activity, AlertTriangle } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function MtpEmergencyView() {
  const { t } = useI18n();
  const [mtpCases, setMtpCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivate, setShowActivate] = useState(false);
  
  // Form state
  const [patientId, setPatientId] = useState('TRAUMA-' + Math.floor(Math.random()*9000 + 1000));
  const [location, setLocation] = useState('ER - Trauma Bay 1');
  const [doctor, setDoctor] = useState('Dr. Nguyen (ER Lead)');

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

  const handleIssueUnit = async (id: string) => {
    try {
      await fetch(`/api/v1/mtp-cases/${id}/issue`, { method: 'POST' });
      fetchCases();
    } catch (e) {}
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* Strategic MTP Command Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 bg-[#020617] p-10 rounded-[40px] border border-rose-900/30 relative overflow-hidden shadow-2xl">
         <div className="absolute -top-10 -right-10 opacity-5">
            <ShieldAlert size={240} className="text-rose-500" />
         </div>
         <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-rose-600 rounded-[20px] flex items-center justify-center text-white shadow-[0_0_30px_rgba(225,29,72,0.4)] animate-pulse">
                  <Zap size={28} />
               </div>
               <div>
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{t('mtp_title')}</h1>
                  <p className="text-rose-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2 italic">{t('mtp_subtitle')}</p>
               </div>
            </div>
         </div>
         <button 
           onClick={() => setShowActivate(true)}
           className="relative z-10 px-10 py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-[24px] shadow-2xl shadow-rose-900/50 transition-all active:scale-95 flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] italic"
         >
           <ShieldAlert size={20} /> {t('mtp_activate_btn')}
         </button>
      </div>

      <div className="grid grid-cols-12 gap-10">
        
        {/* Active Resuscitation Streams */}
        <div className="col-span-12 xl:col-span-8 space-y-8">
           <div className="flex items-center justify-between px-4">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 italic">
                 <Activity size={16} className="text-rose-500" /> {t('mtp_monitor')}
              </h2>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                 {mtpCases.length} {t('national_surveillance')}
              </span>
           </div>
           
           {mtpCases.length === 0 ? (
             <div className="clinical-card p-24 bg-slate-950/20 flex flex-col items-center justify-center text-slate-700 border-dashed border-2">
                <ShieldAlert size={64} className="opacity-10 mb-6" />
                <p className="font-black uppercase tracking-[0.3em] text-[11px] italic">{t('mtp_no_active')}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-8">
                {mtpCases.map(mtp => (
                  <MtpCaseCard key={mtp.id} mtp={mtp} onIssue={() => handleIssueUnit(mtp.id)} />
                ))}
             </div>
           )}
        </div>

        {/* Tactical Guidelines & Triage */}
        <div className="col-span-12 xl:col-span-4 space-y-8">
           <div className="flex items-center gap-3 px-4">
              <ClipboardCheck className="text-slate-500" size={16} />
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">{t('mtp_guidelines')}</h2>
           </div>
           
           <div className="clinical-card p-10 bg-slate-950/40 border-slate-800 space-y-8 shadow-2xl">
              <div className="space-y-6">
                 <GuidelineItem step="01" title={t('mtp_step1_title')} desc={t('mtp_step1_desc')} active />
                 <GuidelineItem step="02" title={t('mtp_step2_title')} desc={t('mtp_step2_desc')} active={mtpCases.some(c => c.currentRound === 1)} />
                 <GuidelineItem step="03" title={t('mtp_step3_title')} desc={t('mtp_step3_desc')} active={mtpCases.some(c => c.currentRound >= 2)} />
                 <GuidelineItem step="04" title={t('mtp_step4_title')} desc={t('mtp_step4_desc')} />
              </div>
              <div className="pt-8 border-t border-slate-800">
                 <div className="p-6 bg-rose-600/5 rounded-3xl border border-rose-900/20 text-[10px] text-rose-500 leading-relaxed font-black uppercase tracking-widest italic shadow-inner">
                    {t('mtp_critical_alert')}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Activation Portal */}
      {showActivate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/95 backdrop-blur-3xl p-6 animate-in fade-in duration-300">
          <div className="clinical-card max-w-xl w-full bg-slate-900 border-rose-900/40 shadow-[0_0_200px_rgba(225,29,72,0.15)] rounded-[40px] p-12">
             <div className="flex justify-between items-start mb-10">
                <div>
                   <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">{t('mtp_title')}</h3>
                   <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">{t('mtp_subtitle')}</p>
                </div>
                <div className="w-16 h-16 bg-rose-600/10 rounded-[24px] flex items-center justify-center text-rose-500 border border-rose-500/20">
                   <ShieldAlert size={32} />
                </div>
             </div>
             
             <div className="space-y-8">
                <div className="clinical-input-group">
                   <label className="clinical-label">{t('mtp_form_patient_id')}</label>
                   <input 
                     value={patientId} 
                     onChange={e=>setPatientId(e.target.value)} 
                     className="clinical-input h-16 font-mono text-2xl text-rose-500 border-rose-500/20 focus:ring-rose-500/20" 
                   />
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="clinical-input-group">
                      <label className="clinical-label">{t('mtp_form_location')}</label>
                      <input value={location} onChange={e=>setLocation(e.target.value)} className="clinical-input h-14" />
                   </div>
                   <div className="clinical-input-group">
                      <label className="clinical-label">{t('mtp_form_clinician')}</label>
                      <input value={doctor} onChange={e=>setDoctor(e.target.value)} className="clinical-input h-14" />
                   </div>
                </div>
             </div>
             
             <div className="mt-12 flex gap-6">
                <button onClick={() => setShowActivate(false)} className="flex-1 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors italic">{t('mtp_form_abstain')}</button>
                <button onClick={handleActivate} className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-rose-900/50 transition-all active:scale-95 uppercase tracking-[0.2em] text-xs italic">
                   {t('mtp_form_initiate')}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MtpCaseCard({ mtp, onIssue }: { mtp: any, onIssue: () => void }) {
  const { t } = useI18n();
  const progress = Math.min(((mtp.unitsIssued || 0) / (mtp.unitsTarget || 18)) * 100, 100);
  
  return (
    <div className="clinical-card p-10 bg-[#020617] border-rose-900/30 hover:border-rose-500/50 transition-all group relative overflow-hidden shadow-2xl">
       <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <Activity size={180} className="text-rose-500" />
       </div>
       
       <div className="flex flex-col xl:flex-row justify-between gap-12 relative z-10">
          <div className="space-y-8 flex-1">
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-rose-600/10 border border-rose-500/20 rounded-[28px] flex items-center justify-center text-rose-500 shadow-inner">
                   <UserCircle size={44} />
                </div>
                <div>
                   <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{mtp.patientIdentifier}</h3>
                   <div className="flex items-center gap-3 mt-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic">Protocol Active · Round {mtp.currentRound}</span>
                   </div>
                </div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-4">
                <MtpStat label="Clinician" value={mtp.authorizedClinician} />
                <MtpStat label="Location" value={mtp.clinicalScenario} />
                <MtpStat label="Time Active" value="14:22" highlight />
                <MtpStat label="Round Goal" value={`${mtp.currentRound === 1 ? 'Pack 1' : 'Pack 2+'}`} />
             </div>

             {mtp.unitsIssued >= 12 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 animate-in shake duration-1000">
                   <AlertTriangle size={24} className="text-amber-500" />
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Coagulopathy Warning</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold mt-1 tracking-wider">Large volume reached. Platelets and Cryoprecipitate mandated per SOP.</p>
                   </div>
                </div>
             )}
          </div>

          <div className="w-full xl:w-[320px] space-y-6">
             <div className="bg-slate-950/40 rounded-[32px] p-8 border border-slate-800 shadow-inner group-hover:border-rose-900/30 transition-colors">
                <div className="flex justify-between items-end mb-4">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resuscitation Volume</span>
                   <span className="text-4xl font-black text-white italic tracking-tighter leading-none">
                      {mtp.unitsIssued || 0}
                      <span className="text-[10px] text-slate-600 not-italic ml-2 uppercase tracking-widest font-bold">Units</span>
                   </span>
                </div>
                <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                   <div 
                      className={`h-full rounded-full transition-all duration-1000 ${progress > 70 ? 'bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.6)]' : 'bg-rose-600'}`} 
                      style={{ width: `${progress}%` }} 
                   />
                </div>
                <div className="flex justify-between mt-3 text-[8px] font-black text-slate-600 uppercase tracking-widest">
                   <span>Initial Bolus</span>
                   <span>Target: {mtp.unitsTarget}</span>
                </div>
             </div>

             <button 
               onClick={onIssue}
               className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-6 rounded-[28px] shadow-2xl shadow-rose-900/40 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] italic"
             >
                <Barcode size={20} /> Record Unit Issue
             </button>
          </div>
       </div>
    </div>
  );
}

function MtpStat({ label, value, highlight }: any) {
   return (
      <div className="flex flex-col gap-1.5">
         <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
         <p className={`text-[11px] font-black uppercase italic ${highlight ? 'text-rose-500' : 'text-slate-300'}`}>{value}</p>
      </div>
   );
}


function GuidelineItem({ step, title, desc, active }: { step: string, title: string, desc: string, active?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`flex gap-4 p-4 rounded-2xl border transition-all ${active ? 'bg-rose-600/5 border-rose-900/30' : 'bg-slate-950/30 border-slate-900 opacity-40'}`}>
       <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${active ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 text-slate-600'}`}>
          {step}
       </div>
       <div>
          <h4 className={`text-[11px] font-black uppercase tracking-widest mb-1 ${active ? 'text-white' : 'text-slate-500'}`}>{title}</h4>
          <p className="text-[10px] text-slate-500 font-medium leading-tight uppercase tracking-wide">{desc}</p>
       </div>
    </div>
  );
}
