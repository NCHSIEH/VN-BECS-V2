import React, { useState } from 'react';
import { User, SystemType, Role } from '../types';
import { LogOut, ShieldCheck, Beaker, Package, Stethoscope, Globe, Lock, BookOpen, Activity, ArrowUpRight, Database, ArrowRightLeft, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface PortalViewProps {
  user: User;
  onSelectSystem: (system: SystemType) => void;
  onSelectRole?: (role: Role) => void;
  onLogout: () => void;
  onOpenDocs?: () => void;
  onOpenSwitcher?: () => void;
}

export function PortalView({ user, onSelectSystem, onSelectRole, onLogout, onOpenDocs, onOpenSwitcher }: PortalViewProps) {
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
      icon: <Database className="text-slate-400" size={32} />,
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
    <div className="h-full w-full bg-[#0b1120] flex flex-col p-8 lg:p-16 overflow-y-auto relative selection:bg-rose-500/30">
      
      {/* Exquisite Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-rose-600/10 blur-[180px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-600/10 blur-[180px] rounded-full" />
      </div>

      <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-16 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 border-b border-slate-800 pb-12">
          <div>
             <div className="flex items-center gap-6 mb-4">
                <div className="h-12 w-2 bg-rose-600 rounded-full shadow-[0_0_20px_rgba(225,29,72,0.6)]" />
                <span className="text-[12px] font-black text-rose-500 uppercase tracking-[0.6em] italic">VN-BECS V1.0</span>
             </div>
             <h1 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-6">VN-BECS Portal</h1>
            <div className="flex items-center gap-6 text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-8">
               <span>User: <strong className="text-white">{user.username}</strong></span>
               <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
               <span>Terminal: <strong className="text-white">VN-HQ-STRAT-01</strong></span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-6">
             {/* Controls Group */}
             <div className="flex items-center gap-8">
                {/* System Manual Button */}
                <div className="flex flex-col items-end gap-3">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Knowledge Base</p>
                   <button 
                     onClick={() => setShowManual(true)}
                     className="flex items-center gap-3 px-6 py-2.5 bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 rounded-[20px] hover:bg-indigo-600 hover:text-white transition-all group shadow-xl active:scale-95"
                   >
                      <BookOpen size={16} className="group-hover:rotate-12 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ui_system_manual')}</span>
                   </button>
                </div>

                {/* Language Selection */}
                <div className="flex flex-col items-end gap-3">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Interface Language</p>
                   <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-[22px] border border-slate-800 shadow-2xl">
                      <button 
                        onClick={() => setLang('en')} 
                        className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all duration-300 flex items-center gap-2 ${
                          lang === 'en' 
                            ? 'bg-rose-600 text-white shadow-lg' 
                            : 'text-slate-600 hover:text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        EN
                      </button>
                      <button 
                        onClick={() => setLang('zh-TW')} 
                        className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all duration-300 flex items-center gap-2 ${
                          lang === 'zh-TW' 
                            ? 'bg-rose-600 text-white shadow-lg' 
                            : 'text-slate-600 hover:text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        繁中
                      </button>
                      <button 
                        onClick={() => setLang('vi')} 
                        className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all duration-300 flex items-center gap-2 ${
                          lang === 'vi' 
                            ? 'bg-rose-600 text-white shadow-lg' 
                            : 'text-slate-600 hover:text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        TIẾNG VIỆT
                      </button>
                   </div>
                </div>
             </div>

             {/* System Actions */}
             <div className="flex items-center gap-4">
                {onOpenSwitcher && (
                  <button 
                    onClick={onOpenSwitcher}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-950/50 to-slate-900 border border-indigo-500/30 text-indigo-400 rounded-3xl hover:from-indigo-600 hover:to-indigo-500 hover:text-white transition-all group shadow-xl active:scale-95"
                  >
                    <ArrowRightLeft size={18} className="text-indigo-500 group-hover:rotate-180 transition-all duration-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Switch System Hub</span>
                  </button>
                )}
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-3 px-8 py-4 bg-rose-950/20 border border-rose-900/40 text-rose-500 rounded-3xl hover:bg-rose-600 hover:text-white transition-all group active:scale-95 shadow-xl"
                >
                   <LogOut size={18} />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('logout')}</span>
                </button>
             </div>
          </div>
        </header>

        {/* Operational Stations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {stations.map((station, idx) => {
            const isPermitted = user.role === 'Admin' || (user.permittedSystems && user.permittedSystems.includes(station.id as SystemType));
            
            return (
              <motion.button
                key={station.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx, duration: 0.6 }}
                onClick={() => isPermitted && handleEnterStation(station.system, station.id)}
                className={`relative flex flex-col p-10 text-left group transition-all duration-700 ${
                  isPermitted ? 'glass-station cursor-pointer hover:scale-[1.02]' : 'bg-slate-950/50 border border-slate-900 opacity-50 grayscale cursor-not-allowed'
                }`}
              >
                {/* Station Icon & Status */}
                <div className="flex justify-between items-start mb-10">
                   <div className="w-16 h-16 rounded-[24px] bg-slate-950 flex items-center justify-center shadow-inner border border-slate-800 group-hover:scale-110 transition-transform">
                      {station.icon}
                   </div>
                   {isPermitted ? (
                     <div className="flex items-center gap-3 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px] ${
                          station.color === 'rose' ? 'bg-rose-500 shadow-rose-500' :
                          station.color === 'sky' ? 'bg-sky-500 shadow-sky-500' :
                          station.color === 'emerald' ? 'bg-emerald-500 shadow-emerald-500' : 'bg-amber-500 shadow-amber-500'
                        }`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{station.status}</span>
                     </div>
                   ) : (
                     <Lock size={20} className="text-slate-700" />
                   )}
                </div>

                {/* Content */}
                <div className="space-y-4 mb-10">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] italic">{station.subtitle}</p>
                      <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter tracking-tight group-hover:translate-x-2 transition-transform">{station.title}</h3>
                   </div>
                   <p className="text-slate-500 text-[13px] font-medium leading-relaxed uppercase tracking-wide line-clamp-3">
                     {station.description}
                   </p>
                </div>

                {/* Footer / Entry */}
                <div className="mt-auto flex justify-between items-center border-t border-slate-800/50 pt-8">
                   <div className="flex -space-x-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-slate-500">
                          U{i}
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full bg-rose-600/20 border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-rose-500">
                        +8
                      </div>
                   </div>
                   {isPermitted && (
                     <div className="flex items-center gap-2 text-rose-500 font-black uppercase italic text-xs group-hover:gap-4 transition-all">
                        {t('portal_launch')} <ArrowUpRight size={18} />
                     </div>
                   )}
                </div>

                {/* Hover Glow */}
                <div className={`absolute bottom-0 right-0 w-48 h-48 blur-[100px] -mr-24 -mb-24 opacity-0 group-hover:opacity-30 transition-all duration-700 ${
                  station.color === 'rose' ? 'bg-rose-500' : 'bg-sky-500'
                }`} />
              </motion.button>
            );
          })}
        </div>

        {/* Global Footer Stats */}
        <footer className="mt-8 flex flex-wrap justify-center gap-12 pt-12 border-t border-slate-900">
           {[
             { label: t('portal_footer_inventory'), value: '184.2k Units', trend: '+2.4%' },
             { label: t('portal_footer_uptime'), value: '99.99%', trend: 'Stable' },
             { label: t('portal_footer_efficiency'), value: '94.2%', trend: '+0.8%' },
             { label: t('portal_footer_coldchain'), value: 'Optimal', trend: 'Global' },
           ].map((stat, i) => (
             <div key={i} className="flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">{stat.label}</span>
                <div className="flex items-center gap-3">
                   <span className="text-lg font-black text-white italic">{stat.value}</span>
                   <span className="text-[9px] font-black text-emerald-500">{stat.trend}</span>
                </div>
             </div>
           ))}
        </footer>
      </div>

      {/* Manual & Help Quick Access */}
      <div className="fixed bottom-12 right-12 flex flex-col gap-4">
         <button onClick={onOpenDocs} className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-900 transition-all shadow-2xl hover:scale-110">
            <BookOpen size={24} />
         </button>
      </div>

       <AnimatePresence>
         {showManual && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
              >
                 {/* Modal Header */}
                 <div className="p-10 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
                    <div>
                       <div className="flex items-center gap-4 mb-2">
                          <BookOpen className="text-rose-500" size={24} />
                          <h2 className="text-2xl font-black text-white uppercase italic tracking-widest">{t('manual_title')}</h2>
                       </div>
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('manual_subtitle')}</p>
                    </div>
                    <button 
                      onClick={() => setShowManual(false)}
                      className="p-4 bg-slate-800/50 hover:bg-rose-600 hover:text-white rounded-full transition-all text-slate-500 shadow-xl"
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
                             <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white">00</div>
                             <h3 className="text-lg font-black text-white uppercase italic">{t('manual_portal_title')}</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed pl-14">{t('manual_portal_desc')}</p>
                       </div>

                       {/* LIMS */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 flex items-center justify-center font-black">01</div>
                             <h3 className="text-lg font-black text-white uppercase italic">{t('manual_lims_title')}</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed pl-14">{t('manual_lims_desc')}</p>
                       </div>

                       {/* LAB */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-sky-600/20 text-sky-500 flex items-center justify-center font-black">02</div>
                             <h3 className="text-lg font-black text-white uppercase italic">{t('manual_lab_title')}</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed pl-14">{t('manual_lab_desc')}</p>
                       </div>

                       {/* HUB */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-500 flex items-center justify-center font-black">03</div>
                             <h3 className="text-lg font-black text-white uppercase italic">{t('manual_hub_title')}</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed pl-14">{t('manual_hub_desc')}</p>
                       </div>

                       {/* HOSPITAL */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center font-black">04</div>
                             <h3 className="text-lg font-black text-white uppercase italic">{t('manual_hospital_title')}</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed pl-14">{t('manual_hospital_desc')}</p>
                       </div>

                       {/* NATIONAL */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-500 flex items-center justify-center font-black">05</div>
                             <h3 className="text-lg font-black text-white uppercase italic">{t('manual_national_title')}</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed pl-14">{t('manual_national_desc')}</p>
                       </div>

                       {/* MDM */}
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-slate-700/50 text-slate-400 flex items-center justify-center font-black">06</div>
                             <h3 className="text-lg font-black text-white uppercase italic">{t('manual_mdm_title')}</h3>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed pl-14">{t('manual_mdm_desc')}</p>
                       </div>
                    </div>
                 </div>

                 {/* Modal Footer */}
                 <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex justify-center shrink-0">
                    <button 
                      onClick={() => setShowManual(false)}
                      className="px-12 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all"
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
