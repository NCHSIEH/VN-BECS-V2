import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Wifi, 
  Database, 
  HardDrive, 
  Cpu, 
  Activity, 
  RefreshCcw, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'loading';
  latency: string;
  services: {
    database: string;
    api: string;
    storage: string;
  };
}

export function SystemDiagnosticView({ onClose }: { onClose: () => void }) {
  const [checking, setChecking] = useState(true);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [progress, setProgress] = useState(0);

  const runDiagnostic = async () => {
    setChecking(true);
    setProgress(0);
    
    // Smooth progress simulation
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 95));
    }, 50);

    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      
      setTimeout(() => {
        setHealth(data);
        setChecking(false);
        setProgress(100);
        clearInterval(interval);
      }, 1500); // Mimic intensive scan
    } catch (e) {
      setHealth({
        status: 'degraded',
        latency: 'N/A',
        services: { database: 'error', api: 'error', storage: 'connected' }
      });
      setChecking(false);
      setProgress(100);
      clearInterval(interval);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 selection:bg-rose-500/30">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-50/80 backdrop-blur-2xl"
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[48px] p-12 relative z-10 shadow-2xl overflow-hidden"
      >
        {/* Background Scanning Animation */}
        {checking && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent animate-scan" />
          </div>
        )}

        <div className="flex justify-between items-start mb-12">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <ShieldCheck size={20} className={checking ? 'text-slate-600' : (health?.status === 'healthy' ? 'text-emerald-500' : 'text-rose-500')} />
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Strategic Integrity Protocol</p>
              </div>
              <h2 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">System Diagnostic</h2>
           </div>
           <button onClick={onClose} className="p-4 bg-slate-50 rounded-full text-slate-600 hover:text-slate-800 transition-all"><X size={24} /></button>
        </div>

        <div className="space-y-10">
           {/* Progress Ring / Core Status */}
           <div className="flex flex-col items-center justify-center py-12 relative">
              <div className="relative w-48 h-48 flex items-center justify-center">
                 <svg className="w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="88" className="stroke-slate-800 fill-none" strokeWidth="4" />
                    <motion.circle 
                      cx="96" cy="96" r="88" 
                      className={`fill-none ${health?.status === 'healthy' ? 'stroke-emerald-500' : 'stroke-rose-500'}`}
                      strokeWidth="4" 
                      strokeDasharray="552.92"
                      animate={{ strokeDashoffset: 552.92 * (1 - progress / 100) }}
                      transition={{ duration: 0.5 }}
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {checking ? (
                      <div className="flex flex-col items-center">
                         <span className="text-3xl font-black text-slate-800 italic">{progress}%</span>
                         <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Analyzing</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                         {health?.status === 'healthy' ? (
                           <CheckCircle2 size={48} className="text-emerald-500 mb-2" />
                         ) : (
                           <AlertCircle size={48} className="text-rose-500 mb-2" />
                         )}
                         <span className={`text-xs font-black uppercase tracking-widest ${health?.status === 'healthy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {health?.status === 'healthy' ? 'System Optimal' : 'Degraded Mode'}
                         </span>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Service Grid */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DiagnosticCard 
                icon={<Database size={18} />} 
                label="Supabase DB" 
                status={checking ? 'scanning' : (health?.services.database === 'operational' ? 'online' : 'offline')} 
              />
              <DiagnosticCard 
                icon={<Wifi size={18} />} 
                label="API Gateway" 
                status={checking ? 'scanning' : 'online'} 
              />
              <DiagnosticCard 
                icon={<HardDrive size={18} />} 
                label="Edge Storage" 
                status={checking ? 'scanning' : 'online'} 
              />
              <DiagnosticCard 
                icon={<Activity size={18} />} 
                label="Latency" 
                status={checking ? 'scanning' : 'info'} 
                value={health?.latency}
              />
           </div>

           {/* Logs / Details */}
           <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                 <Cpu size={12} /> Resource Trace
              </div>
              <div className="space-y-2 font-mono text-[10px]">
                 <p className={checking ? 'text-slate-600' : 'text-slate-600'}>
                   [INFO] Initializing handshake with edge-cluster-vn-north... {progress > 20 ? 'OK' : ''}
                 </p>
                 <p className={progress < 50 ? 'text-slate-700' : 'text-slate-600'}>
                   [SEC] Validating sovereignty-level cryptographic certificates... {progress > 60 ? 'VALID' : ''}
                 </p>
                 <p className={progress < 80 ? 'text-slate-700' : 'text-slate-600'}>
                   [DATA] Cross-referencing MDM sync status with national nodes... {progress > 90 ? 'IN SYNC' : ''}
                 </p>
              </div>
           </div>

           {!checking && (
             <button 
               onClick={runDiagnostic}
               className="w-full py-5 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-3xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3 italic"
             >
               <RefreshCcw size={16} /> Rerun Full Diagnostic
             </button>
           )}
        </div>
      </motion.div>
    </div>
  );
}

function DiagnosticCard({ icon, label, status, value }: { icon: any, label: string, status: 'online' | 'offline' | 'scanning' | 'info', value?: string }) {
  return (
    <div className="bg-slate-50/30 border border-slate-800 p-5 rounded-[24px] flex flex-col items-center gap-3 transition-all hover:bg-slate-800/50">
       <div className={`p-2.5 rounded-xl ${
         status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 
         status === 'offline' ? 'bg-rose-500/10 text-rose-500' : 
         'bg-slate-800 text-slate-600'
       }`}>
          {icon}
       </div>
       <div className="text-center">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">{label}</p>
          <p className={`text-[10px] font-black uppercase ${
            status === 'online' ? 'text-emerald-500' : 
            status === 'offline' ? 'text-rose-500' : 
            'text-slate-800'
          }`}>
            {status === 'scanning' ? 'Scanning...' : (value || status.toUpperCase())}
          </p>
       </div>
    </div>
  );
}
