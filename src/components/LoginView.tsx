import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Activity, BookOpen, ShieldCheck } from "lucide-react";
import { useI18n } from "../lib/i18n";

interface LoginViewProps {
  onLogin: (user: User) => void;
  onOpenDocs?: () => void;
}

export function LoginView({ onLogin, onOpenDocs }: LoginViewProps) {
  const { t, lang, setLang } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) {
        throw new Error(t('login_err'));
      }

      const user = await res.json();
      onLogin(user);
    } catch (err: any) {
      setError(err.message || t('login_err'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/10 blur-[120px] rounded-full animate-pulse"></div>
      </div>

      <div className="clinical-card p-10 max-w-lg w-full bg-slate-900/40 backdrop-blur-3xl relative z-10 border-slate-800 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-rose-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg shadow-rose-900/40 animate-float">
             <Activity size={40} />
          </div>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter italic">{t('login_title')}</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">{t('login_subtitle')}</p>
        </div>

        <div className="flex justify-center mb-10">
           <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
              <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${lang === 'en' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-600 hover:text-slate-400'}`}>EN</button>
              <button onClick={() => setLang('zh-TW')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${lang === 'zh-TW' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-600 hover:text-slate-400'}`}>繁</button>
              <button onClick={() => setLang('vi')} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${lang === 'vi' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-600 hover:text-slate-400'}`}>VI</button>
           </div>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="clinical-input-group">
            <label className="clinical-label">{t('login_user')}</label>
            <input 
              required
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="clinical-input h-14 text-base font-mono tracking-widest"
              placeholder="e.g. admin"
            />
          </div>
          <div className="clinical-input-group">
            <label className="clinical-label">{t('login_pass')}</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="clinical-input h-14 text-base font-mono tracking-widest"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in shake-in duration-300">
               <ShieldCheck size={18} />
               {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="clinical-btn-primary h-14 mt-2"
          >
            <KeyRound size={18} /> {loading ? "..." : t('login_btn')}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Enterprise HQ</p>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400">
               admin / admin123
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Clinical Node</p>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400">
               nurse_hosp_1 / 123
            </div>
          </div>
        </div>

        {onOpenDocs && (
          <div className="mt-8">
            <button 
              type="button"
              onClick={onOpenDocs} 
              className="w-full py-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center gap-3"
            >
              <BookOpen size={18} />
              {t('login_docs_btn')}
            </button>
          </div>
        )}
      </div>
      
      {/* Version Tag */}
      <div className="fixed bottom-8 right-8 text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] italic">
        VN-BECS V1.0 Enterprise
      </div>
    </div>
  );
}
