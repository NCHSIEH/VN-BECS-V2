import React, { useState, useEffect } from 'react';
import { Globe, TrendingUp, ShieldCheck, AlertTriangle, Download, Database, MapPin, Activity, Zap, Droplets, ChevronRight, Search, Bell, User, Truck, Settings } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { VietnamMap } from './VietnamMap';

export function NationalDashboardView() {
  const { t } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-600 animate-pulse">
        <Globe className="animate-[spin_4s_linear_infinite]" size={40} />
        <span className="font-black uppercase tracking-[0.3em] text-[10px]">{t('national_all_live')}...</span>
      </div>
    );
  }

  const nodes = [
    { id: 'hanoi', name: t('national_node_hanoi'), status: t('national_status_critical'), demand: '8.1k', supply: '7.9k', percent: 95 },
    { id: 'hcmc', name: t('national_node_hcmc'), status: t('national_status_critical'), demand: '8.5k', supply: '7.9k', percent: 92 },
    { id: 'danang', name: t('national_node_danang'), status: activeScenario === 'typhoon' ? t('national_status_emergency') : t('national_status_safe'), demand: '3.2k', supply: activeScenario === 'typhoon' ? '1.4k' : '3.1k', percent: activeScenario === 'typhoon' ? 40 : 98 },
    { id: 'cantho', name: t('national_node_cantho'), status: t('national_status_safe'), demand: '2.8k', supply: '2.9k', percent: 100 },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-10 space-y-8 md:space-y-12 animate-in fade-in duration-1000 overflow-x-hidden">
      
      {/* Top Level Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
        <MetricCard 
          title={t('national_inventory')} 
          value="114,892" 
          unit={t('national_unit_total')} 
          trend="+3.1%" 
          chartColor="rose"
          details={[
            { label: t('national_rbc'), value: '6,810', color: 'bg-rose-500' },
            { label: t('national_plt'), value: '4,120', color: 'bg-sky-500' },
            { label: t('national_ffp'), value: '3,632', color: 'bg-amber-500' }
          ]}
        />
        <MetricCard 
          title={t('national_waste')} 
          value="89" 
          unit={t('national_unit_lost')} 
          trend="-1.8%" 
          chartColor="sky"
          details={[
            { label: t('national_expired'), value: '45', color: 'bg-slate-700' },
            { label: t('national_comp'), value: '24', color: 'bg-slate-700' },
            { label: t('national_quality'), value: '20', color: 'bg-slate-700' }
          ]}
        />
        <MetricCard 
          title={t('national_demand')} 
          value={t('national_adequate')} 
          unit={t('national_unit_reserve')} 
          trend={t('national_stable')} 
          chartColor="emerald"
          details={[
            { label: 'O-', value: t('national_status_critical'), color: 'text-rose-500' },
            { label: 'A+', value: t('national_adequate'), color: 'text-emerald-500' }
          ]}
        />
        <MetricCard 
          title={t('national_efficiency')} 
          value="94.2%" 
          unit={t('national_unit_eff')} 
          trend="+0.8%" 
          chartColor="indigo"
          details={[
            { label: t('national_utilization'), value: '89.3%', color: 'text-slate-600' },
            { label: t('national_fulfillment'), value: '98.6%', color: 'text-slate-600' }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
        {/* Main Visualization Center (8 Cols) */}
        <div className="xl:col-span-8 space-y-10">
           <div className="clinical-card p-6 md:p-10 bg-slate-50/40 border-slate-800/50 rounded-[40px] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Globe size={300} />
              </div>
              
              <div className="flex justify-between items-start mb-10 relative z-10">
                 <div>
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.3em] mb-2 flex items-center gap-3">
                       <MapPin size={18} className="text-rose-500" /> {t('national_map_title')}
                    </h3>
                    <p className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest italic">{t('national_map_sub')}</p>
                 </div>
                 <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    <button className="px-4 py-2 text-[8px] font-black uppercase tracking-widest bg-rose-600 text-white rounded-lg shadow-lg">Heatmap</button>
                    <button className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-800 transition-colors">Nodes</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                 <div className="space-y-6">
                    {nodes.map(node => (
                       <RegionHotspot 
                         key={node.id} 
                         name={node.name} 
                         status={node.status} 
                         demand={node.demand} 
                         supply={node.supply} 
                         percent={node.percent} 
                         active={activeNode === node.id}
                         onClick={() => setActiveNode(node.id)}
                       />
                    ))}
                 </div>
                 <div className="hidden lg:flex flex-col items-center justify-center bg-slate-900/20 rounded-[40px] border border-slate-800/30 p-4 min-h-[400px]">
                    <VietnamMap activeNode={activeNode} onSelectNode={setActiveNode} scenarios={{activeScenario}} />
                 </div>
              </div>
           </div>

           {/* Trend Charts Section */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="clinical-card p-8 bg-slate-50/20 border-slate-800/50 rounded-[32px]">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Collection vs. Waste Trend</h4>
                    <TrendingUp size={14} className="text-rose-500/40" />
                 </div>
                 <div className="h-40 flex items-end gap-3 px-2">
                    {[30, 45, 60, 55, 80, 95, 70].map((v, i) => (
                       <div key={i} className="flex-1 bg-rose-500/10 rounded-t-lg relative group overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-rose-600 rounded-t-lg transition-all duration-1000 group-hover:bg-rose-400" style={{ height: `${v}%` }} />
                          <div className="absolute bottom-0 w-full bg-sky-500/40 rounded-t-lg" style={{ height: `${v*0.6}%` }} />
                       </div>
                    ))}
                 </div>
              </div>
              <div className="clinical-card p-8 bg-slate-50/20 border-slate-800/50 rounded-[32px]">
                 <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('national_waste')} Breakdown</h4>
                    <Activity size={14} className="text-sky-500/40" />
                 </div>
                 <div className="space-y-6">
                    <ProgressBar label="RBC" percent={92.5} color="bg-rose-500" />
                    <ProgressBar label="Plasma" percent={12.3} color="bg-sky-500" />
                    <ProgressBar label="Platelets" percent={98.5} color="bg-amber-500" />
                 </div>
              </div>
           </div>
        </div>

        {/* Tactical Control Panel (4 Cols) */}
        <div className="xl:col-span-4 space-y-10">
           <div className="clinical-card p-10 bg-slate-900/30 border-slate-800 rounded-[40px] space-y-10 shadow-2xl">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-800/50">
                 <Zap className="text-amber-500" size={24} />
                 <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">{t('national_simulation')}</h3>
              </div>

              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">{t('national_model_config')}</label>
                    <select className="w-full bg-slate-50 border border-slate-800 p-4 rounded-2xl text-[10px] font-black text-slate-700 uppercase tracking-wider outline-none focus:border-rose-500 transition-all">
                       <option>Typhoon Landing (Central)</option>
                       <option>Viral Pandemic Surge</option>
                       <option>Cyber Grid Outage</option>
                    </select>
                 </div>

                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('national_event_scale')}</span>
                       <span className="text-[10px] font-black text-rose-500">75%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-rose-600 w-3/4 shadow-[0_0_10px_rgba(225,29,72,0.5)]" />
                    </div>
                 </div>

                 <div className="bg-rose-600/5 border border-rose-900/20 p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">{t('national_forecasted_deficit')}</p>
                       <span className="text-rose-500 text-[10px] font-black">-2.4k Units</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">{t('national_estimated_response')}</p>
                       <span className="text-emerald-500 text-[10px] font-black">7-Day Plan</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-4">
                    <button className="py-4 bg-slate-50 border border-slate-800 rounded-2xl text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-800 transition-all">Deploy Units</button>
                    <button className="py-4 bg-slate-50 border border-slate-800 rounded-2xl text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-800 transition-all">Adjust Donations</button>
                 </div>

                 <button 
                   onClick={() => setActiveScenario(activeScenario ? null : 'typhoon')}
                   className={`w-full py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl italic flex items-center justify-center gap-3 ${
                    activeScenario ? 'bg-slate-800 text-slate-600' : 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-900/40'
                   }`}
                 >
                    {activeScenario ? t('national_reset_grid') : t('national_start_simulation')} <Activity size={18} />
                 </button>
              </div>
           </div>

            {/* Command Tasks & Directives */}
            <div className="clinical-card p-10 bg-slate-50/40 border-slate-800/50 rounded-[40px] space-y-8">
               <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">{t('national_tasks')}</h3>
                  <span className="px-3 py-1 bg-rose-500/10 text-rose-500 text-[8px] font-black rounded-full border border-rose-500/20 animate-pulse">4 Urgent</span>
               </div>
               <div className="space-y-4">
                  {[
                    { id: 'T-102', task: 'Verify Regional Stockpiles (Central)', status: 'Pending', icon: <Database size={16} /> },
                    { id: 'T-104', task: 'Authorize Emergency Transport (SOP 3)', status: 'Urgent', icon: <Truck size={16} /> },
                    { id: 'T-108', task: 'Approve MTP Protocol Activation', status: 'Review', icon: <Zap size={16} /> },
                    { id: 'T-112', task: 'Sync Master Database (MDM)', status: 'Daily', icon: <Settings size={16} /> }
                  ].map((task, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-5 bg-slate-900/40 hover:bg-slate-800 border border-slate-800 rounded-3xl transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl text-slate-600 group-hover:text-rose-500 transition-colors">{task.icon}</div>
                          <div className="text-left">
                             <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{task.task}</p>
                             <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">{task.id} · {task.status}</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-slate-700 group-hover:text-slate-800 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
               </div>
            </div>

            {/* Operational Node Connectivity */}
            <div className="clinical-card p-10 bg-slate-50/40 border-slate-800/50 rounded-[40px] space-y-8">
               <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">{t('national_network_status')}</h3>
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                     <span className="text-[8px] font-black text-emerald-500 uppercase">{t('national_all_live')}</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'Donor Centers (LIMS)', status: 'Operational', color: 'rose' },
                    { name: 'Supply Hubs (HUB)', status: 'Syncing', color: 'emerald' },
                    { name: 'Clinical Nodes', status: 'Active', color: 'amber' },
                    { name: 'Logistics Fleet', status: 'On-Route', color: 'sky' }
                  ].map((node, i) => (
                    <div key={i} className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl">
                       <p className="text-[9px] font-black text-slate-800 uppercase tracking-tighter mb-1">{node.name}</p>
                       <div className="flex items-center gap-2">
                          <div className={`w-1 h-1 rounded-full bg-${node.color}-500`}></div>
                          <p className={`text-[7px] font-black text-${node.color}-500 uppercase tracking-widest`}>{node.status}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

           <div className="clinical-card p-10 bg-slate-50/40 border-slate-800/50 rounded-[40px] space-y-8">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">{t('national_governance')}</h3>
              <div className="space-y-4">
                 <button className="w-full flex items-center justify-between p-6 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-3xl transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-sky-500/10 rounded-xl text-sky-500 group-hover:scale-110 transition-transform"><Database size={18} /></div>
                       <div className="text-left">
                          <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider">{t('national_security_report')}</p>
                          <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">PDF | 12.4 MB</p>
                       </div>
                    </div>
                    <Download size={16} className="text-slate-700 group-hover:text-slate-800" />
                 </button>
                 <button className="w-full flex items-center justify-between p-6 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-3xl transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 group-hover:scale-110 transition-transform"><ShieldCheck size={18} /></div>
                       <div className="text-left">
                          <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider">{t('national_compliance_ledger')}</p>
                          <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">CSV | 4.2 MB</p>
                       </div>
                    </div>
                    <Download size={16} className="text-slate-700 group-hover:text-slate-800" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, trend, details, chartColor }: any) {
  return (
    <div className="clinical-card p-6 md:p-8 bg-slate-50/40 border-slate-800/50 rounded-[32px] space-y-6 hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
       <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
       
       <div className="flex justify-between items-center relative z-10">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{title}</span>
          <TrendingUp size={14} className="text-slate-700 group-hover:text-sky-500 transition-colors" />
       </div>
       
       <div className="flex items-end gap-3 relative z-10">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 italic tracking-tighter leading-none">{value}</h2>
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-rose-500 leading-none mb-1">{trend}</span>
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{unit}</span>
          </div>
       </div>

       <div className="h-8 flex items-end gap-1 relative z-10">
          {[20, 35, 25, 45, 30, 55, 40].map((h, i) => (
             <div key={i} className="flex-1 bg-slate-800/50 rounded-sm">
                <div className={`w-full ${chartColor === 'rose' ? 'bg-rose-500' : chartColor === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500'} rounded-sm opacity-40 group-hover:opacity-100 transition-all duration-500`} style={{ height: `${h}%` }} />
             </div>
          ))}
       </div>

       <div className="pt-4 border-t border-slate-900/50 grid grid-cols-3 gap-2 relative z-10">
          {details.map((d: any, i: number) => (
             <div key={i} className="space-y-1">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">{d.label}</span>
                <p className={`text-[9px] md:text-[10px] font-black ${d.color.includes('text') ? d.color : 'text-slate-800'}`}>{d.value}</p>
             </div>
          ))}
       </div>
    </div>
  );
}

function RegionHotspot({ name, status, demand, supply, percent }: any) {
   const isCritical = status.toLowerCase().includes('critical') || status.toLowerCase().includes('emergency') || status.toLowerCase().includes('khẩn') || status.toLowerCase().includes('cấp') || status.toLowerCase().includes('急');
   return (
      <div className="flex items-center gap-4 md:gap-6 p-4 rounded-2xl hover:bg-slate-900/30 transition-all border border-transparent hover:border-slate-800/50 group">
         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${isCritical ? 'bg-rose-500 text-slate-800 shadow-rose-900/40' : 'bg-slate-900 text-slate-600'}`}>
            <MapPin size={18} />
         </div>
         <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider truncate mr-2">{name}</span>
               <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${isCritical ? 'bg-rose-900/40 text-rose-500' : 'bg-emerald-950/40 text-emerald-500'}`}>{status}</span>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${isCritical ? 'bg-rose-600' : 'bg-sky-600'}`} style={{ width: `${percent}%` }} />
               </div>
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest shrink-0">{supply} / {demand}</span>
            </div>
         </div>
      </div>
   );
}

function ProgressBar({ label, percent, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] font-black text-slate-800">{percent}%</span>
      </div>
      <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
