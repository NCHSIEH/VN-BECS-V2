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
  Zap,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { AuditEvent } from "../types";
import { useI18n } from "../lib/i18n";

export function AuditLogViewer() {
  const { t } = useI18n();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const fetchEvents = () => {
    setLoading(true);
    setError(null);
    fetch('/api/v1/audit-events?limit=500')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(payload => {
        const data = Array.isArray(payload) ? payload : (payload.data ?? []);
        setEvents(data);
        setTotal(typeof payload.total === 'number' ? payload.total : data.length);
      })
      .catch(err => {
        setError(t('audit_error'));
        setEvents([]);
      })
      .finally(() => setLoading(false));
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
    if (!type) return <Activity className="text-clinical-muted" />;
    if (type.includes('Collection')) return <Droplets className="text-rose-500" />;
    if (type.includes('Release')) return <Beaker className="text-sky-500" />;
    if (type.includes('Dispatch')) return <Truck className="text-amber-500" />;
    if (type.includes('Delivery')) return <CheckCircle2 className="text-emerald-500" />;
    if (type.includes('Verify')) return <UserCheck className="text-indigo-500" />;
    if (type.includes('RARE')) return <ShieldAlert className="text-sky-500" />;
    if (type.includes('MTP')) return <Zap className="text-rose-500" />;
    return <Activity className="text-clinical-muted" />;
  };

  return (
    <div className="flex-1 flex flex-col gap-10 animate-in fade-in duration-1000">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-clinical-border pb-10">
         <div className="space-y-4">
            <div className="premium-subtitle">
               <ShieldCheck size={18} className="text-rose-500" />
               {t('audit_compliance_hub')}
            </div>
            <h1 className="premium-heading">{t('audit_title')}</h1>
            <p className="text-clinical-muted text-[11px] font-black uppercase tracking-[0.3em] mt-4 opacity-80">
              {t('audit_subtitle')}
              {total > 0 && <span className="ml-4 text-rose-500">({total.toLocaleString()} {t('audit_total_records')})</span>}
            </p>
         </div>

         <div className="flex gap-4">
            <div className="flex bg-clinical-bg p-2 rounded-2xl border border-clinical-border shadow-2xl backdrop-blur-xl">
               <button
                 onClick={() => setViewMode('table')}
                 className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-clinical-bg text-white shadow-2xl border border-clinical-border' : 'text-clinical-muted hover:text-clinical-text'}`}
               >
                 {t('audit_mode_table')}
               </button>
               <button
                 onClick={() => setViewMode('timeline')}
                 className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'timeline' ? 'bg-clinical-bg text-white shadow-2xl border border-clinical-border' : 'text-clinical-muted hover:text-clinical-text'}`}
               >
                 {t('audit_mode_timeline')}
               </button>
            </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 bg-clinical-card/20 p-6 rounded-[40px] border border-clinical-border">
         <div className="flex-1 flex items-center gap-4 bg-clinical-bg/50 p-3 rounded-2xl border border-clinical-border px-6 focus-within:border-rose-500/50 transition-all shadow-inner group">
            <Search size={22} className="text-clinical-muted group-focus-within:text-rose-500 transition-colors" />
            <input
              type="text"
              placeholder={t('audit_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-base font-black uppercase tracking-widest text-clinical-text w-full placeholder:text-clinical-text"
            />
         </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-6 py-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm font-black uppercase tracking-widest">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-16 gap-3 text-clinical-muted text-sm font-black uppercase tracking-widest">
          <Loader2 size={18} className="animate-spin" /> {t('audit_loading')}
        </div>
      )}

      <div className="flex-1 bg-clinical-bg border border-clinical-border rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-0">
         {viewMode === 'table' ? (
            <div className="flex-1 overflow-auto custom-scrollbar">
               <table className="w-full text-left text-sm border-collapse">
                 <thead className="bg-clinical-card/80 text-[11px] uppercase text-clinical-muted sticky top-0 border-b border-clinical-border backdrop-blur-xl z-20">
                   <tr>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">{t('audit_col_timestamp')}</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">{t('audit_col_role')}</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">{t('audit_col_operation')}</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">{t('audit_col_target')}</th>
                     <th className="px-10 py-6 font-black tracking-[0.2em]">{t('audit_col_details')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-clinical-border font-mono text-[13px]">
                   {filteredEvents.map((event, index) => (
                     <tr key={index} className="hover:bg-clinical-bg transition-all group">
                       <td className="px-10 py-6 text-clinical-muted whitespace-nowrap">
                         <div className="flex items-center gap-3">
                            <Clock size={14} className="text-clinical-text group-hover:text-rose-500 transition-colors" />
                            {new Date(event.timestamp).toLocaleString()}
                         </div>
                       </td>
                       <td className="px-10 py-6">
                         <span className="px-4 py-1.5 rounded-xl bg-clinical-card text-clinical-muted border border-clinical-border uppercase text-[10px] font-black tracking-widest group-hover:border-clinical-border transition-all">
                           {event.actorRole}
                         </span>
                       </td>
                       <td className="px-10 py-6">
                         <div className="flex items-center gap-3 font-black text-clinical-text uppercase tracking-tighter">
                            {getEventIcon(event.eventType)}
                            {event.eventType}
                         </div>
                       </td>
                       <td className="px-10 py-6 text-rose-500 font-black tracking-tighter text-base">{event.objectId}</td>
                       <td className="px-10 py-6 text-clinical-muted font-medium italic group-hover:text-clinical-text transition-colors">{event.details}</td>
                     </tr>
                   ))}
                   {!loading && filteredEvents.length === 0 && (
                     <tr>
                       <td colSpan={5} className="text-center py-24 text-clinical-muted italic font-sans text-[11px] uppercase tracking-[0.2em]">
                         {t('audit_no_results')}
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
                     <div className="w-20 h-20 bg-clinical-card rounded-[32px] flex items-center justify-center text-clinical-text mb-6 border border-clinical-border">
                        <History size={40} />
                     </div>
                     <h3 className="text-xl font-black text-clinical-muted uppercase italic tracking-tighter leading-none">{t('audit_timeline_hint_title')}</h3>
                     <p className="text-clinical-muted text-[10px] font-black uppercase tracking-[0.2em] mt-4 max-w-xs">{t('audit_timeline_hint_desc')}</p>
                  </div>
               ) : (
                  <div className="max-w-3xl mx-auto">
                     <div className="mb-12 flex items-center justify-between">
                        <div>
                           <h2 className="text-2xl font-black text-clinical-text tracking-tighter uppercase italic">{t('audit_timeline_lifecycle', { id: searchQuery })}</h2>
                           <p className="text-clinical-muted text-[10px] font-black uppercase tracking-widest mt-1">{t('audit_timeline_trace')}</p>
                        </div>
                        <button
                          onClick={() => alert(t('audit_export_alert', { id: searchQuery }))}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-500 transition-all shadow-lg shadow-sky-900/40 italic"
                        >
                           <ExternalLink size={14} /> {t('audit_export_btn')}
                        </button>
                     </div>

                     <div className="space-y-0 relative">
                        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-clinical-bg"></div>

                        {timelineEvents.map((event, i) => (
                           <div key={i} className="relative pl-16 pb-12 last:pb-0 animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                              <div className={`absolute left-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl border-2 z-10 ${
                                 i === timelineEvents.length - 1 ? 'bg-emerald-600 border-emerald-400' : 'bg-clinical-card border-clinical-border'
                              }`}>
                                 {getEventIcon(event.eventType)}
                              </div>

                              <div className="clinical-card p-6 bg-clinical-card/20 hover:border-clinical-border transition-all group">
                                 <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-black text-clinical-text uppercase italic tracking-tight">{event.eventType}</h4>
                                    <span className="text-[10px] font-mono text-clinical-muted">{new Date(event.timestamp).toLocaleString()}</span>
                                 </div>
                                 <p className="text-xs text-clinical-muted leading-relaxed mb-4">{event.details}</p>
                                 <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 rounded-lg bg-clinical-bg border border-clinical-border text-[9px] font-black text-clinical-muted uppercase tracking-widest">
                                       {t('audit_actor', { role: event.actorRole })}
                                    </div>
                                    {event.eventType === 'BarcodeMismatch' && (
                                       <div className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                                          <ShieldAlert size={10} /> {t('audit_violation')}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ))}

                        {timelineEvents.length === 0 && (
                           <div className="py-20 text-center text-clinical-muted">
                              <p className="text-[10px] font-black uppercase tracking-widest italic">{t('audit_no_events')}</p>
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
