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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vnbbms_theme', theme);
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
    if (user && currentSystem === 'HUB') fetchInventory();
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
    if (currentSystem === 'MDM') return <AdminMDMView onBack={() => setCurrentSystem(null)} />;
    if (currentSystem === 'IAM') return <AdminMDMView onBack={() => setCurrentSystem(null)} initialTab="MSD" />;
    
    if (currentSystem === 'NATIONAL') {
       return (
         <div className="flex-1 flex overflow-hidden">
           <aside className="hidden md:flex w-20 xl:w-24 border-r border-clinical-border bg-white/80 backdrop-blur-3xl flex-col p-4 xl:p-6 z-10 transition-all duration-500 shadow-2xl">
               <nav className="flex-1 flex flex-col items-center gap-6">
                  <CompactSidebarItem icon={<Activity size={24} />} active={nationalTab === 'overview'} onClick={() => setNationalTab('overview')} />
                  <CompactSidebarItem icon={<Database size={24} />} active={nationalTab === 'inventory'} onClick={() => setNationalTab('inventory')} />
                  <CompactSidebarItem icon={<Truck size={24} />} active={nationalTab === 'logistics'} onClick={() => setNationalTab('logistics')} />
                  <CompactSidebarItem icon={<ShieldCheck size={24} />} active={nationalTab === 'surveillance'} onClick={() => setNationalTab('surveillance')} />
                  <CompactSidebarItem icon={<Zap size={24} />} active={nationalTab === 'war_games'} onClick={() => setNationalTab('war_games')} />
                  <div className="w-8 h-px bg-slate-100 my-4"></div>
                  <button onClick={() => setCurrentSystem(null)} className="p-3 text-slate-500 hover:text-rose-500 transition-all"><ArrowLeft size={24} /></button>
               </nav>
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
               {role === 'Dashboard' && <TaskQueue role={user!.role} onNavigate={setRole} />}
               {role === 'LabTech_Crossmatch' && <CrossmatchView />}
               {role === 'MedicalReviewer' && <MedicalReviewerView />}
               {role === 'SOP11_RareDonor' && <RareDonorView />}
               {role !== 'Dashboard' && role !== 'LabTech_Crossmatch' && role !== 'MedicalReviewer' && role !== 'SOP11_RareDonor' && <CrossmatchView />}
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
               {role === 'WarehouseIssuer' && <WarehouseView />}
               {role === 'Warehouse_IssueReturn' && <IssueReturnView />}
               {role === 'Courier' && <CourierView />}
               {role === 'Resource' && <ResourceManagementView />}
               {role === 'Manager' && <ManagerKPIView />}
               {role === 'Admin' && <ManagerKPIView />}
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
