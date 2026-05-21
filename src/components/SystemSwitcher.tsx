import React from 'react';
import { 
  Activity, 
  Package, 
  Globe, 
  Database, 
  Syringe, 
  X, 
  ChevronRight,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemType } from '../types';
import { useI18n } from '../lib/i18n';

interface SystemSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (system: SystemType) => void;
  currentSystem: SystemType | null;
}

export function SystemSwitcher({ isOpen, onClose, onSelect, currentSystem }: SystemSwitcherProps) {
  const { t } = useI18n();
  const systems = [
    { 
      id: 'LIMS' as SystemType, 
      name: t('portal_station_lims'), 
      icon: <Activity size={32} />, 
      color: 'from-rose-500 to-rose-700', 
      desc: t('portal_desc_lims'),
      label: 'LIMS Node'
    },
    { 
      id: 'HUB' as SystemType, 
      name: t('portal_station_hub'), 
      icon: <Package size={32} />, 
      color: 'from-emerald-500 to-emerald-700', 
      desc: t('portal_desc_hub'),
      label: 'SCM Node'
    },
    { 
      id: 'HOSPITAL' as SystemType, 
      name: t('portal_station_hospital'), 
      icon: <Syringe size={32} />, 
      color: 'from-amber-500 to-amber-700', 
      desc: t('portal_desc_hospital'),
      label: 'Clinical Node'
    },
    { 
      id: 'NATIONAL' as SystemType, 
      name: t('portal_station_national'), 
      icon: <Globe size={32} />, 
      color: 'from-indigo-500 to-indigo-700', 
      desc: t('portal_desc_national'),
      label: 'Control Node'
    },
    { 
      id: 'MDM' as SystemType, 
      name: t('portal_station_mdm'), 
      icon: <Database size={32} />, 
      color: 'from-sky-500 to-sky-700', 
      desc: t('portal_desc_mdm'),
      label: 'Data Node'
    },
    {
      id: 'IAM' as SystemType,
      name: 'Identity & Access',
      icon: <Database size={32} />,
      color: 'from-fuchsia-500 to-fuchsia-700',
      desc: 'User accounts, Roles & Permissions (RBAC)',
      label: 'IAM Node'
    },
    {
      id: 'DASHBOARD' as SystemType,
      name: 'Strategic Dashboard',
      icon: <Database size={32} />,
      color: 'from-amber-500 to-amber-700',
      desc: 'Command & Control Overview',
      label: 'Dash Node'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 sm:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl" 
            onClick={onClose} 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-[48px] p-8 sm:p-16 relative z-10 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-start mb-12">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                     <ArrowRightLeft size={20} className="text-rose-500" />
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic text-rose-500/80">Quantum Bridge Protocol</p>
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-black text-slate-800 uppercase italic tracking-tighter">System Switcher</h2>
               </div>
               <button onClick={onClose} className="p-4 bg-slate-50 rounded-full text-slate-600 hover:text-slate-800 transition-all shadow-xl hover:rotate-90">
                  <X size={28} />
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
               {/* Return to Portal Option */}
               <button
                 onClick={() => {
                   onSelect(null as any);
                   onClose();
                 }}
                 className="group relative overflow-hidden p-8 rounded-[40px] border border-rose-500/20 bg-rose-950/10 hover:bg-rose-900/20 hover:border-rose-500 transition-all text-left flex flex-col justify-between h-72 shadow-xl shadow-rose-950/5"
               >
                 <div className="absolute -right-12 -top-12 w-48 h-48 bg-rose-600 opacity-10 blur-3xl group-hover:opacity-30 transition-opacity" />
                 
                 <div className="relative z-10">
                    <div className="w-16 h-16 rounded-3xl bg-rose-600 flex items-center justify-center text-white shadow-xl mb-6 group-hover:scale-110 transition-transform shadow-rose-900/40">
                       <ArrowRightLeft size={32} />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 italic mb-3 tracking-tight">Enterprise Portal</h3>
                    <p className="text-[12px] text-slate-600 font-medium leading-relaxed uppercase tracking-wider">Return to the main station selection hub</p>
                 </div>

                 <div className="relative z-10 flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 italic">
                      Command Root
                    </span>
                    <ChevronRight size={24} className="text-rose-900 group-hover:text-slate-800 group-hover:translate-x-2 transition-all" />
                 </div>
               </button>

               {systems.map((sys) => (
                 <button
                   key={sys.id}
                   onClick={() => {
                     onSelect(sys.id);
                     onClose();
                   }}
                   className={`group relative overflow-hidden p-8 rounded-[40px] border transition-all text-left flex flex-col justify-between h-72 ${
                     currentSystem === sys.id 
                       ? 'bg-slate-800 border-rose-500 shadow-2xl shadow-rose-900/20' 
                       : 'bg-slate-50/40 border-slate-800 hover:border-slate-600 hover:bg-slate-900/60 shadow-xl'
                   }`}
                 >
                   {/* Background Glow */}
                   <div className={`absolute -right-12 -top-12 w-48 h-48 bg-gradient-to-br ${sys.color} opacity-10 blur-3xl group-hover:opacity-30 transition-opacity`} />
                   
                   <div className="relative z-10">
                      <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${sys.color} flex items-center justify-center text-slate-800 shadow-xl mb-6 group-hover:scale-110 transition-transform`}>
                         {sys.icon}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 italic mb-3 tracking-tight">{sys.name}</h3>
                      <p className="text-[12px] text-slate-600 font-medium leading-relaxed">{sys.desc}</p>
                   </div>

                   <div className="relative z-10 flex justify-between items-end">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 italic group-hover:text-rose-500 transition-colors">
                        {sys.label}
                      </span>
                      <ChevronRight size={24} className="text-slate-800 group-hover:text-slate-800 group-hover:translate-x-2 transition-all" />
                   </div>

                   {currentSystem === sys.id && (
                     <div className="absolute top-6 right-6">
                        <div className="px-3 py-1 bg-rose-500 text-slate-800 text-[8px] font-black uppercase rounded-full shadow-lg">Active</div>
                     </div>
                   )}
                 </button>
               ))}
            </div>
            
            <div className="mt-12 pt-8 border-t border-slate-800/50 flex justify-between items-center text-slate-600">
               <p className="text-[9px] font-black uppercase tracking-[0.4em] italic">BECS National Sovereignty Architecture</p>
               <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
