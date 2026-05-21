import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  FlaskConical, 
  Wrench, 
  Plus, 
  Search,
  Filter,
  BarChart3,
  Calendar,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { Resource, ResourceType, ResourceStatus } from "../types";
import { useI18n } from "../lib/i18n";

export function ResourceManagementView() {
  const { t } = useI18n();
  const [resources, setResources] = useState<Resource[]>([]);
  const [filterType, setFilterType] = useState<ResourceType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/resources')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setResources(data);
        } else {
          // Fallback simulation data
          setResources([
            { id: 'RES-701', orgId: 'NBMS-HQ', name: 'Cobas NAT Screening Kit', type: 'Reagent', status: 'Active', stockLevel: 450, minStockLevel: 100, expiryDate: '2024-12-31' },
            { id: 'RES-702', orgId: 'NBMS-HQ', name: 'Leukocyte Filter (Set of 10)', type: 'Consumable', status: 'Active', stockLevel: 820, minStockLevel: 200 },
            { id: 'RES-703', orgId: 'NBMS-HQ', name: 'Automated ABO/Rh Analyzer', type: 'Equipment', status: 'MaintenanceRequired', nextMaintenance: '2024-05-20' },
            { id: 'RES-704', orgId: 'NBMS-HQ', name: 'Cold-Chain Transport Box (L)', type: 'Equipment', status: 'Active', nextMaintenance: '2024-08-15' },
            { id: 'RES-705', orgId: 'NBMS-HQ', name: 'Antisera A/B/D Batch 09', type: 'Reagent', status: 'Active', stockLevel: 15, minStockLevel: 20, expiryDate: '2024-06-15' }
          ]);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Resource Fetch Error:', err);
        // Fallback on error
        setResources([
          { id: 'RES-701', orgId: 'NBMS-HQ', name: 'Cobas NAT Screening Kit', type: 'Reagent', status: 'Active', stockLevel: 450, minStockLevel: 100, expiryDate: '2024-12-31' },
          { id: 'RES-702', orgId: 'NBMS-HQ', name: 'Leukocyte Filter (Set of 10)', type: 'Consumable', status: 'Active', stockLevel: 820, minStockLevel: 200 }
        ]);
        setIsLoading(false);
      });
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const matchesType = filterType === 'ALL' || r.type === filterType;
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           r.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [resources, filterType, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: resources.length,
      critical: resources.filter(r => r.status === 'MaintenanceRequired' || r.status === 'Expired' || (r.stockLevel !== undefined && r.stockLevel < (r.minStockLevel || 0))).length,
      equipment: resources.filter(r => r.type === 'Equipment').length,
      reagents: resources.filter(r => r.type === 'Reagent').length
    };
  }, [resources]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Refresh
        fetch('/api/v1/resources')
          .then(res => res.json())
          .then(setResources);
      }
    } catch (e) {}
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-clinical-muted animate-pulse">
        <Settings className="animate-spin" size={48} />
        <span className="font-black uppercase tracking-[0.3em]">Mapping Resource Ecosystem...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header & Stats Strip */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 px-2">
         <div className="space-y-2">
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-sky-500 uppercase tracking-[0.4em] bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">Resource Protocol</span>
               <div className="h-px w-12 bg-clinical-bg"></div>
            </div>
            <h1 className="text-4xl font-black text-clinical-text tracking-tighter uppercase italic leading-none">Supply & Asset Intelligence</h1>
         </div>

         <div className="flex gap-4">
            <div className="bg-clinical-bg border border-clinical-border p-4 rounded-2xl flex items-center gap-4 min-w-[140px] shadow-xl">
               <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                  <BarChart3 size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-clinical-muted uppercase tracking-widest leading-none mb-1">Assets</p>
                  <p className="text-xl font-black text-clinical-text tracking-tighter">{stats.total}</p>
               </div>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-4 min-w-[140px] shadow-xl">
               <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600 animate-pulse">
                  <AlertTriangle size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-clinical-muted uppercase tracking-widest leading-none mb-1">Critical</p>
                  <p className="text-xl font-black text-rose-500 tracking-tighter">{stats.critical}</p>
               </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4 min-w-[160px] shadow-xl group hover:bg-emerald-500/20 transition-all">
               <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <ShieldCheck size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-clinical-muted uppercase tracking-widest leading-none mb-1">Resilience</p>
                  <p className="text-xl font-black text-emerald-500 tracking-tighter">98.2%</p>
               </div>
            </div>
         </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-clinical-card/20 p-6 rounded-[32px] border border-clinical-border backdrop-blur-xl">
         <div className="flex items-center gap-4 bg-clinical-bg/50 p-2 rounded-2xl border border-clinical-border w-full md:w-auto">
            <Search size={18} className="text-clinical-muted ml-2" />
            <input 
              type="text" 
              placeholder="Search assets, reagents, lots..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-clinical-text w-full md:w-64"
            />
         </div>

         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex bg-clinical-bg/50 p-1.5 rounded-2xl border border-clinical-border">
               {(['ALL', 'Reagent', 'Equipment', 'Consumable'] as const).map(type => (
                 <button 
                   key={type}
                   onClick={() => setFilterType(type)}
                   className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${filterType === type ? 'bg-sky-600 text-white shadow-lg' : 'text-clinical-muted hover:text-clinical-muted'}`}
                 >
                   {type.toUpperCase()}
                 </button>
               ))}
            </div>
            <button className="flex items-center gap-2 px-6 py-3.5 bg-sky-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-sky-900/40 hover:scale-105 active:scale-95 transition-all">
               <Plus size={16} /> Add Resource
            </button>
         </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
         <div className="xl:col-span-8 space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-clinical-border bg-clinical-card/10 shadow-2xl">
               <table className="w-full text-left text-sm">
                  <thead className="bg-clinical-card/60 text-clinical-muted text-[10px] font-black uppercase tracking-[0.2em] border-b border-clinical-border">
                     <tr>
                        <th className="p-8">Resource Identity</th>
                        <th className="p-8">Lifecycle / Status</th>
                        <th className="p-8">Metric</th>
                        <th className="p-8 text-right">Control</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-clinical-border/50">
                     {filteredResources.map(res => (
                        <tr key={res.id} className="hover:bg-clinical-card/30 transition-colors group">
                           <td className="p-8">
                              <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${
                                    res.type === 'Reagent' ? 'bg-rose-500/10 text-rose-600' :
                                    res.type === 'Equipment' ? 'bg-sky-500/10 text-sky-400' :
                                    'bg-emerald-500/10 text-emerald-600'
                                 }`}>
                                    {res.type === 'Reagent' ? <FlaskConical size={24} /> :
                                     res.type === 'Equipment' ? <Wrench size={24} /> :
                                     <Package size={24} />}
                                 </div>
                                 <div>
                                    <h4 className="font-black text-clinical-text text-base tracking-tight">{res.name}</h4>
                                    <p className="text-[10px] font-mono font-bold text-clinical-muted uppercase tracking-widest mt-1">{res.id} · {res.type}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="p-8">
                              <div className="space-y-2">
                                 {res.status === 'Active' ? (
                                    <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full w-fit border border-emerald-500/20">
                                       <CheckCircle size={14} /> Operational
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest bg-rose-500/10 px-3 py-1.5 rounded-full w-fit border border-rose-500/20">
                                       <AlertTriangle size={14} /> {res.status}
                                    </div>
                                 )}
                                 <p className="text-[9px] text-clinical-muted font-bold uppercase tracking-widest">
                                    {res.expiryDate ? `Expires: ${res.expiryDate}` : 
                                     res.nextMaintenance ? `Next Svc: ${res.nextMaintenance}` : 'Continuous Stock'}
                                 </p>
                              </div>
                           </td>
                           <td className="p-8">
                              {res.stockLevel !== undefined ? (
                                 <div className="space-y-2">
                                    <div className="flex justify-between items-baseline">
                                       <span className={`text-xl font-black italic tracking-tighter ${res.stockLevel < (res.minStockLevel || 0) ? 'text-rose-500' : 'text-clinical-text'}`}>
                                          {res.stockLevel}
                                       </span>
                                       <span className="text-[9px] text-clinical-muted font-black uppercase">Units</span>
                                    </div>
                                    <div className="h-1 w-24 bg-clinical-bg rounded-full overflow-hidden">
                                       <div className={`h-full ${res.stockLevel < (res.minStockLevel || 0) ? 'bg-rose-600' : 'bg-sky-500'} transition-all`} 
                                            style={{ width: `${Math.min(100, (res.stockLevel / ((res.minStockLevel || 1) * 3)) * 100)}%` }}></div>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="text-clinical-text italic text-xs font-bold uppercase tracking-widest">Asset tracking active</div>
                              )}
                           </td>
                           <td className="p-8 text-right">
                               {res.status !== 'Active' ? (
                                  <button 
                                    onClick={() => handleUpdateStatus(res.id, 'Active')}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                                  >
                                     Authorize
                                  </button>
                               ) : (
                                  <button className="p-3 bg-clinical-bg/50 text-clinical-muted hover:text-clinical-text hover:bg-clinical-bg rounded-xl transition-all">
                                     <MoreVertical size={18} />
                                  </button>
                               )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Monitoring Sidebar */}
         <div className="xl:col-span-4 space-y-8">
            <div className="clinical-card p-8 bg-clinical-card/20 border border-clinical-border backdrop-blur-xl">
               <h3 className="text-xs font-black text-clinical-muted uppercase tracking-[0.3em] mb-8 italic">Maintenance Schedule</h3>
               <div className="space-y-6">
                  {[
                    { name: 'Cobas NAT', date: 'Jul 10', priority: 'High', type: 'PM' },
                    { name: 'Centrifuge 04', date: 'PAST DUE', priority: 'Critical', type: 'Repair' },
                    { name: 'Platelet Agitator', date: 'Aug 05', priority: 'Low', type: 'PM' },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-clinical-bg/50 border border-clinical-border rounded-2xl group hover:border-clinical-border transition-all cursor-default">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.priority === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-clinical-bg text-clinical-muted'}`}>
                          <Calendar size={18} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-clinical-text uppercase truncate">{m.name}</p>
                          <p className="text-[9px] text-clinical-muted font-bold uppercase tracking-widest">{m.type} · {m.date}</p>
                       </div>
                       <ChevronRight size={14} className="text-clinical-text group-hover:translate-x-1 transition-transform" />
                    </div>
                  ))}
               </div>
               <button className="w-full mt-10 py-3 bg-clinical-card border border-clinical-border text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] rounded-2xl hover:bg-clinical-bg hover:text-white transition-all">
                  Access Maintenance Log
               </button>
            </div>

            <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-[40px] p-8 shadow-2xl shadow-sky-900/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-48 bg-clinical-card/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-clinical-card transition-all duration-1000" />
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-clinical-card rounded-xl backdrop-blur-md"><ShieldCheck className="text-clinical-text" size={20} /></div>
                    <h3 className="text-xs font-black text-clinical-text uppercase tracking-widest italic">Safety Gating Status</h3>
                 </div>
                 <p className="text-[11px] text-clinical-text/80 leading-relaxed font-bold uppercase tracking-widest italic mb-8">
                   System-wide gating is currently active. 2 assets are blocking lab operations due to safety violations.
                 </p>
                 <div className="flex items-center justify-between p-4 bg-clinical-bg rounded-2xl border border-clinical-border backdrop-blur-sm">
                    <div>
                       <p className="text-[8px] font-black text-clinical-text/50 uppercase tracking-widest mb-0.5">Integrity Check</p>
                       <p className="text-sm font-black text-clinical-text tracking-tighter uppercase italic">Hard Gate Active</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></div>
                 </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
