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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true
  });

  const getRoleNameForDisplay = (roleId: string): string => {
    switch (roleId) {
      case 'Dashboard': return t('role_Admin') || 'All Roles';
      case 'Nurse': return t('role_nurse_bedside') || 'Nurse (Bedside)';
      case 'Nurse_Hemovigilance': return t('role_hemovigilance') || 'QA / Hemovigilance';
      case 'HospitalOperator': return t('role_hospital_order') || 'Hospital Operator';
      case 'Nurse_MTP': return 'Nurse (MTP)';
      case 'LabTech_Crossmatch': return t('role_crossmatch') || 'Lab Technician';
      case 'MedicalReviewer': return t('role_med_review') || 'Medical Reviewer';
      case 'SOP11_RareDonor': return t('role_rare_donor') || 'Rare Donor Screener';
      case 'WarehouseIssuer': return t('role_warehouse') || 'Warehouse Issuer';
      case 'Warehouse_IssueReturn': return t('role_issue_return') || 'Issue & Return Clerk';
      case 'Dispatcher': return t('role_dispatcher') || 'Dispatcher';
      case 'Courier': return t('role_courier') || 'Courier / Logistics';
      case 'Resource': return t('role_Resource') || 'Resource Manager';
      case 'Manager': return t('mdm_role_mgr_desc') ? t('mdm_role_mgr_desc').split(' (')[0] : 'Manager';
      case 'Auditor': return t('role_auditor') || 'Compliance Auditor';
      case 'NationalCommander': return t('role_NationalCommander') || 'National Commander';
      default: return roleId;
    }
  };

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
            <p className="text-[9px] text-clinical-muted font-black uppercase tracking-[0.25em] mt-2 opacity-80 italic">
              {currentSystem === 'HUB' ? 'Supply Hub' :
               currentSystem === 'LIMS' ? 'Blood Center LIMS' :
               currentSystem === 'LAB' ? 'Clinical Laboratory' :
               currentSystem === 'HOSPITAL' ? 'Hospital Node' :
               currentSystem === 'NATIONAL' ? 'National Command' :
               'V2.0 Enterprise'}
            </p>
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

          {/* LAB MODE */}
          {currentSystem === 'LAB' && (
            <div className="space-y-4">
               <div className="flex items-center gap-3 px-2">
                  <div className="text-clinical-primary bg-clinical-primary/10 p-2 rounded-xl border border-clinical-primary/20 shadow-inner">
                    <FlaskConical size={20} />
                  </div>
                  <span className="text-[11px] font-black text-clinical-text uppercase tracking-[0.25em]">Laboratory Flow</span>
               </div>
               <div className="space-y-2">
                 {[
                   { id: 'Dashboard', label: t('ui_mission_control'), icon: <Activity size={18} /> },
                   { id: 'LabTech_Crossmatch', label: t('ui_precision_crossmatch'), icon: <FlaskConical size={18} /> },
                   { id: 'MedicalReviewer', label: t('ui_idm_review'), icon: <ClipboardList size={18} /> },
                   { id: 'SOP11_RareDonor', label: t('ui_rare_registry'), icon: <Users size={18} /> },
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
                 <button
                    onClick={() => setRole('Dashboard')}
                    className={`w-full flex flex-col items-start px-6 py-5 rounded-[24px] transition-all group relative overflow-hidden ${
                      currentRole === 'Dashboard'
                        ? 'bg-clinical-bg text-clinical-text border border-clinical-border shadow-xl scale-[1.02]'
                        : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg/50'
                    }`}
                 >
                   <span className="text-[14px] font-black tracking-[0.1em] uppercase italic mb-1">My Task Queue</span>
                   <span className="text-[9px] font-bold text-clinical-muted uppercase tracking-widest">Driven by AI Dispatch</span>
                   {currentRole === 'Dashboard' && (
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
                  title: t('ui_supply_chain'),
                  icon: <Package size={18} className="text-emerald-500" />,
                  items: [
                    { id: 'WarehouseIssuer', label: t('ui_inventory_dispatch'), icon: <Package size={18} /> },
                    { id: 'Warehouse_IssueReturn', label: t('ui_returns_mgmt'), icon: <RefreshCcw size={18} /> },
                    { id: 'Dispatcher', label: t('ui_transport_logistics'), icon: <Truck size={18} /> },
                    { id: 'Courier', label: t('ui_cold_chain_delivery'), icon: <MapPin size={18} /> },
                    { id: 'Resource', label: t('ui_resource_mgmt'), icon: <Database size={18} /> },
                  ]
                }
              ].map((group, idx) => {
                const visibleItems = group.items.filter(item => allowedRoles.includes(item.id as Role) || item.id === 'Dashboard');
                if (visibleItems.length === 0) return null;

                const isCollapsed = collapsedGroups[idx] ?? false;
                const toggleGroup = () => {
                  setCollapsedGroups(prev => ({
                    ...prev,
                    [idx]: !isCollapsed
                  }));
                };

                return (
                  <div key={idx} className="space-y-4">
                    <button
                      onClick={toggleGroup}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group/header border ${
                        !isCollapsed 
                          ? 'bg-clinical-bg border-clinical-primary/20 shadow-md text-clinical-text font-black' 
                          : 'bg-transparent border-transparent text-clinical-muted hover:bg-clinical-bg/30 hover:text-clinical-text'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                         <div className={`p-2.5 rounded-xl bg-clinical-bg border shadow-sm transition-all duration-300 ${
                           !isCollapsed
                             ? 'border-clinical-primary/30 text-clinical-primary scale-[1.05]'
                             : 'border-clinical-border text-clinical-muted group-hover/header:text-clinical-text group-hover/header:border-clinical-muted'
                         }`}>
                           {group.icon}
                         </div>
                         <span className={`text-[12px] font-black uppercase tracking-[0.08em] transition-all duration-300 ${
                           !isCollapsed ? 'text-clinical-text' : 'text-clinical-muted group-hover/header:text-clinical-text'
                         }`}>{group.title}</span>
                      </div>
                      <ChevronRight 
                        size={16} 
                        className={`transition-all duration-300 ${
                          !isCollapsed ? 'text-clinical-primary rotate-90 scale-110' : 'text-clinical-muted group-hover/header:text-clinical-text'
                        }`} 
                      />
                    </button>
                    
                    <div className={`space-y-2 overflow-hidden transition-all duration-500 origin-top ${
                      isCollapsed 
                        ? 'max-h-0 opacity-0 scale-95 pointer-events-none' 
                        : 'max-h-[500px] opacity-100 scale-100'
                    }`}>
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
                             <div className="flex flex-col items-start">
                                <span className="text-[12px] font-black tracking-tight uppercase italic text-left">{item.label}</span>
                                <span className="text-[8px] font-black text-clinical-muted uppercase tracking-[0.1em] mt-1 opacity-70 group-hover:text-clinical-primary transition-colors">
                                  Role: {getRoleNameForDisplay(item.id)}
                                </span>
                             </div>
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
