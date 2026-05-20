import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Package, 
  Search,
  ChevronRight,
  MapPin,
  Clock
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { getDosColorLevel, COLOR_CLASSES } from "../lib/alertThresholds";

export function HospitalInventoryView() {
  const { t } = useI18n();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch of regional hospital inventory
    setTimeout(() => {
      const mockHospitals = [
        { 
          id: 'HOSP-001', 
          name: 'Bach Mai Hospital', 
          location: 'Hanoi',
          stock: { O_POS: 45, O_NEG: 4, A_POS: 22, B_POS: 18 },
          avgDailyUsage: 12,
          lastDelivery: '2024-05-10T08:30:00Z',
          status: 'Optimal'
        },
        { 
          id: 'HOSP-002', 
          name: 'Cho Ray Hospital', 
          location: 'HCMC',
          stock: { O_POS: 12, O_NEG: 1, A_POS: 8, B_POS: 5 },
          avgDailyUsage: 15,
          lastDelivery: '2024-05-09T14:20:00Z',
          status: 'Critical'
        },
        { 
          id: 'HOSP-003', 
          name: 'Hue Central Hospital', 
          location: 'Hue',
          stock: { O_POS: 28, O_NEG: 3, A_POS: 15, B_POS: 12 },
          avgDailyUsage: 8,
          lastDelivery: '2024-05-11T09:00:00Z',
          status: 'Optimal'
        },
        { 
          id: 'HOSP-004', 
          name: 'Vietnam-Germany Hospital', 
          location: 'Hanoi',
          stock: { O_POS: 8, O_NEG: 0, A_POS: 5, B_POS: 3 },
          avgDailyUsage: 10,
          lastDelivery: '2024-05-08T11:45:00Z',
          status: 'Low Stock'
        }
      ];
      setHospitals(mockHospitals);
      setIsLoading(false);
    }, 800);
  }, []);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      h.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [hospitals, searchQuery]);

  const regionalStats = useMemo(() => {
    const totalUnits = hospitals.reduce((acc, h) => acc + Object.values(h.stock).reduce((s: any, v: any) => s + v, 0), 0);
    const criticalHospitals = hospitals.filter(h => h.status === 'Critical').length;
    return { totalUnits, criticalHospitals, hospitalCount: hospitals.length };
  }, [hospitals]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500 animate-pulse">
        <Building2 className="animate-bounce" size={48} />
        <span className="font-black uppercase tracking-[0.3em]">Synchronizing Regional Inventory...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header & High-Level Metrics */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 px-2">
         <div className="space-y-2">
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">VMI Protocol Active</span>
               <div className="h-px w-12 bg-slate-800"></div>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Regional Inventory Visibility</h1>
         </div>

         <div className="flex gap-4">
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 min-w-[140px] shadow-xl">
               <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                  <Package size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Units</p>
                  <p className="text-xl font-black text-white tracking-tighter">{regionalStats.totalUnits}</p>
               </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 min-w-[140px] shadow-xl">
               <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Critical</p>
                  <p className="text-xl font-black text-rose-500 tracking-tighter">{regionalStats.criticalHospitals}</p>
               </div>
            </div>
         </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/20 p-6 rounded-[32px] border border-slate-800 backdrop-blur-xl">
         <div className="flex items-center gap-4 bg-slate-950/50 p-2 rounded-2xl border border-slate-800 w-full md:w-auto">
            <Search size={18} className="text-slate-600 ml-2" />
            <input 
              type="text" 
              placeholder="Search by Hospital Name or Province..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-300 w-full md:w-80" 
            />
         </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">
               <TrendingUp size={14} /> Usage Analytics
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-900/40 hover:scale-105 active:scale-95 transition-all">
               <Activity size={14} /> Replenishment Run
            </button>
         </div>
      </div>

      {/* Hospital Inventory Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         {filteredHospitals.map(hospital => (
            <div key={hospital.id} className="clinical-card group hover:border-slate-600 transition-all bg-slate-900/10 backdrop-blur-xl border-slate-800 overflow-hidden flex flex-col">
               <div className="p-8 border-b border-slate-800 flex justify-between items-start bg-slate-900/20">
                  <div className="flex items-center gap-5">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                        hospital.status === 'Critical' ? 'bg-rose-600 shadow-rose-900/30' : 
                        hospital.status === 'Low Stock' ? 'bg-amber-600 shadow-amber-900/30' : 
                        'bg-emerald-600 shadow-emerald-900/30'
                     }`}>
                        <Building2 size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">{hospital.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest"><MapPin size={10} /> {hospital.location}</span>
                           <span className="text-slate-700">•</span>
                           <span className="text-[10px] font-mono font-bold text-slate-500">{hospital.id}</span>
                        </div>
                     </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
                     hospital.status === 'Critical' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse' : 
                     hospital.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 
                     'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  }`}>
                     {hospital.status}
                  </div>
               </div>

               <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-950/20">
                  {Object.entries(hospital.stock).map(([type, qty]: [string, any]) => {
                     const abo = type.split('_')[0];
                     const rhd = type.split('_')[1];
                     const dos = qty / (hospital.avgDailyUsage / 4);
                     const colorLevel = getDosColorLevel(dos);
                     const cls = COLOR_CLASSES[colorLevel];
                     
                     return (
                        <div key={type} className={`p-4 rounded-2xl border ${cls.border} ${cls.bg} flex flex-col items-center justify-center gap-1 transition-all hover:scale-105`}>
                           <span className={`text-xs font-black ${cls.text}`}>{abo} {rhd === 'POS' ? '+' : '-'}</span>
                           <span className={`text-2xl font-black italic tracking-tighter ${cls.text}`}>{qty}</span>
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{dos.toFixed(1)} DOS</span>
                        </div>
                     );
                  })}
               </div>

               <div className="p-8 bg-slate-900/10 border-t border-slate-800 flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-6">
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">Daily Burn Rate</p>
                        <p className="text-sm font-black text-slate-400 tracking-tighter">{hospital.avgDailyUsage} Units/Day</p>
                     </div>
                     <div className="h-8 w-px bg-slate-800"></div>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">Last Supply</p>
                        <p className="text-sm font-black text-slate-400 tracking-tighter flex items-center gap-2">
                           <Clock size={12} /> {new Date(hospital.lastDelivery).toLocaleDateString()}
                        </p>
                     </div>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-slate-400 border border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all">
                     View Details <ChevronRight size={14} />
                  </button>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
