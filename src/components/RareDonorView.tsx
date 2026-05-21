import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { Users, Search, Plus, Shield, ShieldCheck, AlertCircle } from 'lucide-react';

export function RareDonorView() {
  const { t } = useI18n();
  const [donors, setDonors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobilizingId, setMobilizingId] = useState<string | null>(null);

  const fetchDonors = async () => {
    try {
      const res = await fetch('/api/v1/rare-donors');
      const data = await res.json();
      setDonors(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const handleMobilize = async (id: string) => {
    if (!confirm("CONFIRM EMERGENCY MOBILIZATION: This will trigger automated contact protocols and notify regional centers. Proceed?")) return;
    setMobilizingId(id);
    try {
      const res = await fetch(`/api/v1/rare-donors/${id}/mobilize`, { method: 'POST' });
      if (res.ok) fetchDonors();
    } finally {
      setMobilizingId(null);
    }
  };

  const filteredDonors = donors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.phenotype.toLowerCase().includes(searchTerm.toLowerCase())
  );

   if (loading) return (
      <div className="flex-1 flex items-center justify-center text-clinical-muted font-black uppercase tracking-widest animate-pulse">
         {t('national_all_live')}...
      </div>
   );

   return (
     <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-clinical-text shadow-lg">
                 <Users size={20} />
              </div>
              <h2 className="text-3xl font-black text-clinical-text tracking-tighter uppercase italic italic">
                {t('rare_title')}
              </h2>
           </div>
           <p className="text-clinical-muted text-[10px] font-black uppercase tracking-[0.3em] ml-13 italic">{t('rare_subtitle')}</p>
         </div>
         <button 
           onClick={() => setShowAddForm(true)}
           className="bg-clinical-card hover:bg-clinical-bg text-white border border-clinical-border px-6 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95"
         >
           <Plus size={18} className="text-sky-500" /> {t('lims_btn_register')}
         </button>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
         <div className="xl:col-span-1 space-y-6">
           <div className="clinical-card p-6 bg-clinical-card/20 border-clinical-border">
             <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-widest mb-4 flex items-center gap-3">
               <Search size={16} /> {t('rare_registry_search')}
             </h3>
             <input 
               type="text" 
               placeholder={t('rare_search_placeholder')}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="clinical-input w-full"
             />
           </div>

           <div className="clinical-card p-6 bg-sky-500/5 border-sky-500/20">
             <h3 className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-6 flex items-center gap-3 italic">
               <ShieldCheck size={18} /> {t('rare_health_status')}
             </h3>
             <div className="space-y-6">
               <div className="flex justify-between items-center">
                 <span className="text-clinical-muted text-[10px] font-black uppercase tracking-widest">{t('rare_active_count')}</span>
                 <span className="text-xl font-black text-clinical-text italic tracking-tighter">{donors.length}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-clinical-muted text-[10px] font-black uppercase tracking-widest">{t('rare_available_nodes')}</span>
                 <span className="text-xl font-black text-emerald-500 italic tracking-tighter">{donors.filter(d => d.status === 'Available').length}</span>
               </div>
               <div className="pt-4 border-t border-clinical-border">
                  <div className="p-4 bg-clinical-bg rounded-xl border border-clinical-border text-[9px] text-clinical-muted font-bold uppercase tracking-widest leading-relaxed italic">
                     {t('rare_monitor_msg')}
                  </div>
               </div>
             </div>
           </div>
         </div>

         <div className="xl:col-span-3">
           <div className="clinical-card p-0 bg-clinical-bg/20 border-clinical-border overflow-hidden shadow-2xl">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-clinical-bg border-b border-clinical-border">
                      <th className="px-8 py-5 text-clinical-muted font-black text-[9px] uppercase tracking-[0.2em]">{t('lims_tab_donor')}</th>
                      <th className="px-8 py-5 text-clinical-muted font-black text-[9px] uppercase tracking-[0.2em]">{t('rare_col_phenotype')}</th>
                      <th className="px-8 py-5 text-clinical-muted font-black text-[9px] uppercase tracking-[0.2em]">{t('rare_col_typing')}</th>
                      <th className="px-8 py-5 text-clinical-muted font-black text-[9px] uppercase tracking-[0.2em]">{t('lims_col_status')}</th>
                      <th className="px-8 py-5 text-clinical-muted font-black text-[9px] uppercase tracking-[0.2em] text-right">{t('rare_col_emergency')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-clinical-border">
                    {filteredDonors.map(donor => (
                      <tr key={donor.id} className="hover:bg-clinical-card/20 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-clinical-text uppercase italic tracking-tight">{donor.name}</span>
                            <span className="text-[9px] font-mono font-black text-clinical-muted tracking-widest mt-1">{donor.id} • {donor.location}</span>
                            <div className="flex items-center gap-2 mt-2">
                               <span className="text-[10px] font-black text-sky-500">{donor.bloodType} {donor.rhd}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="bg-sky-500/10 text-sky-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
                            {donor.phenotype}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                 <span className="text-[8px] font-black text-clinical-muted uppercase w-8">HLA:</span>
                                 <span className="text-[9px] font-mono text-clinical-muted">A*02,03; B*07,08</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="text-[8px] font-black text-clinical-muted uppercase w-8">HPA:</span>
                                 <span className="text-[9px] font-mono text-clinical-muted">1a Positive</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            donor.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            donor.status === 'MOBILIZED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}>
                            {donor.status === 'Available' ? t('rare_stat_available') : donor.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {donor.status === 'Available' ? (
                             <button 
                               onClick={() => handleMobilize(donor.id)}
                               disabled={mobilizingId === donor.id}
                               className="bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-rose-500/20 transition-all active:scale-95"
                             >
                               {mobilizingId === donor.id ? t('rare_activating') : t('rare_btn_mobilize')}
                             </button>
                          ) : (
                             <span className="text-[9px] font-black text-clinical-text uppercase tracking-widest italic">{t('rare_protocol_active')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           </div>
         </div>
       </div>

       {showAddForm && (
         <div className="fixed inset-0 bg-clinical-bg/95 backdrop-blur-3xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
           <div className="clinical-card bg-clinical-card border-clinical-border w-full max-w-2xl p-10 shadow-[0_0_150px_rgba(14,165,233,0.1)] rounded-[40px]">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h3 className="text-2xl font-black text-clinical-text uppercase italic tracking-tighter">{t('rare_form_title')}</h3>
                   <p className="text-clinical-muted text-[10px] font-black uppercase tracking-widest mt-1">SOP 11 · Clinical Registry Entry</p>
                </div>
                <button onClick={() => setShowAddForm(false)} className="text-clinical-muted hover:text-clinical-text uppercase text-[10px] font-black tracking-widest">{t('lims_form_cancel')}</button>
             </div>
             
             <div className="grid grid-cols-2 gap-8">
                <div className="clinical-input-group">
                   <label className="clinical-label">{t('rare_form_name')}</label>
                   <input type="text" className="clinical-input" placeholder="e.g. Nguyen Van A" />
                </div>
                <div className="clinical-input-group">
                   <label className="clinical-label">{t('rare_form_phenotype')}</label>
                   <input type="text" className="clinical-input" placeholder="e.g. Bombay O" />
                </div>
                <div className="clinical-input-group">
                   <label className="clinical-label">{t('rare_form_hla')}</label>
                   <input type="text" className="clinical-input" placeholder="A*02,03; B*07,08" />
                </div>
                <div className="clinical-input-group">
                   <label className="clinical-label">{t('rare_form_node')}</label>
                   <input type="text" className="clinical-input" placeholder="+84 ..." />
                </div>
             </div>

             <div className="flex gap-6 mt-12 pt-8 border-t border-clinical-border">
               <button 
                 onClick={() => setShowAddForm(false)}
                 className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-black py-5 rounded-[24px] shadow-xl shadow-sky-900/40 uppercase text-xs tracking-[0.2em] italic transition-all"
               >
                 {t('rare_form_commit')}
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
