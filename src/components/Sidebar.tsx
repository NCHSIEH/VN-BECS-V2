import React from 'react';
import { BloodDropLogo } from './BloodDropLogo';
import { useI18n } from '../lib/i18n';
import { Role } from '../types';
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
  ArrowRightLeft
} from 'lucide-react';

interface SidebarProps {
  currentRole: Role;
  setRole: (role: Role) => void;
  allowedRoles: Role[];
  onReturnToPortal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRole, setRole, allowedRoles, onReturnToPortal }) => {
  const { t } = useI18n();

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

  return (
    <aside className="w-72 bg-slate-50 border-r border-slate-800 flex flex-col h-full overflow-y-auto shrink-0 shadow-2xl z-40">
      <div className="p-8">
        <div className="flex items-center gap-5 mb-8 px-2 group">
          <BloodDropLogo size={24} />
          <div>
            <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-[0.4em] italic leading-none group-hover:text-rose-500 transition-colors">VN-BECS</h2>
            <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.25em] mt-2 opacity-80 italic">Enterprise Command V1.0</p>
          </div>
        </div>

        <nav className="space-y-10">
          {/* Return to Portal Button */}
          {onReturnToPortal && (
            <button
              onClick={onReturnToPortal}
              className="w-full flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-rose-950/30 to-slate-900 border border-rose-500/20 rounded-[24px] text-rose-500 hover:from-rose-600 hover:to-rose-500 hover:text-slate-800 transition-all group shadow-lg active:scale-95 mb-10"
            >
              <ArrowRightLeft size={18} className="group-hover:rotate-180 transition-all duration-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">System Portal</span>
            </button>
          )}
          {/* Priority Task Queue */}
          <div className="space-y-4">
             <div className="flex items-center gap-3 px-2">
                <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 shadow-inner"><Activity size={20} /></div>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.25em]">Operational Flow</span>
             </div>
             {/* Version Tag */}
             <div className="fixed bottom-8 right-8 text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] italic">
               VN-BECS V1.0 Enterprise
             </div>
             <button
               onClick={() => setRole('Dashboard' as Role)}
               className={`w-full flex flex-col items-start px-6 py-5 rounded-[24px] transition-all group relative overflow-hidden ${
                 currentRole === ('Dashboard' as Role)
                   ? 'bg-gradient-to-br from-slate-900 to-slate-950 text-slate-800 border border-slate-800 shadow-2xl scale-[1.02]'
                   : 'text-slate-600 hover:text-slate-700 hover:bg-slate-900/30'
               }`}
             >
               <span className="text-[14px] font-black tracking-[0.1em] uppercase italic mb-1">My Task Queue</span>
               <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Driven by AI Dispatch</span>
               {currentRole === ('Dashboard' as Role) && (
                 <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.6)]" />
               )}
               <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50/50 border border-slate-800 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.8)]" />
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
                   <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">{group.icon}</div>
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{group.title}</span>
                </div>
                <div className="space-y-2">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setRole(item.id as Role)}
                      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all group relative ${
                        currentRole === item.id
                          ? 'bg-slate-900 text-slate-800 border border-slate-800 shadow-xl scale-[1.02]'
                           : 'text-slate-600 hover:text-slate-700 hover:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                         <div className={`transition-colors ${currentRole === item.id ? 'text-rose-500' : 'text-slate-700 group-hover:text-slate-600'}`}>
                            {item.icon}
                         </div>
                         <span className="text-[12px] font-black tracking-tight uppercase italic">{item.label}</span>
                      </div>
                      {currentRole === item.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,1)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-8 border-t border-slate-900 bg-slate-50/80 backdrop-blur-md">
        <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50 shadow-inner">
          <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[12px] font-black text-slate-600 shadow-lg">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-slate-800 truncate uppercase tracking-widest leading-none">Administrator</p>
            <div className="flex items-center gap-2 mt-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
               <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] truncate">Live Secure</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
