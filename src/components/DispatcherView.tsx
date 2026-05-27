import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, ShieldAlert, Activity, GitCommitHorizontal, AlertCircle, RefreshCw, Timer, TrendingUp } from "lucide-react";
import { Order } from "../types";
import { getDosColorLevel, COLOR_CLASSES } from "../lib/alertThresholds";
import { useI18n } from "../lib/i18n";
import { useClinicalUtils } from "../lib/hooks/useClinicalUtils";

export function DispatcherView() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMTP, setActiveMTP] = useState<any | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);

  const { getPriorityLabel } = useClinicalUtils();

  const fetchOrders = () => {
    setIsRefreshing(true);
    fetch('/api/v1/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        if (selectedOrder) {
           const updated = data.find((o: Order) => o.id === selectedOrder.id);
           setSelectedOrder(updated || null);
        }
      })
      .catch(err => console.error("Error fetching orders:", err))
      .finally(() => setIsRefreshing(false));
      
    fetch('/api/v1/mtp-cases')
      .then(res => res.json())
      .then(data => setActiveMTP(data.length > 0 ? data[0] : null))
      .catch(console.error);

    fetch('/api/v1/inventory')
      .then(res => res.json())
      .then(data => setInventory(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApprove = async () => {
    if (!selectedOrder) return;
    try {
      await fetch(`/api/v1/orders/${selectedOrder.id}/approve`, { method: 'POST' });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevert = async () => {
    if (!selectedOrder) return;
    if (!confirm("Revert this order to SUBMITTED status? This will return it to the triage queue.")) return;
    try {
      await fetch(`/api/v1/orders/${selectedOrder.id}/revert`, { method: 'POST' });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscalate = async () => {
    if (!selectedOrder) return;
    const reason = prompt("Enter clinical reason for overriding AI and escalating to Medical Reviewer:");
    if (!reason) return;
    try {
      await fetch(`/api/v1/orders/${selectedOrder.id}/escalate`, { 
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ reason })
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  /** SLA countdown: minutes remaining before SLA breach (T-206) */
  function getSlaInfo(order: Order) {
    if (!order.submittedAt) return { remaining: 0, color: 'text-clinical-muted', label: '--' };
    const slaMinutes: Record<string, number> = { Routine: 240, ASAP: 60, STAT: 30, MTP: 10 };
    const elapsed = (Date.now() - new Date(order.submittedAt).getTime()) / 60000;
    const remaining = Math.max(0, (slaMinutes[order.priority] || 240) - elapsed);
    const pct = remaining / (slaMinutes[order.priority] || 240);
    const color = pct > 0.5 ? 'text-lime-400' : pct > 0.2 ? 'text-amber-400' : 'text-rose-500';
    return { remaining: Math.floor(remaining), color, label: remaining > 60 ? `${Math.floor(remaining/60)}h ${Math.floor(remaining%60)}m` : `${Math.floor(remaining)}m` };
  }

  // Efficiency stats (T-209)
  const stats = useMemo(() => {
    const submitted = orders.filter(o => o.status === 'SUBMITTED').length;
    const approved = orders.filter(o => ['APPROVED','DISPATCHED','IN_TRANSIT','DELIVERED'].includes(o.status)).length;
    const total = orders.length || 1;
    return { submitted, approved, total, rate: Math.round((approved / total) * 100) };
  }, [orders]);

  // Triage Queue Sorting: MTP first, then STAT, then highest HICI, then shortest SLA
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const priorityWeight: Record<string, number> = { MTP: 100, STAT: 80, ASAP: 40, Routine: 0 };
      const weightA = priorityWeight[a.priority] || 0;
      const weightB = priorityWeight[b.priority] || 0;
      
      if (weightA !== weightB) return weightB - weightA;
      
      // If same priority, use HICI
      if (b.hiciScore !== a.hiciScore) return b.hiciScore - a.hiciScore;
      
      // If same HICI, use submission time (FIFO)
      return new Date(a.submittedAt || '').getTime() - new Date(b.submittedAt || '').getTime();
    });
  }, [orders]);

  // ABO×Rh Heatmap data with Expiry Risk Analysis
  const heatmapData = useMemo(() => {
    const types: Array<{ abo: string; rhd: string }> = [
      { abo: 'O', rhd: 'Positive' }, { abo: 'O', rhd: 'Negative' },
      { abo: 'A', rhd: 'Positive' }, { abo: 'A', rhd: 'Negative' },
      { abo: 'B', rhd: 'Positive' }, { abo: 'B', rhd: 'Negative' },
      { abo: 'AB', rhd: 'Positive' }, { abo: 'AB', rhd: 'Negative' },
    ];
    return types.map(t => {
      const units = inventory.filter((i: any) => i.abo === t.abo && i.rhd === t.rhd && i.status === 'AVAILABLE');
      const count = units.length;
      const dos = count / 4; 
      
      // Expiry Risk: Percent of units expiring in < 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const expiringSoon = units.filter((u: any) => new Date(u.expiryDate) < sevenDaysFromNow).length;
      const expiryRisk = count > 0 ? (expiringSoon / count) * 100 : 0;
      
      return { ...t, count, dos, expiryRisk, color: getDosColorLevel(dos) };
    });
  }, [inventory]);

  return (
    <div className="flex flex-col h-full gap-6 w-full max-w-[1600px] mx-auto p-4 lg:p-0 overflow-y-auto lg:overflow-hidden">
      {/* Efficiency Stats Bar (T-209) */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-clinical-bg border border-clinical-border px-3 py-2 rounded-lg">
          <TrendingUp size={14} className="text-lime-400" />
          <span className="text-xs text-clinical-muted">Processed</span>
          <span className="text-sm font-bold text-lime-400">{stats.approved}/{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 bg-clinical-bg border border-clinical-border px-3 py-2 rounded-lg">
          <Timer size={14} className="text-amber-400" />
          <span className="text-xs text-clinical-muted">Pending</span>
          <span className={`text-sm font-bold ${stats.submitted > 3 ? 'text-rose-500' : 'text-amber-400'}`}>{stats.submitted}</span>
        </div>
        <div className="flex items-center gap-2 bg-clinical-bg border border-clinical-border px-3 py-2 rounded-lg">
          <Activity size={14} className="text-cyan-400" />
          <span className="text-xs text-clinical-muted">Completion</span>
          <span className="text-sm font-bold text-cyan-400">{stats.rate}%</span>
        </div>
      </div>
      {activeMTP && (
        <div className="bg-rose-950/80 border border-rose-500 rounded-xl p-3 flex justify-between items-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-rose-500 animate-pulse" />
            <div>
              <h2 className="text-rose-600 font-bold text-sm tracking-widest uppercase">Global MTP Alert Active</h2>
              <p className="text-xs text-rose-200">Patient: {activeMTP.patientIdentifier} | Auth: {activeMTP.authorizedClinician}</p>
            </div>
          </div>
          <span className="text-xs bg-rose-900/50 text-rose-300 border border-rose-500/50 px-2 py-1 rounded font-mono">
            {activeMTP.id}
          </span>
        </div>
      )}
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Order Queue */}
        <div className="col-span-12 lg:col-span-4 bg-clinical-bg border border-clinical-border rounded-xl p-4 flex flex-col gap-3 min-h-[500px]">
          <h2 className="text-sm font-bold text-clinical-muted uppercase tracking-widest border-b border-clinical-border pb-2 flex justify-between items-center">
            <span>{t('dh_triage_queue')}</span>
            <div className="flex gap-3 items-center">
              <button onClick={fetchOrders} className={`text-clinical-muted hover:text-lime-400 transition ${isRefreshing ? 'animate-spin' : ''}`}>
                <RefreshCw size={14} />
              </button>
              <span className="text-lime-400 bg-lime-950/50 px-2 rounded-full text-xs flex items-center">{orders.filter(o => o.status === 'SUBMITTED').length} {t('cour_active_jobs')}</span>
            </div>
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {sortedOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedOrder?.id === order.id ? 'bg-clinical-bg border-lime-400/50' : 'bg-clinical-bg border-clinical-border hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center">
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded
                      ${order.priority === 'STAT' ? 'bg-orange-500/20 text-orange-600 border border-orange-500/30' :
                        order.priority === 'MTP' ? 'bg-rose-500/20 text-rose-600 border border-rose-500/30' : 
                        'bg-clinical-card/80 text-clinical-muted'}`}
                    >
                      {getPriorityLabel(order.priority)}
                    </span>
                    <span className={`text-xs font-mono font-bold px-1.5 rounded ${order.hiciScore >= 80 ? 'text-rose-600 bg-rose-950/50' : 'text-lime-400 bg-lime-950/50'}`}>HICI: {order.hiciScore}</span>
                  </div>
                  <span className="text-xs text-clinical-muted font-mono">{order.id}</span>
                </div>
                <div className="font-semibold text-clinical-text text-sm flex justify-between">
                  <span>{order.hospital}</span>
                  {order.status === 'APPROVED' && <span className="text-lime-400 flex items-center gap-1 text-xs"><CheckCircle2 size={12}/> {t('wh_handover_complete') || 'Approved'}</span>}
                </div>
                <div className="text-clinical-muted text-xs mt-1 truncate">
                  {order.items.map(i => `${i.qty}x ${i.product}`).join(', ')}
                </div>
                {/* SLA Countdown (T-206) */}
                {order.status === 'SUBMITTED' && (() => {
                  const sla = getSlaInfo(order);
                  return (
                    <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-mono ${sla.color}`}>
                      <Timer size={10} /> SLA: {sla.label} remaining
                    </div>
                  );
                })()}
              </div>
            ))}
            {orders.length === 0 && <div className="text-clinical-muted text-sm italic text-center py-8">{t('wh_queue_empty')}</div>}
          </div>
        </div>

        {/* Workspace / HITL */}
        <div className="col-span-12 lg:col-span-5 bg-clinical-bg border border-clinical-border rounded-xl p-4 flex flex-col">
          <h2 className="text-sm font-bold text-clinical-muted uppercase tracking-widest border-b border-clinical-border pb-2 mb-4 flex gap-2">
            <Activity size={16}/> {t('dh_hitl_workspace')}
          </h2>
          
          {!selectedOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-clinical-border border-dashed rounded-lg bg-clinical-bg/50">
               <GitCommitHorizontal size={32} className="text-clinical-muted mb-3"/>
               <p className="text-clinical-muted text-sm">{t('dh_hitl_select_desc')}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-clinical-bg p-3 rounded-lg border border-clinical-border">
                <div className="flex justify-between text-sm text-clinical-muted mb-1">
                  <span>{t('dh_ref')}: {selectedOrder.id}</span>
                  <span>{new Date(selectedOrder.submittedAt || '').toLocaleTimeString()}</span>
                </div>
                <h3 className="text-lg font-bold text-clinical-text mb-2">{selectedOrder.hospital}</h3>
                <div className="space-y-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={`${item.id || item.product}-${idx}`} className="flex justify-between items-center text-sm bg-clinical-bg p-2 rounded">
                       <span className="text-lime-400 font-semibold">{item.product}</span>
                       <span className="text-clinical-muted">{t('lims_col_volume') || 'Requested'}: {item.qty} {t('cour_units')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Proposal */}
              <div className="bg-lime-950/20 p-3 rounded-lg border border-lime-900/40 mt-2">
                <h4 className="text-xs font-bold text-lime-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Activity size={12}/> {t('dh_ai_proposal', { score: String(selectedOrder.hiciScore) })}
                </h4>
                <div className="grid grid-cols-2 gap-2 mb-3 bg-clinical-bg/50 p-2 rounded border border-lime-900/30">
                  <div className="text-xs text-clinical-muted">{t('dh_demand_risk')}: <span className="text-clinical-text">{selectedOrder.rationale?.demandRisk || 'N/A'}</span></div>
                  <div className="text-xs text-clinical-muted">{t('dh_scarcity_risk')}: <span className="text-clinical-text">{selectedOrder.rationale?.regionalScarcityRisk || 'N/A'}</span></div>
                  <div className="text-xs text-clinical-muted">{t('dh_lead_time_risk')}: <span className="text-clinical-text">{selectedOrder.rationale?.leadTimeRisk || 'N/A'}</span></div>
                  <div className="text-xs text-clinical-muted">{t('dh_confidence')}: <span className="text-lime-400">{selectedOrder.rationale?.confidence || 'High'}</span></div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                   <div className={`h-1.5 flex-1 rounded-full bg-clinical-card overflow-hidden`}>
                      <div className={`h-full bg-lime-500`} style={{ width: '100%' }}></div>
                   </div>
                   <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest">{t('dh_fefo_match')}</span>
                </div>
                <p className="text-clinical-muted text-sm mb-3">
                   {selectedOrder.hiciScore >= 70 ? 'Critical priority detected. ' : ''}
                   Suggested fulfilling <strong>100%</strong> of requested amount from Central Hub reserve.
                   <span className="text-rose-600 text-[10px] block mt-1 font-bold uppercase tracking-widest">{t('dh_fefo_risk_warning')}</span>
                </p>
                <div className="flex justify-between items-center border-t border-lime-900/40 pt-2 flex-wrap gap-2">
                  <span className="text-xs text-clinical-muted hidden sm:inline-block">{t('dh_approval_req')}</span>
                  {selectedOrder.status !== 'APPROVED' && selectedOrder.status !== 'DISPATCHED' ? (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-clinical-bg text-clinical-muted rounded text-xs hover:bg-clinical-card/80 transition">Partial...</button>
                      <button onClick={handleApprove} className="px-3 py-1 bg-lime-400 hover:bg-lime-400 text-clinical-text rounded font-bold text-xs shadow transition">{t('dh_btn_approve')}</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-lime-400 font-bold text-sm flex items-center gap-1"><CheckCircle2 size={16}/> {t('wh_handover_complete') || 'Authorized'}</span>
                      {selectedOrder.status === 'APPROVED' && (
                        <button 
                          onClick={handleRevert}
                          className="px-2 py-1 bg-rose-950/30 text-rose-500 border border-rose-900/50 rounded text-[10px] font-black uppercase tracking-widest hover:bg-rose-900 hover:text-clinical-text transition-all"
                        >
                          Undo Approval
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Override / Exception */}
              {selectedOrder.priority === 'STAT' && selectedOrder.status !== 'APPROVED' && selectedOrder.status !== 'REVIEW_PENDING' && (
                <div className="mt-auto bg-orange-950/20 p-3 rounded-lg border border-orange-900/30">
                  <div className="flex gap-2 items-center text-orange-600 text-sm font-bold mb-1">
                     <AlertCircle size={14}/> STAT Request Notice
                  </div>
                  <p className="text-xs text-orange-300/80 mb-2">This request bypasses standard routing. Overrides require dual review logs.</p>
                  <button 
                    onClick={handleEscalate}
                    className="w-full py-1.5 border border-orange-800 text-orange-600 rounded text-xs hover:bg-orange-900/40 transition"
                  >
                    {t('dh_btn_escalate')}
                  </button>
                </div>
              )}
              {selectedOrder.status === 'REVIEW_PENDING' && (
                <div className="mt-auto bg-purple-950/20 p-3 rounded-lg border border-purple-900/30">
                  <div className="flex gap-2 items-center text-purple-600 text-sm font-bold mb-1">
                     <Activity size={14}/> {t('ui_idm_review') || 'Escalated to Medical Reviewer'}
                  </div>
                  <p className="text-xs text-purple-300/80">{t('dh_escalated_msg', { reason: selectedOrder.escalationReason || 'STAT Override' })}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Regional Overview */}
        <div className="col-span-12 lg:col-span-3 bg-clinical-bg border border-clinical-border rounded-xl p-4 flex flex-col">
          <h2 className="text-sm font-bold text-clinical-muted uppercase tracking-widest border-b border-clinical-border pb-2 mb-4">
            {t('dh_heatmap_title')}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {heatmapData.map(item => {
              const cls = COLOR_CLASSES[item.color];
              return (
                <div key={`${item.abo}-${item.rhd}`} className={`p-2.5 rounded-lg border ${cls.border} ${cls.bg} text-center`}>
                  <div className={`${cls.text} font-bold text-sm`}>{item.abo} {item.rhd === 'Positive' ? '+' : '-'}</div>
                  <div className={`${cls.text} font-mono text-lg font-bold`}>{item.count}</div>
                  <div className="flex justify-between items-center mt-1">
                     <span className="text-[8px] text-clinical-muted uppercase font-black">{item.dos.toFixed(1)} DOS</span>
                     {item.expiryRisk > 20 && <span className="text-[8px] text-rose-500 font-black animate-pulse">{t('dh_heatmap_exp')}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scarcity Alert */}
          {heatmapData.some(h => h.color === 'red') && (
             <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg mt-3">
                <div className="text-rose-600 text-xs font-bold uppercase tracking-wide mb-1 flex gap-1 items-center">
                  <ShieldAlert size={14}/> {t('dh_scarcity_alert')}
                </div>
                <div className="text-sm text-rose-200">
                  {heatmapData.filter(h => h.color === 'red').map(h => `${h.abo} ${h.rhd === 'Positive' ? '+' : '-'}`).join(', ')} {t('dh_heatmap_alert')}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
