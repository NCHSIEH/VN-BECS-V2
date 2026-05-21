import React from 'react';
import { useI18n } from '../lib/i18n';

interface VietnamMapProps {
  activeNode: string | null;
  onSelectNode: (nodeId: string | null) => void;
  scenarios: any;
}

export function VietnamMap({ activeNode, onSelectNode, scenarios }: VietnamMapProps) {
  const { t } = useI18n();
  
  // Simplified clickable regions for Vietnam
  // North (Hanoi), Central (Da Nang), South (HCMC), Mekong (Can Tho)
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center bg-clinical-card/10 rounded-[40px] border border-clinical-border overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(225,29,72,0.05),transparent)] opacity-50" />
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <svg viewBox="0 0 200 500" className="h-full w-auto relative z-10 drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {/* Simplified Vietnam Path */}
        <path 
          d="M100,50 L110,60 L105,80 L115,100 L120,130 L110,160 L125,200 L130,250 L120,300 L110,350 L120,400 L100,450 L80,440 L70,420 L85,400 L75,350 L85,300 L70,250 L80,200 L70,150 L85,100 L75,70 Z" 
          fill="none" 
          stroke="#1e293b" 
          strokeWidth="2" 
        />
        
        {/* North Region */}
        <g onClick={() => onSelectNode('hanoi')} className="cursor-pointer group/node">
           <circle cx="100" cy="80" r="8" className={`transition-all duration-500 ${activeNode === 'hanoi' ? 'fill-rose-500 scale-150' : 'fill-slate-800 hover:fill-rose-500'}`} />
           <circle cx="100" cy="80" r="15" className={`fill-rose-500/20 animate-ping ${activeNode === 'hanoi' ? 'opacity-100' : 'opacity-0'}`} />
           <text x="115" y="85" className="fill-slate-500 text-[8px] font-black uppercase tracking-widest pointer-events-none group-hover/node:fill-white transition-colors">{t('national_node_hanoi')}</text>
        </g>

        {/* Central Region */}
        <g onClick={() => onSelectNode('danang')} className="cursor-pointer group/node">
           <circle cx="115" cy="220" r="8" className={`transition-all duration-500 ${activeNode === 'danang' ? 'fill-rose-500 scale-150' : 'fill-slate-800 hover:fill-rose-500'}`} />
           <circle cx="115" cy="220" r="15" className={`fill-rose-500/20 animate-ping ${activeNode === 'danang' ? 'opacity-100' : 'opacity-0'}`} />
           <text x="130" y="225" className="fill-slate-500 text-[8px] font-black uppercase tracking-widest pointer-events-none group-hover/node:fill-white transition-colors">{t('national_node_danang')}</text>
        </g>

        {/* South Region */}
        <g onClick={() => onSelectNode('hcmc')} className="cursor-pointer group/node">
           <circle cx="105" cy="400" r="8" className={`transition-all duration-500 ${activeNode === 'hcmc' ? 'fill-rose-500 scale-150' : 'fill-slate-800 hover:fill-rose-500'}`} />
           <circle cx="105" cy="400" r="15" className={`fill-rose-500/20 animate-ping ${activeNode === 'hcmc' ? 'opacity-100' : 'opacity-0'}`} />
           <text x="120" y="405" className="fill-slate-500 text-[8px] font-black uppercase tracking-widest pointer-events-none group-hover/node:fill-white transition-colors">{t('national_node_hcmc')}</text>
        </g>

        {/* Mekong Region */}
        <g onClick={() => onSelectNode('cantho')} className="cursor-pointer group/node">
           <circle cx="85" cy="430" r="6" className={`transition-all duration-500 ${activeNode === 'cantho' ? 'fill-rose-500 scale-150' : 'fill-slate-800 hover:fill-rose-500'}`} />
           <text x="50" y="435" className="fill-slate-500 text-[8px] font-black uppercase tracking-widest pointer-events-none group-hover/node:fill-white transition-colors text-right">{t('national_node_cantho')}</text>
        </g>

        {/* Heatmap Overlay Simulation */}
        {scenarios.activeScenario === 'typhoon' && (
           <circle cx="115" cy="220" r="40" className="fill-rose-600/10 stroke-rose-600/30 stroke-dasharray-4 animate-pulse" />
        )}
      </svg>

      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
         <div className="bg-clinical-bg/80 backdrop-blur-xl border border-clinical-border p-4 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.5)]" />
               <span className="text-[8px] font-black text-clinical-text uppercase tracking-widest">{t('national_status_critical')}</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <span className="text-[8px] font-black text-clinical-text uppercase tracking-widest">{t('national_status_safe')}</span>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.2em]">{t('national_all_live')}</p>
            <p className="text-[8px] font-black text-clinical-text uppercase tracking-[0.3em] mt-1">v3.0.0-PROD</p>
         </div>
      </div>
    </div>
  );
}
