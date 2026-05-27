import React, { useState, useEffect } from "react";
import { 
  ScanFace, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  UserCheck, 
  ShieldCheck, 
  Stethoscope, 
  FileText,
  Loader2,
  Lock,
  Unlock
} from "lucide-react";
import { validateISBT128 } from "../lib/bloodSafety";
import { useI18n } from "../lib/i18n";
import { SearchableSelect } from "./SearchableSelect";
import { useBarcodeScanner } from "../lib/hooks/useBarcodeScanner";

export function BedsideVerificationView() {
  const { t } = useI18n();
  const [patientId, setPatientId] = useState("");
  const [patientAbo, setPatientAbo] = useState("O");
  const [patientRhd, setPatientRhd] = useState("Positive");
  const [unitBarcodeRaw, setUnitBarcodeRaw] = useState("");
  const [verifier2Id, setVerifier2Id] = useState("");
  const [vitalsChecked, setVitalsChecked] = useState(false);
  const [consentVerified, setConsentVerified] = useState(false);
  const [ehrStatus, setEhrStatus] = useState<'idle' | 'fetching' | 'linked' | 'failed'>('idle');
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [patientsList, setPatientsList] = useState<any[]>([]);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch('/api/v1/patients');
        const data = await res.json();
        if (Array.isArray(data)) {
          setPatientsList(data);
        }
      } catch (err) {
        console.error("Failed to fetch patients list for Bedside Verification:", err);
      }
    }
    loadPatients();
  }, []);

  useBarcodeScanner((barcode) => {
    setUnitBarcodeRaw(barcode);
  });

  const handlePatientIdChange = (val: string) => {
    setPatientId(val);
    setEhrStatus('idle');
    setConsentVerified(false);
    setVitalsChecked(false);
    const match = patientsList.find(p => p.id === val || p.mrn === val);
    if (match) {
       setPatientAbo(match.abo);
       setPatientRhd(match.rhd);
    }
  };

  const simulateEhrFetch = () => {
    if (!patientId) return;
    setEhrStatus('fetching');
    setTimeout(() => {
       const match = patientsList.find(p => p.id === patientId || p.mrn === patientId);
       if (match) {
          setEhrStatus('linked');
          setConsentVerified(true);
          setVitalsChecked(true);
       } else {
          setEhrStatus('failed');
       }
    }, 1500);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!patientId || !unitBarcodeRaw || !verifier2Id) return;
    
    // Safety Gating
    if(!vitalsChecked || !consentVerified) {
       setResult({ success: false, message: "CRITICAL SAFETY BLOCK: Clinical prerequisites (EHR Consent & Vitals) must be authenticated." });
       return;
    }
    
    const isbtCheck = validateISBT128(unitBarcodeRaw);
    if (!isbtCheck.valid) {
       setResult({ success: false, message: isbtCheck.error! });
       return;
    }

    setIsVerifying(true);
    setResult(null);

    try {
      const res = await fetch('/api/v1/bedside-verify', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           patientId, patientAbo, patientRhd, unitBarcodeRaw, 
           verifier1: 'Nurse', verifier2Pin: verifier2Id, 
           consentVerified, preVitalsChecked: vitalsChecked 
         })
      });
      const data = await res.json();
      if(res.ok) {
         setResult({ success: true, message: "TRANSFUSION AUTHORIZED: 100% Identification match & clinical prerequisites verified." });
         // Reset form slightly for next unit but keep patient
         setUnitBarcodeRaw("");
      } else {
         setResult({ success: false, message: data.error || data.message || "Verification Failed" });
      }
    } catch(err) {
      setResult({ success: false, message: "Communication failure with Central Hub. Retry authentication." });
    } finally {
      setIsVerifying(false);
    }
  };

  const isLocked = !consentVerified || !vitalsChecked || !patientId;

  return (
    <div className="flex flex-col h-full items-center justify-center animate-in fade-in zoom-in duration-500 p-6">
       <div className="max-w-xl w-full bg-clinical-bg border border-clinical-border p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          {/* Visual Polish */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-lime-500 to-sky-500 opacity-50"></div>
          
          <div className="flex flex-col items-center mb-10 text-center">
             <div className="bg-clinical-card w-20 h-20 rounded-[32px] flex items-center justify-center mb-6 border border-clinical-border shadow-inner">
                <ScanFace size={40} className="text-sky-400" />
             </div>
             <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Bedside Safety Node</h2>
             <p className="text-clinical-muted text-[10px] font-black uppercase tracking-[0.2em] mt-4 max-w-xs">Dual-Personnel Authentication & ISBT Scanning</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-8 flex flex-col">
             {/* Stage 1: Identity & EHR Bridge */}
             <div className="p-6 bg-clinical-bg border border-clinical-border rounded-3xl relative">
                <div className="flex justify-between items-center mb-6">
                   <div className="text-[10px] font-black text-clinical-muted uppercase tracking-widest flex items-center gap-2">
                      <Database size={14} className="text-sky-500" /> Clinical EHR Bridge
                   </div>
                   {ehrStatus === 'linked' && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">Record Linked</span>}
                </div>
                
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <SearchableSelect 
                        label=""
                        options={patientsList.map(p => ({ 
                           value: p.mrn || p.id, 
                           label: `${p.mrn || p.id} (${p.name || ''}) - ${p.abo} ${p.rhd === 'Positive' ? 'RhD+' : 'RhD-'}` 
                        }))}
                        value={patientId}
                        onChange={handlePatientIdChange}
                        placeholder="Search Patient MRN..."
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={simulateEhrFetch}
                    disabled={!patientId || ehrStatus === 'fetching'}
                    className="px-6 bg-sky-600 hover:bg-sky-500 disabled:opacity-30 text-white rounded-2xl transition-all shadow-lg shadow-sky-900/20"
                  >
                     {ehrStatus === 'fetching' ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-clinical-card p-4 rounded-2xl border border-clinical-border text-center">
                     <span className="text-[9px] font-black text-clinical-muted uppercase block mb-1">Blood Group</span>
                     <span className="text-xl font-black text-white italic tracking-tighter">{patientAbo} {patientRhd === 'Positive' ? 'RhD+' : 'RhD-'}</span>
                  </div>
                  <div className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center ${
                     ehrStatus === 'linked' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                     ehrStatus === 'failed' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-clinical-card border-clinical-border'
                  }`}>
                     <span className="text-[9px] font-black text-clinical-muted uppercase block mb-1">EHR Status</span>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${
                        ehrStatus === 'linked' ? 'text-emerald-400' : ehrStatus === 'failed' ? 'text-rose-500' : 'text-clinical-muted'
                     }`}>
                        {ehrStatus === 'linked' ? 'Sync Success' : ehrStatus === 'failed' ? 'Record Missing' : 'Standby'}
                     </span>
                  </div>
                </div>
             </div>

             {/* Stage 2: Clinical Gating */}
             <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-3xl border flex items-center gap-4 transition-all ${consentVerified ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-clinical-bg border-clinical-border'}`}>
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${consentVerified ? 'text-emerald-400 bg-emerald-500/20' : 'text-clinical-text bg-clinical-bg'}`}>
                      <FileText size={20} />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-clinical-muted uppercase tracking-widest leading-none mb-1">Consent</p>
                      <p className={`text-[10px] font-black uppercase tracking-tighter ${consentVerified ? 'text-white' : 'text-clinical-muted'}`}>
                         {consentVerified ? 'Authenticated' : 'Required'}
                      </p>
                   </div>
                </div>
                <div className={`p-4 rounded-3xl border flex items-center gap-4 transition-all ${vitalsChecked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-clinical-bg border-clinical-border'}`}>
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${vitalsChecked ? 'text-emerald-400 bg-emerald-500/20' : 'text-clinical-text bg-clinical-bg'}`}>
                      <Stethoscope size={20} />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-clinical-muted uppercase tracking-widest leading-none mb-1">Vitals</p>
                      <p className={`text-[10px] font-black uppercase tracking-tighter ${vitalsChecked ? 'text-white' : 'text-clinical-muted'}`}>
                         {vitalsChecked ? 'Stabilized' : 'Required'}
                      </p>
                   </div>
                </div>
             </div>

             {/* Stage 3: Scanning & Authentication */}
             <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest mb-3 block flex justify-between items-center">
                    <span>ISBT-128 Unit Barcode</span>
                    <button type="button" onClick={() => setUnitBarcodeRaw("=W0000 23 123456")} className="text-[9px] text-sky-500 font-black uppercase tracking-widest hover:text-white transition-all underline decoration-sky-500/30 underline-offset-4">Mock Scan</button>
                  </label>
                  <input 
                    required
                    value={unitBarcodeRaw}
                    onChange={e => setUnitBarcodeRaw(e.target.value)}
                    type="text" 
                    placeholder="SCAN UNIT LABEL..."
                    className="w-full bg-clinical-bg border border-clinical-border text-white p-5 rounded-3xl focus:border-emerald-500/50 outline-none transition-all text-xl font-black tracking-widest font-mono shadow-inner placeholder:text-clinical-text"
                  />
                </div>

                <div className="relative">
                   <input 
                     required
                     list="verifier-list"
                     value={verifier2Id}
                     onChange={e => setVerifier2Id(e.target.value)}
                     type="text" 
                     placeholder="SECOND AUTHENTICATOR PIN/ID"
                     className="w-full bg-clinical-bg border border-clinical-border text-white p-4 rounded-2xl focus:border-emerald-500/50 outline-none transition-all text-xs font-black tracking-widest uppercase shadow-inner placeholder:text-clinical-text"
                   />
                   <datalist id="verifier-list">
                     <option value="ID-1011 (Dr. Jenkins)" />
                     <option value="ID-2022 (Nurse Kelly)" />
                   </datalist>
                </div>
             </div>

             <button 
               disabled={isVerifying || isLocked} 
               type="submit" 
               className={`w-full font-black py-6 rounded-[32px] mt-4 transition-all shadow-xl uppercase text-xs tracking-[0.3em] italic flex items-center justify-center gap-4 ${
                  isLocked 
                  ? 'bg-clinical-bg text-clinical-muted border border-clinical-border cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 hover:scale-[1.02]'
               }`}
             >
               {isVerifying ? <Loader2 className="animate-spin" /> : isLocked ? <Lock size={18} /> : <Unlock size={18} />}
               {isVerifying ? 'Authenticating...' : 'Authorize Transfusion'}
             </button>
          </form>

          {result && (
             <div className={`mt-10 p-6 rounded-[32px] flex items-center gap-6 border animate-in slide-in-from-bottom-4 duration-500 ${result.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${result.success ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                   {result.success ? <ShieldCheck size={32} /> : <AlertTriangle size={32} className="animate-pulse" />}
                </div>
                <div className="text-[11px] font-black uppercase tracking-widest leading-relaxed">{result.message}</div>
             </div>
          )}
       </div>
    </div>
  );
}
