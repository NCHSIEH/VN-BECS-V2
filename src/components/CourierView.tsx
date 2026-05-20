import { useState, useEffect, useMemo } from "react";
import { Truck, MapPin, Thermometer, CheckCircle, Navigation, ShieldCheck, AlertTriangle, TrendingUp, History, Package } from "lucide-react";
import { Order } from "../types";

/** Mini sparkline for temperature history */
function TempSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = 2.0;
  const max = 6.0;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 120},${30 - ((v - min) / (max - min)) * 30}`).join(' ');
  return (
    <svg width="120" height="30" className="overflow-visible">
      <polyline fill="none" stroke="#fbbf24" strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CourierView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [temperature, setTemperature] = useState(4.2);
   const [tempHistory, setTempHistory] = useState<number[]>([4.0, 4.1, 4.2, 4.3, 4.2]);
   const [violationMinutes, setViolationMinutes] = useState(0);

   const wastageProbability = useMemo(() => {
      if (violationMinutes === 0 && temperature <= 6.0) return 2;
      // Probability increases with violation time and temperature height
      const timeFactor = Math.min(60, violationMinutes) * 1.5;
      const tempFactor = Math.max(0, temperature - 6.0) * 10;
      return Math.min(100, Math.floor(timeFactor + tempFactor));
   }, [violationMinutes, temperature]);

  const fetchOrders = () => {
    fetch('/api/v1/orders')
      .then(res => res.json())
      .then(data => setOrders(data.filter((o: Order) => o.status === 'DISPATCHED' || o.status === 'IN_TRANSIT')))
      .catch(console.error);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
       setTemperature(prev => {
          // Normal fluctuation
          let change = (Math.random() - 0.5) * 0.4;
          
          // Simulation: Occasional spike to test wastage logic
          if (Math.random() > 0.95) change = 2.5; 
          
          const next = Math.max(1.5, Math.min(12.0, prev + change));
          
          setTempHistory(h => [...h.slice(-19), next]);
          
          if (next > 6.0 || next < 2.0) {
             setViolationMinutes(v => v + 1);
          } else {
             setViolationMinutes(0);
          }
          
          return next;
       });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isWasted = violationMinutes >= 10 || temperature > 10.0;

  const handleStartTransit = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/transit`, { method: 'POST' });
      if (res.ok) fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const [handoverCode, setHandoverCode] = useState("");
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  const handleDeliver = async () => {
    if (!selectedOrder || handoverCode.length !== 4) return;
    try {
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/deliver`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoverCode })
      });
      if (res.ok) {
         fetchOrders();
         setSelectedOrder(null);
         setShowHandoverModal(false);
         setHandoverCode("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWastageReport = async () => {
    if (!selectedOrder) return;
    if (confirm("CRITICAL: Confirm wastage of this entire shipment due to cold chain breach?")) {
       try {
          await fetch(`/api/v1/orders/${selectedOrder.id}/waste`, { method: 'POST' });
          fetchOrders();
          setSelectedOrder(null);
          setViolationMinutes(0);
       } catch (e) {}
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full overflow-y-auto lg:overflow-hidden p-4 lg:p-0 animate-in fade-in duration-500">
      {/* Task List */}
      <div className="w-full lg:w-1/3 bg-[#020617] border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
           <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex gap-3 items-center">
             <Truck size={16} className="text-sky-500"/> Transport Ops
           </h2>
           <span className="bg-sky-500/10 text-sky-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{orders.length} Active</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {orders.map(order => (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrder(order)}
              className={`p-4 rounded-2xl border transition-all group ${
                selectedOrder?.id === order.id ? 'bg-slate-900 border-sky-500 shadow-xl shadow-sky-900/20' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-[10px] font-black text-slate-500 tracking-widest">{order.id}</span>
                <span className={`text-[9px] uppercase font-black px-2 py-1 rounded-lg border ${
                  order.status === 'IN_TRANSIT' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                }`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <h4 className="font-black text-white text-sm uppercase tracking-tight group-hover:text-sky-400 transition-colors">{order.hospital}</h4>
              <div className="flex items-center gap-4 mt-4">
                 <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    <Package size={12} /> {order.allocatedUnits?.length || 1} units
                 </div>
                 <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    <History size={12} /> {order.priority}
                 </div>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
             <div className="flex flex-col items-center justify-center py-12 text-slate-600 border border-slate-800 border-dashed rounded-3xl">
                <Truck size={32} className="mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">No active transport jobs</p>
             </div>
          )}
        </div>
      </div>

      {/* Tracking & Telemetry View */}
      <div className="flex-1 bg-[#020617] border border-slate-800 rounded-2xl p-8 flex flex-col shadow-2xl relative overflow-hidden">
        {!selectedOrder ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 bg-slate-900 rounded-[32px] flex items-center justify-center text-slate-700 mb-6 border border-slate-800">
                <MapPin size={40} />
             </div>
             <h3 className="text-xl font-black text-slate-400 uppercase italic tracking-tighter">Telematics Standby</h3>
             <p className="text-slate-600 text-xs font-medium mt-2 max-w-xs uppercase tracking-widest">Select a transport job to initiate real-time telemetry monitoring.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full mx-auto w-full max-w-3xl">
             <div className="flex justify-between items-start mb-8 border-b border-slate-800 pb-8">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                     <span className="px-3 py-1 bg-sky-500/10 text-sky-500 border border-sky-500/30 rounded-full text-[9px] font-black uppercase tracking-widest">Live Courier Feed</span>
                     <span className="text-slate-700">•</span>
                     <span className="font-mono text-[10px] text-slate-500 font-black">{selectedOrder.id}</span>
                  </div>
                  <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">{selectedOrder.hospital}</h2>
                  <p className="text-slate-500 text-sm flex items-center gap-2 mt-2 font-bold uppercase tracking-widest"><MapPin size={16} className="text-sky-500"/> Vietnam National Transit Network</p>
               </div>
               
               <div className={`p-6 rounded-[32px] border flex flex-col items-center justify-center min-w-[180px] shadow-2xl transition-all duration-500 ${
                  temperature > 6.0 || temperature < 2.0 
                  ? 'bg-rose-500/10 border-rose-500 text-rose-500 animate-pulse' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
               }`}>
                  <div className="flex items-center gap-3 font-black text-3xl italic tracking-tighter">
                     <Thermometer size={32}/> {temperature.toFixed(1)}°C
                  </div>
                  <div className="flex items-center gap-2 mt-3 mb-4">
                     <TempSparkline data={tempHistory} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Cold Chain Integrity</div>
               </div>
             </div>

             {/* Violation Alert */}
             {(temperature > 6.0 || temperature < 2.0) && (
                <div className="mb-8 p-6 bg-rose-500 rounded-3xl text-white flex items-center gap-6 animate-in shake duration-500 shadow-xl shadow-rose-900/40">
                   <AlertTriangle size={40} className="shrink-0" />
                   <div className="flex-1">
                      <p className="font-black text-[10px] uppercase tracking-[0.3em] italic mb-1 opacity-80">Safety Violation</p>
                      <h4 className="font-black text-lg leading-tight">CRITICAL TEMPERATURE BREACH</h4>
                      <p className="text-xs font-bold opacity-90 mt-1">
                         Current value {temperature.toFixed(1)}°C is outside RBC safe range (2°C - 6°C). 
                         {violationMinutes > 0 && ` Duration: ${violationMinutes}s.`}
                      </p>
                   </div>
                   {isWasted && (
                      <div className="bg-black/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                         WASTAGE IMMINENT
                      </div>
                   )}
                </div>
             )}

             {/* Telemetry Grid */}
             <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-900/20 border border-slate-800 p-6 rounded-3xl flex flex-col justify-center">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={12}/> Route Efficiency</p>
                   <p className="text-2xl font-black text-white italic tracking-tighter">98.4% <span className="text-[10px] text-emerald-500 not-italic">Optimal</span></p>
                </div>
                <div className="bg-slate-900/20 border border-slate-800 p-6 rounded-3xl flex flex-col justify-center">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Navigation size={12}/> Estimated Arrival</p>
                   <p className="text-2xl font-black text-white italic tracking-tighter">14 <span className="text-[10px] text-slate-500 not-italic">MINUTES</span></p>
                </div>
                <div className="bg-slate-900/20 border border-slate-800 p-6 rounded-3xl flex flex-col justify-center col-span-2">
                   <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={12}/> AI Wastage Probability</p>
                      <span className={`text-[10px] font-black uppercase ${wastageProbability > 50 ? 'text-rose-500' : wastageProbability > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                         {wastageProbability > 50 ? 'High Risk' : wastageProbability > 20 ? 'Elevated' : 'Safe'}
                      </span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${wastageProbability > 50 ? 'bg-rose-500' : wastageProbability > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                           style={{ width: `${wastageProbability}%` }} 
                         />
                      </div>
                      <span className="text-xl font-black text-white italic tracking-tighter">{wastageProbability}%</span>
                   </div>
                </div>
             </div>

             {/* Action Bar */}
             <div className="mt-auto pt-8 border-t border-slate-800">
               {isWasted ? (
                  <button 
                    onClick={handleWastageReport}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-6 rounded-[32px] flex items-center justify-center gap-4 transition-all shadow-xl shadow-rose-900/40 uppercase text-xs tracking-[0.3em] italic"
                  >
                    <AlertTriangle size={24} /> Report Shipment Wastage (Safety Block)
                  </button>
               ) : (
                  <div className="flex gap-6">
                    {selectedOrder.status === 'DISPATCHED' && (
                      <button onClick={handleStartTransit} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-black py-6 rounded-[32px] transition-all shadow-xl shadow-sky-900/40 uppercase text-xs tracking-[0.3em] italic">
                        Verify & Initiate Transit
                      </button>
                    )}
                    {selectedOrder.status === 'IN_TRANSIT' && (
                      <button 
                        onClick={() => setShowHandoverModal(true)} 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-[32px] flex items-center justify-center gap-4 transition-all shadow-xl shadow-emerald-900/40 uppercase text-xs tracking-[0.3em] italic"
                      >
                        <ShieldCheck size={24} /> Complete Secure Handover
                      </button>
                    )}
                  </div>
               )}
             </div>
          </div>
        )}
      </div>

      {/* Handover Verification Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="clinical-card bg-slate-900 border-emerald-500/30 w-full max-w-sm p-10 shadow-[0_0_150px_rgba(16,185,129,0.15)] rounded-[40px]">
             <div className="text-center mb-10">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-inner">
                   <ShieldCheck size={40} />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Chain of Custody</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Hospital Recipient PIN Required</p>
             </div>

             <div className="space-y-8">
                <div>
                   <input 
                     autoFocus
                     type="text" 
                     maxLength={4}
                     value={handoverCode}
                     onChange={(e) => setHandoverCode(e.target.value.replace(/\D/g, ''))}
                     className="w-full bg-slate-950 border-2 border-slate-800 text-emerald-400 text-center text-5xl font-black tracking-[0.5em] py-8 rounded-3xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner placeholder:opacity-10"
                     placeholder="----"
                   />
                </div>
                
                <div className="flex flex-col gap-4">
                   <button 
                     onClick={handleDeliver}
                     disabled={handoverCode.length !== 4}
                     className="w-full bg-emerald-600 disabled:opacity-30 text-white py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all"
                   >
                     Authorize Release
                   </button>
                   <button onClick={() => setShowHandoverModal(false)} className="w-full py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-all">Cancel Operation</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
