import React, { useState, useEffect, Suspense, lazy } from 'react';
import { GlobalHeader } from './components/GlobalHeader';
import { MessagingCenter } from './components/MessagingCenter';
import { BloodDropLogo } from './components/BloodDropLogo';
import { HospitalOperatorView } from './components/HospitalOperatorView';
import { HospitalInventoryView } from './components/HospitalInventoryView';
import { SystemSwitcher } from './components/SystemSwitcher';
import { DispatcherView } from './components/DispatcherView';
import { WarehouseView } from './components/WarehouseView';
import { AuditLogViewer } from './components/AuditLogViewer';
import { MedicalReviewerView } from './components/MedicalReviewerView';
import { ManagerKPIView } from './components/ManagerKPIView';
import { CourierView } from './components/CourierView';
import { BedsideVerificationView } from './components/BedsideVerificationView';
import { SystemDiagnosticView } from './components/SystemDiagnosticView';
import { DonorCenterSimulatorView } from './components/DonorCenterSimulatorView';
import { FlowIndicator } from './components/FlowIndicator';
import { Role, User, SystemType } from './types';
import { I18nProvider, useI18n } from './lib/i18n';
import { 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  Settings, 
  Truck, 
  Syringe, 
  ClipboardCheck, 
  Globe, 
  ExternalLink, 
  Activity, 
  RefreshCcw, 
  LogOut, 
  ChevronLeft, 
  Database, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  ArrowUpRight, 
  Package, 
  ArrowRightLeft,
  X
} from 'lucide-react';
import { LoginView } from './components/LoginView';
import { PortalView } from './components/PortalView';
import { Tooltip } from './components/Tooltip';
import { AdminMDMView } from './components/AdminMDMView';
import { DocsView } from './components/DocsView';
import { CrossmatchView } from './components/CrossmatchView';
import { IssueReturnView } from './components/IssueReturnView';
import { HemovigilanceView } from './components/HemovigilanceView';
import { RareDonorView } from './components/RareDonorView';
import { MtpEmergencyView } from './components/MtpEmergencyView';
import { ResourceManagementView } from './components/ResourceManagementView';
import { NationalDashboardView } from './components/NationalDashboardView';
import { Sidebar } from './components/Sidebar';
import { TaskQueue } from './components/TaskQueue';
import { LabDashboardView } from './components/LabDashboardView';
import { IdmTestingView } from './components/IdmTestingView';
import { offlineStore } from './lib/offlineStore';
import { ThemeSwitcher, ThemeType } from './components/ThemeSwitcher';

function getSubRoles(mainRole: string): Role[] {
  if (mainRole === 'Admin' || mainRole === 'Manager') return [
    'HospitalOperator', 'Nurse', 'Nurse_Hemovigilance', 'Nurse_MTP',
    'WarehouseIssuer', 'Warehouse_IssueReturn', 'Dispatcher', 'Courier', 'Resource',
    'LabTech_Crossmatch', 'MedicalReviewer', 'SOP11_RareDonor',
    'Manager', 'Auditor', 'NationalCommander', 'QA_Officer', 'Admin'
  ] as Role[];
  return [mainRole as Role];
}

function AppContent() {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [currentSystem, setCurrentSystem] = useState<SystemType | null>(null);
  const [role, setRole] = useState<Role>(() => {
    const saved = localStorage.getItem('vnbbms_role');
    return saved ? saved as Role : 'Admin';
  });
  const [limsTab, setLimsTab] = useState<'DONOR' | 'LAB' | 'PROCESS' | 'RELEASE'>('DONOR');
  const [isOffline, setIsOffline] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [localEventsCount, setLocalEventsCount] = useState(0);
  const [nationalTab, setNationalTab] = useState('overview');
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('vnbbms_theme');
    return (saved as ThemeType) || 'classic-medical-blue';
  });
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  const [warehouseTab, setWarehouseTab] = useState<'DISPATCH' | 'INVENTORY' | 'RESOURCES'>('DISPATCH');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vnbbms_theme', theme);
    const isDark = ['slate-corporate', 'tech-lavender', 'minty-aqua', 'aurora-glow'].includes(theme);
    document.documentElement.classList.toggle('dark', isDark);
  }, [theme]);

  useEffect(() => {
    if (currentSystem === 'LIMS' && user) {
      // Auto-select first permitted LIMS stage based on user role
      const role = user.role;
      if (role === 'DonorScreener') setLimsTab('DONOR');
      else if (role === 'Nurse') setLimsTab('LAB');
      else if (role === 'LIMS_Simulator') setLimsTab('RELEASE');
      else setLimsTab('DONOR'); // Admin/Manager: start at DONOR
    }
  }, [currentSystem, user]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/v1/inventory');
      const data = await res.json();
      setInventory(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (user && (currentSystem === 'HUB' || currentSystem === 'HOSPITAL')) fetchInventory();
  }, [user, currentSystem]);

  useEffect(() => {
    localStorage.setItem('vnbbms_role', role);
  }, [role]);

  const handleLogin = (u: User) => {
    setUser(u);
    setRole('Dashboard');
    if (u.permittedSystems.length === 1) setCurrentSystem(u.permittedSystems[0]);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentSystem(null);
  };

  const handleLaunchMission = (roleTarget: Role) => {
    let system: SystemType | null = null;
    
    if (['WarehouseIssuer', 'Warehouse_IssueReturn', 'Dispatcher', 'Courier', 'Resource', 'Manager', 'QA_Officer', 'Auditor'].includes(roleTarget)) {
      system = 'HUB';
    } else if (['HospitalOperator', 'Nurse', 'Nurse_MTP', 'Nurse_Hemovigilance'].includes(roleTarget)) {
      system = 'HOSPITAL';
    } else if (['LabTech_Crossmatch', 'MedicalReviewer', 'SOP11_RareDonor'].includes(roleTarget)) {
      system = 'LAB';
    } else if (['LIMS_Simulator', 'DonorScreener'].includes(roleTarget)) {
      system = 'LIMS';
    } else if (['NationalCommander'].includes(roleTarget)) {
      system = 'NATIONAL';
    } else if (roleTarget === 'Admin') {
      system = 'NATIONAL';
    }
    
    if (system) {
      setCurrentSystem(system);
      setRole(roleTarget);
    }
  };

  const handleResetSystem = async () => {
    setShowConfirmReset(false);
    setIsResetting(true);
    try {
      await fetch('/api/v1/reset', { method: 'POST' });
      window.location.reload();
    } catch (e) {
      setIsResetting(false);
    }
  };

  const handleOfflineRelease = async (unitId: string, pId: string, dId: string) => {
    try {
      await offlineStore.saveEvent({
        hospitalId: 'HOSP-DEFAULT',
        unitBarcodeRaw: unitId,
        patientTempId: pId,
        authorizationDoctorId: dId,
        timestamp: new Date().toISOString()
      });
      const pending = await offlineStore.getPendingEvents();
      setLocalEventsCount(pending.length);
    } catch (e) {}
  };

  const renderSystemView = () => {
    if (currentSystem === 'MDM') return <AdminMDMView onBack={() => setCurrentSystem(null)} mode="MDM" />;
    if (currentSystem === 'IAM') return <AdminMDMView onBack={() => setCurrentSystem(null)} mode="IAM" />;
    if (currentSystem === 'DASHBOARD') return <NationalDashboardView onBack={() => setCurrentSystem(null)} />;
    
    if (currentSystem === 'NATIONAL') {
       return (
         <div className="flex-1 flex overflow-hidden">
           <aside className="w-72 bg-clinical-card/85 border-r border-clinical-border flex flex-col h-full overflow-y-auto shrink-0 shadow-2xl z-40 backdrop-blur-xl transition-all duration-300">
             <div className="p-8">
               <div className="flex items-center gap-5 mb-8 px-2 group">
                 <ShieldCheck size={24} className="text-rose-500" />
                 <div>
                   <h2 className="text-[14px] font-black text-clinical-text uppercase tracking-[0.4em] italic leading-none group-hover:text-clinical-primary transition-colors">VN-BECS</h2>
                   <p className="text-[9px] text-clinical-muted font-black uppercase tracking-[0.25em] mt-2 opacity-80 italic">
                     National Command
                   </p>
                 </div>
               </div>

               <nav className="space-y-10">
                  <button
                    onClick={() => setCurrentSystem(null)}
                    className="w-full flex items-center justify-center gap-4 px-6 py-3.5 bg-transparent border-2 border-cyan-500/50 rounded-full text-cyan-400 hover:bg-cyan-500 hover:text-slate-900 hover:border-cyan-500 transition-all duration-300 group shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 mb-10"
                  >
                    <ArrowRightLeft size={18} className="group-hover:rotate-180 transition-all duration-500" />
                    <span className="text-[12px] font-extrabold uppercase tracking-[0.25em] italic">SYSTEM PORTAL</span>
                  </button>

                 <div className="space-y-4">
                    <button onClick={() => setNationalTab('overview')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] transition-all group ${nationalTab === 'overview' ? 'bg-clinical-primary text-white shadow-lg' : 'text-clinical-muted hover:bg-slate-100 hover:text-clinical-text'}`}>
                      <Activity size={20} /> <span className="font-black uppercase tracking-widest text-xs italic">Overview</span>
                    </button>
                    <button onClick={() => setNationalTab('inventory')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] transition-all group ${nationalTab === 'inventory' ? 'bg-clinical-primary text-white shadow-lg' : 'text-clinical-muted hover:bg-slate-100 hover:text-clinical-text'}`}>
                      <Database size={20} /> <span className="font-black uppercase tracking-widest text-xs italic">Inventory</span>
                    </button>
                    <button onClick={() => setNationalTab('logistics')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] transition-all group ${nationalTab === 'logistics' ? 'bg-clinical-primary text-white shadow-lg' : 'text-clinical-muted hover:bg-slate-100 hover:text-clinical-text'}`}>
                      <Truck size={20} /> <span className="font-black uppercase tracking-widest text-xs italic">Logistics</span>
                    </button>
                    <button onClick={() => setNationalTab('surveillance')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] transition-all group ${nationalTab === 'surveillance' ? 'bg-clinical-primary text-white shadow-lg' : 'text-clinical-muted hover:bg-slate-100 hover:text-clinical-text'}`}>
                      <ShieldCheck size={20} /> <span className="font-black uppercase tracking-widest text-xs italic">Surveillance</span>
                    </button>
                    <button onClick={() => setNationalTab('war_games')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] transition-all group ${nationalTab === 'war_games' ? 'bg-rose-600 text-white shadow-lg' : 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'}`}>
                      <Zap size={20} /> <span className="font-black uppercase tracking-widest text-xs italic">War Games</span>
                    </button>
                 </div>
               </nav>
             </div>
           </aside>
            <main className="flex-1 overflow-y-auto bg-clinical-bg relative">
               {nationalTab === 'overview' && <NationalDashboardView />}
               {nationalTab === 'inventory' && <HospitalInventoryView />}
               {nationalTab === 'logistics' && <ResourceManagementView />}
               {nationalTab === 'surveillance' && <AuditLogViewer />}
               {nationalTab === 'war_games' && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-700">
                     <h3 className="text-3xl font-black text-slate-800 uppercase italic">Command War Games Active</h3>
                  </div>
               )}
            </main>
         </div>
       );
    }

    if (currentSystem === 'LIMS') {
      return (
        <DonorCenterSimulatorView 
          activeTab={limsTab} 
          onTabChange={setLimsTab} 
          user={user!}
        />
      );
    }

    if (currentSystem === 'LAB') {
       return (
         <div className="flex-1 flex flex-col overflow-hidden">
            <FlowIndicator role={role} />
            <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-clinical-bg">
               {role === 'Dashboard' && <LabDashboardView />}
               {role === 'LabTech_Crossmatch' && <CrossmatchView user={user!} />}
               {role === 'MedicalReviewer' && <IdmTestingView />}
               {role === 'SOP11_RareDonor' && <RareDonorView />}
               {role !== 'Dashboard' && role !== 'LabTech_Crossmatch' && role !== 'MedicalReviewer' && role !== 'SOP11_RareDonor' && <LabDashboardView />}
            </main>
         </div>
       );
    }
    
    if (currentSystem === 'HOSPITAL') {
       return (
         <div className="flex-1 flex flex-col overflow-hidden">
            <FlowIndicator role={role} />
            <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-clinical-bg">
               {role === 'Dashboard' && <TaskQueue role={user!.role} onNavigate={setRole} />}
               {role === 'HospitalOperator' && (
                 <HospitalOperatorView 
                    user={user!} inventory={inventory} isOffline={isOffline} 
                    localEventsCount={localEventsCount} onSync={fetchInventory} onLogout={handleLogout} 
                    onOfflineRelease={handleOfflineRelease} 
                 />
               )}
               {role === 'Nurse' && <BedsideVerificationView />}
               {role === 'Nurse_MTP' && <MtpEmergencyView />}
               {role === 'Nurse_Hemovigilance' && <HemovigilanceView />}
            </main>
         </div>
       );
    }

    if (currentSystem === 'HUB') {
       return (
         <div className="flex-1 flex flex-col overflow-hidden">
            <FlowIndicator role={role} />
            <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-clinical-bg">
               {role === 'Dashboard' && <TaskQueue role={user!.role} onNavigate={setRole} />}
               {role === 'Dispatcher' && <DispatcherView />}
               {role === 'WarehouseIssuer' && <WarehouseView activeTab={warehouseTab} setActiveTab={setWarehouseTab} />}
               {role === 'Warehouse_IssueReturn' && <IssueReturnView />}
               {role === 'Courier' && <CourierView />}
               {role === 'Resource' && <ResourceManagementView />}
               {role === 'Manager' && <ManagerKPIView onBack={() => setRole('Dashboard')} />}
               {role === 'Admin' && <ManagerKPIView onBack={() => setRole('Dashboard')} />}
               {role === 'NationalCommander' && <NationalDashboardView />}
               {role === 'Auditor' && <AuditLogViewer />}
               {role === 'QA_Officer' && <AuditLogViewer />}
            </main>
         </div>
       );
    }

    return <PortalView 
      user={user!} 
      onSelectSystem={setCurrentSystem} 
      onSelectRole={setRole} 
      onLogout={handleLogout} 
      onOpenDocs={() => setShowDocs(true)} 
      onOpenSwitcher={() => setShowSwitcher(true)} 
      onOpenThemeSwitcher={() => setShowThemeSwitcher(true)} 
      onLaunchMission={handleLaunchMission}
    />;
  };

  if (showDocs) return <DocsView onBack={() => setShowDocs(false)} />;
  if (!user) return <LoginView onLogin={handleLogin} onOpenDocs={() => setShowDocs(true)} />;

  return (
    <div className="flex flex-col h-screen bg-clinical-bg text-clinical-text overflow-hidden font-sans selection:bg-rose-500/30">
      <GlobalHeader 
        user={user} 
        isOffline={isOffline} 
        onLogout={handleLogout} 
        onOpenMessages={() => { setShowMessages(true); setUnreadCount(0); }}
        onOpenSwitcher={() => setShowSwitcher(true)}
        onOpenThemeSwitcher={() => setShowThemeSwitcher(true)}
        unreadMessages={unreadCount}
        systemName={currentSystem ? `VN-BECS · ${currentSystem === 'HUB' ? 'Supply Hub' : currentSystem === 'LIMS' ? 'Blood Center LIMS' : currentSystem === 'LAB' ? 'Clinical Laboratory' : currentSystem === 'HOSPITAL' ? 'Hospital Node' : currentSystem === 'NATIONAL' ? 'National Command' : currentSystem} Command` : "VN-BECS V1.0 Enterprise"}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {currentSystem && ['LIMS', 'LAB', 'HOSPITAL', 'HUB'].includes(currentSystem) && (
          <Sidebar 
            currentRole={role} 
            setRole={setRole} 
            allowedRoles={getSubRoles(user.role)} 
            currentSystem={currentSystem}
            limsTab={limsTab}
            setLimsTab={setLimsTab}
            warehouseTab={warehouseTab}
            setWarehouseTab={setWarehouseTab}
            onReturnToPortal={() => setCurrentSystem(null)}
            user={user}
          />
        )}
        <main className="flex-1 relative overflow-hidden flex flex-col">
           <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" /></div>}>
              {renderSystemView()}
           </Suspense>
        </main>
      </div>

      <MessagingCenter currentUser={user} isOpen={showMessages} onClose={() => setShowMessages(false)} />
      <SystemSwitcher isOpen={showSwitcher} onClose={() => setShowSwitcher(false)} onSelect={setCurrentSystem} currentSystem={currentSystem} />
      <ThemeSwitcher isOpen={showThemeSwitcher} onClose={() => setShowThemeSwitcher(false)} currentTheme={theme} onSelectTheme={setTheme} />
      {showDocs && <DocsView onBack={() => setShowDocs(false)} />}
      {showDiagnostic && <SystemDiagnosticView onClose={() => setShowDiagnostic(false)} />}

      {showConfirmReset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100 backdrop-blur-md p-4">
          <div className="clinical-card max-w-sm w-full bg-white border-clinical-border rounded-3xl overflow-hidden shadow-2xl">
             <div className="p-6 border-b border-clinical-border bg-slate-50"><h3 className="text-sm font-black text-clinical-text uppercase italic tracking-widest">Confirm System Reset</h3></div>
             <div className="p-8"><p className="text-slate-600 text-[11px] font-black uppercase tracking-widest leading-relaxed">Execute full command reset? All data will be baseline initialized.</p></div>
             <div className="p-6 bg-slate-50/50 border-t border-clinical-border flex justify-end gap-3">
               <button onClick={() => setShowConfirmReset(false)} className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest">Cancel</button>
               <button onClick={handleResetSystem} className="px-8 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/40">Reset</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactSidebarItem({ icon, active = false, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-14 h-14 flex items-center justify-center rounded-[18px] transition-all group ${active ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-600'}`}>
      <div className="transition-transform group-hover:scale-110">{icon}</div>
    </button>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
