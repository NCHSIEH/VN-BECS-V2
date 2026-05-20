import { useState, useEffect } from "react";
import { Stethoscope, CheckCircle2, AlertTriangle } from "lucide-react";
import { Order } from "../types";

export function MedicalReviewerView() {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = () => {
    fetch('/api/v1/orders')
      .then(res => res.json())
      .then(data => setOrders(data.filter((o: Order) => o.status === 'REVIEW_PENDING')))
      .catch(console.error);
  };

  useEffect(() => {
    fetchOrders();
    const int = setInterval(fetchOrders, 3000);
    return () => clearInterval(int);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/v1/orders/${id}/medical-approve`, { method: 'POST' });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-7xl mx-auto w-full">
      <div className="bg-[#020617] border border-slate-700 rounded-xl p-4 flex flex-col h-full">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Stethoscope size={18} className="text-purple-500" />
            Medical Review Board (Dual Review)
          </h2>
          <span className="text-xs bg-purple-950/50 text-purple-500 border border-purple-900/50 px-2 py-1 rounded font-mono">
            {orders.length} Pending
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
             <CheckCircle2 size={48} className="mb-4 text-lime-900" />
             <p>No escalated orders pending review.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
            {orders.map(order => (
              <div key={order.id} className="bg-[#020617] border border-purple-900/40 rounded-lg p-5 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <div className="flex gap-2 items-center mb-1">
                        <span className="text-xs font-mono font-bold text-slate-500">{order.id}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {order.priority}
                        </span>
                     </div>
                     <h3 className="text-lg font-bold text-slate-300">{order.hospital}</h3>
                   </div>
                   <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1">Requested Items</div>
                      {order.items.map(item => (
                        <div key={item.id} className="text-sm font-mono text-lime-400">
                          {item.qty}x {item.product}
                        </div>
                      ))}
                   </div>
                 </div>
                 
                 <div className="bg-purple-950/20 p-3 rounded border border-purple-900/30 flex items-start gap-3 mb-4">
                    <AlertTriangle size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Dispatcher Escalation Note</div>
                      <p className="text-sm text-purple-200">{order.escalationReason}</p>
                    </div>
                 </div>

                 <div className="flex gap-3 justify-end border-t border-slate-700 pt-4 mt-2">
                    <button className="px-4 py-2 border border-rose-900 text-rose-600 hover:bg-rose-950/30 rounded text-sm font-semibold transition">
                       Reject
                    </button>
                    <button 
                       onClick={() => handleApprove(order.id)}
                       className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded shadow-lg text-sm font-bold transition"
                    >
                       Approve Exception
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
