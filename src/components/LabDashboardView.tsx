import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { Activity, FlaskConical, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export function LabDashboardView() {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    pendingIdm: 42,
    pendingCrossmatch: 14,
    processing: 28,
    completedToday: 350
  });

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700 p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg">
               <Activity size={20} />
            </div>
            <h2 className="text-3xl font-black text-clinical-text tracking-tighter uppercase italic">
              {t('irl_idm_title')}
            </h2>
          </div>
          <p className="text-clinical-muted text-[10px] font-black uppercase tracking-[0.3em] ml-13 italic">
            {t('irl_dashboard_ops')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <StatCard 
           title={t('irl_metric_pending_idm')} 
           value={stats.pendingIdm} 
           icon={<FlaskConical size={24} />} 
           color="amber"
           subtext="Serology & NAT required"
        />
        <StatCard 
           title={t('irl_metric_pending_xm')} 
           value={stats.pendingCrossmatch} 
           icon={<ShieldCheck size={24} />} 
           color="purple"
           subtext="Compatibility testing requested"
        />
        <StatCard 
           title={t('irl_metric_active_processing')} 
           value={stats.processing} 
           icon={<Clock size={24} />} 
           color="sky"
           subtext="Specimens in analyzers"
        />
        <StatCard 
           title={t('irl_metric_completed_today')} 
           value={stats.completedToday} 
           icon={<CheckCircle2 size={24} />} 
           color="emerald"
           subtext="Cleared for release"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1">
         <div className="xl:col-span-2 clinical-card bg-clinical-card/20 p-8 flex flex-col">
            <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] italic mb-6">
              {t('irl_recent_activity')}
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
               {/* Mock Data for Dashboard */}
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="p-4 rounded-2xl bg-clinical-bg border border-clinical-border flex justify-between items-center group hover:border-sky-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                          <FlaskConical size={18} />
                       </div>
                       <div>
                          <div className="text-sm font-black text-clinical-text uppercase italic">
                             {t('irl_din')}: W0000 24 12345{i}
                          </div>
                          <div className="text-[9px] font-black text-clinical-muted uppercase tracking-widest mt-1">
                             {t('irl_specimen_received')}
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black uppercase bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">
                          {t('irl_awaiting_idm')}
                       </span>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="xl:col-span-1 space-y-8 flex flex-col">
            <div className="clinical-card bg-rose-500/5 border-rose-500/20 p-6">
               <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] italic mb-4 flex items-center gap-2">
                 <AlertCircle size={16} /> {t('irl_urgent_clinical_requests')}
               </h3>
               <div className="space-y-3">
                  <div className="p-3 bg-clinical-bg rounded-xl border border-clinical-border">
                     <div className="text-[10px] font-black text-clinical-text uppercase">{t('irl_stat_xm_mtp')}</div>
                     <div className="text-[9px] text-rose-500 font-bold uppercase mt-1">{t('irl_trauma_center_units')}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtext }: any) {
  const colorMap: any = {
    amber: 'bg-amber-500 text-amber-500 border-amber-500 shadow-amber-500',
    purple: 'bg-purple-500 text-purple-500 border-purple-500 shadow-purple-500',
    sky: 'bg-sky-500 text-sky-500 border-sky-500 shadow-sky-500',
    emerald: 'bg-emerald-500 text-emerald-500 border-emerald-500 shadow-emerald-500',
  };
  const theme = colorMap[color];
  const themeBg = theme.split(' ')[0] + '/10';
  const themeText = theme.split(' ')[1];
  const themeBorder = theme.split(' ')[2] + '/20';
  
  return (
    <div className={`clinical-card p-6 ${themeBg} border-${themeBorder} transition-transform hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-4">
         <div className={`p-3 rounded-xl bg-white/10 ${themeText} shadow-sm backdrop-blur-md`}>
           {icon}
         </div>
         <span className="text-3xl font-black text-clinical-text italic">{value}</span>
      </div>
      <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${themeText} mb-1`}>{title}</h3>
      <p className="text-[9px] text-clinical-muted font-black uppercase tracking-widest italic">{subtext}</p>
    </div>
  );
}
