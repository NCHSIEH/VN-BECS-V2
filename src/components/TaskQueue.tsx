import React from 'react';
import { useI18n } from '../lib/i18n';
import { Role } from '../types';
import { 
  ArrowRight,
  Activity,
  ShieldCheck,
  Package,
  Truck,
  FlaskConical,
  Stethoscope,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string;
  priority: 'Urgent' | 'High' | 'Routine';
  progress: number;
  deadline: string;
  roleTarget: Role;
  icon: React.ReactNode;
}

interface TaskQueueProps {
  role: Role;
  onNavigate?: (role: Role) => void;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({ role, onNavigate }) => {
  const { t } = useI18n();

  const getMissionsForRole = (r: Role): Mission[] => {
    const allMissions: Mission[] = [
      { 
        id: 'M-1', 
        title: 'Emergency Requisition STAT', 
        description: 'Patient #8829 (ER) requires 2 units O Neg immediately. Pre-warm authorized.', 
        priority: 'Urgent', 
        progress: 10, 
        deadline: '5m', 
        roleTarget: 'HospitalOperator', 
        icon: <Stethoscope size={24} /> 
      },
      { 
        id: 'M-2', 
        title: 'Precision Crossmatch Queue', 
        description: 'Batch #2405 (Surgery Pack) awaiting compatibility validation.', 
        priority: 'High', 
        progress: 45, 
        deadline: '15m', 
        roleTarget: 'LIMS_Simulator',
        icon: <FlaskConical size={24} /> 
      },
      { 
        id: 'M-3', 
        title: 'Inventory Dispatch Pick', 
        description: 'Order #ORD-992 (Central Hub) ready for picking & validation.', 
        priority: 'High', 
        progress: 0, 
        deadline: '20m', 
        roleTarget: 'WarehouseIssuer', 
        icon: <Package size={24} /> 
      },
      { 
        id: 'M-4', 
        title: 'Cold Chain Anomaly Audit', 
        description: 'Transport T-12 temperature variance detected (+1.8°C). Review log.', 
        priority: 'Urgent', 
        progress: 60, 
        deadline: 'ASAP', 
        roleTarget: 'Dispatcher', 
        icon: <Truck size={24} /> 
      },
      { 
        id: 'M-5', 
        title: 'Bedside ID Verification', 
        description: 'Patient #0012 transfusion start pending bedside ID check.', 
        priority: 'Urgent', 
        progress: 85, 
        deadline: '2m', 
        roleTarget: 'Nurse', 
        icon: <ShieldCheck size={24} /> 
      },
      { 
        id: 'M-6', 
        title: 'Executive KPI Sync', 
        description: 'Generate national blood usage report for Ministry of Health.', 
        priority: 'Routine', 
        progress: 0, 
        deadline: 'EOD', 
        roleTarget: 'Admin',
        icon: <Activity size={24} /> 
      }
    ];

    if (r === 'Admin') return allMissions;
    return allMissions.filter(m => m.roleTarget === r);
  };

  const missions = getMissionsForRole(role);
  const getPriorityColors = (p: string) => {
    switch (p) {
      case 'Urgent':
        return {
          border: 'border-rose-500/35 animate-breath-urgent border-2',
          glow: 'bg-rose-500 shadow-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
          btn: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
        };
      case 'High':
        return {
          border: 'border-amber-500/35 animate-breath-high border-2',
          glow: 'bg-amber-500 shadow-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
          btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
        };
      default:
        return {
          border: 'border-clinical-border hover:border-clinical-primary/50 shadow-sm hover:shadow-md border bg-clinical-card/95',
          glow: 'bg-clinical-primary/60 shadow-[0_0_5px_var(--clinical-primary)]',
          btn: 'bg-clinical-primary hover:bg-clinical-primary/80 shadow-clinical-primary/30'
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-clinical-border pb-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
             <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Operational Intelligence</span>
          </div>
          <h1 className="text-5xl font-black text-clinical-text italic tracking-tighter uppercase leading-none">Mission Control</h1>
          <p className="text-clinical-muted text-[11px] font-black uppercase tracking-[0.3em] mt-4">Active Command Stream | <span className="text-rose-500">{role}</span></p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-clinical-bg backdrop-blur-xl border border-clinical-border p-5 rounded-[24px] min-w-[140px] text-center">
              <p className="text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-1">Efficiency</p>
              <p className="text-3xl font-black text-emerald-500 tracking-tighter italic">94.2%</p>
           </div>
           <div className="bg-clinical-bg backdrop-blur-xl border border-clinical-border p-5 rounded-[24px] min-w-[140px] text-center">
              <p className="text-[9px] font-black text-clinical-muted uppercase tracking-widest mb-1">Active</p>
              <p className="text-3xl font-black text-rose-500 tracking-tighter italic">{missions.length}</p>
           </div>
        </div>
      </div>

      {missions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 bg-clinical-card/20 rounded-[40px] border border-dashed border-clinical-border">
           <Activity size={48} className="text-clinical-text mb-6" />
           <p className="text-clinical-muted font-black uppercase tracking-[0.3em] text-xs text-center leading-relaxed">
             No High-Priority Missions Detected<br/>
             <span className="opacity-50">Monitoring global data streams...</span>
           </p>
        </div>
      ) : (
        /* The Centralized Operational Command Dispatch Hub Frame */
        <div className="relative p-6 lg:p-8 rounded-[36px] border border-clinical-primary/20 bg-clinical-card/35 dark:bg-slate-950/20 backdrop-blur-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] mt-2 overflow-hidden">
           {/* Subtle high-tech diagonal strip background inside the container frame */}
           <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-clinical-primary/5 to-transparent blur-3xl pointer-events-none -z-10" />
           
           {/* Hub Header Info Strip */}
           <div className="flex justify-between items-center mb-6 border-b border-clinical-border pb-4 select-none">
              <div className="flex items-center gap-3">
                 <span className="w-2.5 h-2.5 rounded-full bg-clinical-primary animate-pulse" />
                 <span className="text-[10px] font-mono text-clinical-muted uppercase tracking-[0.25em] font-black">
                    Operational Control Dispatch Hub // Active Mission Log
                 </span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="px-2 py-0.5 rounded-md bg-clinical-primary/10 border border-clinical-primary/20 text-[8px] font-mono text-clinical-primary font-bold tracking-widest uppercase">
                    SYSTEM STATUS: SYNCED
                 </span>
              </div>
           </div>

           {/* The Card Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {missions.map(mission => {
               const colors = getPriorityColors(mission.priority);

               return (
                 <div 
                   key={mission.id}
                   className={`group relative flex flex-col p-6 rounded-tl-[12px] rounded-br-[12px] rounded-tr-[36px] rounded-bl-[36px] border bg-clinical-card/85 backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 ${colors.border}`}
                 >
                   {/* Cyber HUD Corner Elements for Proposal 1 high-tech style */}
                   <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-clinical-muted/40 group-hover:border-clinical-primary/60 transition-colors" />
                   <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-clinical-muted/40 group-hover:border-clinical-primary/60 transition-colors" />
                   <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-clinical-muted/40 group-hover:border-clinical-primary/60 transition-colors" />
                   <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-clinical-muted/40 group-hover:border-clinical-primary/60 transition-colors" />

                   {/* Top Section: Icon, ID, Priority Glow Tag */}
                   <div className="flex justify-between items-start mb-5">
                      <div className="relative">
                         <div className="p-3.5 rounded-xl bg-clinical-bg border border-clinical-border shadow-inner text-clinical-text group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                            {mission.icon}
                         </div>
                         <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-clinical-card ${colors.glow} animate-pulse`} />
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                         <span className="text-[9px] font-mono text-clinical-muted font-bold tracking-wider">{mission.id}</span>
                         <span className="px-2.5 py-0.5 rounded-full bg-clinical-bg border border-clinical-border text-[8px] font-black text-clinical-muted uppercase tracking-widest">
                            {mission.deadline}
                         </span>
                      </div>
                   </div>

                   {/* Tactical readout indicators */}
                   <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-clinical-primary/40 group-hover:bg-clinical-primary transition-colors" />
                      <span className="text-[8px] font-mono text-clinical-muted uppercase tracking-[0.2em] font-bold">CASE READOUT // {mission.priority}</span>
                   </div>

                   {/* Card Title & Description */}
                   <h3 className="text-lg font-black italic tracking-tight mb-2 uppercase leading-tight text-clinical-text group-hover:text-clinical-primary transition-colors">
                      {mission.title}
                   </h3>
                   <p className="text-[11px] font-semibold text-clinical-muted mb-6 leading-relaxed uppercase tracking-wide line-clamp-2">
                      {mission.description}
                   </p>

                   {/* Readiness Indicator & Launch Button */}
                   <div className="mt-auto space-y-5">
                      <div className="space-y-2">
                         <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-clinical-muted">
                            <span>Readiness</span>
                            <span className="font-mono">{mission.progress}%</span>
                         </div>
                         <div className="h-2 w-full bg-clinical-bg rounded-full overflow-hidden p-0.5 border border-clinical-border">
                            <div 
                              className="h-full bg-clinical-primary rounded-full shadow-[0_0_8px_var(--clinical-primary)] transition-all duration-1000 ease-out"
                              style={{ width: `${mission.progress}%` }}
                            />
                         </div>
                      </div>

                      <button 
                        onClick={() => onNavigate?.(mission.roleTarget)}
                        className={`w-full py-3 rounded-xl text-white font-black uppercase italic tracking-tighter active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md text-xs cursor-pointer ${colors.btn}`}
                      >
                        Launch Mission <ArrowRight size={16} />
                      </button>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      )}
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10">
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-rose-600/5 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-sky-600/5 blur-[150px] rounded-full animate-pulse" />
      </div>
    </div>
  );
};
