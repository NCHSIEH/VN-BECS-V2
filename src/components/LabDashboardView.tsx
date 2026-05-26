import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { Activity, FlaskConical, ShieldCheck, Clock, CheckCircle2, AlertCircle, ChevronRight, TestTube2, Microscope, ArrowRightToLine } from 'lucide-react';

export function LabDashboardView() {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    pendingIdm: 42,
    pendingCrossmatch: 14,
    processing: 28,
    completedToday: 350
  });

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700 p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg">
               <Activity size={20} />
            </div>
            <h2 className="text-3xl font-black text-clinical-text tracking-tighter uppercase italic">
              {t('irl_dashboard_title')}
            </h2>
          </div>
          <p className="text-clinical-muted text-[10px] font-black uppercase tracking-[0.3em] ml-13 italic">
            {t('irl_dashboard_ops')}
          </p>
        </div>
      </div>

      {/* PIPELINE VISUALIZATION */}
      <div className="clinical-card bg-[#0a0f1d]/80 p-6 border border-clinical-border/50 shadow-sm">
        <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] italic mb-6">
          {t('irl_pipeline_title')}
        </h3>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
           {/* Connecting Line */}
           <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-clinical-border -z-10 -translate-y-1/2"></div>
           
           {/* Step 1 */}
           <PipelineStep 
              number="1" 
              icon={<TestTube2 size={20} />} 
              label={t('irl_pipeline_step1')} 
              status="active" 
              color="sky" 
           />
           {/* Step 2 */}
           <PipelineStep 
              number="2" 
              icon={<Microscope size={20} />} 
              label={t('irl_pipeline_step2')} 
              status="pending" 
              color="amber" 
           />
           {/* Step 3 */}
           <PipelineStep 
              number="3" 
              icon={<ShieldCheck size={20} />} 
              label={t('irl_pipeline_step3')} 
              status="pending" 
              color="purple" 
           />
           {/* Step 4 */}
           <PipelineStep 
              number="4" 
              icon={<ArrowRightToLine size={20} />} 
              label={t('irl_pipeline_step4')} 
              status="pending" 
              color="emerald" 
           />
        </div>
      </div>

      {/* AUTOMATED DISPATCH QUEUES */}
      <div className="clinical-card bg-clinical-card/30 p-6 border-dashed border-2 border-clinical-border/90 shadow-md space-y-4">
        <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] italic">
          {t('irl_dispatch_queues_title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: Reception */}
          <StatCard 
             title={t('irl_metric_active_processing')} 
             value={stats.processing} 
             icon={<TestTube2 size={24} />} 
             color="sky"
             subtext="Specimens in transit / check-in"
          />
          {/* Card 2: IDM/NAT */}
          <StatCard 
             title={t('irl_metric_pending_idm')} 
             value={stats.pendingIdm} 
             icon={<Microscope size={24} />} 
             color="amber"
             subtext="Serology & NAT required"
          />
          {/* Card 3: Crossmatch */}
          <StatCard 
             title={t('irl_metric_pending_xm')} 
             value={stats.pendingCrossmatch} 
             icon={<ShieldCheck size={24} />} 
             color="purple"
             subtext="Compatibility testing requested"
          />
          {/* Card 4: Release */}
          <StatCard 
             title={t('irl_metric_completed_today')} 
             value={stats.completedToday} 
             icon={<ArrowRightToLine size={24} />} 
             color="emerald"
             subtext="Cleared for release"
          />
        </div>
      </div>

      {/* BOTTOM SECTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
         <div className="xl:col-span-2 clinical-card bg-clinical-card/20 p-6 flex flex-col h-full">
            <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] italic mb-4">
              {t('irl_recent_activity')}
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
               {[
                 { id: 1, step: 1, status: t('irl_specimen_received'), color: 'text-sky-500', bg: 'bg-sky-500/10' },
                 { id: 2, step: 2, status: t('irl_awaiting_idm'), color: 'text-amber-500', bg: 'bg-amber-500/10' },
                 { id: 3, step: 3, status: 'CROSSMATCH IN PROGRESS', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                 { id: 4, step: 4, status: 'QUALITY RELEASED', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                 { id: 5, step: 2, status: 'NAT SCREENING', color: 'text-amber-500', bg: 'bg-amber-500/10' }
               ].map(item => (
                 <div key={item.id} className="p-3 rounded-xl bg-clinical-bg border border-clinical-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-sky-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-clinical-card flex items-center justify-center text-clinical-text">
                          <span className="font-black italic">{item.step}</span>
                       </div>
                       <div>
                          <div className="text-sm font-black text-clinical-text uppercase italic">
                             {t('irl_din')}: W0000 24 12345{item.id}
                          </div>
                          <div className="text-[9px] font-black text-clinical-muted uppercase tracking-widest mt-1">
                             Whole Blood • LIMS Transfer
                          </div>
                       </div>
                    </div>
                    <div className="text-left sm:text-right">
                       <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-clinical-border ${item.color} ${item.bg}`}>
                          {item.status}
                       </span>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="xl:col-span-1 space-y-6 flex flex-col">
            <div className="clinical-card bg-rose-500/5 border-rose-500/20 p-6 flex-shrink-0">
               <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] italic mb-4 flex items-center gap-2">
                 <AlertCircle size={16} /> {t('irl_urgent_clinical_requests')}
               </h3>
               <div className="space-y-3">
                  <div className="p-3 bg-clinical-bg rounded-xl border border-clinical-border shadow-lg shadow-rose-500/5">
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

function PipelineStep({ number, icon, label, status, color }: any) {
  const isSky = color === 'sky';
  const isAmber = color === 'amber';
  const isPurple = color === 'purple';
  const isEmerald = color === 'emerald';

  let colorClasses = 'bg-clinical-bg text-clinical-muted border-clinical-border';
  if (isSky) colorClasses = 'bg-sky-500/10 text-sky-500 border-sky-500/30';
  if (isAmber) colorClasses = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
  if (isPurple) colorClasses = 'bg-purple-500/10 text-purple-500 border-purple-500/30';
  if (isEmerald) colorClasses = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';

  return (
     <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${colorClasses} w-full md:w-auto backdrop-blur-sm z-10 min-w-[140px]`}>
        <div className="flex items-center gap-3 mb-2">
           <div className="font-black italic text-sm opacity-50">#{number}</div>
           {icon}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-center mt-1">
           {label}
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
