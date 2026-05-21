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

  const getPriorityStyles = (p: string) => {
    switch (p) {
      case 'Urgent': return 'from-rose-500 to-rose-700 border-rose-400/50 shadow-rose-900/40';
      case 'High': return 'from-amber-500 to-orange-600 border-amber-400/50 shadow-amber-900/40';
      default: return 'from-slate-800 to-slate-900 border-clinical-border shadow-sm';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {missions.map(mission => (
            <div 
              key={mission.id}
              className={`group relative flex flex-col p-8 rounded-[40px] border transition-all hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br ${getPriorityStyles(mission.priority)}`}
            >
              <div className="flex justify-between items-start mb-8">
                 <div className="p-4 rounded-2xl bg-clinical-bg backdrop-blur-xl border border-clinical-border shadow-lg group-hover:rotate-6 transition-transform">
                    {mission.icon}
                 </div>
                 <div className="px-4 py-2 rounded-full bg-clinical-bg backdrop-blur-xl border border-clinical-border text-[10px] font-black uppercase tracking-[0.2em]">
                    {mission.deadline}
                 </div>
              </div>

              <h3 className="text-2xl font-black italic tracking-tight mb-3 uppercase leading-tight text-clinical-text">{mission.title}</h3>
              <p className="text-[12px] font-bold text-clinical-text/70 mb-10 leading-relaxed uppercase tracking-wide">
                {mission.description}
              </p>

              <div className="mt-auto space-y-8">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-clinical-text/50">
                       <span>Readiness</span>
                       <span>{mission.progress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-clinical-bg rounded-full overflow-hidden p-0.5 border border-clinical-border">
                       <div 
                         className="h-full bg-clinical-card rounded-full shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-1000 ease-out"
                         style={{ width: `${mission.progress}%` }}
                       />
                    </div>
                 </div>

                 <button 
                   onClick={() => onNavigate?.(mission.roleTarget)}
                   className="w-full py-5 rounded-[24px] bg-clinical-card text-black font-black uppercase italic tracking-tighter hover:bg-clinical-bg active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl"
                 >
                   Launch Mission <ArrowRight size={20} />
                 </button>
              </div>

              {/* Priority Tag */}
              <div className="absolute -top-3 -right-3 px-4 py-2 rounded-xl bg-clinical-bg border border-clinical-border text-[10px] font-black text-clinical-text uppercase tracking-widest shadow-2xl group-hover:-translate-y-1 transition-transform">
                 {mission.priority}
              </div>
            </div>
          ))}
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
