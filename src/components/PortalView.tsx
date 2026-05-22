import React, { useState } from 'react';
import { User, SystemType, Role } from '../types';
import { 
  LogOut, 
  ShieldCheck, 
  Beaker, 
  Package, 
  Stethoscope, 
  Globe, 
  Lock, 
  BookOpen, 
  Activity, 
  ArrowUpRight, 
  Database, 
  ArrowRightLeft, 
  X, 
  RefreshCcw,
  Palette
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface PortalViewProps {
  user: User;
  onSelectSystem: (system: SystemType) => void;
  onSelectRole?: (role: Role) => void;
  onLogout: () => void;
  onOpenDocs?: () => void;
  onOpenSwitcher?: () => void;
  onOpenThemeSwitcher?: () => void;
}

export function PortalView({ 
  user, 
  onSelectSystem, 
  onSelectRole, 
  onLogout, 
  onOpenDocs, 
  onOpenSwitcher,
  onOpenThemeSwitcher
}: PortalViewProps) {
  const { lang, setLang, t } = useI18n();
  const [showManual, setShowManual] = useState(false);

  const stations = [
    {
      id: 'LIMS',
      title: t('portal_station_lims_title'),
      subtitle: t('portal_station_lims_sub'),
      icon: <Activity className="text-rose-500" size={32} />,
      roles: ['Nurse', 'Manager', 'Admin', 'LabTech', 'LabTech_Crossmatch'],
      description: t('portal_station_lims_desc'),
      color: 'rose',
      status: 'High Volume',
      system: 'LIMS' as SystemType
    },
    {
      id: 'LAB',
      title: t('portal_station_lab_title'),
      subtitle: t('portal_station_lab_sub'),
      icon: <Beaker className="text-sky-500" size={32} />,
      roles: ['LabTech_Crossmatch', 'MedicalReviewer', 'Admin'],
      description: t('portal_station_lab_desc'),
      color: 'sky',
      status: 'Optimized',
      system: 'LIMS' as SystemType
    },
    {
      id: 'HUB',
      title: t('portal_station_hub_title'),
      subtitle: t('portal_station_hub_sub'),
      icon: <Package className="text-emerald-500" size={32} />,
      roles: ['Dispatcher', 'WarehouseIssuer', 'Courier', 'Admin'],
      description: t('portal_station_hub_desc'),
      color: 'emerald',
      status: 'Live Sync',
      system: 'HUB' as SystemType
    },
    {
      id: 'HOSPITAL',
      title: t('portal_station_hospital_title'),
      subtitle: t('portal_station_hospital_sub'),
      icon: <Stethoscope className="text-amber-500" size={32} />,
      roles: ['Nurse', 'HospitalOperator', 'Admin'],
      description: t('portal_station_hospital_desc'),
      color: 'amber',
      status: 'Operational',
      system: 'HOSPITAL' as SystemType
    },
    {
      id: 'NATIONAL',
      title: t('portal_station_national_title'),
      subtitle: t('portal_station_national_sub'),
      icon: <Globe className="text-violet-500" size={32} />,
      roles: ['Manager', 'NationalCommander', 'Auditor', 'Admin'],
      description: t('portal_station_national_desc'),
      color: 'violet',
      status: 'Strategic',
      system: 'NATIONAL' as SystemType
    },
    {
      id: 'MDM',
      title: t('portal_station_mdm_title'),
      subtitle: t('portal_station_mdm_sub'),
      icon: <Database className="text-clinical-muted animate-pulse" size={32} />,
      roles: ['Admin'],
      description: t('portal_station_mdm_desc'),
      color: 'slate',
      status: 'Secured',
      system: 'MDM' as SystemType
    },
    {
      id: 'IAM',
      title: 'Identity & Access',
      subtitle: 'IAM Node',
      icon: <Database className="text-fuchsia-500" size={32} />,
      roles: ['Admin'],
      description: 'User accounts, Roles & Permissions (RBAC)',
      color: 'fuchsia',
      status: 'Protected',
      system: 'IAM' as SystemType
    },
    {
      id: 'DASHBOARD',
      title: 'Strategic Dashboard',
      subtitle: 'Command & Control',
      icon: <Database className="text-amber-500" size={32} />,
      roles: ['Admin', 'Manager'],
      description: 'High-level metrics, inventory overview, alerts',
      color: 'amber',
      status: 'Live Sync',
      system: 'DASHBOARD' as SystemType
    }
  ];

  const handleEnterStation = (system: SystemType, id: string) => {
    onSelectSystem(system);
    // Auto-role assignment based on station intent
    if (id === 'LIMS') onSelectRole?.('Dashboard' as Role);
    if (id === 'LAB') onSelectRole?.('LabTech_Crossmatch' as Role);
    if (id === 'HUB') onSelectRole?.('WarehouseIssuer' as Role);
    if (id === 'HOSPITAL') onSelectRole?.('HospitalOperator' as Role);
    if (id === 'NATIONAL') onSelectRole?.('NationalCommander' as Role);
  };

  return (
    <div className="h-full w-full bg-clinical-bg flex flex-col p-8 lg:p-16 overflow-y-auto relative selection:bg-rose-500/30 transition-all duration-500">
      
      {/* Exquisite Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-rose-600/10 blur-[180px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-600/10 blur-[180px] rounded-full" />
      </div>

      <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-16 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 border-b border-clinical-border pb-12 relative z-20">
          <div>
             <div className="flex items-center gap-6 mb-4">
                <div className="h-12 w-2 bg-rose-600 rounded-full shadow-[0_0_20px_rgba(225,29,72,0.6)] animate-pulse" />
                <span className="text-[12px] font-black text-rose-500 uppercase tracking-[0.6em] italic">VN-BECS V1.0</span>
             </div>
             <h1 className="text-6xl font-black text-clinical-text uppercase italic tracking-tighter mb-6">VN-BECS Portal</h1>
             <div className="flex items-center gap-6 text-[11px] font-black text-clinical-muted uppercase tracking-[0.4em] ml-8">
                <span>User: <strong className="text-clinical-text">{user.username}</strong></span>
                <div className="w-1.5 h-1.5 rounded-full bg-clinical-border" />
                <span>Terminal: <strong className="text-clinical-text">VN-HQ-STRAT-01</strong></span>
             </div>
          </div>

          <div className="flex flex-col items-end gap-6 w-full md:w-auto shrink-0">
             {/* Controls Group */}
             <div className="flex flex-wrap items-center gap-8 justify-end w-full">
                {/* Theme Switcher Button */}
                {onOpenThemeSwitcher && (
                  <div className="flex flex-col items-end gap-3">
                     <p className="text-[9px] font-black text-clinical-muted uppercase tracking-[0.4em] italic">Visual Theme</p>
                     <button 
                       onClick={onOpenThemeSwitcher}
                       className="flex items-center gap-3 px-6 py-2.5 bg-clinical-card border border-clinical-border text-clinical-text rounded-[20px] hover:bg-clinical-primary hover:text-white transition-all group shadow-sm active:scale-95 duration-200"
                     >
                        <Palette size={16} className="group-hover:rotate-12 transition-transform text-clinical-primary group-hover:text-white" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">樣式切換 (Theme)</span>
                     </button>
                  </div>
                )}

                {/* System Manual Button */}
                <div className="flex flex-col items-end gap-3">
                   <p className="text-[9px] font-black text-clinical-muted uppercase tracking-[0.4em] italic">Knowledge Base</p>
                   <button 
                     onClick={() => setShowManual(true)}
                     className="flex items-center gap-3 px-6 py-2.5 bg-clinical-card border border-clinical-border text-clinical-text rounded-[20px] hover:bg-clinical-primary hover:text-white transition-all group shadow-sm active:scale-95 duration-200"
                   >
                      <BookOpen size={16} className="group-hover:rotate-12 transition-transform text-clinical-primary group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ui_system_manual')}</span>
                   </button>
                </div>

                {/* Language Switcher */}
                <div className="flex flex-col items-end gap-3">
                   <p className="text-[9px] font-black text-clinical-muted uppercase tracking-[0.4em] italic">Interface Language</p>
                   <div className="flex items-center gap-2 bg-clinical-card p-1.5 rounded-[22px] border border-clinical-border shadow-sm">
                      <button 
                        onClick={() => setLang('en')} 
                        className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all duration-300 flex items-center gap-2 ${
                          lang === 'en' 
                            ? 'bg-clinical-primary text-white shadow-lg' 
                            : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg'
                        }`}
                      >
                        EN
                      </button>
                      <button 
                        onClick={() => setLang('zh-TW')} 
                        className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all duration-300 flex items-center gap-2 ${
                          lang === 'zh-TW' 
                            ? 'bg-clinical-primary text-white shadow-lg' 
                            : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg'
                        }`}
                      >
                        繁中
                      </button>
                      <button 
                        onClick={() => setLang('vi')} 
                        className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all duration-300 flex items-center gap-2 ${
                          lang === 'vi' 
                            ? 'bg-clinical-primary text-white shadow-lg' 
                            : 'text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg'
                        }`}
                      >
                        TIẾNG VIỆT
                      </button>
                   </div>
                </div>
             </div>
  
             <div className="flex flex-wrap gap-6 shrink-0 w-full md:w-auto justify-end">

                <button 
                  onClick={onLogout}
                  className="flex items-center gap-3 px-8 py-4 bg-rose-600/10 border border-rose-500/20 text-rose-600 rounded-3xl hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all group active:scale-95 shadow-sm duration-200"
                >
                   <LogOut size={18} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('logout')}</span>
                </button>
             </div>
          </div>
        </header>
 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10">
          {stations.map((station, idx) => {
            const isPermitted = user.role?.toLowerCase() === 'admin' || (user.permittedSystems && user.permittedSystems.includes(station.id as SystemType));
            
            return (
              <motion.button
                key={station.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.5 }}
                onClick={() => isPermitted && handleEnterStation(station.system, station.id)}
                className={`relative flex flex-col p-10 text-left group transition-all duration-500 ${
                  isPermitted 
                    ? 'clinical-card cursor-pointer hover:scale-[1.02] border-clinical-border' 
                    : 'bg-clinical-card/50 border border-clinical-border opacity-50 grayscale cursor-not-allowed rounded-[24px]'
                }`}
              >
                <div className="flex justify-between items-start mb-10">
                   <div className="w-16 h-16 rounded-[24px] bg-clinical-bg flex items-center justify-center shadow-inner border border-clinical-border group-hover:scale-110 transition-transform duration-300">
                      {station.icon}
                   </div>
                   {isPermitted ? (
                     <div className="flex items-center gap-3 bg-clinical-bg px-4 py-2 rounded-full border border-clinical-border">
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px] ${
                           station.color === 'rose' ? 'bg-rose-500 shadow-rose-500' :
                           station.color === 'sky' ? 'bg-sky-500 shadow-sky-500' :
                           station.color === 'emerald' ? 'bg-emerald-500 shadow-emerald-500' : 'bg-amber-500 shadow-amber-500'
                         }`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-clinical-muted">{station.status}</span>
                     </div>
                   ) : (
                     <Lock size={20} className="text-clinical-muted" />
                   )}
                </div>

                <div className="space-y-4 mb-10">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] italic">{station.subtitle}</p>
                      <h3 className="text-3xl font-black text-clinical-text uppercase italic tracking-tighter group-hover:translate-x-2 transition-transform duration-300">{station.title}</h3>
                   </div>
                   <p className="text-clinical-muted text-[13px] font-medium leading-relaxed uppercase tracking-wide line-clamp-3">
                     {station.description}
                   </p>
                </div>

                {/* Footer / Entry */}
                <div className="mt-auto flex justify-between items-center border-t border-clinical-border pt-8">
                   <div className="flex -space-x-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-clinical-bg border-2 border-clinical-card flex items-center justify-center text-[8px] font-black text-clinical-text shadow-sm">
                          U{i}
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full bg-rose-600/10 border-2 border-clinical-card flex items-center justify-center text-[8px] font-black text-rose-600 shadow-sm">
                        +8
                      </div>
                   </div>
                   {isPermitted && (
                     <div className="flex items-center gap-2 text-rose-500 font-black uppercase italic text-xs group-hover:gap-4 transition-all duration-300">
                        {t('portal_launch')} <ArrowUpRight size={18} />
                     </div>
                   )}
                </div>

                {/* Hover Glow */}
                <div className={`absolute bottom-0 right-0 w-48 h-48 blur-[100px] -mr-24 -mb-24 opacity-0 group-hover:opacity-30 transition-all duration-700 pointer-events-none ${
                  station.color === 'rose' ? 'bg-rose-500' : 'bg-sky-500'
                }`} />
              </motion.button>
            );
          })}
        </div>

        {/* Global Footer Stats */}
        <footer className="mt-8 flex flex-wrap justify-center gap-12 pt-12 border-t border-clinical-border">
           {[
             { label: t('portal_footer_inventory'), value: '184.2k Units', trend: '+2.4%' },
             { label: t('portal_footer_uptime'), value: '99.99%', trend: 'Stable' },
             { label: t('portal_footer_efficiency'), value: '94.2%', trend: '+0.8%' },
             { label: t('portal_footer_coldchain'), value: 'Optimal', trend: 'Global' },
           ].map((stat, i) => (
             <div key={i} className="flex flex-col items-center">
                <span className="text-[10px] font-black text-clinical-muted uppercase tracking-widest mb-2">{stat.label}</span>
                <div className="flex items-center gap-3">
                   <span className="text-lg font-black text-clinical-text italic">{stat.value}</span>
                   <span className="text-[9px] font-black text-emerald-500">{stat.trend}</span>
                </div>
             </div>
           ))}
        </footer>
      </div>

      {/* Manual & Help Quick Access */}
      <div className="fixed bottom-12 right-12 flex flex-col gap-4 z-40">
         <button onClick={onOpenDocs} className="w-16 h-16 rounded-full bg-clinical-card border border-clinical-border flex items-center justify-center text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg transition-all shadow-xl hover:scale-110 active:scale-95 duration-200">
            <BookOpen size={24} />
         </button>
      </div>

      {/* Command Manual Modal */}
      <AnimatePresence>
        {showManual && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-clinical-bg/40 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="w-full max-w-5xl max-h-[90vh] bg-clinical-card border border-clinical-border rounded-[40px] shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
             >
                {/* Modal Header */}
                <div className="p-10 border-b border-clinical-border bg-clinical-bg/30 flex justify-between items-center shrink-0">
                   <div>
                      <div className="flex items-center gap-4 mb-2">
                         <BookOpen className="text-rose-500" size={24} />
                         <h2 className="text-2xl font-black text-clinical-text uppercase italic tracking-widest">{t('manual_title')}</h2>
                      </div>
                      <p className="text-[11px] font-black text-clinical-muted uppercase tracking-[0.2em]">{t('manual_subtitle')}</p>
                   </div>
                   <button 
                     onClick={() => setShowManual(false)}
                     className="p-4 bg-clinical-bg hover:bg-rose-600 hover:text-white hover:border-rose-600 rounded-full transition-all text-clinical-muted shadow-sm border border-clinical-border flex items-center justify-center"
                   >
                      <X size={24} />
                   </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Unified Portal */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-clinical-bg border border-clinical-border flex items-center justify-center text-clinical-text font-black">00</div>
                            <h3 className="text-lg font-black text-clinical-text uppercase italic">{t('manual_portal_title')}</h3>
                         </div>
                         <p className="text-sm text-clinical-muted leading-relaxed pl-14">{t('manual_portal_desc')}</p>
                      </div>

                      {/* LIMS */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-600/10 text-rose-600 flex items-center justify-center font-black">01</div>
                            <h3 className="text-lg font-black text-clinical-text uppercase italic">{t('manual_lims_title')}</h3>
                         </div>
                         <p className="text-sm text-clinical-muted leading-relaxed pl-14">{t('manual_lims_desc')}</p>
                      </div>

                      {/* LAB */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-sky-600/10 text-sky-600 flex items-center justify-center font-black">02</div>
                            <h3 className="text-lg font-black text-clinical-text uppercase italic">{t('manual_lab_title')}</h3>
                         </div>
                         <p className="text-sm text-clinical-muted leading-relaxed pl-14">{t('manual_lab_desc')}</p>
                      </div>

                      {/* HUB */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center font-black">03</div>
                            <h3 className="text-lg font-black text-clinical-text uppercase italic">{t('manual_hub_title')}</h3>
                         </div>
                         <p className="text-sm text-clinical-muted leading-relaxed pl-14">{t('manual_hub_desc')}</p>
                      </div>

                      {/* HOSPITAL */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center font-black">04</div>
                            <h3 className="text-lg font-black text-clinical-text uppercase italic">{t('manual_hospital_title')}</h3>
                         </div>
                         <p className="text-sm text-clinical-muted leading-relaxed pl-14">{t('manual_hospital_desc')}</p>
                      </div>

                      {/* NATIONAL */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-500 flex items-center justify-center font-black">05</div>
                            <h3 className="text-lg font-black text-clinical-text uppercase italic">{t('manual_national_title')}</h3>
                         </div>
                         <p className="text-sm text-clinical-muted leading-relaxed pl-14">{t('manual_national_desc')}</p>
                      </div>

                      {/* MDM */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-clinical-bg border border-clinical-border text-clinical-text flex items-center justify-center font-black">06</div>
                            <h3 className="text-lg font-black text-clinical-text uppercase italic">{t('manual_mdm_title')}</h3>
                         </div>
                         <p className="text-sm text-clinical-muted leading-relaxed pl-14">{t('manual_mdm_desc')}</p>
                      </div>
                   </div>
                </div>

                {/* Modal Footer */}
                <div className="p-8 border-t border-clinical-border bg-clinical-bg/30 flex justify-center shrink-0">
                   <button 
                     onClick={() => setShowManual(false)}
                     className="px-12 py-4 bg-clinical-card hover:bg-clinical-primary border border-clinical-border text-clinical-text hover:text-white hover:border-clinical-primary rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-md duration-200"
                   >
                      Close Command Manual
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
