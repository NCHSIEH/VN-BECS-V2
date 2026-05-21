import React, { useState, useEffect } from "react";
import { ScanBarcode, PackageCheck, AlertOctagon, CheckCircle, Database, Package, RefreshCcw, ArrowRight, ShieldCheck, Activity, Globe } from "lucide-react";
import { Order } from "../types";
import { validateISBT128 } from "../lib/bloodSafety";
import { useI18n } from "../lib/i18n";
import { motion } from "framer-motion";

export function WarehouseView() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [scanResult, setScanResult] = useState<{status: 'success' | 'error', message: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'INVENTORY' | 'RESOURCES'>('DISPATCH');
  const [inventory, setInventory] = useState<any[]>([]);

  const fetchData = () => {
    fetch('/api/v1/orders')
      .then(res => res.json())
      .then(data => {
         setOrders(data.filter((o: Order) => o.status === 'APPROVED' || o.status === 'DISPATCHED'));
         if (selectedOrder) {
            const updated = data.find((o: Order) => o.id === selectedOrder.id);
            setSelectedOrder(updated || null);
         }
      })
      .catch(console.error);
      
    fetch('/api/v1/inventory')
      .then(res => res.json())
      .then(setInventory)
      .catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !scannedCode) return;
    setScanResult(null);

    const isbtCheck = validateISBT128(scannedCode);
    if (!isbtCheck.valid) {
       setScanResult({ status: 'error', message: `🚨 ${isbtCheck.error!} (掃描內容：${scannedCode})` });
       return;
    }

    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scannedCode })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setScanResult({ status: 'error', message: data.message });
      } else {
        const handoverToken = Math.floor(1000 + Math.random() * 9000).toString();
        setScanResult({ 
          status: 'success', 
          message: `✅ Verification Complete. ISBT ${scannedCode} assigned. Handover Token: ${handoverToken}` 
        });
        setSelectedOrder(data);
        fetchData();
      }
      setScannedCode("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-clinical-bg overflow-hidden">
      {/* Top Decorative Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-sky-500 to-amber-500 shrink-0" />

      {/* Active Mission Banner */}
      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-10 py-4 flex items-center justify-between group backdrop-blur-xl shrink-0">
         <div className="flex items-center gap-6">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] italic">Logistics Command</span>
               <span className="text-sm font-black text-clinical-text uppercase italic tracking-tighter">Central Hub Inventory Dispatch</span>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">Cold Chain Integrity</span>
               <div className="flex items-center gap-3 mt-1">
                  <div className="h-1.5 w-48 bg-clinical-card rounded-full overflow-hidden p-0.5 border border-clinical-border shadow-inner">
                     <div className="h-full bg-emerald-500 w-[94%] shadow-[0_0_10px_rgba(16,185,129,0.6)] rounded-full transition-all duration-1000" />
                  </div>
                  <span className="text-[10px] font-black text-clinical-text">94%</span>
               </div>
            </div>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Sidebar */}
        <div className="w-96 bg-clinical-bg/50 border-r border-clinical-border flex flex-col shrink-0 p-8 gap-8 overflow-y-auto custom-scrollbar">
           <div className="space-y-2">
              <h2 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] mb-6">Fulfillment Hub</h2>
              {[
                { id: 'DISPATCH', label: '1. Picking Queue', icon: <PackageCheck size={20} />, color: 'emerald' },
                { id: 'INVENTORY', label: '2. Hub Directory', icon: <Database size={20} />, color: 'sky' },
                { id: 'RESOURCES', label: '3. Asset Management', icon: <Package size={20} />, color: 'amber' },
              ].map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => setActiveTab(stage.id as any)}
                  className={`w-full flex items-center justify-between p-6 rounded-[28px] transition-all group relative overflow-hidden ${
                    activeTab === stage.id 
                      ? 'bg-clinical-card text-clinical-text border border-clinical-border shadow-2xl scale-[1.02]'
                      : 'text-clinical-muted hover:text-clinical-muted hover:bg-clinical-card/30'
                  }`}
                >
                  <div className="flex items-center gap-5 relative z-10">
                     <div className={`transition-colors ${activeTab === stage.id ? 'text-emerald-500' : 'text-clinical-text'}`}>
                        {stage.icon}
                     </div>
                     <span className="text-[14px] font-black uppercase italic tracking-tight">{stage.label}</span>
                  </div>
                  {activeTab === stage.id && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse relative z-10" />}
                </button>
              ))}
           </div>

           <div className="mt-auto space-y-6">
              <div className="bg-clinical-bg p-6 rounded-[32px] border border-clinical-border shadow-inner">
                 <p className="text-[10px] font-black text-clinical-muted uppercase tracking-widest mb-4">Network Health</p>
                 <div className="flex gap-4">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">Units Ready</span>
                       <span className="text-xl font-black text-emerald-500">{inventory.length}</span>
                    </div>
                    <div className="w-px h-8 bg-clinical-bg mt-2" />
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">Pending Orders</span>
                       <span className="text-xl font-black text-sky-500">{orders.filter(o => o.status === 'APPROVED').length}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Operational Viewport */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-clinical-bg/20">
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-right-12 duration-1000">
            
            {/* Contextual Header */}
            <div className="flex justify-between items-end border-b border-clinical-border pb-12">
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                     <p className="text-clinical-muted text-[11px] font-black uppercase tracking-[0.5em]">VN-HUB-NODE-01</p>
                  </div>
                  <h1 className="premium-heading">
                    {activeTab === 'DISPATCH' && 'Picking & Verification'}
                    {activeTab === 'INVENTORY' && 'Inventory Directory'}
                    {activeTab === 'RESOURCES' && 'Asset Oversight'}
                  </h1>
               </div>
               <div className="flex gap-4">
                  <button onClick={fetchData} className="p-4 bg-clinical-card border border-clinical-border text-clinical-muted hover:text-clinical-text rounded-[20px] transition-all">
                     <RefreshCcw size={20} />
                  </button>
               </div>
            </div>

            {/* Content Logic */}
            <div className="space-y-12">
              {activeTab === 'DISPATCH' && (
                <div className="flex flex-col lg:flex-row gap-12">
                   {/* Left: Queue */}
                   <div className="w-full lg:w-1/3 space-y-6">
                      <h3 className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] mb-4">Pending Requests</h3>
                      <div className="space-y-4">
                        {orders.map(order => (
                          <button 
                            key={order.id} 
                            onClick={() => {setSelectedOrder(order); setScanResult(null); setScannedCode("");}}
                            className={`w-full p-6 rounded-[32px] border text-left transition-all ${
                              selectedOrder?.id === order.id ? 'bg-clinical-card border-emerald-500 shadow-2xl scale-[1.02]' : 'bg-clinical-bg/30 border-clinical-border hover:border-clinical-border'
                            }`}
                          >
                             <div className="flex justify-between items-start mb-4">
                                <span className="font-mono font-black text-clinical-muted text-sm italic">{order.id}</span>
                                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${
                                  order.status === 'DISPATCHED' ? 'bg-sky-950/30 text-sky-500 border-sky-900/30' : 'bg-emerald-950/30 text-emerald-500 border-emerald-900/30'
                                }`}>{order.status}</span>
                             </div>
                             <p className="text-clinical-text font-black uppercase italic tracking-tight text-lg mb-1">{order.hospital}</p>
                             <p className="text-[10px] text-clinical-muted font-bold uppercase tracking-widest">{order.priority} PRIORITY</p>
                          </button>
                        ))}
                        {orders.length === 0 && (
                          <div className="p-20 text-center border-2 border-dashed border-clinical-border rounded-[40px] text-clinical-text uppercase font-black text-[10px] tracking-widest italic">Queue Empty</div>
                        )}
                      </div>
                   </div>

                   {/* Right: Verification Station */}
                   <div className="flex-1">
                      {!selectedOrder ? (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-clinical-border rounded-[48px] p-20 text-clinical-text group">
                           <PackageCheck size={64} className="mb-6 opacity-20 group-hover:opacity-40 transition-opacity" />
                           <p className="font-black uppercase tracking-widest text-[10px] italic">Select Order for Verification</p>
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="clinical-card p-12 space-y-10"
                        >
                           <div className="flex justify-between items-start">
                              <div>
                                 <h2 className="text-3xl font-black text-clinical-text italic uppercase tracking-tight">{selectedOrder.id}</h2>
                                 <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">Scanning Unit Handover</p>
                              </div>
                              <div className="w-16 h-16 rounded-[24px] bg-clinical-bg border border-clinical-border flex items-center justify-center text-clinical-muted">
                                 <ScanBarcode size={32} />
                              </div>
                           </div>

                           <div className="bg-clinical-bg/50 border border-clinical-border p-8 rounded-[32px] space-y-6">
                              <h4 className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">Required Components</h4>
                              {selectedOrder.items.map(item => (
                                <div key={item.id} className="flex flex-col gap-4">
                                   <div className="flex justify-between items-end">
                                      <span className="text-2xl font-black text-clinical-text italic">{item.qty}x {item.product}</span>
                                      <span className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{item.abo} {item.rhd}</span>
                                   </div>
                                   {selectedOrder.allocatedUnits && (
                                     <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                           <span className="font-mono text-emerald-500 font-black text-lg tracking-widest">{selectedOrder.allocatedUnits.join(', ')}</span>
                                        </div>
                                        <button 
                                          onClick={() => setScannedCode(selectedOrder.allocatedUnits![0])}
                                          className="text-[10px] font-black text-emerald-500 hover:text-emerald-600 transition-colors uppercase tracking-widest"
                                        >
                                          AUTO-FILL
                                        </button>
                                     </div>
                                   )}
                                </div>
                              ))}
                           </div>

                           {selectedOrder.status === 'DISPATCHED' ? (
                             <div className="bg-emerald-500/10 border border-emerald-500/30 p-10 rounded-[32px] flex flex-col items-center gap-6">
                                <CheckCircle size={48} className="text-emerald-500" />
                                <div className="text-center">
                                   <h3 className="text-2xl font-black text-clinical-text uppercase italic italic">Handover Complete</h3>
                                   <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-2">Transitioning to cold-chain logistics</p>
                                </div>
                             </div>
                           ) : (
                             <form onSubmit={handleScan} className="space-y-6">
                                <div className="relative">
                                   <ScanBarcode className="absolute left-6 top-1/2 -translate-y-1/2 text-clinical-muted" size={28} />
                                   <input
                                     autoFocus
                                     type="text"
                                     value={scannedCode}
                                     onChange={e => setScannedCode(e.target.value)}
                                     placeholder="Scan ISBT-128 Unit Barcode..."
                                     className="clinical-input pl-16 py-8 text-2xl font-mono tracking-widest text-emerald-500"
                                   />
                                </div>
                                <button type="submit" className="clinical-btn-primary w-full py-8 text-lg">
                                   Verify & Dispatch <ArrowRight size={24} />
                                </button>
                             </form>
                           )}

                           {scanResult && (
                             <div className={`p-8 rounded-[32px] border flex gap-6 items-center ${
                               scanResult.status === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                             }`}>
                                {scanResult.status === 'error' ? <AlertOctagon size={28} /> : <CheckCircle size={28} />}
                                <span className="font-black text-lg italic uppercase">{scanResult.message}</span>
                             </div>
                           )}
                        </motion.div>
                      )}
                   </div>
                </div>
              )}

              {activeTab === 'INVENTORY' && (
                <div className="space-y-8 animate-in fade-in duration-700">
                   <div className="overflow-hidden rounded-[40px] border border-clinical-border bg-clinical-card/10 shadow-2xl">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-clinical-bg/50 text-clinical-muted text-[10px] font-black uppercase tracking-[0.3em] border-b border-clinical-border">
                         <tr>
                           <th className="p-8">ISBT Barcode</th>
                           <th className="p-8">Blood Type</th>
                           <th className="p-8">Product</th>
                           <th className="p-8">Status</th>
                           <th className="p-8 text-right">Expiry</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-clinical-border">
                         {inventory.map(inv => {
                           const isExpired = new Date(inv.expiryDate) < new Date();
                           return (
                             <tr key={inv.unitId} className="hover:bg-clinical-bg transition-all group">
                               <td className="p-8">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-xl bg-clinical-bg flex items-center justify-center text-sky-500 border border-clinical-border">
                                        <Database size={16} />
                                     </div>
                                     <span className="font-mono font-black text-clinical-text text-lg italic tracking-tighter">{inv.unitId}</span>
                                  </div>
                               </td>
                               <td className="p-8">
                                  <span className="bg-clinical-bg text-clinical-text px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest border border-clinical-border">
                                    {inv.abo} {inv.rhd === 'Positive' ? '+' : '-'}
                                  </span>
                               </td>
                               <td className="p-8 text-clinical-muted font-bold uppercase text-[11px] tracking-widest">{inv.productCode}</td>
                               <td className="p-8">
                                  <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    inv.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-clinical-card text-clinical-muted border-clinical-border'
                                  }`}>{inv.status}</span>
                               </td>
                               <td className="p-8 text-right font-mono text-clinical-muted text-[13px]">{new Date(inv.expiryDate).toLocaleDateString()}</td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}

              {activeTab === 'RESOURCES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in duration-700">
                   {[
                     { name: 'Triple Blood Bag (450ml)', stock: 1250, min: 500, unit: 'PCS', status: 'Optimal' },
                     { name: 'Quadruple Blood Bag (450ml)', stock: 120, min: 200, unit: 'PCS', status: 'Low Stock' },
                     { name: 'Transport Validation Box', stock: 45, min: 10, unit: 'Units', status: 'Optimal' },
                     { name: 'Cold Chain Data Logger', stock: 82, min: 50, unit: 'Units', status: 'Optimal' },
                     { name: 'Safety Seals (Red)', stock: 2400, min: 1000, unit: 'PCS', status: 'Optimal' },
                     { name: 'Biohazard Disposal Bags', stock: 350, min: 500, unit: 'PCS', status: 'Alert' },
                   ].map((res, i) => (
                     <div key={i} className="clinical-card p-10 group hover:border-amber-500/30 transition-all">
                        <div className="flex justify-between items-start mb-8">
                           <div className="w-16 h-16 rounded-[24px] bg-clinical-bg border border-clinical-border flex items-center justify-center text-clinical-muted group-hover:text-amber-500 transition-all">
                              <Package size={32} />
                           </div>
                           <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                             res.status === 'Optimal' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                             res.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                           }`}>{res.status}</span>
                        </div>
                        <h3 className="text-xl font-black text-clinical-text italic uppercase tracking-tight mb-2">{res.name}</h3>
                        <div className="flex items-baseline gap-3 mt-6">
                           <span className="text-5xl font-black italic tracking-tighter text-clinical-text">{res.stock}</span>
                           <span className="text-[11px] font-black text-clinical-muted uppercase tracking-widest">{res.unit}</span>
                        </div>
                        <div className="mt-8 h-2 w-full bg-clinical-bg rounded-full overflow-hidden border border-clinical-border shadow-inner">
                           <div className={`h-full ${res.stock < res.min ? 'bg-rose-600' : 'bg-emerald-600'} transition-all duration-1000`} style={{ width: `${Math.min(100, (res.stock / (res.min * 2)) * 100)}%` }} />
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
