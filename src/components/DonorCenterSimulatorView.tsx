import React, { useState, useEffect, useMemo } from "react";
import { Database, Send, Beaker, ShieldAlert, CheckCircle, Activity, Globe, CheckSquare, Dna, ArrowRight, Users, ClipboardList, Thermometer, Droplet, AlertCircle, Plus, Search, Calendar, Hash, ShieldCheck, Wrench, X, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { ProductCatalog } from "../types";
import { useI18n } from "../lib/i18n";
import { LimsFlowIndicator } from './FlowIndicator';
import { VietnamIdValidator, validateDonorAge, validateCollectionVolume, validateDonorName, validateDonorWeight, validateVietnamDeferralRules } from '../lib/validators';
import type { DonationType } from '../types';

export function DonorCenterSimulatorView({ initialTab = 'DONOR' }: { initialTab?: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE' }) {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<ProductCatalog[]>([]);
  const [activeTab, setActiveTab] = useState<'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE'>(initialTab);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [gatingError, setGatingError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [donorForm, setDonorForm] = useState({
    id: '', name: '', nationalId: '', dob: '',
    gender: 'Male' as 'Male'|'Female', weight: '',
    bloodType: 'O', rhd: 'Positive',
    hadTattooRecently: false,
    traveledToMalariaZone: false,
    feelingUnwell: false,
    hasHighRiskCondition: false
  });
  const [donorFormError, setDonorFormError] = useState("");
  const [donorLookupMessage, setDonorLookupMessage] = useState("");

  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectForm, setCollectForm] = useState({ donorId: '', volume: 500, type: 'WholeBlood', customDonationId: '' });
  const [collectFormError, setCollectFormError] = useState("");

  // DB States
  const [donors, setDonors] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  const loadData = () => {
    fetch('/api/v1/catalog/products')
      .then(res => res.ok ? res.json() : [])
      .then(d => setCatalog(Array.isArray(d) ? d : []))
      .catch(() => setCatalog([]));
      
    fetch('/api/v1/lims/donors')
      .then(res => res.ok ? res.json() : [])
      .then(d => setDonors(Array.isArray(d) ? d : []))
      .catch(() => setDonors([]));
      
    fetch('/api/v1/lims/donations')
      .then(res => res.ok ? res.json() : [])
      .then(d => setDonations(Array.isArray(d) ? d : []))
      .catch(() => setDonations([]));
      
    fetch('/api/v1/lims/components')
      .then(res => res.ok ? res.json() : [])
      .then(d => setComponents(Array.isArray(d) ? d : []))
      .catch(() => setComponents([]));
      
    fetch('/api/v1/resources')
      .then(res => res.ok ? res.json() : [])
      .then(d => setResources(Array.isArray(d) ? d : []))
      .catch(() => setResources([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateVietnamId = (id: string) => {
    return VietnamIdValidator.validate(id).valid;
  };

  // Real-time validation states
  const cccdValidation = useMemo(() => VietnamIdValidator.validate(donorForm.nationalId), [donorForm.nationalId]);
  const ageValidation = useMemo(() => {
    if (!donorForm.dob || donorForm.dob.length !== 10) return null;
    return validateDonorAge(donorForm.dob.replace(/\//g, '-'));
  }, [donorForm.dob]);
  
  const donorAge = useMemo(() => {
    if (!donorForm.dob || donorForm.dob.length !== 10) return null;
    const diff = new Date().getTime() - new Date(donorForm.dob.replace(/\//g, '-')).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }, [donorForm.dob]);
  
  const volumeValidation = useMemo(
    () => validateCollectionVolume(collectForm.volume, collectForm.type as DonationType),
    [collectForm.volume, collectForm.type]
  );

  // Dashboard stats
  const todayCollections = useMemo(() => {
    const today = new Date().toDateString();
    return donations.filter(d => new Date(d.collectedAt).toDateString() === today).length;
  }, [donations]);
  const pendingTests = useMemo(() => donations.filter(d => d.idmStatus === 'PENDING').length, [donations]);
  const reactiveRate = useMemo(() => {
    const tested = donations.filter(d => d.idmStatus && d.idmStatus !== 'PENDING');
    if (tested.length === 0) return 0;
    return Math.round((tested.filter(d => d.idmStatus === 'REACTIVE').length / tested.length) * 100);
  }, [donations]);
  const availableComponents = useMemo(() => components.filter(c => c.status === 'AVAILABLE').length, [components]);

  const handleCccdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cccd = e.target.value;
    setDonorForm(prev => ({ ...prev, nationalId: cccd }));
    setDonorLookupMessage("");

    if (cccd.length === 12) {
      const existingDonor = donors.find(d => d.nationalId === cccd);
      if (existingDonor) {
        // Find last donation to check 12-week gap
        const donorDonations = donations.filter(d => d.donorId === existingDonor.id).sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
        if (donorDonations.length > 0) {
          const lastDonationDate = new Date(donorDonations[0].collectedAt);
          const weeksSinceLast = (new Date().getTime() - lastDonationDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
          if (weeksSinceLast < 12) {
            setDonorFormError(`捐血間隔不足：上次捐血為 ${lastDonationDate.toLocaleDateString()} (距離不到 12 週)`);
            return;
          }
        }

        setDonorForm(prev => ({
          ...prev,
          id: existingDonor.id,
          name: existingDonor.name,
          dob: existingDonor.dob.replace(/-/g, '/'),
          gender: existingDonor.gender || 'Male',
          weight: existingDonor.weight?.toString() || '',
          bloodType: existingDonor.bloodType,
          rhd: existingDonor.rhd
        }));
        setDonorLookupMessage("✓ 已自動載入歷史捐血者資料");
        setDonorFormError(""); // Clear any previous errors if valid now
      }
    }
  };

  const openDonorModal = (donor?: any) => {
    setDonorFormError("");
    setDonorLookupMessage("");
    if (donor) {
       // Replace dashes with slashes for YYYY/MM/DD input format
       const formattedDob = donor.dob ? donor.dob.replace(/-/g, '/') : '';
       setDonorForm({
         id: donor.id, name: donor.name, nationalId: donor.nationalId, dob: formattedDob,
         gender: donor.gender || 'Male', weight: donor.weight?.toString() || '',
         bloodType: donor.bloodType, rhd: donor.rhd,
         hadTattooRecently: false, traveledToMalariaZone: false, feelingUnwell: false, hasHighRiskCondition: false
       });
    } else {
       setDonorForm({
         id: '', name: '', nationalId: '', dob: '',
         gender: 'Male', weight: '',
         bloodType: 'O', rhd: 'Positive',
         hadTattooRecently: false, traveledToMalariaZone: false, feelingUnwell: false, hasHighRiskCondition: false
       });
    }
    setIsDonorModalOpen(true);
  };

  const submitDonorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setDonorFormError("");

    // 1. Validate Name
    const nameVal = validateDonorName(donorForm.name);
    if (!nameVal.valid) {
      setDonorFormError(nameVal.errors.join(", "));
      return;
    }

    // 2. Validate CCCD
    const cccdVal = VietnamIdValidator.validate(donorForm.nationalId);
    if (!cccdVal.valid) {
      setDonorFormError(`越南身分證格式錯誤: ${cccdVal.errors.join(", ")}`);
      return;
    }

    // 3. Validate Date of Birth
    if (!donorForm.dob || donorForm.dob.length !== 10) {
      setDonorFormError("請輸入完整的出生日期格式 (YYYY/MM/DD)");
      return;
    }
    const normalizedDob = donorForm.dob.replace(/\//g, '-');
    const ageVal = validateDonorAge(normalizedDob);
    if (!ageVal.valid) {
      setDonorFormError(`出生日期驗證失敗: ${ageVal.errors.join(", ")}`);
      return;
    }

    // 4. Validate Weight
    const weightVal = validateDonorWeight(Number(donorForm.weight), donorForm.gender);
    if (!weightVal.valid) {
      setDonorFormError(`體重驗證失敗: ${weightVal.errors.join(", ")}`);
      return;
    }

    // 5. Check Deferrals
    const deferralCheck = validateVietnamDeferralRules({
      hadTattooRecently: donorForm.hadTattooRecently,
      traveledToMalariaZone: donorForm.traveledToMalariaZone,
      feelingUnwell: donorForm.feelingUnwell,
      hasHighRiskCondition: donorForm.hasHighRiskCondition
    });

    const finalDeferralStatus = deferralCheck.deferred ? 'Active' : 'None';
    const finalDeferralReason = deferralCheck.reason || '';
    const finalDeferralUntil = deferralCheck.until || '';

    if (deferralCheck.deferred) {
      // Show error but we still submit the donor record to the database so it's tracked
      setDonorFormError(`捐血者已被暫緩: ${deferralCheck.reason} (暫緩至: ${deferralCheck.until ? new Date(deferralCheck.until).toLocaleDateString() : '永久'})`);
      // We will allow registration, but block collection in UI. However, if you want hard stop on register:
      // return;
    }

    try {
      const isEdit = !!donorForm.id;
      const url = isEdit ? `/api/v1/lims/donors/${donorForm.id}` : '/api/v1/lims/donors';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...donorForm,
          dob: normalizedDob, // Store as standard YYYY-MM-DD
          weight: Number(donorForm.weight),
          deferralStatus: finalDeferralStatus,
          deferralReason: finalDeferralReason,
          deferralUntil: finalDeferralUntil
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
         setDonorFormError(data.message || data.error);
         return;
      }

      loadData();
      setIsDonorModalOpen(false);
    } catch(e: any) {
      setDonorFormError(e.message || "Network Error");
    }
  };

  const openCollectModal = (donorId: string) => {
    setCollectFormError("");
    setCollectForm({ donorId, volume: 500, type: 'WholeBlood', customDonationId: '' });
    setIsCollectModalOpen(true);
  };

  const submitCollectForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setCollectFormError("");
    try {
      const res = await fetch('/api/v1/lims/collect', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(collectForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setCollectFormError(data.message || data.error);
        return;
      }
      loadData();
      setIsCollectModalOpen(false);
    } catch(e: any) {
      setCollectFormError(e.message || "Network Error");
    }
  };

  const runIDMTests = async (donationId: string) => {
    setGatingError(null);
    
    // Hard Gating Check
    const reagents = resources.filter(r => r.type === 'Reagent');
    const expiredReagent = reagents.find(r => r.status === 'Expired');
    if (expiredReagent) {
       setGatingError(`SAFETY INTERLOCK ACTIVE: Reagent ${expiredReagent.name} is EXPIRED. Laboratory testing blocked.`);
       return;
    }
    
    const analyzers = resources.filter(r => r.name.includes('Analyzer'));
    const maintenanceRequired = analyzers.find(r => r.status === 'MaintenanceRequired');
    if (maintenanceRequired) {
       setGatingError(`SAFETY INTERLOCK ACTIVE: Equipment ${maintenanceRequired.name} requires maintenance. Testing restricted.`);
       return;
    }

    try {
      await fetch(`/api/v1/lims/lab-tests/${donationId}/run`, { method: 'POST' });
      loadData();
    } catch(e) {}
  };

  const processComponent = async (donationId: string) => {
    setGatingError(null);
    
    // Hard Gating Check
    const centrifuges = resources.filter(r => r.name.includes('Centrifuge'));
    const maintenanceRequired = centrifuges.find(r => r.status === 'MaintenanceRequired');
    if (maintenanceRequired) {
       setGatingError(`SAFETY INTERLOCK ACTIVE: Equipment ${maintenanceRequired.name} requires maintenance. Processing restricted.`);
       return;
    }

    try {
      await fetch(`/api/v1/lims/process-component/${donationId}`, { method: 'POST' });
      loadData();
    } catch(e) {}
  };

  const handleRelease = async (compId: string) => {
    setIsSyncing(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/v1/lims/components/${compId}/release`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
         setStatus({ type: 'success', msg: `✅ ${t('lims_release_success')} ISBT: ${compId}` });
         loadData();
      } else {
         setStatus({ type: 'error', msg: `Sync Failed: ${data.error}` });
      }
    } catch (err) {
       setStatus({ type: 'error', msg: "Network Error" });
    } finally {
       setIsSyncing(false);
    }
  };

  const getProductName = (code: string) => catalog.find(c => c.productCode === code)?.alias || code;

  return (
    <div className="flex flex-col h-full bg-[#0b1120] selection:bg-rose-500/30 overflow-hidden">
      {/* Top Decorative Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-sky-500 to-emerald-500 shrink-0" />

      {/* Active Mission Banner */}
      <div className="bg-rose-500/10 border-b border-rose-500/20 px-10 py-4 flex items-center justify-between group backdrop-blur-xl shrink-0">
         <div className="flex items-center gap-6">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.8)]" />
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] italic">Active Mission</span>
               <span className="text-sm font-black text-slate-800 uppercase italic tracking-tighter">Site A Registration Overflow</span>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Throughput Readiness</span>
               <div className="flex items-center gap-3 mt-1">
                  <div className="h-1.5 w-48 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
                     <div className="h-full bg-rose-500 w-[42%] shadow-[0_0_10px_rgba(225,29,72,0.6)] rounded-full transition-all duration-1000" />
                  </div>
                  <span className="text-[10px] font-black text-slate-800">42%</span>
               </div>
            </div>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Sidebar */}
        <div className="w-96 bg-slate-50/50 border-r border-slate-900 flex flex-col shrink-0 p-8 gap-8 overflow-y-auto custom-scrollbar">
           <div className="space-y-2">
              <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6">Operational Stages</h2>
              {[
                { id: 'DONOR', label: '1. Registration', icon: <Users size={20} />, color: 'rose' },
                { id: 'LAB', label: '2. Clinical Screening', icon: <Thermometer size={20} />, color: 'sky' },
                { id: 'PROCESS', label: '3. Phlebotomy', icon: <Droplet size={20} />, color: 'emerald' },
                { id: 'RELEASE', label: '4. Lab Logistics', icon: <Send size={20} />, color: 'amber' },
              ].map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => setActiveTab(stage.id as any)}
                  className={`w-full flex items-center justify-between p-6 rounded-[28px] transition-all group relative overflow-hidden ${
                    activeTab === stage.id 
                      ? 'bg-slate-900 text-slate-800 border border-slate-800 shadow-2xl scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-600 hover:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center gap-5 relative z-10">
                     <div className={`transition-colors ${activeTab === stage.id ? 'text-rose-500' : 'text-slate-700'}`}>
                        {stage.icon}
                     </div>
                     <span className="text-[14px] font-black uppercase italic tracking-tight">{stage.label}</span>
                  </div>
                  {activeTab === stage.id && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse relative z-10" />}
                </button>
              ))}
           </div>

           <div className="mt-auto space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 shadow-inner">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Site Performance</p>
                 <div className="flex gap-4">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Enrollments</span>
                       <span className="text-xl font-black text-rose-500">{todayCollections}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-800 mt-2" />
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Lab Load</span>
                       <span className="text-xl font-black text-sky-500">{pendingTests}</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center justify-between px-2">
                 <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Asset Gating</span>
                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} /> SECURED
                 </span>
              </div>
           </div>
        </div>

        {/* Operational Viewport */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/20">
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-right-12 duration-1000">
            
            {/* Contextual Header */}
            <div className="flex justify-between items-end border-b border-slate-900 pb-12">
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.6)]" />
                     <p className="text-slate-600 text-[11px] font-black uppercase tracking-[0.5em]">VN-DONOR-NODE-01</p>
                  </div>
                  <h1 className="premium-heading">
                    {activeTab === 'DONOR' && 'Registry Control'}
                    {activeTab === 'LAB' && 'Clinical Diagnostics'}
                    {activeTab === 'PROCESS' && 'Phlebotomy Ops'}
                    {activeTab === 'RELEASE' && 'Chain of Custody'}
                  </h1>
               </div>
               {activeTab === 'DONOR' && (
                 <button onClick={() => openDonorModal()} className="clinical-btn-primary">
                   <Plus size={24} /> Register Donor
                 </button>
               )}
            </div>

            {gatingError && (
              <div className="p-8 rounded-[32px] bg-rose-500 border border-rose-400 text-slate-800 mb-8 flex gap-6 items-center animate-in shake duration-500 shadow-2xl shadow-rose-900/40">
                <ShieldAlert size={40} className="shrink-0" />
                <div className="flex-1">
                   <p className="font-black text-xs uppercase tracking-[0.2em] italic mb-1">Safety Gate Violation</p>
                   <p className="font-bold text-lg opacity-90 leading-tight">{gatingError}</p>
                </div>
                <button onClick={() => setGatingError(null)} className="px-6 py-3 bg-white hover:bg-white/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">Acknowledge</button>
              </div>
            )}

            {status && (
              <div className={`p-8 rounded-[32px] border mb-8 flex gap-6 items-center animate-in fade-in slide-in-from-top-4 duration-500 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${status.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                  {status.type === 'success' ? <CheckCircle size={28} /> : <ShieldAlert size={28} />}
                </div>
                <span className="font-black text-lg tracking-tight italic uppercase">{status.msg}</span>
              </div>
            )}

            {/* Content Logic */}
            <div className="space-y-12">
              {activeTab === 'DONOR' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center bg-slate-50/50 p-8 rounded-[32px] border border-slate-800 shadow-inner group">
                    <div className="flex items-center gap-6 text-slate-600 flex-1">
                      <Search size={24} className="group-hover:text-rose-500 transition-colors" />
                      <input type="text" placeholder="Search donors by MRN, Name, or CCCD..." className="bg-transparent border-none focus:ring-0 text-lg font-medium w-full text-slate-700 placeholder:text-slate-800" />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[40px] border border-slate-900 bg-slate-900/10 shadow-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-900">
                        <tr>
                          <th className="p-8">{t('lims_col_donor_id')}</th>
                          <th className="p-8">{t('lims_col_name')}</th>
                          <th className="p-8 text-center">{t('lims_col_blood_type')}</th>
                          <th className="p-8">{t('lims_col_reg_date')}</th>
                          <th className="p-8 text-right">{t('lims_col_action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50">
                        {donors.map(d => (
                          <tr key={d.id} className="hover:bg-slate-900/40 transition-all group duration-500">
                            <td className="p-8">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-rose-500/20 group-hover:text-rose-600 transition-all">
                                   <Hash size={16} />
                                 </div>
                                 <span className="font-mono font-black text-slate-600 tracking-tighter text-base">{d.id}</span>
                               </div>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                  <span className="font-black text-slate-800 text-lg italic uppercase">{d.name}</span>
                                  <span className="text-[10px] text-slate-600 font-mono tracking-widest">{d.nationalId}</span>
                               </div>
                            </td>
                            <td className="p-8 text-center">
                              <span className={`inline-block px-4 py-2 rounded-2xl text-[11px] font-black tracking-[0.2em] ${d.rhd === 'Negative' ? 'bg-rose-950/30 text-rose-500 border border-rose-900/30' : 'bg-emerald-950/30 text-emerald-500 border border-emerald-900/30'}`}>
                                {d.bloodType}{d.rhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                 <span className="text-slate-600 font-bold text-[13px]">{new Date(d.registeredAt).toLocaleDateString()}</span>
                                 <span className="text-[10px] text-slate-600 font-mono uppercase">{new Date(d.registeredAt).toLocaleTimeString()}</span>
                               </div>
                            </td>
                            <td className="p-8 text-right">
                               <div className="flex gap-4 justify-end">
                                 <button onClick={() => openDonorModal(d)} className="p-3 rounded-2xl bg-slate-50 border border-slate-800 text-slate-600 hover:text-slate-800 hover:border-slate-600 transition-all shadow-inner">
                                    <Activity size={20} />
                                 </button>
                                 <button 
                                   onClick={() => openCollectModal(d.id)} 
                                   disabled={d.deferralStatus === 'Active'}
                                   className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg italic ${d.deferralStatus === 'Active' ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' : 'bg-rose-600/10 text-rose-500 border border-rose-600/20 hover:bg-rose-600 hover:text-white hover:shadow-rose-900/20'}`}
                                 >
                                    {d.deferralStatus === 'Active' ? 'Deferred' : 'Phlebotomy'}
                                 </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'LAB' && (
                <div className="space-y-12 animate-in fade-in duration-700">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="glass-station p-8 flex items-center gap-8 group">
                         <div className="w-16 h-16 rounded-[24px] bg-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                            <Activity size={32} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Queue Load</p>
                            <p className="text-3xl font-black text-slate-800 italic">{donations.filter(d => d.idmStatus === 'PENDING').length} Units</p>
                         </div>
                      </div>
                      <div className="glass-station p-8 flex items-center gap-8 group">
                         <div className="w-16 h-16 rounded-[24px] bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <CheckCircle size={32} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Diagnostics Pass</p>
                            <p className="text-3xl font-black text-slate-800 italic">{donations.filter(d => d.idmStatus === 'CLEARED').length} Units</p>
                         </div>
                      </div>
                      <div className="glass-station p-8 flex items-center gap-8 group">
                         <div className="w-16 h-16 rounded-[24px] bg-rose-500/20 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                            <ShieldAlert size={32} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Biological Risk</p>
                            <p className="text-3xl font-black text-slate-800 italic">{reactiveRate}% Rate</p>
                         </div>
                      </div>
                   </div>

                   <div className="overflow-hidden rounded-[40px] border border-slate-900 bg-slate-900/10 shadow-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-900">
                        <tr>
                          <th className="p-8">{t('lims_col_don_id')}</th>
                          <th className="p-8">{t('lims_col_name')}</th>
                          <th className="p-8 text-center">{t('lims_col_blood_type')}</th>
                          <th className="p-8">{t('lims_col_idm')}</th>
                          <th className="p-8 text-right">{t('lims_col_action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50">
                        {donations.filter(d => Boolean(d.idmStatus)).map(donation => (
                          <tr key={donation.id} className="hover:bg-slate-900/40 transition-all duration-500 group">
                            <td className="p-8 font-mono font-black text-sky-400 tracking-tighter text-lg italic">{donation.id}</td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                 <span className="font-black text-slate-800 text-base italic uppercase">{donation.donorName}</span>
                                 <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">{donation.donationType} · {donation.volume}ml</span>
                               </div>
                            </td>
                            <td className="p-8 text-center">
                              <span className="bg-slate-50 text-slate-600 px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest border border-slate-800">
                                {donation.donorAbo}{donation.donorRhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8">
                               {donation.idmStatus === 'PENDING' && (
                                 <div className="flex items-center gap-3 text-sky-400 font-black text-[10px] uppercase tracking-[0.3em] bg-sky-500/10 px-5 py-2 rounded-full w-fit border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                                    Diagnostic Run
                                 </div>
                               )}
                               {donation.idmStatus === 'CLEARED' && (
                                 <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] bg-emerald-500/10 px-5 py-2 rounded-full w-fit border border-emerald-500/20">
                                    <CheckCircle size={14} />
                                    CLEARED
                                 </div>
                               )}
                               {donation.idmStatus === 'REACTIVE' && (
                                 <div className="flex items-center gap-3 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] bg-rose-500/10 px-5 py-2 rounded-full w-fit border border-rose-500/20">
                                    <ShieldAlert size={14} />
                                    REACTIVE
                                 </div>
                               )}
                            </td>
                            <td className="p-8 text-right">
                              {donation.idmStatus === 'PENDING' && (
                                <button 
                                  onClick={() => runIDMTests(donation.id)}
                                  className="px-8 py-4 rounded-[18px] bg-sky-600 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sky-900/30 hover:scale-105 active:scale-95 transition-all italic"
                                >
                                  Process Diagnostics
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                   </div>
                </div>
              )}

              {activeTab === 'PROCESS' && (
                <div className="space-y-8 animate-in fade-in duration-700">
                   <div className="overflow-hidden rounded-[40px] border border-slate-900 bg-slate-900/10 shadow-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-900">
                        <tr>
                          <th className="p-8">Unit ID</th>
                          <th className="p-8">Serology</th>
                          <th className="p-8 text-center">Abo/Rh</th>
                          <th className="p-8">Volume</th>
                          <th className="p-8 text-right">Ops</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50">
                        {donations.filter(d => Boolean(d.idmStatus) && d.componentCount === 0).map(donation => (
                          <tr key={donation.id} className="hover:bg-slate-900/40 transition-all group">
                            <td className="p-8 font-mono font-black text-slate-700 tracking-tighter text-lg italic">{donation.id}</td>
                            <td className="p-8">
                               {donation.idmStatus === 'CLEARED' ? (
                                 <span className="text-emerald-500 font-black text-[11px] uppercase tracking-[0.2em] bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">SAFE</span>
                               ) : (
                                 <span className="text-rose-500 font-black text-[11px] uppercase tracking-[0.2em] bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">BIO-RISK</span>
                               )}
                            </td>
                            <td className="p-8 text-center">
                              <span className="bg-slate-50 text-slate-600 px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest border border-slate-800">
                                {donation.donorAbo}{donation.donorRhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8 text-slate-600 font-mono text-[13px]">{donation.volume} ml</td>
                            <td className="p-8 text-right">
                               {donation.idmStatus === 'REACTIVE' ? (
                                 <div className="bg-rose-950/30 border border-rose-900/30 text-rose-500 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic">QUARANTINE RESTRICTED</div>
                               ) : (
                                 <button 
                                   onClick={() => processComponent(donation.id)}
                                   className="px-8 py-4 rounded-[18px] bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-emerald-900/30 hover:scale-105 active:scale-95 transition-all italic"
                                 >
                                   Fabricate Components
                                 </button>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                   </div>
                </div>
              )}

              {activeTab === 'RELEASE' && (
                <div className="space-y-8 animate-in fade-in duration-700">
                   <div className="overflow-hidden rounded-[40px] border border-slate-900 bg-slate-900/10 shadow-2xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/50 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-900">
                        <tr>
                          <th className="p-8">Global ID</th>
                          <th className="p-8">Product Class</th>
                          <th className="p-8 text-center">Abo/Rh</th>
                          <th className="p-8">Custody Status</th>
                          <th className="p-8 text-right">Dispatch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/50">
                        {components.filter(c => c.status !== 'QUARANTINE' && c.status !== 'DISCARDED').map(comp => (
                          <tr key={comp.id} className="hover:bg-slate-900/40 transition-all group">
                            <td className="p-8 font-mono font-black text-slate-800 tracking-tighter text-xl italic">{comp.id}</td>
                            <td className="p-8 text-slate-600 font-black uppercase italic tracking-tight">{getProductName(comp.productCode)}</td>
                            <td className="p-8 text-center">
                              <span className="bg-slate-50 text-slate-700 px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest border border-slate-800">
                                {comp.abo}{comp.rhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8">
                               {comp.status === 'AVAILABLE' ? (
                                 <span className="flex items-center gap-3 text-amber-500 font-black text-[10px] uppercase tracking-[0.4em] bg-amber-500/10 px-5 py-2 rounded-full w-fit border border-amber-500/20">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    READY
                                 </span>
                               ) : (
                                 <span className="flex items-center gap-3 text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] bg-emerald-500/10 px-5 py-2 rounded-full w-fit border border-emerald-500/20">
                                    <Globe size={14} />
                                    HUB INTRANSIT
                                 </span>
                               )}
                            </td>
                            <td className="p-8 text-right">
                               {comp.status === 'AVAILABLE' && (
                                 <button 
                                   onClick={() => handleRelease(comp.id)}
                                   disabled={isSyncing}
                                   className="px-8 py-4 rounded-[18px] bg-white text-slate-950 font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all italic disabled:opacity-30"
                                 >
                                   {isSyncing ? 'SYNCING...' : 'RELEASE TO HUB'}
                                 </button>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Premium Modals */}
      {isDonorModalOpen && (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={submitDonorForm} 
            className="glass-station bg-slate-50 border-slate-800 w-full max-w-2xl overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)]"
          >
             <div className="p-12 border-b border-slate-900 flex justify-between items-center bg-slate-900/20">
                <div>
                   <h3 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">{donorForm.id ? 'Modify Registry' : 'Donor Enrollment'}</h3>
                   <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">National Identity Integration</p>
                </div>
                <button type="button" onClick={() => setIsDonorModalOpen(false)} className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-all">
                   <X size={24} />
                </button>
             </div>
             <div className="p-12 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {donorFormError && (
                  <div className="bg-rose-500/10 text-rose-500 text-xs font-black p-6 rounded-3xl border border-rose-500/20 flex items-center gap-4 animate-in shake duration-500">
                    <AlertCircle size={24} />
                    {donorFormError}
                  </div>
                )}
                <div className="space-y-4">
                   <label className="clinical-label">{t('lims_form_name')}</label>
                   <input required type="text" value={donorForm.name} onChange={e => setDonorForm({...donorForm, name: e.target.value.toUpperCase()})} className="clinical-input italic uppercase text-2xl py-8" placeholder="e.g. NGUYEN VAN A" />
                </div>
                
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <label className="clinical-label">{t('lims_form_nid')}</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          const validId = (100000000000 + Math.floor(Math.random() * 899999999999)).toString();
                          setDonorForm({...donorForm, nationalId: validId});
                        }}
                        className="text-[9px] bg-sky-500/10 text-sky-400 px-4 py-2 rounded-xl border border-sky-500/20 hover:bg-sky-500 hover:text-slate-800 transition-all font-black uppercase tracking-widest flex items-center gap-2"
                      >
                         <Database size={12} /> Scan Chip Card
                      </button>
                   </div>
                   <input 
                     required 
                     type="text" 
                     value={donorForm.nationalId} 
                     onChange={e => setDonorForm({...donorForm, nationalId: e.target.value.replace(/\D/g, '').slice(0, 12)})} 
                     className="clinical-input font-mono text-2xl tracking-[0.3em] py-8 text-sky-400" 
                     placeholder="001092000001" 
                   />
                   {donorForm.nationalId && cccdValidation && !cccdValidation.valid && (
                     <p className="text-rose-500 text-[10px] font-black uppercase mt-2 px-1">
                        ⚠️ {cccdValidation.errors.join(', ')}
                     </p>
                   )}
                   {donorForm.nationalId && cccdValidation && cccdValidation.valid && (
                     <p className="text-emerald-500 text-[10px] font-black uppercase mt-2 px-1">
                        ✓ Valid Vietnam National CCCD
                     </p>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="clinical-label">{t('lims_form_dob')} (YYYY/MM/DD)</label>
                      <input 
                        required 
                        type="text" 
                        value={donorForm.dob} 
                        onChange={e => {
                          const val = e.target.value;
                          const digits = val.replace(/\D/g, '').slice(0, 8);
                          let formatted = '';
                          if (digits.length <= 4) {
                            formatted = digits;
                          } else if (digits.length <= 6) {
                            formatted = `${digits.slice(0, 4)}/${digits.slice(4)}`;
                          } else {
                            formatted = `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
                          }
                          setDonorForm({...donorForm, dob: formatted});
                        }} 
                        className="clinical-input py-8 font-mono text-center text-xl text-sky-400" 
                        placeholder="YYYY/MM/DD"
                        maxLength={10}
                      />
                      {donorForm.dob && donorForm.dob.length === 10 && ageValidation && !ageValidation.valid && (
                        <p className="text-rose-500 text-[10px] font-black uppercase mt-2 px-1">
                           ⚠️ {ageValidation.errors.join(', ')}
                        </p>
                      )}
                      {donorForm.dob && donorForm.dob.length === 10 && ageValidation && ageValidation.valid && (
                        <p className="text-emerald-500 text-[10px] font-black uppercase mt-2 px-1">
                           ✓ Valid Donor Age (Age: {donorAge})
                        </p>
                      )}
                   </div>
                   <div className="space-y-4">
                      <label className="clinical-label">Gender & Weight</label>
                      <div className="grid grid-cols-2 gap-4">
                         <select value={donorForm.gender} onChange={e => setDonorForm({...donorForm, gender: e.target.value as 'Male' | 'Female'})} className="clinical-input py-8 appearance-none text-center">
                           <option value="Male">MALE</option><option value="Female">FEMALE</option>
                         </select>
                         <input required type="number" value={donorForm.weight} onChange={e => setDonorForm({...donorForm, weight: e.target.value})} placeholder="KG" className="clinical-input py-8 font-mono text-center text-xl text-sky-400" />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-10">
                   <div className="space-y-4">
                      <label className="clinical-label">Blood Type</label>
                      <div className="grid grid-cols-2 gap-4">
                         <select value={donorForm.bloodType} onChange={e => setDonorForm({...donorForm, bloodType: e.target.value})} className="clinical-input py-8 appearance-none text-center">
                           <option value="O">O</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option>
                         </select>
                         <select value={donorForm.rhd} onChange={e => setDonorForm({...donorForm, rhd: e.target.value})} className="clinical-input py-8 appearance-none text-center">
                           <option value="Positive">+</option><option value="Negative">-</option>
                         </select>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-[24px] border border-slate-800 mt-6">
                   <h4 className="text-rose-500 text-[10px] font-black uppercase tracking-widest mb-4">Vietnam Ministry of Health Questionnaire</h4>
                   <div className="space-y-4">
                      <label className="flex items-center gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-800/50 cursor-pointer">
                         <input type="checkbox" checked={donorForm.hadTattooRecently} onChange={e => setDonorForm({...donorForm, hadTattooRecently: e.target.checked})} className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500 w-5 h-5" />
                         <span className="font-bold text-[11px] uppercase tracking-wider">Had a tattoo or piercing within the last 6 months?</span>
                      </label>
                      <label className="flex items-center gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-800/50 cursor-pointer">
                         <input type="checkbox" checked={donorForm.traveledToMalariaZone} onChange={e => setDonorForm({...donorForm, traveledToMalariaZone: e.target.checked})} className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500 w-5 h-5" />
                         <span className="font-bold text-[11px] uppercase tracking-wider">Traveled to a malaria endemic zone within the last 12 months?</span>
                      </label>
                      <label className="flex items-center gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-800/50 cursor-pointer">
                         <input type="checkbox" checked={donorForm.feelingUnwell} onChange={e => setDonorForm({...donorForm, feelingUnwell: e.target.checked})} className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500 w-5 h-5" />
                         <span className="font-bold text-[11px] uppercase tracking-wider">Currently feeling unwell, taking medication, or having a fever?</span>
                      </label>
                      <label className="flex items-center gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-800/50 cursor-pointer">
                         <input type="checkbox" checked={donorForm.hasHighRiskCondition} onChange={e => setDonorForm({...donorForm, hasHighRiskCondition: e.target.checked})} className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500 w-5 h-5" />
                         <span className="font-bold text-[11px] uppercase tracking-wider">Have any high-risk conditions (e.g. HIV, Hepatitis)?</span>
                      </label>
                   </div>
                </div>
             </div>
             <div className="p-12 bg-slate-50/60 border-t border-slate-900 flex justify-end gap-6">
                <button type="button" onClick={() => setIsDonorModalOpen(false)} className="px-10 py-6 rounded-[20px] text-slate-600 font-black text-[11px] uppercase tracking-[0.3em] hover:text-slate-700 transition-colors">Abort</button>
                <button type="submit" className="clinical-btn-primary min-w-[240px]">{donorForm.id ? 'Save Changes' : 'Initialize Record'}</button>
             </div>
          </motion.form>
        </div>
      )}

      {/* Phlebotomy Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={submitCollectForm} 
            className="glass-station bg-slate-50 border-rose-500/20 w-full max-w-2xl overflow-hidden shadow-[0_0_150px_rgba(225,29,72,0.1)]"
          >
             <div className="p-12 border-b border-slate-900 flex justify-between items-center bg-rose-500/5">
                <div>
                   <h3 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Phlebotomy Initiation</h3>
                   <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">ISBT-128 Protocol Active</p>
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-rose-600 flex items-center justify-center text-white shadow-2xl shadow-rose-900/40">
                   <Droplet size={32} />
                </div>
             </div>
             <div className="p-12 space-y-10">
                {collectFormError && (
                  <div className="bg-rose-500/10 text-rose-500 text-xs font-black p-6 rounded-3xl border border-rose-500/20">{collectFormError}</div>
                )}
                <div className="space-y-4">
                   <label className="clinical-label">Unit Identification (DIN)</label>
                   <div className="relative group">
                      <input type="text" value={collectForm.customDonationId} onChange={e => setCollectForm({...collectForm, customDonationId: e.target.value.toUpperCase()})} className="clinical-input py-8 font-mono text-3xl tracking-widest text-rose-500" placeholder="=W0000 24 000000" />
                      <button type="button" onClick={() => setCollectForm({...collectForm, customDonationId: `=W0000 24 ${Math.floor(Math.random() * 900000 + 100000)}`})} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-800 transition-colors">
                         <RefreshCcw size={24} />
                      </button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="clinical-label">Target Volume (mL)</label>
                      <input required type="number" value={collectForm.volume} onChange={e => setCollectForm({...collectForm, volume: parseInt(e.target.value)})} className="clinical-input py-8 text-2xl text-center" />
                   </div>
                   <div className="space-y-4">
                      <label className="clinical-label">Collection Method</label>
                      <select value={collectForm.type} onChange={e => setCollectForm({...collectForm, type: e.target.value})} className="clinical-input py-8 appearance-none text-center italic">
                         <option value="WholeBlood">WHOLE BLOOD</option>
                         <option value="Apheresis">APHERESIS</option>
                      </select>
                   </div>
                </div>
             </div>
             <div className="p-12 bg-slate-50/60 border-t border-slate-900 flex justify-end gap-6">
                <button type="button" onClick={() => setIsCollectModalOpen(false)} className="px-10 py-6 rounded-[20px] text-slate-600 font-black text-[11px] uppercase tracking-[0.3em] hover:text-slate-700 transition-colors">Abort</button>
                <button type="submit" className="clinical-btn-primary min-w-[300px]">Start Collection Run</button>
             </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}

function SegmentBadge({ label, val, color }: any) {
  const colors: any = {
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/30'
  };

  return (
    <div className={`px-2 py-1 rounded-lg border ${colors[color]} flex flex-col items-center min-w-[40px]`}>
       <span className="text-[7px] font-black uppercase tracking-tighter opacity-60 leading-none mb-0.5">{label}</span>
       <span className="text-[10px] font-black font-mono leading-none">{val}</span>
    </div>
  );
}

