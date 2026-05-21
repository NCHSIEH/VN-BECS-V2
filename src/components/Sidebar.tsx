import React, { useState, useEffect, useCallback } from 'react';
import { BloodDropLogo } from './BloodDropLogo';
import { useI18n } from '../lib/i18n';
import { Role, SystemType, User } from '../types';
import { 
  FlaskConical, 
  Truck, 
  BarChart3, 
  ChevronRight,
  Stethoscope,
  Activity,
  ShieldCheck,
  Package,
  RefreshCcw,
  Users,
  MapPin,
  ClipboardList,
  Globe,
  Zap,
  Database,
  ArrowRightLeft,
  Thermometer,
  Droplet,
  Send,
  Lock
} from 'lucide-react';

interface SidebarProps {
  currentRole: Role;
  setRole: (role: Role) => void;
  allowedRoles: Role[];
  currentSystem: SystemType;
  limsTab?: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE';
  setLimsTab?: (tab: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE') => void;
  onReturnToPortal?: () => void;
  user?: User | null;
}

/** Returns true if the given user role can access the given LIMS stage */
function isLimsStageAllowed(userRole: Role | undefined, stageId: string): boolean {
  if (!userRole) return true;
  // Admin and Manager have full access
  if (userRole === 'Admin' || (userRole as string) === 'Manager') return true;
  switch (userRole) {
    case 'DonorScreener': return stageId === 'DONOR';
    case 'Nurse': return stageId === 'LAB' || stageId === 'PROCESS';
    case 'LIMS_Simulator': return stageId === 'RELEASE';
    default: return true;
  }
}

interface LimsBadgeCounts {
  DONOR: number;
  LAB: number;
  PROCESS: number;
  RELEASE: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentRole, 
  setRole, 
  allowedRoles, 
  currentSystem, 
  limsTab, 
  setLimsTab, 
  onReturnToPortal,
  user
}) => {
  const { t } = useI18n();
  const [badgeCounts, setBadgeCounts] = useState<LimsBadgeCounts>({ DONOR: 0, LAB: 0, PROCESS: 0, RELEASE: 0 });
  const [hoveredLocked, setHoveredLocked] = useState<string | null>(null);

  const fetchLimsBadges = useCallback(async () => {
    if (currentSystem !== 'LIMS') return;
    try {
      const [donorsRes, donationsRes, componentsRes] = await Promise.all([
        fetch('/api/v1/lims/donors'),
        fetch('/api/v1/lims/donations'),
        fetch('/api/v1/lims/components'),
      ]);
      const [donors, donations, components] = await Promise.all([
        donorsRes.ok ? donorsRes.json() : [],
        donationsRes.ok ? donationsRes.json() : [],
        componentsRes.ok ? componentsRes.json() : [],
      ]);

      const donorArr = Array.isArray(donors) ? donors : [];
      const donationArr = Array.isArray(donations) ? donations : [];
      const componentArr = Array.isArray(components) ? components : [];

      setBadgeCounts({
        DONOR: donorArr.length,
        LAB: donationArr.filter((d: any) => (d.idmStatus || 'PENDING') === 'PENDING').length,
        PROCESS: donationArr.filter((d: any) => d.idmStatus === 'CLEARED' && (d.componentCount ?? 0) === 0).length,
        RELEASE: componentArr.filter((c: any) => c.status === 'AVAILABLE').length,
      });
    } catch { /* silent */ }
  }, [currentSystem]);

  useEffect(() => {
    if (currentSystem !== 'LIMS') return;
    fetchLimsBadges();
    const interval = setInterval(fetchLimsBadges, 8000);
    const handleUpdate = () => fetchLimsBadges();
    window.addEventListener('lims-data-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('lims-data-updated', handleUpdate);
    };
  }, [currentSystem, fetchLimsBadges]);

  const groups = [
    {
      id: 'clinical',
      title: t('nav_clinical'),
      icon: <Stethoscope size={18} />,
      roles: ['HospitalOperator', 'Nurse', 'Nurse_Hemovigilance', 'Nurse_MTP'] as Role[],
    },
    {
      id: 'lab',
      title: t('nav_laboratory'),
      icon: <FlaskConical size={18} />,
      roles: ['LIMS_Simulator', 'DonorScreener'],
    },
    {
      id: 'logistics',
      title: t('nav_logistics'),
      icon: <Truck size={18} />,
      roles: ['Dispatcher', 'WarehouseIssuer', 'Warehouse_IssueReturn', 'Courier', 'Resource'] as Role[],
    },
    {
      id: 'management',
      title: t('nav_management'),
      icon: <BarChart3 size={18} />,
      roles: ['Admin', 'QA_Officer'],
    }
  ];

  /** Get display label for which role can access this stage (for locked tooltip) */
  function getLockTooltip(stageId: string): string {
    switch (stageId) {
      case 'DONOR': return '助理 (DonorScreener) 專屬';
      case 'LAB': return '護理師 (Nurse) 專屬';
      case 'PROCESS': return '護理師 (Nurse) 專屬';
      case 'RELEASE': return '實驗室人員 (LIMS_Simulator) 專屬';
      default: return '無存取權限';
    }
  }

  return (
    <aside className="w-72 bg-clinical-card/85 border-r border-clinical-border flex flex-col h-full overflow-y-auto shrink-0 shadow-2xl z-40 backdrop-blur-xl transition-all duration-300">
      <div className="p-8">
        <div className="flex items-center gap-5 mb-8 px-2 group">
          <BloodDropLogo size={24} />
          <div>
            <h2 className="text-[14px] font-black text-clinical-text uppercase tracking-[0.4em] italic leading-none group-hover:text-clinical-primary transition-colors">VN-BECS</h2>
            <p className="text-[9px] text-clinical-muted font-black uppercase tracking-[0.25em] mt-2 opacity-80 italic">Enterprise Command V1.0</p>
          </div>
        </div>

        <nav className="space-y-10">
          {/* Return to Portal Button */}
          {onReturnToPortal && (
            <button
              onClick={onReturnToPortal}
              className="w-full flex items-center gap-4 px-6 py-4 bg-clinical-primary/10 border border-clinical-primary/20 rounded-[24px] text-clinical-primary hover:bg-clinical-primary hover:text-white transition-all group shadow-lg active:scale-95 mb-10"
            >
              <ArrowRightLeft size={18} className="group-hover:rotate-180 transition-all duration-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">System Portal</span>
            </button>
          )}
          {/* LIMS MODE */}
          {currentSystem === 'LIMS' && (
            <div className="space-y-4">
               <div className="flex items-center gap-3 px-2">
                  <div className="text-clinical-primary bg-clinical-primary/10 p-2 rounded-xl border border-clinical-primary/20 shadow-inner">
                    <FlaskConical size={20} />
                  </div>
                  <span className="text-[11px] font-black text-clinical-text uppercase tracking-[0.25em]">LIMS Stages</span>
               </div>
               <div className="space-y-2">
                 {[
                   { id: 'DONOR', label: t('lims_stage_registration'), icon: <Users size={18} />, badgeKey: 'DONOR' as keyof LimsBadgeCounts },
                   { id: 'LAB', label: t('lims_stage_screening'), icon: <Thermometer size={18} />, badgeKey: 'LAB' as keyof LimsBadgeCounts },
                   { id: 'PROCESS', label: t('lims_stage_phlebotomy'), icon: <Droplet size={18} />, badgeKey: 'PROCESS' as keyof LimsBadgeCounts },
                   { id: 'RELEASE', label: t('lims_stage_logistics'), icon: <Send size={18} />, badgeKey: 'RELEASE' as keyof LimsBadgeCounts },
                 ].map((stage) => {
                   const allowed = isLimsStageAllowed(user?.role, stage.id);
                   const count = badgeCounts[stage.badgeKey];
                   const isActive = limsTab === stage.id;
                   return (
                     <div key={stage.id} className="relative">
                       <button
                         onClick={() => allowed && setLimsTab && setLimsTab(stage.id as any)}
                         onMouseEnter={() => !allowed && setHoveredLocked(stage.id)}
                         onMouseLeave={() => setHoveredLocked(null)}
                         disabled={!allowed}
                         title={!allowed ? getLockTooltip(stage.id) : undefined}
                         className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group relative ${
                           !allowed
                             ? 'opacity-40 cursor-not-allowed text-clinical-muted bg-clinical-bg/20'
                             : isActive
                             ? 'bg-clinical-bg text-clinical-text border border-clinical-border shadow-md scale-[1.02]'
                             : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg/50'
                         }`}
                       >
                         <div className="flex items-center gap-4">
                            <div className={`transition-colors ${
                              !allowed ? 'text-clinical-muted' : isActive ? 'text-clinical-primary' : 'text-clinical-muted group-hover:text-clinical-text'
                            }`}>
                               {!allowed ? <Lock size={18} /> : stage.icon}
                            </div>
                            <span className="text-[12px] font-black tracking-tight uppercase italic text-left">{stage.label}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           {count > 0 && allowed && (
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                               isActive
                                 ? 'bg-clinical-primary text-white shadow-[0_0_8px_var(--clinical-primary)]'
                                 : 'bg-clinical-primary/15 text-clinical-primary border border-clinical-primary/30'
                             }`}>
                               {count}
                             </span>
                           )}
                           {isActive && allowed && (
                             <div className="w-1.5 h-1.5 rounded-full bg-clinical-primary shadow-[0_0_10px_var(--clinical-primary)]" />
                           )}
                         </div>
                       </button>
                       {/* Lock tooltip */}
                       {!allowed && hoveredLocked === stage.id && (
                         <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none">
                           <div className="flex items-center gap-1.5">
                             <Lock size={10} />
                             {getLockTooltip(stage.id)}
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {/* HOSPITAL MODE */}
          {currentSystem === 'HOSPITAL' && (
            <div className="space-y-4">
               <div className="flex items-center gap-3 px-2">
                  <div className="text-clinical-primary bg-clinical-primary/10 p-2 rounded-xl border border-clinical-primary/20 shadow-inner">
                    <Stethoscope size={20} />
                  </div>
                  <span className="text-[11px] font-black text-clinical-text uppercase tracking-[0.25em]">Clinical Flow</span>
               </div>
               <div className="space-y-2">
                 {[
                   { id: 'Dashboard', label: t('ui_mission_control'), icon: <Activity size={18} /> },
                   { id: 'Nurse', label: t('ui_bedside_verif'), icon: <ShieldCheck size={18} /> },
                   { id: 'HospitalOperator', label: t('ui_emergency_req'), icon: <Stethoscope size={18} /> },
                   { id: 'Nurse_MTP', label: t('ui_mtp_tactical'), icon: <Zap size={18} /> },
                 ].map((flow) => (
                   <button
                     key={flow.id}
                     onClick={() => setRole(flow.id as Role)}
                     className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group relative ${
                       currentRole === flow.id
                         ? 'bg-clinical-bg text-clinical-text border border-clinical-border shadow-md scale-[1.02]'
                         : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg/50'
                     }`}
                   >
                     <div className="flex items-center gap-4">
                        <div className={`transition-colors ${currentRole === flow.id ? 'text-clinical-primary' : 'text-clinical-muted group-hover:text-clinical-text'}`}>
                           {flow.icon}
                        </div>
                        <span className="text-[12px] font-black tracking-tight uppercase italic text-left">{flow.label}</span>
                     </div>
                     {currentRole === flow.id && (
                       <div className="w-1.5 h-1.5 rounded-full bg-clinical-primary shadow-[0_0_10px_var(--clinical-primary)]" />
                     )}
                   </button>
                 ))}
               </div>
            </div>
          )}

          {/* HUB MODE */}
          {currentSystem === 'HUB' && (
            <>
              {/* Priority Task Queue */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3 px-2">
                    <div className="text-clinical-primary bg-clinical-primary/10 p-2 rounded-xl border border-clinical-primary/20 shadow-inner"><Activity size={20} /></div>
                    <span className="text-[11px] font-black text-clinical-text uppercase tracking-[0.25em]">Operational Flow</span>
                 </div>
                 {/* Version Tag */}
                 <div className="fixed bottom-8 right-8 text-[10px] font-black text-clinical-muted uppercase tracking-[0.5em] italic">
                   VN-BECS V1.0 Enterprise
                 </div>
                 <button
                    onClick={() => setRole('Dashboard' as Role)}
                    className={`w-full flex flex-col items-start px-6 py-5 rounded-[24px] transition-all group relative overflow-hidden ${
                      currentRole === ('Dashboard' as Role)
                        ? 'bg-clinical-bg text-clinical-text border border-clinical-border shadow-xl scale-[1.02]'
                        : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg/50'
                    }`}
                 >
                   <span className="text-[14px] font-black tracking-[0.1em] uppercase italic mb-1">My Task Queue</span>
                   <span className="text-[9px] font-bold text-clinical-muted uppercase tracking-widest">Driven by AI Dispatch</span>
                   {currentRole === ('Dashboard' as Role) && (
                     <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-clinical-primary" />
                   )}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-clinical-card border border-clinical-border flex items-center justify-center shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-clinical-primary animate-pulse shadow-[0_0_8px_var(--clinical-primary)]" />
                   </div>
                 </button>
              </div>

              {/* Operational Hub Groups */}
              {[
                {
                  title: t('ui_frontline_ops'),
                  icon: <Activity size={18} className="text-rose-500" />,
                  items: [
                    { id: 'Dashboard', label: t('ui_mission_control'), icon: <Activity size={18} /> },
                    { id: 'Nurse', label: t('ui_bedside_verif'), icon: <ShieldCheck size={18} /> },
                    { id: 'Nurse_Hemovigilance', label: t('ui_hemo_pulse'), icon: <Activity size={18} /> },
                    { id: 'HospitalOperator', label: t('ui_emergency_req'), icon: <Stethoscope size={18} /> },
                    { id: 'Nurse_MTP', label: t('ui_mtp_tactical'), icon: <Zap size={18} /> },
                  ]
                },
                {
                  title: t('ui_clinical_lab'),
                  icon: <FlaskConical size={18} className="text-sky-500" />,
                  items: [
                    { id: 'LabTech_Crossmatch', label: t('ui_precision_crossmatch'), icon: <FlaskConical size={18} /> },
                    { id: 'MedicalReviewer', label: t('ui_idm_review'), icon: <ClipboardList size={18} /> },
                    { id: 'SOP11_RareDonor', label: t('ui_rare_registry'), icon: <Users size={18} /> },
                  ]
                },
                {
                  title: t('ui_supply_chain'),
                  icon: <Package size={18} className="text-emerald-500" />,
                  items: [
                    { id: 'WarehouseIssuer', label: t('ui_inventory_dispatch'), icon: <Package size={18} /> },
                    { id: 'Warehouse_IssueReturn', label: t('ui_returns_mgmt'), icon: <RefreshCcw size={18} /> },
                    { id: 'Dispatcher', label: t('ui_transport_logistics'), icon: <Truck size={18} /> },
                    { id: 'Courier', label: t('ui_cold_chain_delivery'), icon: <MapPin size={18} /> },
                    { id: 'Resource', label: t('ui_resource_mgmt'), icon: <Database size={18} /> },
                  ]
                },
                {
                  title: t('ui_strategic_intel'),
                  icon: <Globe size={18} className="text-amber-500" />,
                  items: [
                    { id: 'Manager', label: t('ui_executive_kpi'), icon: <Activity size={18} /> },
                    { id: 'Auditor', label: t('ui_compliance_audit'), icon: <ShieldCheck size={18} /> },
                    { id: 'NationalCommander', label: t('ui_national_inv'), icon: <Globe size={18} /> },
                  ]
                }
              ].map((group, idx) => {
                const visibleItems = group.items.filter(item => allowedRoles.includes(item.id as Role) || item.id === 'Dashboard');
                if (visibleItems.length === 0) return null;

                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                       <div className="p-2 rounded-xl bg-clinical-bg border border-clinical-border shadow-sm">{group.icon}</div>
                       <span className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.2em]">{group.title}</span>
                    </div>
                    <div className="space-y-2">
                      {visibleItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setRole(item.id as Role)}
                          className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group relative ${
                            currentRole === item.id
                              ? 'bg-clinical-bg text-clinical-text border border-clinical-border shadow-md scale-[1.02]'
                               : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg/50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                             <div className={`transition-colors ${currentRole === item.id ? 'text-clinical-primary' : 'text-clinical-muted group-hover:text-clinical-text'}`}>
                                {item.icon}
                             </div>
                             <span className="text-[12px] font-black tracking-tight uppercase italic text-left">{item.label}</span>
                          </div>
                          {currentRole === item.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-clinical-primary shadow-[0_0_10px_var(--clinical-primary)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </nav>
      </div>
      
      <div className="mt-auto p-8 border-t border-clinical-border bg-clinical-bg/80 backdrop-blur-md">
        <div className="flex items-center gap-4 bg-clinical-card p-4 rounded-3xl border border-clinical-border shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-clinical-bg border border-clinical-border flex items-center justify-center text-[12px] font-black text-clinical-muted shadow-inner">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-clinical-text truncate uppercase tracking-widest leading-none">Administrator</p>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-2 h-2 rounded-full bg-clinical-success animate-pulse shadow-[0_0_8px_var(--clinical-success)]"></div>
               <p className="text-[10px] text-clinical-muted font-black uppercase tracking-[0.2em] truncate">Live Secure</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
