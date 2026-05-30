import React, { useState, useEffect, useMemo } from "react";
import { Database, Send, Beaker, ShieldAlert, CheckCircle, Activity, Globe, CheckSquare, Dna, ArrowRight, Users, ClipboardList, Thermometer, Droplet, AlertCircle, Plus, Search, Calendar, Hash, ShieldCheck, Wrench, X, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { ProductCatalog } from "../types";
import { useI18n } from "../lib/i18n";
import { LimsFlowIndicator } from './FlowIndicator';
import { VietnamIdValidator, validateDonorAge, validateCollectionVolume, validateDonorName, validateDonorWeight, validateVietnamDeferralRules, validateDonationInterval, generateValidCCCD } from '../lib/validators';
import type { DonationType } from '../types';

interface DonorCenterSimulatorViewProps {
  activeTab?: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE';
  onTabChange?: (tab: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE') => void;
  initialTab?: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE';
  user?: any;
}

export function DonorCenterSimulatorView({ 
  activeTab: controlledActiveTab, 
  onTabChange, 
  initialTab = 'DONOR',
  user
}: DonorCenterSimulatorViewProps) {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState<ProductCatalog[]>([]);
  const [localActiveTab, setLocalActiveTab] = useState<'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE'>(controlledActiveTab || initialTab);
  
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : localActiveTab;
  const setActiveTab = (tab: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setLocalActiveTab(tab);
    }
  };
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [gatingError, setGatingError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [limsToast, setLimsToast] = useState<{ title: string; message: string; nextStage?: 'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE'; nextLabel?: string } | null>(null);

  // MDM & Database Queue States
  const [orgs, setOrgs] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [dispatchMode, setDispatchMode] = useState<'Auto' | 'Shared' | 'Direct'>('Shared');
  const [dispatchChairId, setDispatchChairId] = useState<string>('Chair 1');
  const [selectedQueueDonor, setSelectedQueueDonor] = useState<any | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [simulatedChairDesk, setSimulatedChairDesk] = useState<string>('Chair 1');

  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
  const [donorForm, setDonorForm] = useState({
    id: '', name: '', nationalId: '', dob: '',
    gender: 'Male' as 'Male'|'Female', weight: '',
    bloodType: 'O', rhd: 'Positive',
    hadTattooRecently: false,
    traveledToMalariaZone: false,
    feelingUnwell: false,
    hasHighRiskCondition: false,
    recentVaccine: false,
    recentDentalSurgery: false,
    pregnancyOrLactation: false
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
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [viewingQuestionnaire, setViewingQuestionnaire] = useState<any | null>(null);

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
      
    fetch('/api/v1/lims/questionnaires')
      .then(res => res.ok ? res.json() : [])
      .then(d => setQuestionnaires(Array.isArray(d) ? d : []))
      .catch(() => setQuestionnaires([]));

    fetch('/api/v1/mdm/organizations')
      .then(res => res.ok ? res.json() : [])
      .then(d => setOrgs(Array.isArray(d) ? d : []))
      .catch(() => setOrgs([]));

    fetch('/api/v1/lims/queues')
      .then(res => res.ok ? res.json() : [])
      .then(d => setQueues(Array.isArray(d) ? d : []))
      .catch(() => setQueues([]));

    // Notify Sidebar to refresh workload badges
    window.dispatchEvent(new Event('lims-data-updated'));
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
    () => {
      const donor = donors.find(d => d.id === collectForm.donorId);
      const weightKg = donor?.weight ? Number(donor.weight) : undefined;
      return validateCollectionVolume(collectForm.volume, collectForm.type as DonationType, weightKg);
    },
    [collectForm.volume, collectForm.type, collectForm.donorId, donors]
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
          const interval = validateDonationInterval(donorDonations[0].collectedAt);
          if (!interval.eligible) {
            setDonorFormError(t('lims_err_donation_interval', {
              date: new Date(donorDonations[0].collectedAt).toLocaleDateString(),
              weeks: String(interval.weeksSinceLast ?? 0),
              required: String(interval.weeksRequired),
            }));
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
        setDonorLookupMessage(t('lims_msg_donor_loaded'));
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
       const quest = questionnaires.find(q => q.donorId === donor.id);
       const ans = quest ? JSON.parse(quest.answersJson || '{}') : {};
       setDonorForm({
         id: donor.id, name: donor.name, nationalId: donor.nationalId, dob: formattedDob,
         gender: donor.gender || 'Male', weight: donor.weight?.toString() || '',
         bloodType: donor.bloodType, rhd: donor.rhd,
         hadTattooRecently: ans.hadTattooRecently || false,
         traveledToMalariaZone: ans.traveledToMalariaZone || false,
         feelingUnwell: ans.feelingUnwell || false,
         hasHighRiskCondition: ans.hasHighRiskCondition || false,
         recentVaccine: ans.recentVaccine || false,
         recentDentalSurgery: ans.recentDentalSurgery || false,
         pregnancyOrLactation: ans.pregnancyOrLactation || false
       });
    } else {
       setDonorForm({
         id: '', name: '', nationalId: '', dob: '',
         gender: 'Male', weight: '',
         bloodType: 'O', rhd: 'Positive',
         hadTattooRecently: false, traveledToMalariaZone: false, feelingUnwell: false, hasHighRiskCondition: false,
         recentVaccine: false, recentDentalSurgery: false, pregnancyOrLactation: false
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
      setDonorFormError(t('lims_err_cccd_format', { detail: cccdVal.errors.join(', ') }));
      return;
    }

    // 3. Validate Date of Birth
    if (!donorForm.dob || donorForm.dob.length !== 10) {
      setDonorFormError(t('lims_err_dob_incomplete'));
      return;
    }
    const normalizedDob = donorForm.dob.replace(/\//g, '-');
    const ageVal = validateDonorAge(normalizedDob);
    if (!ageVal.valid) {
      setDonorFormError(t('lims_err_dob_invalid', { detail: ageVal.errors.join(', ') }));
      return;
    }

    // 4. Validate Weight
    const weightVal = validateDonorWeight(Number(donorForm.weight), donorForm.gender);
    if (!weightVal.valid) {
      setDonorFormError(t('lims_err_weight_invalid', { detail: weightVal.errors.join(', ') }));
      return;
    }

    // 4b. Enforce the inter-donation interval (VN26/AABB 12 weeks) at submit —
    // not just on CCCD entry — so a repeat donor cannot be enrolled for
    // collection too soon. Resolve last donation by national ID.
    const existingDonor = donors.find(d => d.nationalId === donorForm.nationalId);
    if (existingDonor) {
      const prior = donations
        .filter(d => d.donorId === existingDonor.id)
        .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
      if (prior.length > 0) {
        const interval = validateDonationInterval(prior[0].collectedAt);
        if (!interval.eligible) {
          setDonorFormError(t('lims_err_donation_interval', {
            date: new Date(prior[0].collectedAt).toLocaleDateString(),
            weeks: String(interval.weeksSinceLast ?? 0),
            required: String(interval.weeksRequired),
          }));
          return;
        }
      }
    }

    // 5. Check Deferrals
    const deferralCheck = validateVietnamDeferralRules({
      hadTattooRecently: donorForm.hadTattooRecently,
      traveledToMalariaZone: donorForm.traveledToMalariaZone,
      feelingUnwell: donorForm.feelingUnwell,
      hasHighRiskCondition: donorForm.hasHighRiskCondition,
      recentVaccine: donorForm.recentVaccine,
      recentDentalSurgery: donorForm.recentDentalSurgery,
      pregnancyOrLactation: donorForm.pregnancyOrLactation
    });

    const finalDeferralStatus = deferralCheck.deferred ? 'Active' : 'None';
    const finalDeferralReason = deferralCheck.reason || '';
    const finalDeferralUntil = deferralCheck.until || '';

    if (deferralCheck.deferred) {
      // Show error but we still submit the donor record to the database so it's tracked
      setDonorFormError(t('lims_err_deferred', {
        reason: deferralCheck.reason || '',
        until: deferralCheck.until ? new Date(deferralCheck.until).toLocaleDateString() : t('lims_deferral_permanent'),
      }));
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
      
      // If the donor is NOT deferred, open the Dispatch Modal so they can send the donor to Phlebotomy Chairs!
      if (finalDeferralStatus !== 'Active') {
        setSelectedQueueDonor({ id: data.id || donorForm.id || 'D-TEMP', name: donorForm.name });
        setIsDispatchModalOpen(true);
      } else {
        setLimsToast({
          title: t('lims_toast_deferred_title'),
          message: t('lims_toast_deferred_msg'),
          nextStage: 'DONOR',
          nextLabel: t('lims_btn_close')
        });
      }
    } catch(e: any) {
      setDonorFormError(e.message || "Network Error");
    }
  };

  const handleConfirmDispatch = async () => {
    if (!selectedQueueDonor) return;
    
    // User's active center ID (or fallback)
    const currentOrgId = user?.orgId || 'BC-HN-01';
    
    let targetChair = dispatchChairId;
    if (dispatchMode === 'Auto') {
      const orgQueues = queues.filter(q => q.orgId === currentOrgId && q.status === 'ASSIGNED');
      const org = orgs.find(o => o.id === currentOrgId);
      const chairsCount = org?.chairsCount || 3;
      
      let minCount = Infinity;
      let selectedChair = 'Chair 1';
      for (let i = 1; i <= chairsCount; i++) {
        const chairName = `Chair ${i}`;
        const chairLength = orgQueues.filter(q => q.chairId === chairName).length;
        if (chairLength < minCount) {
          minCount = chairLength;
          selectedChair = chairName;
        }
      }
      targetChair = selectedChair;
    }
    
    try {
      const res = await fetch('/api/v1/lims/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorId: selectedQueueDonor.id,
          donorName: selectedQueueDonor.name,
          orgId: currentOrgId,
          status: dispatchMode === 'Shared' ? 'WAITING' : 'ASSIGNED',
          dispatchMode: dispatchMode,
          chairId: dispatchMode === 'Shared' ? '' : targetChair
        })
      });
      
      if (res.ok) {
        setStatus({ type: 'success', msg: t('lims_msg_dispatch_success', { mode: dispatchMode }) });
        loadData();
      }
    } catch (err) {
      console.error("Dispatch error:", err);
    } finally {
      setIsDispatchModalOpen(false);
      setSelectedQueueDonor(null);
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

      // Remove from LIMS queue on successful collection
      const currentOrgId = user?.orgId || 'BC-HN-01';
      const queueEntry = queues.find(q => q.donorId === collectForm.donorId && q.orgId === currentOrgId);
      if (queueEntry) {
        await fetch(`/api/v1/lims/queues/${queueEntry.id}`, { method: 'DELETE' });
      }

      loadData();
      setIsCollectModalOpen(false);
    } catch(e: any) {
      setCollectFormError(e.message || "Network Error");
    }
  };

  const handleCallNext = async (chairName: string) => {
    const currentOrgId = user?.orgId || 'BC-HN-01';
    const waitingList = queues.filter(q => q.orgId === currentOrgId && q.status === 'WAITING');
    if (waitingList.length === 0) {
      setStatus({ type: 'error', msg: t('lims_triage_empty_pool_warning') });
      return;
    }
    const nextDonor = waitingList[0];
    
    try {
      const res = await fetch(`/api/v1/lims/queues/${nextDonor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ASSIGNED',
          chairId: chairName
        })
      });
      
      if (res.ok) {
        setStatus({ type: 'success', msg: `${t('lims_triage_call_next')}: ${nextDonor.donorName} ➔ ${chairName}` });
        loadData();
      }
    } catch (err) {
      console.error("Call next error:", err);
    }
  };

  const runIDMTests = async (donationId: string) => {
    setGatingError(null);
    
    // Hard Gating Check
    const reagents = resources.filter(r => r.type === 'Reagent');
    const expiredReagent = reagents.find(r => r.status === 'Expired');
    if (expiredReagent) {
       setGatingError(t('lims_gate_reagent_expired', { name: expiredReagent.name }));
       return;
    }

    const analyzers = resources.filter(r => r.name.includes('Analyzer'));
    const maintenanceRequired = analyzers.find(r => r.status === 'MaintenanceRequired');
    if (maintenanceRequired) {
       setGatingError(t('lims_gate_equip_maint', { name: maintenanceRequired.name }));
       return;
    }

    try {
      // We no longer fake the test result.
      // Instead, we just show a toast indicating it has been submitted to the IRL.
      // IRL must clear it via the IDM Testing module.
      
      setLimsToast({
        title: t('lims_toast_specimen_title'),
        message: t('lims_toast_specimen_msg'),
        nextStage: 'PROCESS',
        nextLabel: t('lims_status_cleared')
      });
    } catch(e) {}
  };

  const processComponent = async (donationId: string) => {
    setGatingError(null);
    
    // Hard Gating Check
    const centrifuges = resources.filter(r => r.name.includes('Centrifuge'));
    const maintenanceRequired = centrifuges.find(r => r.status === 'MaintenanceRequired');
    if (maintenanceRequired) {
       setGatingError(t('lims_gate_centrifuge_maint', { name: maintenanceRequired.name }));
       return;
    }

    const donation = donations.find(d => d.id === donationId);
    if (!donation || donation.idmStatus !== 'CLEARED') {
       setGatingError(t('lims_gate_idm_not_cleared', { status: donation?.idmStatus || 'PENDING' }));
       return;
    }

    try {
      const res = await fetch(`/api/v1/lims/process-component/${donationId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        loadData();
        // Toast: Component fabricated, guide to RELEASE
        setLimsToast({
          title: t('lims_toast_stage3_title'),
          message: t('lims_toast_stage3_msg'),
          nextStage: 'RELEASE',
          nextLabel: t('lims_toast_stage3_btn')
        });
      } else {
        setGatingError(t('lims_err_processing_failed', { detail: data.error || data.message || 'Validation Interlock Triggered' }));
      }
    } catch(e) {
      setGatingError(t('lims_err_network'));
    }
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
         // Toast: Released to Hub
         setLimsToast({
           title: t('lims_toast_stage4_title'),
           message: t('lims_toast_stage4_msg', { compId }),
         });
      } else {
         setStatus({ type: 'error', msg: t('lims_err_release_failed', { detail: data.error || data.message || 'Access Denied' }) });
      }
    } catch (err) {
       setStatus({ type: 'error', msg: t('lims_err_network') });
    } finally {
       setIsSyncing(false);
    }
  };

  const throughputReadiness = useMemo(() => {
    // KPI 1: Bed/Staff Utilization Rate (Donors waiting for phlebotomy)
    const pendingPhlebotomy = donors.length - donations.length;
    // KPI 2: Donations per Hour & Queue Length (Lab and processing backlog)
    const pendingLab = donations.filter(d => !d.labStatus || d.labStatus === 'PENDING').length;
    const pendingComponents = components.filter(c => c.status !== 'HUB INTRANSIT' && c.status !== 'READY').length;
    // KPI 3: Hardware & Consumables Health (broken machines). Use `status`
    // (the field resources actually carry) — `maintenanceStatus` never existed,
    // so equipment alarms were silently excluded from the readiness score.
    const activeAlarms = resources.filter(r => r.status === 'MaintenanceRequired' || r.status === 'Expired').length;

    // Base score is 100%, subtract points for bottlenecks
    let readiness = 100;
    readiness -= (pendingPhlebotomy * 15);
    readiness -= (pendingLab * 5);
    readiness -= (pendingComponents * 10);
    readiness -= (activeAlarms * 25);

    return Math.max(12, Math.min(100, readiness)); // Min 12% to keep UI visible, max 100%
  }, [donors, donations, components, resources]);

  const getProductName = (code: string) => catalog.find(c => c.productCode === code)?.alias || code;

  return (
    <div className="flex flex-col h-full bg-clinical-bg selection:bg-rose-500/30 overflow-hidden">
      {/* LIMS Stage Navigation Toast */}
      {limsToast && (
        <>
          <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-[2px] z-[190]" onClick={() => setLimsToast(null)} />
          <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[200] max-w-md w-full animate-in slide-in-from-top-4 duration-500 px-4">
            <div className="bg-clinical-card/95 backdrop-blur-2xl border border-clinical-border rounded-3xl shadow-2xl overflow-hidden">
              {/* Toast accent bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-clinical-primary via-sky-400 to-emerald-400" />
              <div className="p-8">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-[14px] font-black text-clinical-text uppercase tracking-tight mb-2 italic">{limsToast.title}</p>
                    <p className="text-[12px] text-clinical-muted leading-relaxed uppercase tracking-wide font-medium">{limsToast.message}</p>
                  </div>
                  <button
                    onClick={() => setLimsToast(null)}
                    className="p-2 text-clinical-muted hover:text-clinical-text transition-colors rounded-full hover:bg-clinical-bg shrink-0 border border-clinical-border/50 shadow-sm"
                  >
                    <X size={16} />
                  </button>
                </div>
                {limsToast.nextStage && (
                  <div className="mt-6 flex gap-4">
                    <button
                      onClick={() => {
                        setActiveTab(limsToast.nextStage!);
                        setLimsToast(null);
                      }}
                      className="flex-grow px-6 py-3.5 bg-clinical-primary hover:opacity-90 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-clinical-primary/20"
                    >
                      {limsToast.nextLabel || '前往下一步 →'}
                    </button>
                    <button
                      onClick={() => setLimsToast(null)}
                      className="px-6 py-3.5 bg-clinical-bg hover:bg-clinical-bg/60 border border-clinical-border text-clinical-muted hover:text-clinical-text rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                    >
                      {t('ui_later')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Decorative Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-sky-500 to-emerald-500 shrink-0" />

      {/* Active Mission Banner */}
      <div className="bg-rose-500/10 border-b border-rose-500/20 px-10 py-4 flex items-center justify-between group backdrop-blur-xl shrink-0">
         <div className="flex items-center gap-6">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.8)]" />
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] italic">{t('lims_active_mission')}</span>
               <span className="text-sm font-black text-clinical-text uppercase italic tracking-tighter">Site A Registration Overflow</span>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t('lims_throughput_readiness')}</span>
               <div className="flex items-center gap-3 mt-1">
                  <div className="h-1.5 w-48 bg-clinical-card rounded-full overflow-hidden p-0.5 border border-clinical-border shadow-inner">
                     <div className="h-full bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.6)] rounded-full transition-all duration-1000" style={{ width: `${throughputReadiness}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-clinical-text">{throughputReadiness}%</span>
               </div>
            </div>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Operational Viewport */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-clinical-bg">
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-right-12 duration-1000">
            
            {/* Contextual Header */}
            <div className="flex justify-between items-end border-b border-clinical-border pb-12">
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.6)]" />
                     <p className="text-clinical-muted text-[11px] font-black uppercase tracking-[0.5em]">VN-DONOR-NODE-01</p>
                  </div>
                  <h1 className="premium-heading">
                    {activeTab === 'DONOR' && t('lims_hdr_registry_control')}
                    {activeTab === 'LAB' && t('lims_hdr_clinical_diag')}
                    {activeTab === 'PROCESS' && t('lims_hdr_phlebotomy_ops')}
                    {activeTab === 'RELEASE' && t('lims_hdr_chain_custody')}
                  </h1>
               </div>
               {activeTab === 'DONOR' && (
                 <button onClick={() => openDonorModal()} className="clinical-btn-primary">
                   <Plus size={24} /> {t('lims_btn_register_donor')}
                 </button>
               )}
            </div>

            {gatingError && (
              <div className="p-8 rounded-[32px] bg-rose-500 border border-rose-400 text-clinical-text mb-8 flex gap-6 items-center animate-in shake duration-500 shadow-2xl shadow-rose-900/40">
                <ShieldAlert size={40} className="shrink-0" />
                <div className="flex-1">
                   <p className="font-black text-xs uppercase tracking-[0.2em] italic mb-1">{t('lims_safety_gate_title')}</p>
                   <p className="font-bold text-lg opacity-90 leading-tight">{gatingError}</p>
                </div>
                <button onClick={() => setGatingError(null)} className="px-6 py-3 bg-clinical-card hover:bg-clinical-card/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">{t('lims_btn_acknowledge')}</button>
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
                  <div className="flex justify-between items-center bg-clinical-bg/50 p-8 rounded-[32px] border border-clinical-border shadow-inner group">
                    <div className="flex items-center gap-6 text-clinical-muted flex-1">
                      <Search size={24} className="group-hover:text-rose-500 transition-colors" />
                      <input type="text" placeholder="Search donors by MRN, Name, or CCCD..." className="bg-transparent border-none focus:ring-0 text-lg font-medium w-full text-clinical-text placeholder:text-clinical-text" />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[40px] border border-clinical-border bg-clinical-card shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-clinical-bg text-clinical-muted text-sm font-black uppercase tracking-wider border-b border-clinical-border">
                        <tr>
                          <th className="p-8">{t('lims_col_donor_id')}</th>
                          <th className="p-8">{t('lims_col_name')}</th>
                          <th className="p-8 text-center">{t('lims_col_blood_type')}</th>
                          <th className="p-8">{t('lims_col_reg_date')}</th>
                          <th className="p-8 text-right">{t('lims_col_action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-clinical-border">
                        {donors.map((d, idx) => (
                          <tr key={`${d.id}-${idx}`} className="hover:bg-clinical-bg transition-all group duration-500">
                            <td className="p-8">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-clinical-bg flex items-center justify-center text-clinical-muted group-hover:bg-rose-500/20 group-hover:text-rose-600 transition-all">
                                   <Hash size={16} />
                                 </div>
                                 <span className="font-mono font-black text-clinical-muted tracking-tighter text-base">{d.id}</span>
                               </div>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                  <span className="font-black text-clinical-text text-lg italic uppercase">{d.name}</span>
                                  <span className="text-[10px] text-clinical-muted font-mono tracking-widest">{d.nationalId}</span>
                               </div>
                            </td>
                            <td className="p-8 text-center">
                              <span className={`inline-block px-4 py-2 rounded-2xl text-[11px] font-black tracking-[0.2em] ${d.rhd === 'Negative' ? 'bg-rose-950/30 text-rose-500 border border-rose-900/30' : 'bg-emerald-950/30 text-emerald-500 border border-emerald-900/30'}`}>
                                {d.bloodType}{d.rhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                 <span className="text-clinical-muted font-bold text-[13px]">{new Date(d.registeredAt).toLocaleDateString()}</span>
                                 <span className="text-[10px] text-clinical-muted font-mono uppercase">{new Date(d.registeredAt).toLocaleTimeString()}</span>
                               </div>
                            </td>
                            <td className="p-8 text-right">
                               <div className="flex gap-4 justify-end">
                                 <button 
                                   onClick={() => {
                                     const quest = questionnaires.find(q => q.donorId === d.id);
                                     if (quest) {
                                       setViewingQuestionnaire(quest);
                                     } else {
                                       setViewingQuestionnaire({
                                         id: 'QST-MOCK',
                                         donorId: d.id,
                                         answersJson: JSON.stringify({
                                           hadTattooRecently: false,
                                           traveledToMalariaZone: false,
                                           feelingUnwell: false,
                                           hasHighRiskCondition: false,
                                           recentVaccine: false,
                                           recentDentalSurgery: false,
                                           pregnancyOrLactation: false
                                         }),
                                         isPassed: d.deferralStatus === 'Active' ? 0 : 1,
                                         createdAt: d.registeredAt,
                                         deferralReason: d.deferralReason || '',
                                         deferralUntil: d.deferralUntil || ''
                                       });
                                     }
                                   }} 
                                   className="p-3 rounded-2xl bg-clinical-bg border border-clinical-border text-clinical-muted hover:text-sky-400 hover:border-sky-500/45 transition-all shadow-inner"
                                   title={t('qst_btn_view')}
                                 >
                                    <ClipboardList size={20} />
                                 </button>
                                 <button onClick={() => openDonorModal(d)} className="p-3 rounded-2xl bg-clinical-bg border border-clinical-border text-clinical-muted hover:text-clinical-text hover:border-slate-600 transition-all shadow-inner">
                                    <Activity size={20} />
                                 </button>
                                 <button 
                                   onClick={() => openCollectModal(d.id)} 
                                   disabled={d.deferralStatus === 'Active'}
                                   className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg italic ${d.deferralStatus === 'Active' ? 'bg-clinical-bg text-clinical-muted border border-clinical-border cursor-not-allowed' : 'bg-rose-600/10 text-rose-500 border border-rose-600/20 hover:bg-rose-600 hover:text-white hover:shadow-rose-900/20'}`}
                                 >
                                    {d.deferralStatus === 'Active' ? t('rare_stat_deferred') : t('lims_btn_collect')}
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
                            <p className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] mb-1">{t('lims_lab_queue_load')}</p>
                            <p className="text-3xl font-black text-clinical-text italic">{donations.filter(d => d.idmStatus === 'PENDING').length} {t('lims_unit_suffix')}</p>
                         </div>
                      </div>
                      <div className="glass-station p-8 flex items-center gap-8 group">
                         <div className="w-16 h-16 rounded-[24px] bg-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <CheckCircle size={32} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] mb-1">{t('lims_lab_diag_pass')}</p>
                            <p className="text-3xl font-black text-clinical-text italic">{donations.filter(d => d.idmStatus === 'CLEARED').length} {t('lims_unit_suffix')}</p>
                         </div>
                      </div>
                      <div className="glass-station p-8 flex items-center gap-8 group">
                         <div className="w-16 h-16 rounded-[24px] bg-rose-500/20 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                            <ShieldAlert size={32} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.3em] mb-1">{t('lims_lab_bio_risk')}</p>
                            <p className="text-3xl font-black text-clinical-text italic">{reactiveRate}% {t('lims_rate_suffix')}</p>
                         </div>
                      </div>
                   </div>

                   <div className="overflow-hidden rounded-[40px] border border-clinical-border bg-clinical-card shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-clinical-bg text-clinical-muted text-sm font-black uppercase tracking-wider border-b border-clinical-border">
                        <tr>
                          <th className="p-8">{t('lims_col_don_id')}</th>
                          <th className="p-8">{t('lims_col_name')}</th>
                          <th className="p-8 text-center">{t('lims_col_blood_type')}</th>
                          <th className="p-8">{t('lims_col_collected_at')}</th>
                          <th className="p-8">{t('lims_col_idm')}</th>
                          <th className="p-8 text-right">{t('lims_col_action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-clinical-border">
                        {donations.filter(d => Boolean(d.idmStatus)).map((donation, idx) => (
                          <tr key={`${donation.id}-${idx}`} className="hover:bg-clinical-bg transition-all duration-500 group">
                            <td className="p-8 font-mono font-black text-sky-400 tracking-tighter text-lg italic">{donation.id}</td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                 <span className="font-black text-clinical-text text-base italic uppercase">{donation.donorName}</span>
                                 <span className="text-[10px] text-clinical-muted uppercase font-bold tracking-widest">{donation.donationType} · {donation.volume}ml</span>
                               </div>
                            </td>
                            <td className="p-8 text-center">
                              <span className="bg-clinical-bg text-clinical-muted px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest border border-clinical-border">
                                {donation.donorAbo}{donation.donorRhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                 <span className="text-clinical-muted font-bold text-[13px]">{new Date(donation.collectedAt).toLocaleDateString()}</span>
                                 <span className="text-[10px] text-clinical-muted font-mono uppercase">{new Date(donation.collectedAt).toLocaleTimeString()}</span>
                               </div>
                            </td>
                            <td className="p-8">
                               {donation.idmStatus === 'PENDING' && (
                                 <div className="flex items-center gap-3 text-sky-400 font-black text-[10px] uppercase tracking-[0.3em] bg-sky-500/10 px-5 py-2 rounded-full w-fit border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                                    {t('lims_lab_diag_run')}
                                 </div>
                               )}
                               {donation.idmStatus === 'CLEARED' && (
                                 <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] bg-emerald-500/10 px-5 py-2 rounded-full w-fit border border-emerald-500/20">
                                    <CheckCircle size={14} />
                                    {t('lims_status_cleared')}
                                 </div>
                               )}
                               {donation.idmStatus === 'REACTIVE' && (
                                 <div className="flex items-center gap-3 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] bg-rose-500/10 px-5 py-2 rounded-full w-fit border border-rose-500/20">
                                    <ShieldAlert size={14} />
                                    {t('lims_status_reactive')}
                                 </div>
                               )}
                            </td>
                            <td className="p-8 text-right">
                              {donation.idmStatus === 'PENDING' && (
                                <button 
                                  onClick={() => runIDMTests(donation.id)}
                                  className="px-8 py-4 rounded-[18px] bg-sky-600 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sky-900/30 hover:scale-105 active:scale-95 transition-all italic"
                                >
                                  {t('lims_lab_process_diag')}
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
                <div className="space-y-12 animate-in fade-in duration-700">
                   
                   {/* Phlebotomy Chairs Triage Board */}
                   <div className="space-y-6">
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-4">
                            <Droplet className="text-rose-500 animate-pulse" size={24} />
                            <div>
                               <h2 className="text-2xl font-black text-clinical-text uppercase italic tracking-tighter">{t('lims_triage_board_title')}</h2>
                               <p className="text-[10px] text-clinical-muted uppercase font-black tracking-widest mt-1">{t('lims_triage_board_sub')}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <span className="text-[10px] font-black text-clinical-muted uppercase tracking-widest bg-clinical-card px-4 py-2 rounded-2xl border border-clinical-border">
                               {t('lims_triage_active_chairs')}: <span className="text-rose-500 font-mono font-black">{(orgs.find(o => o.id === (user?.orgId || 'BC-HN-01'))?.chairsCount || 3)}</span>
                            </span>
                         </div>
                      </div>

                      {/* Layout: Left Column = Waiting Pool, Right Column = Phlebotomy Chairs Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                         
                         {/* Shared Waiting Pool Panel (1/4 width) */}
                         <div className="lg:col-span-1 glass-station p-8 bg-clinical-card border-clinical-border rounded-[32px] flex flex-col h-[400px] shadow-sm">
                            <div className="flex justify-between items-center border-b border-clinical-border pb-4 mb-6 shrink-0">
                               <div className="flex items-center gap-3">
                                  <Users className="text-sky-400" size={18} />
                                  <span className="font-black text-sm uppercase italic tracking-tight text-clinical-text">{t('lims_triage_waiting_pool')}</span>
                                </div>
                                <span className="bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full text-[9px] font-mono font-black border border-sky-500/20 shadow-sm animate-pulse">
                                   {queues.filter(q => q.orgId === (user?.orgId || 'BC-HN-01') && q.status === 'WAITING').length}
                                </span>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4 pr-1">
                               {queues.filter(q => q.orgId === (user?.orgId || 'BC-HN-01') && q.status === 'WAITING').length === 0 ? (
                                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-clinical-border/50 rounded-2xl">
                                     <Activity size={24} className="text-clinical-muted/40 mb-3" />
                                     <p className="text-[10px] font-black uppercase text-clinical-muted tracking-widest">{t('lims_triage_empty_pool')}</p>
                                  </div>
                               ) : (
                                  queues.filter(q => q.orgId === (user?.orgId || 'BC-HN-01') && q.status === 'WAITING').map((q, idx) => (
                                     <div key={`wait-${q.id}-${idx}`} className="p-5 bg-clinical-bg border border-clinical-border rounded-2xl hover:border-slate-500 transition-all flex items-center justify-between group">
                                        <div className="flex flex-col">
                                           <span className="text-xs font-black uppercase italic text-clinical-text">{q.donorName}</span>
                                           <span className="text-[8px] font-mono text-clinical-muted mt-1 uppercase">ID: {q.donorId}</span>
                                        </div>
                                        <span className="text-[8px] font-mono bg-clinical-card px-2 py-1 rounded-md text-clinical-muted border border-clinical-border uppercase shrink-0">
                                           {t('lims_proc_wait')} #{idx + 1}
                                        </span>
                                     </div>
                                  ))
                               )}
                            </div>
                         </div>

                         {/* Active Chairs Dynamic Grid (3/4 width) */}
                         <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                            {Array.from({ length: orgs.find(o => o.id === (user?.orgId || 'BC-HN-01'))?.chairsCount || 3 }).map((_, idx) => {
                               const chairName = `Chair ${idx + 1}`;
                               const assignedDonor = queues.find(q => q.orgId === (user?.orgId || 'BC-HN-01') && q.chairId === chairName && q.status === 'ASSIGNED');
                               const chairNumber = idx + 1;

                               return (
                                  <div key={`desk-${chairName}`} className={`p-8 rounded-[32px] border flex flex-col justify-between transition-all duration-500 h-[380px] shadow-sm ${assignedDonor ? 'bg-rose-500/5 border-rose-500/30' : 'bg-clinical-card border-clinical-border'}`}>
                                     
                                     {/* Header */}
                                     <div className="flex justify-between items-start">
                                        <div>
                                           <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-clinical-muted">{t('lims_proc_desk')}</span>
                                           <h4 className="text-xl font-black text-clinical-text italic uppercase">CHAIR {chairNumber}</h4>
                                        </div>
                                        {assignedDonor ? (
                                           <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                              {t('lims_triage_busy')}
                                           </span>
                                        ) : (
                                           <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                              {t('lims_triage_idle')}
                                           </span>
                                        )}
                                     </div>

                                     {/* Center Patient Card or Empty State */}
                                     <div className="my-6 flex-grow flex flex-col justify-center">
                                        {assignedDonor ? (
                                           <div className="bg-clinical-bg p-5 rounded-2xl border border-clinical-border/80 shadow-inner">
                                              <p className="text-[8px] font-black text-clinical-muted uppercase tracking-widest mb-1">{t('lims_triage_current_donor')}</p>
                                              <p className="text-lg font-black text-clinical-text italic uppercase leading-none">{assignedDonor.donorName}</p>
                                              <p className="text-[9px] font-mono text-rose-500 mt-1.5 uppercase">ID: {assignedDonor.donorId}</p>
                                              {/* Show donor blood type if we can match it from donors list */}
                                              {(() => {
                                                 const dInfo = donors.find(d => d.id === assignedDonor.donorId);
                                                 if (dInfo) {
                                                    return (
                                                       <span className="inline-block mt-3 bg-rose-950/20 border border-rose-900/30 text-rose-500 px-3 py-1 rounded-lg text-[9px] font-black font-mono">
                                                          {dInfo.bloodType}{dInfo.rhd === 'Positive' ? '+' : '-'}
                                                       </span>
                                                    );
                                                 }
                                                 return null;
                                              })()}
                                           </div>
                                        ) : (
                                           <div className="border border-dashed border-clinical-border/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-clinical-bg/30">
                                              <Users size={20} className="text-clinical-muted/30 mb-2" />
                                              <p className="text-[9px] font-black text-clinical-muted uppercase tracking-widest">{t('lims_triage_no_occupied')}</p>
                                           </div>
                                        )}
                                     </div>

                                     {/* Action Footer */}
                                     <div className="shrink-0">
                                        {assignedDonor ? (
                                           <button 
                                             onClick={() => openCollectModal(assignedDonor.donorId)}
                                             className="w-full py-4 rounded-[18px] bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-950/40 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 italic"
                                           >
                                              <Droplet size={14} /> {t('lims_triage_collect_blood')}
                                           </button>
                                        ) : (
                                           <button 
                                             onClick={() => handleCallNext(chairName)}
                                             className="w-full py-4 rounded-[18px] bg-clinical-bg hover:bg-clinical-bg/60 border border-clinical-border text-clinical-text font-black text-[10px] uppercase tracking-widest shadow-sm hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 italic"
                                           >
                                              <ArrowRight size={14} /> {t('lims_triage_call_next')}
                                           </button>
                                        )}
                                     </div>

                                  </div>
                               );
                            })}
                         </div>

                      </div>
                   </div>

                   {/* Separator line */}
                   <div className="border-t border-clinical-border/50 pt-10" />

                   {/* 原有的 Component Fabrication 表格標題 */}
                   <div className="space-y-4">
                      <div className="flex items-center gap-4">
                         <Beaker className="text-sky-400" size={24} />
                         <div>
                            <h2 className="text-2xl font-black text-clinical-text uppercase italic tracking-tighter">{t('lims_centrifugation_title')}</h2>
                            <p className="text-[10px] text-clinical-muted uppercase font-black tracking-widest mt-1">{t('lims_centrifugation_sub')}</p>
                         </div>
                      </div>
                   </div>

                   {/* 原有的 Component Fabrication 表格 */}
                   <div className="overflow-hidden rounded-[40px] border border-clinical-border bg-clinical-card shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-clinical-bg text-clinical-muted text-sm font-black uppercase tracking-wider border-b border-clinical-border">
                        <tr>
                          <th className="p-8">{t('lims_col_unit_id')}</th>
                          <th className="p-8">{t('lims_col_serology')}</th>
                          <th className="p-8 text-center">Abo/Rh</th>
                          <th className="p-8">{t('lims_col_collected_at')}</th>
                          <th className="p-8">{t('lims_col_volume')}</th>
                          <th className="p-8 text-right">{t('lims_col_ops')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-clinical-border">
                        {donations.filter(d => Boolean(d.idmStatus) && d.componentCount === 0).map((donation, idx) => (
                          <tr key={`${donation.id}-${idx}`} className="hover:bg-clinical-bg transition-all group">
                            <td className="p-8 font-mono font-black text-clinical-text tracking-tighter text-lg italic">{donation.id}</td>
                            <td className="p-8">
                               {donation.idmStatus === 'CLEARED' ? (
                                 <span className="text-emerald-500 font-black text-[11px] uppercase tracking-[0.2em] bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">{t('lims_proc_safe')}</span>
                               ) : (
                                 <span className="text-rose-500 font-black text-[11px] uppercase tracking-[0.2em] bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">{t('lims_proc_biorisk')}</span>
                               )}
                            </td>
                            <td className="p-8 text-center">
                              <span className="bg-clinical-bg text-clinical-muted px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest border border-clinical-border">
                                {donation.donorAbo}{donation.donorRhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                 <span className="text-clinical-muted font-bold text-[13px]">{new Date(donation.collectedAt).toLocaleDateString()}</span>
                                 <span className="text-[10px] text-clinical-muted font-mono uppercase">{new Date(donation.collectedAt).toLocaleTimeString()}</span>
                               </div>
                            </td>
                            <td className="p-8 text-clinical-muted font-mono text-[13px]">{donation.volume} ml</td>
                            <td className="p-8 text-right">
                               {donation.idmStatus === 'REACTIVE' ? (
                                 <div className="bg-rose-950/30 border border-rose-900/30 text-rose-500 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic">{t('lims_proc_quarantine_restricted')}</div>
                               ) : (
                                 <button 
                                   onClick={() => processComponent(donation.id)}
                                   disabled={donation.idmStatus !== 'CLEARED'}
                                   className="px-8 py-4 rounded-[18px] bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-emerald-900/30 hover:scale-105 active:scale-95 transition-all italic disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                                 >
                                   {t('lims_proc_fabricate')}
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
                   <div className="overflow-hidden rounded-[40px] border border-clinical-border bg-clinical-card shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-clinical-bg text-clinical-muted text-sm font-black uppercase tracking-wider border-b border-clinical-border">
                        <tr>
                          <th className="p-8">{t('lims_col_global_id')}</th>
                          <th className="p-8">{t('lims_col_product_class')}</th>
                          <th className="p-8 text-center">Abo/Rh</th>
                          <th className="p-8">{t('lims_col_fabricated_at')}</th>
                          <th className="p-8">{t('lims_col_custody')}</th>
                          <th className="p-8 text-right">{t('lims_col_dispatch')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-clinical-border">
                        {components.filter(c => c.status !== 'QUARANTINE' && c.status !== 'DISCARDED').map((comp, idx) => (
                          <tr key={`${comp.id}-${comp.productCode}-${idx}`} className="hover:bg-clinical-bg transition-all group">
                            <td className="p-8 font-mono font-black text-clinical-text tracking-tighter text-xl italic">{comp.id}</td>
                            <td className="p-8 text-clinical-muted font-black uppercase italic tracking-tight">{getProductName(comp.productCode)}</td>
                            <td className="p-8 text-center">
                              <span className="bg-clinical-bg text-clinical-text px-4 py-2 rounded-2xl text-[11px] font-black tracking-widest border border-clinical-border">
                                {comp.abo}{comp.rhd === 'Positive' ? '+' : '-'}
                              </span>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                 <span className="text-clinical-muted font-bold text-[13px]">{new Date(comp.createdAt).toLocaleDateString()}</span>
                                 <span className="text-[10px] text-clinical-muted font-mono uppercase">{new Date(comp.createdAt).toLocaleTimeString()}</span>
                               </div>
                            </td>
                            <td className="p-8">
                               {comp.status === 'AVAILABLE' ? (
                                 <span className="flex items-center gap-3 text-amber-500 font-black text-[10px] uppercase tracking-[0.4em] bg-amber-500/10 px-5 py-2 rounded-full w-fit border border-amber-500/20">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    {t('lims_status_ready')}
                                 </span>
                               ) : (
                                 <span className="flex items-center gap-3 text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] bg-emerald-500/10 px-5 py-2 rounded-full w-fit border border-emerald-500/20">
                                    <Globe size={14} />
                                    {t('lims_status_hub_intransit')}
                                 </span>
                               )}
                            </td>
                            <td className="p-8 text-right">
                               {comp.status === 'AVAILABLE' && (
                                 <button 
                                   onClick={() => handleRelease(comp.id)}
                                   disabled={isSyncing}
                                   className="px-8 py-4 rounded-[18px] bg-clinical-bg text-clinical-text font-black text-[11px] uppercase tracking-[0.3em] shadow-sm hover:scale-105 active:scale-95 transition-all italic disabled:opacity-30 border border-clinical-border"
                                 >
                                   {isSyncing ? t('lims_btn_syncing') : t('lims_btn_release_hub')}
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
        <div className="fixed inset-0 bg-clinical-bg/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={submitDonorForm} 
            className="glass-station bg-clinical-bg border-clinical-border w-full max-w-2xl overflow-hidden shadow-2xl"
          >
             <div className="p-12 border-b border-clinical-border flex justify-between items-center bg-clinical-card">
                <div>
                   <h3 className="text-3xl font-black text-clinical-text uppercase italic tracking-tighter">{donorForm.id ? t('lims_form_modify_title') : t('lims_form_enroll_title')}</h3>
                   <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">{t('lims_form_subtitle')}</p>
                </div>
                <button type="button" onClick={() => setIsDonorModalOpen(false)} className="w-12 h-12 rounded-full bg-clinical-card border border-clinical-border flex items-center justify-center text-clinical-muted hover:text-clinical-text transition-all">
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
                          // Generate a CCCD that passes province/format validation
                          // (the previous random number could yield an invalid province code).
                          setDonorForm({...donorForm, nationalId: generateValidCCCD()});
                        }}
                        className="text-[9px] bg-sky-500/10 text-sky-400 px-4 py-2 rounded-xl border border-sky-500/20 hover:bg-sky-500 hover:text-clinical-text transition-all font-black uppercase tracking-widest flex items-center gap-2"
                      >
                         <Database size={12} /> {t('lims_form_scan_chip')}
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
                        {t('lims_cccd_valid')}
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
                           {t('lims_age_valid', { age: String(donorAge) })}
                        </p>
                      )}
                   </div>
                   <div className="space-y-4">
                      <label className="clinical-label">{t('lims_form_gender_weight')}</label>
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
                      <label className="clinical-label">{t('lims_form_blood_type')}</label>
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

                <div className="bg-clinical-bg p-6 rounded-[24px] border border-clinical-border mt-6">
                    <h4 className="text-rose-500 text-[10px] font-black uppercase tracking-widest mb-4">{t('qst_title')}</h4>
                    <div className="space-y-4">
                       <label className="flex items-center gap-4 text-sm text-clinical-text bg-clinical-bg p-4 rounded-xl border border-clinical-border cursor-pointer">
                          <input type="checkbox" checked={donorForm.hadTattooRecently} onChange={e => setDonorForm({...donorForm, hadTattooRecently: e.target.checked})} className="rounded bg-clinical-card border-clinical-border text-rose-500 focus:ring-rose-500 w-5 h-5" />
                          <span className="font-bold text-[11px] uppercase tracking-wider">{t('qst_recent_tattoo')}</span>
                       </label>
                       <label className="flex items-center gap-4 text-sm text-clinical-text bg-clinical-bg p-4 rounded-xl border border-clinical-border cursor-pointer">
                          <input type="checkbox" checked={donorForm.traveledToMalariaZone} onChange={e => setDonorForm({...donorForm, traveledToMalariaZone: e.target.checked})} className="rounded bg-clinical-card border-clinical-border text-rose-500 focus:ring-rose-500 w-5 h-5" />
                          <span className="font-bold text-[11px] uppercase tracking-wider">{t('qst_malaria_travel')}</span>
                       </label>
                       <label className="flex items-center gap-4 text-sm text-clinical-text bg-clinical-bg p-4 rounded-xl border border-clinical-border cursor-pointer">
                          <input type="checkbox" checked={donorForm.feelingUnwell} onChange={e => setDonorForm({...donorForm, feelingUnwell: e.target.checked})} className="rounded bg-clinical-card border-clinical-border text-rose-500 focus:ring-rose-500 w-5 h-5" />
                          <span className="font-bold text-[11px] uppercase tracking-wider">{t('qst_feeling_unwell')}</span>
                       </label>
                       <label className="flex items-center gap-4 text-sm text-clinical-text bg-clinical-bg p-4 rounded-xl border border-clinical-border cursor-pointer">
                          <input type="checkbox" checked={donorForm.recentVaccine} onChange={e => setDonorForm({...donorForm, recentVaccine: e.target.checked})} className="rounded bg-clinical-card border-clinical-border text-rose-500 focus:ring-rose-500 w-5 h-5" />
                          <span className="font-bold text-[11px] uppercase tracking-wider">{t('qst_recent_vaccine')}</span>
                       </label>
                       <label className="flex items-center gap-4 text-sm text-clinical-text bg-clinical-bg p-4 rounded-xl border border-clinical-border cursor-pointer">
                          <input type="checkbox" checked={donorForm.recentDentalSurgery} onChange={e => setDonorForm({...donorForm, recentDentalSurgery: e.target.checked})} className="rounded bg-clinical-card border-clinical-border text-rose-500 focus:ring-rose-500 w-5 h-5" />
                          <span className="font-bold text-[11px] uppercase tracking-wider">{t('qst_recent_dental')}</span>
                       </label>
                       {donorForm.gender === 'Female' && (
                         <label className="flex items-center gap-4 text-sm text-clinical-text bg-clinical-bg p-4 rounded-xl border border-clinical-border cursor-pointer">
                            <input type="checkbox" checked={donorForm.pregnancyOrLactation} onChange={e => setDonorForm({...donorForm, pregnancyOrLactation: e.target.checked})} className="rounded bg-clinical-card border-clinical-border text-rose-500 focus:ring-rose-500 w-5 h-5" />
                            <span className="font-bold text-[11px] uppercase tracking-wider">{t('qst_pregnancy_lactation')}</span>
                         </label>
                       )}
                       <label className="flex items-center gap-4 text-sm text-clinical-text bg-clinical-bg p-4 rounded-xl border border-clinical-border cursor-pointer">
                          <input type="checkbox" checked={donorForm.hasHighRiskCondition} onChange={e => setDonorForm({...donorForm, hasHighRiskCondition: e.target.checked})} className="rounded bg-clinical-card border-clinical-border text-rose-500 focus:ring-rose-500 w-5 h-5" />
                          <span className="font-bold text-[11px] uppercase tracking-wider">{t('qst_high_risk_cond')}</span>
                       </label>
                    </div>

                    {(() => {
                       const liveDeferral = validateVietnamDeferralRules({
                         hadTattooRecently: donorForm.hadTattooRecently,
                         traveledToMalariaZone: donorForm.traveledToMalariaZone,
                         feelingUnwell: donorForm.feelingUnwell,
                         hasHighRiskCondition: donorForm.hasHighRiskCondition,
                         recentVaccine: donorForm.recentVaccine,
                         recentDentalSurgery: donorForm.recentDentalSurgery,
                         pregnancyOrLactation: donorForm.pregnancyOrLactation
                       });
                       if (!liveDeferral.deferred) return null;
                       return (
                         <div className="mt-6 p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex flex-col gap-2 animate-pulse">
                           <h5 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-rose-400">
                             {t('qst_warning_title')}
                           </h5>
                           <p className="text-[11px] font-bold leading-relaxed">
                             {t('qst_warning_deferred')}
                           </p>
                           <div className="text-[10px] opacity-90 font-mono mt-1 space-y-1">
                             <div>• {t('qst_warning_reason')}: <span className="font-black italic">{liveDeferral.reason}</span></div>
                             <div>• {t('qst_warning_until')}: <span className="font-black italic">{liveDeferral.until ? new Date(liveDeferral.until).toLocaleDateString() : t('qst_warning_permanent')}</span></div>
                           </div>
                         </div>
                       );
                    })()}
                 </div>
             </div>
             <div className="p-12 bg-clinical-bg/60 border-t border-clinical-border flex justify-end gap-6">
                <button type="button" onClick={() => setIsDonorModalOpen(false)} className="px-10 py-6 rounded-[20px] text-clinical-muted font-black text-[11px] uppercase tracking-[0.3em] hover:text-clinical-text transition-colors">{t('lims_btn_abort')}</button>
                <button type="submit" className="clinical-btn-primary min-w-[240px]">{donorForm.id ? t('lims_btn_save_changes') : t('lims_btn_init_record')}</button>
             </div>
          </motion.form>
        </div>
      )}

      {/* Phlebotomy Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 bg-clinical-bg/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={submitCollectForm} 
            className="glass-station bg-clinical-bg border-rose-500/20 w-full max-w-2xl overflow-hidden shadow-[0_0_150px_rgba(225,29,72,0.1)]"
          >
             <div className="p-12 border-b border-clinical-border flex justify-between items-center bg-rose-500/5">
                <div>
                   <h3 className="text-3xl font-black text-clinical-text uppercase italic tracking-tighter">{t('lims_modal_phlebotomy_title')}</h3>
                   <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">{t('lims_modal_isbt_protocol')}</p>
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
                   <label className="clinical-label">{t('lims_modal_din')}</label>
                   <div className="relative group">
                      <input type="text" value={collectForm.customDonationId} onChange={e => setCollectForm({...collectForm, customDonationId: e.target.value.toUpperCase()})} className="clinical-input py-8 font-mono text-3xl tracking-widest text-rose-500" placeholder="=W0000 24 000000" />
                      <button type="button" onClick={() => setCollectForm({...collectForm, customDonationId: `=W0000 24 ${Math.floor(Math.random() * 900000 + 100000)}`})} className="absolute right-6 top-1/2 -translate-y-1/2 text-clinical-text hover:text-clinical-text transition-colors">
                         <RefreshCcw size={24} />
                      </button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="clinical-label">{t('lims_modal_target_vol')}</label>
                      <input required type="number" value={collectForm.volume} onChange={e => setCollectForm({...collectForm, volume: parseInt(e.target.value)})} className={`clinical-input py-8 text-2xl text-center ${!volumeValidation.valid ? 'border-rose-500/60 text-rose-500' : ''}`} />
                      {collectForm.volume > 0 && !volumeValidation.valid && (
                        <p className="text-rose-500 text-[10px] font-black uppercase mt-2 px-1 leading-relaxed">
                           ⚠️ {volumeValidation.errors.join(', ')}
                        </p>
                      )}
                      {collectForm.volume > 0 && volumeValidation.valid && (
                        <p className="text-emerald-500 text-[10px] font-black uppercase mt-2 px-1">
                           {t('lims_vol_ok')}
                        </p>
                      )}
                   </div>
                   <div className="space-y-4">
                      <label className="clinical-label">{t('lims_modal_coll_method')}</label>
                      <select value={collectForm.type} onChange={e => setCollectForm({...collectForm, type: e.target.value})} className="clinical-input py-8 appearance-none text-center italic uppercase">
                         <option value="WholeBlood">{t('lims_type_wb')}</option>
                         <option value="Apheresis">{t('lims_type_apheresis')}</option>
                      </select>
                   </div>
                </div>
             </div>
             <div className="p-12 bg-clinical-bg/60 border-t border-clinical-border flex justify-end gap-6">
                <button type="button" onClick={() => setIsCollectModalOpen(false)} className="px-10 py-6 rounded-[20px] text-clinical-muted font-black text-[11px] uppercase tracking-[0.3em] hover:text-clinical-text transition-colors">{t('lims_modal_abort')}</button>
                <button type="submit" disabled={!volumeValidation.valid} className={`clinical-btn-primary min-w-[300px] ${!volumeValidation.valid ? 'opacity-40 cursor-not-allowed' : ''}`}>{t('lims_modal_start_run')}</button>
             </div>
          </motion.form>
        </div>
      )}

      {/* Smart Workflow Dispatcher Modal */}
      {isDispatchModalOpen && selectedQueueDonor && (
        <div className="fixed inset-0 bg-clinical-bg/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-station bg-clinical-bg border-rose-500/20 w-full max-w-2xl overflow-hidden shadow-[0_0_150px_rgba(225,29,72,0.1)]"
          >
             <div className="p-12 border-b border-clinical-border flex justify-between items-center bg-rose-500/5">
                <div>
                   <h3 className="text-3xl font-black text-clinical-text uppercase italic tracking-tighter">{t('lims_triage_dispatch_title')}</h3>
                   <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">{t('lims_triage_dispatch_sub')}</p>
                </div>
                <div className="w-16 h-16 rounded-[24px] bg-rose-600 flex items-center justify-center text-white shadow-2xl shadow-rose-900/40">
                   <Users size={32} />
                </div>
             </div>
             
             <div className="p-12 space-y-8">
                <div className="bg-clinical-bg p-6 rounded-[24px] border border-clinical-border">
                   <p className="text-[10px] font-black text-clinical-muted uppercase tracking-widest mb-1">{t('lims_triage_selected_donor')}</p>
                   <p className="text-2xl font-black text-clinical-text italic uppercase">{selectedQueueDonor.name}</p>
                   <p className="text-xs text-rose-500 font-mono mt-1">ID: {selectedQueueDonor.id}</p>
                </div>

                <div className="space-y-4">
                   <label className="clinical-label">{t('lims_triage_dispatch_mode')}</label>
                   <div className="grid grid-cols-3 gap-4">
                      {/* Auto Card */}
                      <button 
                        type="button" 
                        onClick={() => setDispatchMode('Auto')}
                        className={`p-6 rounded-2xl border text-left transition-all ${dispatchMode === 'Auto' ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-clinical-bg border-clinical-border text-clinical-muted hover:border-slate-500'}`}
                      >
                         <div className="font-black text-sm uppercase mb-1">{t('lims_triage_mode_auto')}</div>
                         <div className="text-[9px] uppercase tracking-wider opacity-80">{t('lims_triage_mode_auto_sub')}</div>
                      </button>

                      {/* Shared Card */}
                      <button 
                        type="button" 
                        onClick={() => setDispatchMode('Shared')}
                        className={`p-6 rounded-2xl border text-left transition-all ${dispatchMode === 'Shared' ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-clinical-bg border-clinical-border text-clinical-muted hover:border-slate-500'}`}
                      >
                         <div className="font-black text-sm uppercase mb-1">{t('lims_triage_mode_shared')}</div>
                         <div className="text-[9px] uppercase tracking-wider opacity-80">{t('lims_triage_mode_shared_sub')}</div>
                      </button>

                      {/* Direct Card */}
                      <button 
                        type="button" 
                        onClick={() => setDispatchMode('Direct')}
                        className={`p-6 rounded-2xl border text-left transition-all ${dispatchMode === 'Direct' ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-clinical-bg border-clinical-border text-clinical-muted hover:border-slate-500'}`}
                      >
                         <div className="font-black text-sm uppercase mb-1">{t('lims_triage_mode_direct')}</div>
                         <div className="text-[9px] uppercase tracking-wider opacity-80">{t('lims_triage_mode_direct_sub')}</div>
                      </button>
                   </div>
                </div>

                {dispatchMode === 'Direct' && (
                   <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <label className="clinical-label">{t('lims_triage_assign_chair')}</label>
                      <select 
                        value={dispatchChairId} 
                        onChange={e => setDispatchChairId(e.target.value)} 
                        className="clinical-input py-8 appearance-none text-center italic uppercase font-black tracking-widest text-sky-400"
                      >
                         {Array.from({ length: orgs.find(o => o.id === (user?.orgId || 'BC-HN-01'))?.chairsCount || 3 }).map((_, i) => (
                            <option key={`chair-${i+1}`} value={`Chair ${i+1}`}>CHAIR {i+1}</option>
                         ))}
                      </select>
                   </div>
                )}
             </div>

             <div className="p-12 bg-clinical-bg/60 border-t border-clinical-border flex justify-end gap-6">
                <button 
                  type="button" 
                  onClick={() => {
                     setIsDispatchModalOpen(false);
                     setSelectedQueueDonor(null);
                  }} 
                  className="px-10 py-6 rounded-[20px] text-clinical-muted font-black text-[11px] uppercase tracking-[0.3em] hover:text-clinical-text transition-colors"
                >
                   {t('lims_triage_btn_cancel')}
                </button>
                <button 
                  type="button" 
                  onClick={handleConfirmDispatch}
                  className="clinical-btn-primary min-w-[240px]"
                >
                   {t('lims_triage_btn_confirm')}
                </button>
             </div>
          </motion.div>
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
    slate: 'bg-slate-500/10 text-clinical-muted border-slate-500/30'
  };

  return (
    <div className={`px-2 py-1 rounded-lg border ${colors[color]} flex flex-col items-center min-w-[40px]`}>
       <span className="text-[7px] font-black uppercase tracking-tighter opacity-60 leading-none mb-0.5">{label}</span>
       <span className="text-[10px] font-black font-mono leading-none">{val}</span>
    </div>
  );
}

