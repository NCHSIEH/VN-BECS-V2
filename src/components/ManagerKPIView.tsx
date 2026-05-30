import React, { useState, useEffect, useMemo } from "react";
import { 
  ActivitySquare, 
  Clock, 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  ShieldCheck as ShieldCheckIcon, 
  Bell, 
  Settings, 
  Activity, 
  AlertCircle,
  CalendarRange,
  PieChart,
  ArrowRight,
  Filter,
  ArrowLeft
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Tooltip } from "./Tooltip";
import { getKpiColorLevel, COLOR_CLASSES } from "../lib/alertThresholds";

/** Mini sparkline rendered via SVG. */
function Sparkline({ data, color = '#84cc16', width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ManagerKPIView({ onBack }: { onBack?: () => void }) {
  const { t, lang, setLang } = useI18n();
  const [kpis, setKpis] = useState<any>(null);
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({ Critical: 0, High: 0, Medium: 0, Low: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetch('/api/v1/kpis').then(r => r.json()).then(setKpis).catch(console.error);
    fetch('/api/v1/alerts/counts').then(r => r.json()).then(setAlertCounts).catch(console.error);
    fetch('/api/v1/alerts').then(r => r.json()).then(d => setAlerts(d.slice(0, 10))).catch(console.error);
    fetch('/api/v1/config/kpi-thresholds').then(r => r.json()).then(setThresholds).catch(console.error);
  }, []);

  const sparklines = useMemo(() => ({
    orderTime: [48, 42, 45, 38, 35, 32, 28],
    statTime: [6.2, 5.5, 4.8, 5.1, 3.9, 3.2, 2.8],
    mismatch: [0.3, 0.2, 0.1, 0.15, 0.08, 0.05, 0.02],
    wastage: [2.8, 2.5, 2.2, 2.0, 1.8, 1.5, 1.2],
    compliance: [96, 97, 97.5, 98, 98.2, 99, 99.5],
    supplyDays: [12, 11.5, 13, 14.2, 13.8, 14.5, 15.2]
  }), []);

  const handleSaveThresholds = async () => {
    await fetch('/api/v1/config/kpi-thresholds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thresholds)
    });
    setShowConfig(false);
  };

  if (!kpis) return <div className="text-center p-12 text-clinical-muted font-black uppercase tracking-[0.3em] animate-pulse">{t('mgr_loading')}</div>;

  const kpiCards = [
    {
      label: t('mgr_kpi_dos'), icon: <CalendarRange size={16} className="text-emerald-600" />,
      value: '15.2 Days', sparkData: sparklines.supplyDays, sparkColor: '#10b981',
      color: 'green' as any,
      tooltip: 'Projected inventory coverage based on rolling 30-day demand.', trend: '+0.7 days vs goal', trendUp: true,
    },
    {
      label: t('mgr_kpi_stat'), icon: <Target size={16} className="text-rose-500" />,
      value: kpis.statResponseTime, sparkData: sparklines.statTime, sparkColor: '#f43f5e',
      color: getKpiColorLevel(2.8, 5, 10),
      tooltip: t('tt_kpi_stat'), trend: 'Under 5m SLA target met', trendUp: false,
    },
    {
      label: t('mgr_kpi_wastage'), icon: <PieChart size={16} className="text-amber-500" />,
      value: kpis.wastageRate, sparkData: sparklines.wastage, sparkColor: '#f59e0b',
      color: getKpiColorLevel(1.2, thresholds?.wastageGreen || 2, thresholds?.wastageYellow || 5),
      tooltip: t('tt_kpi_wastage'), trend: '0.5% reduction vs last month', trendUp: false,
    },
    {
      label: t('mgr_kpi_compliance'), icon: <ShieldCheckIcon size={16} className="text-sky-500" />,
      value: kpis.dualReviewCompletionRate, sparkData: sparklines.compliance, sparkColor: '#0ea5e9',
      color: getKpiColorLevel(99.5, thresholds?.complianceGreen || 98, thresholds?.complianceYellow || 95, true),
      tooltip: t('tt_kpi_compliance'), trend: 'Regulatory requirement met', trendUp: true,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      
      {/* Executive Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 border-b border-clinical-border pb-12 px-2">
         <div className="flex items-start gap-4">
            {onBack && (
               <button 
                 onClick={onBack} 
                 className="p-3 bg-clinical-card border border-clinical-border hover:bg-slate-200 dark:hover:bg-slate-800 rounded-[20px] text-clinical-text hover:text-rose-500 transition-all mt-1 shadow-md active:scale-95 duration-150 cursor-pointer"
                 title={t('mgr_back')}
               >
                  <ArrowLeft size={20} />
               </button>
            )}
            <div className="space-y-2">
               <div className="premium-subtitle">
                  {t('mgr_oversight_node')}
               </div>
               <h1 className="premium-heading">{t('mgr_title')}</h1>
               <p className="text-clinical-muted text-[11px] font-black uppercase tracking-[0.3em] mt-1 opacity-80">{t('mgr_subtitle')}</p>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-clinical-bg p-2 rounded-2xl border border-clinical-border shadow-inner">
               <button className="px-6 py-2.5 bg-clinical-bg text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-2xl border border-clinical-border">Live</button>
               <button className="px-6 py-2.5 text-clinical-muted hover:text-clinical-text rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">7D</button>
               <button className="px-6 py-2.5 text-clinical-muted hover:text-clinical-text rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">30D</button>
            </div>
            <button onClick={() => setShowConfig(!showConfig)} className="p-4 bg-clinical-card border border-clinical-border text-clinical-muted hover:text-rose-500 rounded-[24px] transition-all shadow-2xl hover:scale-110 active:scale-95">
               <Settings size={24} />
            </button>
         </div>
      </div>

      {/* Primary KPI Strip - High Density */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {kpiCards.map((kpi, i) => {
          const cls = COLOR_CLASSES[kpi.color];
          return (
            <Tooltip key={i} content={kpi.tooltip}>
              <div className={`p-8 rounded-[40px] border ${cls.border} ${cls.bg} bg-opacity-40 backdrop-blur-xl transition-all hover:scale-[1.03] cursor-default group relative overflow-hidden shadow-2xl`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-clinical-card/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="p-3 bg-clinical-bg/80 rounded-2xl border border-clinical-border shadow-inner group-hover:text-clinical-text transition-colors">{kpi.icon}</div>
                  <Sparkline data={kpi.sparkData} color={kpi.sparkColor} width={90} height={30} />
                </div>
                <p className="text-[11px] font-black text-clinical-muted uppercase tracking-[0.2em] mb-2 italic">{kpi.label}</p>
                <div className="flex items-baseline gap-3 relative z-10">
                  <span className={`text-4xl font-black italic tracking-tighter ${cls.text}`}>{kpi.value}</span>
                  <div className={`flex items-center gap-1.5 text-[10px] font-black ${kpi.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {kpi.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  </div>
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Strategic Analytics */}
        <div className="xl:col-span-8 space-y-8">
          <div className="clinical-card p-10 bg-clinical-card/20 border border-clinical-border backdrop-blur-xl relative overflow-hidden">
             <div className="flex justify-between items-center mb-10">
               <div>
                 <h2 className="text-2xl font-black text-clinical-text uppercase tracking-[0.2em] italic">{t('mgr_throughput_title')}</h2>
                 <p className="text-clinical-muted text-[10px] font-black uppercase tracking-widest mt-1">{t('mgr_throughput_sub')}</p>
               </div>
               <div className="flex gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-clinical-bg border border-clinical-border rounded-xl">
                     <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                     <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t('mgr_actual')}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-clinical-bg border border-clinical-border rounded-xl">
                     <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                     <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t('mgr_forecast')}</span>
                  </div>
               </div>
             </div>
             
             <div className="h-[360px] w-full bg-clinical-bg/40 rounded-[40px] border border-clinical-border flex flex-col items-center justify-center p-12 relative group shadow-inner">
                {/* Simulated Chart Visualization */}
                <div className="w-full h-full flex items-end justify-between gap-2 px-4">
                  {[45, 62, 58, 75, 90, 82, 70, 85, 95, 110, 105, 120].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                       <div className="w-full bg-clinical-bg rounded-t-xl relative overflow-hidden group-hover:bg-clinical-bg/50 transition-all" style={{ height: `${h}%` }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rose-600 to-rose-500 h-[60%] opacity-80 group-hover:opacity-100 transition-all rounded-t-lg shadow-lg shadow-rose-900/20"></div>
                       </div>
                       <span className="text-[8px] font-black text-clinical-muted uppercase tracking-widest">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="bg-clinical-bg/90 border border-clinical-border p-6 rounded-3xl backdrop-blur-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 scale-95 group-hover:scale-100">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1">{t('mgr_peak_perf')}</p>
                      <p className="text-2xl font-black text-clinical-text italic tracking-tighter">+18.4% WoW</p>
                      <p className="text-[9px] text-clinical-muted font-bold uppercase tracking-widest mt-2">{t('mgr_opt_target')}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Wastage Breakdown Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="clinical-card p-8 bg-clinical-card/20 border border-clinical-border">
                <h3 className="text-sm font-black text-clinical-text uppercase tracking-[0.2em] mb-8 italic flex items-center gap-3">
                   <PieChart size={18} className="text-amber-500" />
                   Wastage Breakdown
                </h3>
                <div className="space-y-6">
                   {[
                     { label: 'Expirations', val: '64%', color: 'rose-500', trend: 'down' },
                     { label: 'Cold Chain Violation', val: '22%', color: 'sky-500', trend: 'down' },
                     { label: 'Processing Errors', val: '14%', color: 'amber-500', trend: 'up' },
                   ].map(item => (
                     <div key={item.label} className="space-y-2">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{item.label}</span>
                           <span className="text-xs font-black text-clinical-text tracking-tighter italic">{item.val}</span>
                        </div>
                        <div className="h-1.5 w-full bg-clinical-bg rounded-full overflow-hidden">
                           <div className={`h-full bg-${item.color} shadow-lg shadow-${item.color}/20 transition-all`} style={{ width: item.val }}></div>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="mt-8 pt-6 border-t border-clinical-border flex items-center justify-between">
                   <p className="text-[9px] text-clinical-muted font-bold uppercase tracking-widest italic">Annual Cost Impact: <span className="text-rose-500">-$24,500</span></p>
                   <ArrowRight size={14} className="text-clinical-text" />
                </div>
             </div>

             <div className="clinical-card p-8 bg-clinical-card/20 border border-clinical-border">
                <h3 className="text-sm font-black text-clinical-text uppercase tracking-[0.2em] mb-8 italic flex items-center gap-3">
                   <Activity size={18} className="text-sky-500" />
                   Safety Alerts
                </h3>
                <div className="space-y-4">
                   {alerts.length > 0 ? alerts.map(a => (
                     <div key={a.id} className="flex items-center gap-4 p-3 bg-clinical-bg/50 border border-clinical-border rounded-2xl group hover:border-clinical-border transition-all">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${a.severity === 'Critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500'}`}></div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-black text-clinical-text uppercase truncate">{a.title}</p>
                           <p className="text-[8px] text-clinical-muted font-bold uppercase tracking-widest truncate">{a.message}</p>
                        </div>
                        <span className="text-[8px] font-mono text-clinical-text font-black shrink-0">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                   )) : (
                     <div className="h-32 flex items-center justify-center border-2 border-dashed border-clinical-border rounded-3xl">
                        <p className="text-[10px] font-black text-clinical-text uppercase tracking-widest italic">{t('mgr_no_anomalies')}</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>

        {/* Strategic Sidebar */}
        <div className="xl:col-span-4 space-y-8">
           <div className="clinical-card p-8 bg-clinical-card/20 border border-clinical-border backdrop-blur-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black text-clinical-muted uppercase tracking-[0.3em] italic">{t('mgr_hub_health')}</h3>
                <Filter size={14} className="text-clinical-text" />
              </div>
              <div className="space-y-8">
                {[
                  { name: 'Northern Hub', status: 'Optimal', load: '42%', color: 'emerald' },
                  { name: 'Southern Center', status: 'Peak', load: '88%', color: 'rose' },
                  { name: 'Central Supply', status: 'Safe', load: '65%', color: 'sky' },
                  { name: 'District Delta', status: 'Low Stock', load: '12%', color: 'amber' },
                ].map(node => (
                  <div key={node.name} className="flex flex-col gap-3 group cursor-default">
                    <div className="flex justify-between items-end">
                      <div>
                         <span className="text-[11px] font-black text-clinical-text uppercase tracking-widest italic group-hover:text-rose-500 transition-colors">{node.name}</span>
                         <p className="text-[8px] text-clinical-muted font-bold uppercase mt-0.5 tracking-tighter">Utilization: {node.load}</p>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                        node.color === 'rose' ? 'bg-rose-950/30 text-rose-500 border-rose-900/30' : 
                        node.color === 'emerald' ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/30' :
                        'bg-clinical-bg text-clinical-muted border-clinical-border'
                      }`}>{node.status}</span>
                    </div>
                    <div className="h-1 w-full bg-clinical-bg rounded-full overflow-hidden border border-clinical-border">
                      <div className={`h-full bg-${node.color}-500 shadow-sm transition-all duration-1000`} style={{ width: node.load }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-10 py-3 bg-clinical-card border border-clinical-border text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] rounded-2xl hover:bg-clinical-bg hover:text-white transition-all group">
                 View Node Matrix <ArrowRight size={12} className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
           </div>

           <div className="bg-gradient-to-br from-rose-600 to-rose-700 rounded-[40px] p-8 shadow-2xl shadow-rose-900/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-clinical-card/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-clinical-card transition-all duration-1000" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 bg-clinical-card rounded-xl backdrop-blur-md"><AlertCircle className="text-clinical-text" size={20} /></div>
                   <h3 className="text-xs font-black text-clinical-text uppercase tracking-widest italic">Safety Protocol S-10</h3>
                </div>
                <p className="text-[11px] text-clinical-text/80 leading-relaxed font-bold uppercase tracking-widest italic mb-8">
                  V3.0 System-wide hard-gating is now active. All reagent lot numbers must be verified before laboratory release.
                </p>
                <div className="flex items-center justify-between p-4 bg-clinical-bg rounded-2xl border border-clinical-border backdrop-blur-sm">
                   <div>
                      <p className="text-[8px] font-black text-clinical-text/50 uppercase tracking-widest mb-0.5">{t('mgr_network_status')}</p>
                      <p className="text-sm font-black text-clinical-text tracking-tighter uppercase italic">100% Compliant</p>
                   </div>
                   <div className="w-8 h-8 rounded-full border-2 border-clinical-border border-t-white animate-spin"></div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* KPI Threshold Config Panel */}
      {showConfig && thresholds && (
        <div className="clinical-card p-10 bg-clinical-card border border-clinical-border animate-in zoom-in-95 duration-500 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-base font-black text-clinical-text flex items-center gap-3 uppercase tracking-widest italic">
                <Settings size={20} className="text-rose-500" /> KPI Configuration Hub
             </h3>
             <button onClick={() => setShowConfig(false)} className="text-clinical-muted hover:text-clinical-text transition-colors"><AlertCircle size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {Object.entries(thresholds).map(([key, val]) => (
              <div key={key} className="space-y-3">
                <label className="text-[10px] text-clinical-muted uppercase font-black tracking-widest block italic">{key.replace(/([A-Z])/g, ' $1')}</label>
                <input type="number" value={val as number}
                  onChange={e => setThresholds({ ...thresholds, [key]: parseFloat(e.target.value) })}
                  className="w-full bg-clinical-bg border border-clinical-border rounded-xl px-4 py-3 text-clinical-text text-sm font-mono focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/50 outline-none transition-all shadow-inner" />
              </div>
            ))}
          </div>
          <div className="mt-10 pt-8 border-t border-clinical-border flex justify-end gap-4">
             <button onClick={() => setShowConfig(false)} className="px-8 py-3 text-[10px] font-black text-clinical-muted uppercase tracking-widest hover:text-clinical-text transition-all">{t('mgr_discard')}</button>
             <button onClick={handleSaveThresholds} className="px-10 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all">{t('mgr_commit')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
