import React, { useState } from 'react';
import { Package, Activity, Clock, MapPin, Search, AlertCircle, RefreshCcw, LogIn, Syringe, ShieldCheck, Zap } from 'lucide-react';
import { User, InventoryUnit, SyncStatus } from '../types';
import { useI18n } from "../lib/i18n";
import { UnitCard } from './UnitCard';
import { motion } from "framer-motion";

interface HospitalOperatorViewProps {
  user: User;
  onLogout: () => void;
  inventory: InventoryUnit[];
  isOffline: boolean;
  localEventsCount: number;
  onSync: () => Promise<void>;
  onOfflineRelease: (unitId: string, patientTempId: string, doctorId: string) => void;
}

export function HospitalOperatorView({ 
  user, 
  onLogout, 
  inventory, 
  isOffline, 
  localEventsCount,
  onSync,
  onOfflineRelease
}: HospitalOperatorViewProps) {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [offlineBarcode, setOfflineBarcode] = useState('');
  const [offlineTempId, setOfflineTempId] = useState('');
  const [offlineDocId, setOfflineDocId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const filteredInventory = (Array.isArray(inventory) ? inventory : []).filter(unit => 
    unit.unitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOfflineRelease = () => {
    if (!offlineBarcode || !offlineTempId || !offlineDocId) {
      alert("Please fill all emergency fields");
      return;
    }
    onOfflineRelease(offlineBarcode, offlineTempId, offlineDocId);
    setOfflineBarcode('');
    setOfflineTempId('');
    setOfflineDocId('');
    setSuccessMsg('Emergency release recorded locally!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  if (isOffline) {
    return (
       <div className="flex flex-col h-full gap-4 max-w-7xl mx-auto w-full items-center justify-center p-4">
          <div className="clinical-card p-12 max-w-2xl w-full flex flex-col items-center text-center">
             <AlertCircle size={64} className="text-rose-500 mb-6" />
             <h2 className="text-3xl font-black text-rose-600 mb-4 uppercase tracking-tighter italic">{t('hosp_offline_title')}</h2>
             <p className="text-clinical-muted mb-10 leading-relaxed font-medium">{t('hosp_offline_desc')}</p>
             
             <div className="w-full border border-clinical-border p-8 rounded-3xl text-left shadow-inner bg-clinical-bg/30">
                <h3 className="font-bold text-clinical-text mb-6 border-b border-clinical-border pb-3 flex justify-between uppercase tracking-widest text-xs">
                  <span>{t('hosp_emergency_log')}</span>
                  <span className="px-3 py-1 rounded-full text-clinical-muted border border-clinical-border shadow-sm">{localEventsCount} {t('hosp_pending_sync')}</span>
                </h3>
               <div className="space-y-4">
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-clinical-muted" size={18} />
                     <input 
                       type="text" 
                       value={offlineBarcode}
                       onChange={e => setOfflineBarcode(e.target.value)}
                       placeholder={t('hosp_scan_unit')} 
                       className="clinical-input pl-12 py-4 text-base" 
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <input type="text" value={offlineTempId} onChange={e => setOfflineTempId(e.target.value)} placeholder={t('hosp_patient_temp_id')} className="clinical-input py-4 text-base" />
                      <input type="text" value={offlineDocId} onChange={e => setOfflineDocId(e.target.value)} placeholder={t('hosp_doc_id')} className="clinical-input py-4 text-base" />
                   </div>
                   {successMsg && <div className="text-emerald-500 font-bold text-sm bg-emerald-950/20 p-2 rounded-lg text-center">{t('hosp_success_local')}</div>}
                   <button onClick={handleOfflineRelease} className="clinical-btn-primary w-full py-4 text-xs">
                     {t('hosp_record_btn')}
                   </button>
               </div>
             </div>
          </div>
       </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-12 max-w-7xl mx-auto w-full p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Mission Context Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-[32px] px-10 py-6 flex items-center justify-between group shadow-xl backdrop-blur-xl">
         <div className="flex items-center gap-6">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] italic">Clinical Node Status</span>
               <span className="text-sm font-black text-clinical-text uppercase italic tracking-tighter">Emergency Requisition Active - Node 4</span>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">Inventory Readiness</span>
               <div className="flex items-center gap-3 mt-1">
                  <div className="h-1.5 w-48 bg-clinical-card rounded-full overflow-hidden p-0.5 border border-clinical-border shadow-inner">
                     <div className="h-full bg-amber-500 w-[78%] shadow-[0_0_10px_rgba(245,158,11,0.6)] rounded-full transition-all duration-1000" />
                  </div>
                  <span className="text-[10px] font-black text-clinical-text">78%</span>
               </div>
            </div>
         </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-clinical-border pb-12">
        <div>
           <p className="premium-subtitle">Hospital Operations Node</p>
           <h1 className="premium-heading">{t('hospital_title')}</h1>
           <div className="flex items-center gap-6 mt-6">
              <span className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                <ShieldCheck size={14} />
                {user.orgId} • SECURED LINK
              </span>
              {localEventsCount > 0 && (
                 <button 
                   onClick={handleSync}
                   disabled={syncing}
                   className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:text-amber-400 transition-colors bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20"
                 >
                   <RefreshCcw size={14} className={syncing ? 'animate-spin' : ''} />
                   {localEventsCount} Pending Sync
                 </button>
              )}
           </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setShowOrderModal(true)}
             className="clinical-btn-primary h-16 px-8"
           >
             <Zap size={20} className="text-amber-300" />
             STAT Requisition (叫血)
           </button>
           <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-clinical-muted group-focus-within:text-rose-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder={t('search_units')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="clinical-input pl-16 w-80 h-16 text-base"
              />
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredInventory.map(unit => (
          <UnitCard 
            key={unit.unitId} 
            barcode={unit.unitId}
            abo={unit.abo}
            rhd={unit.rhd}
            product={unit.productCode}
            expiry={unit.expiryDate}
            status={unit.status === 'AVAILABLE' ? 'Ready' : unit.status === 'RESERVED' ? 'Reserved' : 'Ready'}
            isIrradiated={unit.isIrradiated}
            isCmvNegative={unit.isCmvNegative}
          />
        ))}
        {filteredInventory.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-clinical-border rounded-[48px] p-32 flex flex-col items-center justify-center text-clinical-text">
            <Package size={64} className="mb-6 opacity-20" />
            <p className="font-black uppercase tracking-[0.3em] text-xs italic">Zero inventory records detected in this node</p>
          </div>
        )}
      </div>

      {/* STAT Requisition Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-clinical-bg/95 backdrop-blur-3xl" onClick={() => setShowOrderModal(false)} />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl bg-clinical-bg border border-clinical-border rounded-[48px] overflow-hidden relative z-10 shadow-2xl"
          >
             <div className="p-12 border-b border-clinical-border flex justify-between items-center bg-rose-500/5">
                <div>
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.5em] mb-2 italic">Life-Threatening STAT</p>
                   <h2 className="text-4xl font-black text-clinical-text uppercase italic tracking-tighter">STAT Requisition (叫血單)</h2>
                </div>
                <button onClick={() => setShowOrderModal(false)} className="w-14 h-14 bg-clinical-card border border-clinical-border rounded-full text-clinical-muted hover:text-clinical-text transition-all flex items-center justify-center">
                   <Clock size={28} />
                </button>
             </div>

             <div className="p-12 space-y-10">
                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="clinical-label">Patient ID / National ID</label>
                      <input type="text" placeholder="Scan Patient Wristband..." className="clinical-input py-8 text-xl" />
                   </div>
                   <div className="space-y-4">
                      <label className="clinical-label">Ordering Physician</label>
                      <input type="text" placeholder="Physician Code..." className="clinical-input py-8 text-xl" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="clinical-label">Blood Product</label>
                      <select className="clinical-input py-8 text-xl appearance-none italic bg-clinical-bg">
                         <option>Red Blood Cells (LR)</option>
                         <option>Fresh Frozen Plasma</option>
                         <option>Platelets Apheresis</option>
                         <option>Cryoprecipitate</option>
                      </select>
                   </div>
                   <div className="space-y-4">
                      <label className="clinical-label">Quantity (Units)</label>
                      <input type="number" defaultValue="2" className="clinical-input py-8 text-2xl text-center" />
                   </div>
                </div>

                <div className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-[32px] space-y-4">
                   <div className="flex items-center gap-4 text-rose-500">
                      <AlertCircle size={24} />
                      <p className="text-[11px] font-black uppercase tracking-[0.2em]">Clinical Justification mandatory for STAT</p>
                   </div>
                   <textarea 
                     placeholder="State emergency clinical condition (e.g. Massive Hemorrhage, MTP Activation)..." 
                     className="w-full bg-clinical-bg/80 border border-clinical-border rounded-[24px] p-6 text-clinical-text text-lg focus:outline-none focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all h-32 italic"
                   />
                </div>

                <div className="flex gap-6 pt-6">
                   <button 
                     onClick={() => {
                        alert("STAT Request Transmitted to Regional Hub via Secure Channel");
                        setShowOrderModal(false);
                     }}
                     className="clinical-btn-primary flex-1 py-8 text-base"
                   >
                     Transmit Emergency STAT
                   </button>
                   <button 
                     onClick={() => setShowOrderModal(false)}
                     className="px-12 bg-clinical-card text-clinical-muted hover:text-clinical-text font-black rounded-[24px] border border-clinical-border uppercase tracking-widest text-[11px] transition-all"
                   >
                     Cancel
                   </button>
                </div>
             </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
