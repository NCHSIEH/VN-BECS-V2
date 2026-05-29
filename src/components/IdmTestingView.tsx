import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { ClipboardList, FlaskConical, AlertTriangle, CheckCircle2, Search, Activity, ShieldCheck, Database } from 'lucide-react';

interface IdmSpecimen {
  id: string; // DIN
  donorId: string;
  collectedAt: string;
  tests: {
    hiv: 'Pending' | 'Reactive' | 'Non-Reactive';
    hcv: 'Pending' | 'Reactive' | 'Non-Reactive';
    hbsag: 'Pending' | 'Reactive' | 'Non-Reactive';
    syphilis: 'Pending' | 'Reactive' | 'Non-Reactive';
    nat: 'Pending' | 'Reactive' | 'Non-Reactive';
  };
  status: 'PENDING' | 'CLEARED' | 'QUARANTINED';
}

export function IdmTestingView() {
  const { t } = useI18n();
  const [specimens, setSpecimens] = useState<IdmSpecimen[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  const fetchSpecimens = async () => {
    try {
      const res = await fetch('/api/v1/lims/donations');
      const data = await res.json();
      
      const formatted = data.map((d: any) => ({
        id: d.id,
        donorId: d.donorId,
        collectedAt: d.collectedAt || new Date().toISOString(),
        tests: d.idmStatus === 'CLEARED' 
          ? { hiv: 'Non-Reactive', hcv: 'Non-Reactive', hbsag: 'Non-Reactive', syphilis: 'Non-Reactive', nat: 'Non-Reactive' }
          : d.idmStatus === 'QUARANTINED'
          ? { hiv: 'Reactive', hcv: 'Reactive', hbsag: 'Reactive', syphilis: 'Reactive', nat: 'Reactive' }
          : { hiv: 'Pending', hcv: 'Pending', hbsag: 'Pending', syphilis: 'Pending', nat: 'Pending' },
        status: d.idmStatus || 'PENDING'
      }));
      setSpecimens(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSpecimens();
    // Refresh every 10 seconds
    const interval = setInterval(fetchSpecimens, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = specimens.filter(s => s.id.includes(searchTerm) || s.donorId.includes(searchTerm));

  const handleAuthorize = async (id: string, action: 'clear' | 'quarantine') => {
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/v1/lims/lab-tests/${id}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', msg: `Authorization ${action === 'clear' ? 'CLEARED' : 'QUARANTINED'} for donation ${id} succeeded.` });
        fetchSpecimens();
      } else {
        setStatusMsg({ type: 'error', msg: `AUTHORIZATION FAILED: ${data.error || data.message || 'Access Denied'}` });
      }
    } catch (e) {
      setStatusMsg({ type: 'error', msg: "Network Error" });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700 p-2">
      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-black uppercase tracking-widest ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
        }`}>
          <AlertTriangle size={16} />
          {statusMsg.msg}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
               <ClipboardList size={20} />
            </div>
            <h2 className="text-3xl font-black text-clinical-text tracking-tighter uppercase italic">
              {t('irl_idm_title')}
            </h2>
          </div>
          <p className="text-clinical-muted text-[10px] font-black uppercase tracking-[0.3em] ml-13 italic">
            {t('irl_idm_sub')}
          </p>
        </div>
        <div className="flex gap-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-amber-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder={t('irl_placeholder_scan_din')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="clinical-input pl-12 h-12 w-64 bg-clinical-card border-clinical-border"
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1 overflow-hidden">
        
        {/* LIS Integration Panel */}
        <div className="xl:col-span-1 flex flex-col gap-6">
           <div className="clinical-card bg-amber-500/5 border-amber-500/20 p-6 flex flex-col">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2 italic">
                 <Activity size={16} /> {t('irl_analyzer_integration')}
              </h3>
              <div className="space-y-4">
                 <AnalyzerStatus name="ARCHITECT i2000SR" type="Serology" status="Online" />
                 <AnalyzerStatus name="cobas 6800" type="NAT" status="Processing" />
                 <AnalyzerStatus name="Alinity s" type="Serology" status="Standby" />
              </div>
              <button className="mt-8 w-full bg-clinical-bg border border-clinical-border text-clinical-text font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-clinical-primary/10 hover:text-clinical-primary transition-colors">
                 {t('irl_force_sync_lis')}
              </button>
           </div>

           <div className="clinical-card bg-clinical-card/30 p-6 flex-1">
              <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.2em] mb-4">{t('irl_required_assays')}</h3>
              <ul className="space-y-2 text-[10px] font-bold text-clinical-muted uppercase tracking-wider">
                 <li className="flex justify-between items-center bg-clinical-bg p-2 rounded"><span>HIV-1/2</span> <span className="text-amber-500">Anti-HIV/NAT</span></li>
                 <li className="flex justify-between items-center bg-clinical-bg p-2 rounded"><span>HCV</span> <span className="text-amber-500">Anti-HCV/NAT</span></li>
                 <li className="flex justify-between items-center bg-clinical-bg p-2 rounded"><span>HBV</span> <span className="text-amber-500">HBsAg/NAT</span></li>
                 <li className="flex justify-between items-center bg-clinical-bg p-2 rounded"><span>Syphilis</span> <span className="text-amber-500">Serology</span></li>
              </ul>
           </div>
        </div>

        {/* Specimen Worklist */}
        <div className="xl:col-span-3 clinical-card bg-clinical-card/20 p-0 overflow-hidden flex flex-col shadow-2xl">
           <div className="p-6 border-b border-clinical-border flex justify-between items-center bg-clinical-bg/50">
              <h3 className="text-[11px] font-black text-clinical-text uppercase tracking-[0.3em] italic flex items-center gap-2">
                 <Database size={16} className="text-amber-500" /> {t('irl_pending_review_worklist')}
              </h3>
              <div className="flex gap-2">
                 <span className="px-3 py-1 bg-clinical-bg rounded-lg text-[9px] font-black uppercase text-clinical-muted border border-clinical-border">{t('irl_total')}: {filtered.length}</span>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {filtered.map(specimen => (
                 <div key={specimen.id} className={`p-6 rounded-3xl border transition-all ${
                    specimen.status === 'QUARANTINED' ? 'bg-rose-500/5 border-rose-500/30' :
                    specimen.status === 'CLEARED' ? 'bg-emerald-500/5 border-emerald-500/30' :
                    'bg-clinical-card border-clinical-border hover:border-amber-500/40'
                 }`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                             specimen.status === 'QUARANTINED' ? 'bg-rose-500/20 text-rose-500' :
                             specimen.status === 'CLEARED' ? 'bg-emerald-500/20 text-emerald-500' :
                             'bg-amber-500/10 text-amber-500'
                          }`}>
                             {specimen.status === 'QUARANTINED' ? <AlertTriangle size={24} /> :
                              specimen.status === 'CLEARED' ? <ShieldCheck size={24} /> :
                              <FlaskConical size={24} />}
                          </div>
                          <div>
                             <div className="flex items-center gap-3">
                                <h4 className="text-lg font-black text-clinical-text uppercase italic tracking-tighter">{t('irl_din')}: {specimen.id}</h4>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                   specimen.status === 'QUARANTINED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                   specimen.status === 'CLEARED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                   'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>{specimen.status.replace('_', ' ')}</span>
                             </div>
                             <div className="text-[10px] font-black text-clinical-muted uppercase tracking-widest mt-1">
                                {t('irl_donor')}: {specimen.donorId} • {t('irl_collected')}: {new Date(specimen.collectedAt).toLocaleString()}
                             </div>
                          </div>
                       </div>

                       {specimen.status !== 'CLEARED' && specimen.status !== 'QUARANTINED' && (
                          <div className="flex gap-3">
                             <button 
                               onClick={() => handleAuthorize(specimen.id, 'quarantine')}
                               className="px-6 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                             >
                                {t('irl_btn_reactive')}
                             </button>
                             <button 
                               onClick={() => handleAuthorize(specimen.id, 'clear')}
                               className="px-6 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                             >
                                {t('irl_btn_clear')}
                             </button>
                          </div>
                       )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-clinical-bg/50 p-4 rounded-2xl border border-clinical-border">
                       <TestResultBox name="Anti-HIV 1/2" result={specimen.tests.hiv} />
                       <TestResultBox name="Anti-HCV" result={specimen.tests.hcv} />
                       <TestResultBox name="HBsAg" result={specimen.tests.hbsag} />
                       <TestResultBox name="Syphilis" result={specimen.tests.syphilis} />
                       <TestResultBox name="Multiplex NAT" result={specimen.tests.nat} />
                    </div>
                 </div>
              ))}
              
              {filtered.length === 0 && (
                 <div className="py-20 flex flex-col items-center text-clinical-muted space-y-4">
                    <CheckCircle2 size={48} className="opacity-20" />
                    <p className="text-[11px] font-black uppercase tracking-widest italic">{t('irl_worklist_empty')}</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function AnalyzerStatus({ name, type, status }: { name: string, type: string, status: string }) {
   const isOnline = status === 'Online' || status === 'Processing';
   return (
      <div className="flex justify-between items-center p-3 bg-clinical-bg rounded-xl border border-clinical-border">
         <div>
            <div className="text-[11px] font-black text-clinical-text uppercase">{name}</div>
            <div className="text-[9px] text-clinical-muted uppercase font-bold tracking-widest">{type}</div>
         </div>
         <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>{status}</span>
         </div>
      </div>
   );
}

function TestResultBox({ name, result }: { name: string, result: string }) {
   return (
      <div className="flex flex-col items-center justify-center p-3 bg-clinical-card rounded-xl border border-clinical-border/50">
         <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-2 text-center">{name}</span>
         <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${
            result === 'Reactive' ? 'bg-rose-500/20 text-rose-500' :
            result === 'Non-Reactive' ? 'bg-emerald-500/10 text-emerald-500' :
            'bg-amber-500/10 text-amber-500'
         }`}>
            {result}
         </span>
      </div>
   );
}
