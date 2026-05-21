import React from 'react';
import { Barcode, Thermometer, Calendar } from 'lucide-react';

interface UnitCardProps {
  barcode: string;
  abo: string;
  rhd: string;
  product: string;
  expiry: string;
  temp?: number;
  status: 'Ready' | 'Reserved' | 'Quarantine' | 'Waste';
  isIrradiated?: boolean;
  isCmvNegative?: boolean;
}

export function UnitCard({ barcode, abo, rhd, product, expiry, temp, status, isIrradiated, isCmvNegative }: UnitCardProps) {
  const statusColors = {
    Ready: 'bg-transparent text-emerald-600 border-emerald-100',
    Reserved: 'bg-transparent text-sky-600 border-sky-100',
    Quarantine: 'bg-transparent text-amber-600 border-amber-100',
    Waste: 'bg-transparent text-rose-600 border-rose-100',
  };

  return (
    <div className="clinical-card p-5 flex flex-col gap-4 group transition-all hover:scale-[1.02] cursor-pointer bg-transparent">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <Barcode size={14} />
            <span className="text-[10px] font-mono font-bold tracking-widest">{barcode}</span>
          </div>
          <h3 className="text-lg font-black text-clinical-text uppercase italic leading-tight">{product}</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[status]}`}>
          {status}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-14 h-14 bg-transparent rounded-2xl flex flex-col items-center justify-center border border-slate-100 shadow-inner">
          <span className="text-xl font-black text-clinical-primary leading-none">{abo}</span>
          <span className="text-[8px] font-bold text-slate-600 mt-1">{rhd === 'Positive' ? 'RhD+' : 'RhD-'}</span>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Calendar size={10} /> Expiry
            </span>
            <span className="text-xs font-bold text-slate-600">{new Date(expiry).toLocaleDateString()}</span>
          </div>
          {temp !== undefined && (
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Thermometer size={10} /> Temp
              </span>
              <span className={`text-xs font-bold ${temp > 6 ? 'text-rose-500' : 'text-emerald-500'}`}>{temp}°C</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden mr-4">
          <div className="h-full bg-clinical-primary" style={{ width: '100%' }}></div>
        </div>
        <div className="flex gap-2">
           {isIrradiated && <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 text-[8px] font-black uppercase border border-purple-200">Irradiated</span>}
           {isCmvNegative && <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 text-[8px] font-black uppercase border border-sky-200">CMV Neg</span>}
        </div>
        <button className="text-[9px] font-black text-clinical-primary uppercase tracking-widest hover:underline ml-4">Details</button>
      </div>
    </div>
  );
}
