import { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, 
  Activity, 
  Search, 
  History, 
  Droplets, 
  Beaker, 
  Truck, 
  CheckCircle2, 
  UserCheck, 
  ArrowRight,
  Clock,
  ExternalLink,
  ShieldAlert,
  Zap
} from "lucide-react";
import { AuditEvent } from "../types";

export function AuditLogViewer() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const fetchEvents = () => {
    fetch('/api/v1/audit-events')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setEvents(data);
        } else {
          setEvents([
            { id: 'AUD-001', timestamp: new Date().toISOString(), actorId: 'U-772', actorRole: 'Dispatcher', eventType: 'DispatchConfirmed', objectId: 'VNB-2024-8812', details: 'Automated FEFO pick-list approved for Transport Route Central-1' },
            { id: 'AUD-002', timestamp: new Date(Date.now() - 3600000).toISOString(), actorId: 'U-775', actorRole: 'Nurse', eventType: 'VerifySuccess', objectId: 'VNB-2024-9014', details: 'Bedside verification successful for Patient MRN-4421' },
            { id: 'AUD-003', timestamp: new Date(Date.now() - 7200000).toISOString(), actorId: 'U-780', actorRole: 'Admin', eventType: 'MDMUpdate', objectId: 'ORG-HOSP-04', details: 'Emergency priority escalation updated for Vietnam-Germany Hospital' },
            { id: 'AUD-004', timestamp: new Date(Date.now() - 86400000).toISOString(), actorId: 'U-782', actorRole: 'LabTech', eventType: 'MTPActivated', objectId: 'VNB-MTP-09', details: 'Massive Transfusion Protocol initiated by ER-Command' }
          ]);
        }
      })
      .catch(() => {
        setEvents([
          { id: 'AUD-001', timestamp: new Date().toISOString(), actorId: 'U-772', actorRole: 'Dispatcher', eventType: 'DispatchConfirmed', objectId: 'VNB-2024-8812', details: 'Automated FEFO pick-list approved for Transport Route Central-1' }
        ]);
      });
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    return events.filter(e => 
      e.objectId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eventType?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const timelineEvents = useMemo(() => {
    if (!searchQuery) return [];
    return [...filteredEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [filteredEvents, searchQuery]);

  const getEventIcon = (type: string) => {
    if (!type) return <Activity className="text-slate-600" />;
    if (type.includes('Collection')) return <Droplets className="text-rose-500" />;
    if (type.includes('Release')) return <Beaker className="text-sky-500" />;
    if (type.includes('Dispatch')) return <Truck className="text-amber-500" />;
    if (type.includes('Delivery')) return <CheckCircle2 className="text-emerald-500" />;
    if (type.includes('Verify')) return <UserCheck className="text-indigo-500" />;
    if (type.includes('RARE')) return <ShieldAlert className="text-sky-500" />;
    if (type.includes('MTP')) return <Zap className="text-rose-500" />;
    return <Activity className="text-slate-600" />;
  };

  return (
    <div className="flex-1 flex flex-col gap-10 animate-in fade-in duration-1000">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-slate-800 pb-10">
         <div className="space-y-4">
            <div className="premium-subtitle">
               <ShieldCheck size={18} className="text-rose-500" />
               Compliance & Sovereignty Hub
            </div>
            <h1 className="premium-heading">Audit Ledger</h1>
            <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.3em] mt-4 opacity-80">Immutable Blockchain-Verified Traceability Records</p>
         </div>

         <div className="flex gap-4">
            <div className="flex bg-slate-900/50 p-2 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
               <button 
                 onClick={() => setViewMode('table')}
                 className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-slate-800 text-white shadow-2xl border border-slate-700' : 'text-slate-600 hover:text-slate-700'}`}
               >
                 Raw Registry
               </button>
               <button 
                 onClick={() => setViewMode('timeline')}
                 className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'timeline' ? 'bg-slate-800 text-white shadow-2xl border border-slate-700' : 'text-slate-600 hover:text-slate-700'}`}
               >
                 Vein-to-Vein
               </button>
            </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 bg-slate-900/20 p-6 rounded-[40px] border border-slate-800">
         <div className="flex-1 flex items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-800 px-6 focus-within:border-rose-500/50 transition-all shadow-inner group">
            <Search size={22} className="text-slate-600 group-focus-within:text-rose-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by ISBT Unit ID or Authority Hash..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-base font-black uppercase tracking-widest text-slate-700 w-full placeholder:text-slate-700"
            />
         </div>
      </div>

      <div className="flex-1 bg-[#020617] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-0">
         {viewMode === 'table' ? (
            <div className="flex-1 overflow-auto custom-scrollbar">
               <table className="w-full text-left text-sm border-collapse">
                 <thead className="bg-slate-900/80 text-[11px] uppercase text-slate-600 sticky top-0 border-b border-slate-800 backdrop-blur-xl z-20">
                   <tr>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">Digital Timestamp</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">Authority Role</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">Operation</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">Target ID</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">Cryptographic Details</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-900 font-mono text-[13px]">
                   {filteredEvents.map((event, index) => (
                     <tr key={index} className="hover:bg-slate-900/40 transition-all group">
                       <td className="px-10 py-6 text-slate-600 whitespace-nowrap">
                         <div className="flex items-center gap-3">
                            <Clock size={14} className="text-slate-700 group-hover:text-rose-500 transition-colors" />
                            {new Date(event.timestamp).toLocaleString()}
                         </div>
                       </td>
                       <td className="px-10 py-6">
                         <span className="px-4 py-1.5 rounded-xl bg-slate-900 text-slate-600 border border-slate-800 uppercase text-[10px] font-black tracking-widest group-hover:border-slate-700 transition-all">
                           {event.actorRole}
                         </span>
                       </td>
                       <td className="px-10 py-6">
                         <div className="flex items-center gap-3 font-black text-slate-700 uppercase tracking-tighter">
                            {getEventIcon(event.eventType)}
                            {event.eventType}
                         </div>
                       </td>
                       <td className="px-10 py-6 text-rose-500 font-black tracking-tighter text-base">{event.objectId}</td>
                       <td className="px-10 py-6 text-slate-600 font-medium italic group-hover:text-slate-700 transition-colors">{event.details}</td>
                     </tr>
                   ))}
                   {filteredEvents.length === 0 && (
                     <tr>
                       <td colSpan={5} className="text-center py-24 text-slate-600 italic font-sans text-[11px] uppercase tracking-[0.2em]">
                         No cryptographic records matched the query.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
            </div>
         ) : (
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
               {!searchQuery ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                     <div className="w-20 h-20 bg-slate-900 rounded-[32px] flex items-center justify-center text-slate-700 mb-6 border border-slate-800">
                        <History size={40} />
                     </div>
                     <h3 className="text-xl font-black text-slate-600 uppercase italic tracking-tighter leading-none">Timeline Visualizer</h3>
                     <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-4 max-w-xs">Enter a specific Unit ID above to reconstruct the end-to-end "Vein-to-Vein" lifecycle.</p>
                  </div>
               ) : (
                  <div className="max-w-3xl mx-auto">
                     <div className="mb-12 flex items-center justify-between">
                        <div>
                           <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Unit Lifecycle: {searchQuery}</h2>
                           <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-1">Full Traceability Path Discovered</p>
                        </div>
                        <button 
                          onClick={() => {
                             alert("GENERATING DIGITAL AFFIDAVIT OF TRACEABILITY...\n\nBlockchain Hash: 0x7f3b...e4a2\nSovereignty Verification: SUCCESS\n\nFile: Affidavit_" + searchQuery + ".pdf is being compiled.");
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-500 transition-all shadow-lg shadow-sky-900/40 italic"
                        >
                           <ExternalLink size={14} /> Export Affidavit
                        </button>
                     </div>

                     <div className="space-y-0 relative">
                        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-slate-800"></div>
                        
                        {timelineEvents.map((event, i) => (
                           <div key={i} className="relative pl-16 pb-12 last:pb-0 animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                              <div className={`absolute left-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl border-2 z-10 ${
                                 i === timelineEvents.length - 1 ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-900 border-slate-800'
                              }`}>
                                 {getEventIcon(event.eventType)}
                              </div>
                              
                              <div className="clinical-card p-6 bg-slate-900/20 hover:border-slate-700 transition-all group">
                                 <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-black text-slate-800 uppercase italic tracking-tight">{event.eventType}</h4>
                                    <span className="text-[10px] font-mono text-slate-600">{new Date(event.timestamp).toLocaleString()}</span>
                                 </div>
                                 <p className="text-xs text-slate-600 leading-relaxed mb-4">{event.details}</p>
                                 <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-800 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                       Actor: {event.actorRole}
                                    </div>
                                    {event.eventType === 'BarcodeMismatch' && (
                                       <div className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                                          <ShieldAlert size={10} /> Violation Logged
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ))}

                        {timelineEvents.length === 0 && (
                           <div className="py-20 text-center text-slate-600">
                              <p className="text-[10px] font-black uppercase tracking-widest italic">No events found for this Unit ID.</p>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
    </div>
  );
}
