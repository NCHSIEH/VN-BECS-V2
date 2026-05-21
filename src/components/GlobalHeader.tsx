import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  User as UserIcon, 
  ChevronDown, 
  Mail, 
  Activity, 
  Clock,
  ShieldCheck,
  Globe,
  LogOut,
  ArrowRightLeft,
  Settings
} from 'lucide-react';
import { User } from '../types';
import { useI18n } from '../lib/i18n';
import { BloodDropLogo } from './BloodDropLogo';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalHeaderProps {
  user: User;
  isOffline?: boolean;
  onLogout: () => void;
  onOpenMessages: () => void;
  onOpenSwitcher?: () => void;
  unreadMessages?: number;
  systemName?: string;
}

export function GlobalHeader({ 
  user, 
  isOffline = false, 
  onLogout, 
  onOpenMessages,
  onOpenSwitcher,
  unreadMessages = 0,
  systemName = "NATIONAL BLOOD SUPPLY & LOGISTICS COMMAND"
}: GlobalHeaderProps) {
  const { t, lang, setLang } = useI18n();
  const [time, setTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).toUpperCase() + ' GMT+7';
  };

  return (
    <header className="h-28 border-b border-slate-800/50 bg-[#020617]/80 backdrop-blur-2xl z-[60] sticky top-0 flex flex-col shadow-2xl">
      {/* Top Bar */}
      <div className="flex-1 flex items-center justify-between px-8 lg:px-12">
        <div className="flex items-center gap-8">
           <div className="flex items-center gap-4">
              <BloodDropLogo size={20} />
              <div className="flex flex-col">
                 <h1 className="text-sm lg:text-base font-black text-slate-800 uppercase tracking-[0.2em] italic leading-tight">
                    {systemName}
                 </h1>
                 <div className="flex items-center gap-2 mt-1">
                    <Globe size={12} className="text-rose-500" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">{t('ui_republic_vn')}</span>
                 </div>
              </div>
           </div>
           
           <nav className="hidden xl:flex items-center gap-6 border-l border-slate-800 ml-8 pl-8">
              {[ { id: 'live', label: t('ui_live_overview') }, { id: 'logistics', label: t('ui_logistics') }, { id: 'analytics', label: t('ui_analytics') }, { id: 'predictions', label: t('ui_predictions') }, { id: 'reports', label: t('ui_reports') } ].map(item => (
                <button key={item.id} className="text-[10px] font-black text-slate-600 hover:text-slate-800 uppercase tracking-widest transition-colors relative group">
                  {item.label}
                  <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-rose-600 scale-x-0 group-hover:scale-x-100 transition-transform" />
                </button>
              ))}
           </nav>
        </div>

        <div className="flex items-center gap-6 lg:gap-8">
           {/* Search */}
           <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-600 focus-within:border-rose-500 transition-all">
              <Search size={16} />
              <input type="text" className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-48" placeholder={t('ui_command_search')} />
           </div>

           {/* System Switcher Button (More Obvious) */}
           {onOpenSwitcher && (
             <button 
               onClick={onOpenSwitcher}
               className="hidden lg:flex items-center gap-3 px-6 py-2.5 bg-gradient-to-r from-rose-900/40 to-indigo-900/40 border border-rose-500/30 text-rose-500 rounded-2xl hover:from-rose-600 hover:to-indigo-600 hover:text-slate-800 transition-all group shadow-lg shadow-rose-950/20 active:scale-95"
             >
                <ArrowRightLeft size={16} className="group-hover:rotate-180 transition-all duration-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ui_system_hub')}</span>
             </button>
           )}

           <div className="flex items-center gap-4 border-r border-slate-800 pr-8">
              <button onClick={onOpenMessages} className="relative p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl text-slate-600 hover:text-rose-500 transition-all border border-slate-800">
                 <Mail size={20} />
                 {unreadMessages > 0 && (
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-900/50 animate-bounce">
                     {unreadMessages}
                   </span>
                 )}
              </button>
              <button className="relative p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl text-slate-600 hover:text-rose-500 transition-all border border-slate-800">
                 <Bell size={20} />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.6)]" />
              </button>
           </div>

           {/* User Info */}
           <div className="relative" ref={menuRef}>
              <div 
                className="flex items-center gap-4 group cursor-pointer"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                 <div className="flex flex-col text-right hidden sm:block">
                    <p className="text-[11px] font-black text-slate-800 uppercase italic leading-none mb-1">{user.username}</p>
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{user.role}</p>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 p-0.5 shadow-xl group-hover:scale-105 transition-all">
                    <div className="w-full h-full rounded-[14px] bg-slate-50 flex items-center justify-center overflow-hidden">
                       {user.photoUrl ? (
                         <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                       ) : localStorage.getItem(`becs_user_photo_${user.id}`) ? (
                         <img src={localStorage.getItem(`becs_user_photo_${user.id}`)!} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Avatar" className="w-full h-full object-cover" />
                       )}
                    </div>
                 </div>
                 <ChevronDown size={16} className={`text-slate-600 group-hover:text-slate-800 transition-all ${showProfileMenu ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-64 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden py-2"
                  >
                     <div className="px-6 py-4 border-b border-slate-800 bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('ui_command_identity')}</p>
                        <p className="text-xs font-black text-slate-800 uppercase italic">{user.username}</p>
                     </div>
                     <div className="p-2">
                        <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-600 hover:text-slate-800 hover:bg-slate-800 transition-all group">
                           <Settings size={18} className="text-slate-600" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ui_profile_settings')}</span>
                        </button>
                        <div className="h-px bg-slate-800 my-2 mx-4" />
                        <button 
                          onClick={() => { onLogout(); setShowProfileMenu(false); }}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-rose-500 hover:text-slate-800 hover:bg-rose-600 transition-all group"
                        >
                           <LogOut size={18} />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ui_terminate_session')}</span>
                        </button>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>

      {/* Bottom Bar (Status & Time) */}
      <div className="h-8 bg-slate-50/50 flex items-center justify-between px-12 border-t border-slate-800/30">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">
                {isOffline ? t('status_offline') : t('status_synchronized')}
              </span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-slate-600">
              <Clock size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">{formatTime(time)}</span>
           </div>
        </div>
      </div>
    </header>
  );
}
