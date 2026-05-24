import React, { useState, useEffect } from 'react';
import { Shield, Building, Users, ArrowLeft, Plus, Edit2, Camera, Trash2, X, Lock, Unlock, CheckCircle, Key, Database } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { SuperuserDBConsole } from './SuperuserDBConsole';

export function AdminMDMView({ onBack, initialTab, mode = 'MDM' }: { onBack: () => void; initialTab?: 'Orgs' | 'MSD' | 'Catalog' | 'RBAC'; mode?: 'MDM' | 'IAM' }) {
  const { t, lang, setLang } = useI18n();
  const defaultTab = initialTab || (mode === 'MDM' ? 'Orgs' : 'MSD');
  const [tab, setTab] = useState<'Orgs' | 'MSD' | 'Catalog' | 'RBAC'>(defaultTab);
  const [showSuperuserTerminal, setShowSuperuserTerminal] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Org form
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Hospital');
  const [orgLoc, setOrgLoc] = useState('');
  const [orgChairsCount, setOrgChairsCount] = useState(3);

  const [uName, setUName] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRole, setURole] = useState('HospitalOperator');
  const [uOrgId, setUOrgId] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uDept, setUDept] = useState('');

  // Catalog form
  const [pCode, setPCode] = useState('');
  const [pAlias, setPAlias] = useState('');
  const [pClass, setPClass] = useState('RBC');
  const [pAbo, setPAbo] = useState(true);
  const [pRhd, setPRhd] = useState(true);

  // Edit states
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Filter states for MSD staff directory
  const [userFilter, setUserFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const fetchMDM = () => {
    fetch('/api/v1/mdm/organizations').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setOrgs(data);
        if (data.length > 0 && !uOrgId) setUOrgId(data[0].id);
      }
    }).catch(e => console.error("MDM Org fetch error:", e));
    
    fetch('/api/v1/mdm/users').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data);
    }).catch(e => console.error("MDM User fetch error:", e));
    
    fetch('/api/v1/catalog/products').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProducts(data);
    }).catch(e => {
       console.error("Catalog fetch error:", e);
       setProducts([]); // Prevent crash
    });
  };

  useEffect(() => {
    fetchMDM();
  }, []);

  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/v1/mdm/organizations', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ 
        name: orgName, 
        type: orgType, 
        location: orgLoc,
        chairsCount: orgType === 'BloodCenter' ? orgChairsCount : undefined
      })
    });
    setOrgName(''); setOrgLoc(''); setOrgChairsCount(3);
    fetchMDM();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/v1/mdm/users', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ 
        username: uName, 
        password: uPass, 
        role: uRole, 
        orgId: uOrgId,
        details: { email: uEmail, phone: uPhone, department: uDept }
      })
    });
    setUName(''); setUPass(''); setUEmail(''); setUPhone(''); setUDept('');
    fetchMDM();
  };

  const handleSuspendUser = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/v1/mdm/users/${id}/status`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ isActive: !currentStatus })
    });
    fetchMDM();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/v1/catalog/products', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ productCode: pCode, alias: pAlias, componentClass: pClass, aboRequired: pAbo, rhdRequired: pRhd })
    });
    setPCode(''); setPAlias('');
    fetchMDM();
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/v1/mdm/organizations/${editingOrg.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(editingOrg)
    });
    setEditingOrg(null);
    fetchMDM();
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/v1/mdm/users/${editingUser.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(editingUser)
    });
    setEditingUser(null);
    fetchMDM();
  };

  const handlePhotoUpload = async (userId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await fetch(`/api/v1/mdm/users/${userId}`, {
          method: 'PUT',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ photoUrl: base64String })
        });
        fetchMDM();
      };
      reader.readAsDataURL(file);
    }
  };

  if (showSuperuserTerminal) {
    return <SuperuserDBConsole onBack={() => setShowSuperuserTerminal(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-clinical-bg text-clinical-text">
      {mode === 'MDM' ? (
        <header className="p-4 border-b border-indigo-200 bg-clinical-bg flex items-center justify-between shadow-lg">
           <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 bg-clinical-bg hover:bg-slate-700 rounded-lg text-clinical-muted transition-colors">
                <ArrowLeft size={18} />
             </button>
             <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                   <Database className="text-indigo-600" size={20} />
                </div>
                <div>
                   <h1 className="font-bold text-indigo-600 uppercase tracking-widest text-sm">{t('portal_station_mdm_title')}</h1>
                   <p className="text-[10px] text-clinical-muted uppercase tracking-wide">{t('portal_station_mdm_sub')}</p>
                </div>
             </div>
           </div>
        </header>
      ) : (
        <header className="p-4 border-b border-fuchsia-500/20 bg-clinical-bg flex items-center justify-between shadow-lg">
           <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 bg-clinical-bg hover:bg-slate-700 rounded-lg text-clinical-muted transition-colors">
                <ArrowLeft size={18} />
             </button>
             <div className="flex items-center gap-3">
                <div className="p-2 bg-fuchsia-500/20 rounded-lg border border-fuchsia-500/30">
                   <Key className="text-fuchsia-600" size={20} />
                </div>
                <div>
                   <h1 className="font-bold text-fuchsia-600 uppercase tracking-widest text-sm">Identity & Access (IAM)</h1>
                   <p className="text-[10px] text-clinical-muted uppercase tracking-wide">人員目錄、身分認證與角色存取控制 (RBAC)</p>
                </div>
             </div>
           </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden p-6 gap-6">
          <div className="w-64 flex flex-col gap-2 justify-between">
             <div className="flex flex-col gap-2">
                {mode === 'MDM' ? (
                  <>
                     <button onClick={() => setTab('Orgs')} className={`p-4 rounded-xl flex items-center gap-3 transition-all ${tab === 'Orgs' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-clinical-bg text-clinical-muted hover:bg-clinical-bg'}`}>
                        <Building size={18} /> <span className="text-xs font-bold uppercase tracking-widest">{t('mdm_orgs')}</span>
                     </button>
                     <button onClick={() => setTab('Catalog')} className={`p-4 rounded-xl flex items-center gap-3 transition-all ${tab === 'Catalog' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-clinical-bg text-clinical-muted hover:bg-clinical-bg'}`}>
                        <Shield size={18} /> <span className="text-xs font-bold uppercase tracking-widest">{t('mdm_catalog')}</span>
                     </button>
                  </>
                ) : (
                  <>
                     <button onClick={() => setTab('MSD')} className={`p-4 rounded-xl flex items-center gap-3 transition-all ${tab === 'MSD' ? 'bg-fuchsia-600 text-white shadow-lg' : 'bg-clinical-bg text-clinical-muted hover:bg-clinical-bg'}`}>
                        <Users size={18} /> <span className="text-xs font-bold uppercase tracking-widest">{t('mdm_msd')}</span>
                     </button>
                     <button onClick={() => setTab('RBAC')} className={`p-4 rounded-xl flex items-center gap-3 transition-all ${tab === 'RBAC' ? 'bg-fuchsia-600 text-white shadow-lg' : 'bg-clinical-bg text-clinical-muted hover:bg-clinical-bg'}`}>
                        <Key size={18} /> <span className="text-xs font-bold uppercase tracking-widest">{t('mdm_rbac')}</span>
                     </button>
                  </>
                )}
             </div>
             
             {/* Glowing Cyber-Style Superuser Entrance Card Button */}
             <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-200">
                <button 
                   onClick={() => setShowSuperuserTerminal(true)} 
                   className="group relative p-4 rounded-2xl border border-violet-500/30 bg-violet-950/5 text-violet-600 hover:text-white transition-all shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] hover:scale-[1.03] active:scale-95 duration-300 flex flex-col gap-2 items-start overflow-hidden text-left cursor-pointer"
                >
                   {/* Glowing neon hover gradient */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                   
                   <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-violet-500/10 group-hover:bg-white/20 rounded-lg border border-violet-500/20 group-hover:border-transparent transition-colors">
                         <Lock size={12} className="group-hover:hidden" />
                         <Unlock size={12} className="hidden group-hover:block" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-violet-500 group-hover:text-violet-200">超級使用者終端</span>
                   </div>
                   
                   <div>
                      <p className="text-[10px] font-black text-slate-800 group-hover:text-white uppercase leading-none">⚡ ENTER SUPERUSER CONSOLE</p>
                      <p className="text-[8px] text-slate-500 group-hover:text-white/80 mt-1 leading-tight font-medium">關聯安全認證與試算表編輯器</p>
                   </div>
                </button>
             </div>
          </div>

         {/* Content */}
         <div className="flex-1 bg-clinical-bg border border-clinical-border rounded-2xl p-6 overflow-y-auto">
            {tab === 'Orgs' && (
              <div>
                <h2 className="text-xl font-bold text-clinical-text mb-6 flex items-center gap-2 border-b border-clinical-border pb-4">
                  <Building className="text-clinical-muted" /> {t('mdm_org_dir')}
                </h2>
                
                <form onSubmit={handleAddOrg} className={`grid ${orgType === 'BloodCenter' ? 'grid-cols-5' : 'grid-cols-4'} gap-4 mb-8 bg-clinical-bg p-4 rounded-xl border border-clinical-border`}>
                  <input required value={orgName} onChange={e=>setOrgName(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder={t('mdm_name')} />
                  <select value={orgType} onChange={e=>setOrgType(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     <option value="Hospital">{t('org_type_hospital')}</option>
                     <option value="BloodCenter">{t('org_type_bloodcenter')}</option>
                     <option value="Hub">{t('org_type_hub')}</option>
                  </select>
                  {orgType === 'BloodCenter' && (
                    <input type="number" min={1} max={6} required value={orgChairsCount} onChange={e=>setOrgChairsCount(parseInt(e.target.value) || 3)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Active Chairs (1-6)" title="Number of active phlebotomy chairs" />
                  )}
                  <input required value={orgLoc} onChange={e=>setOrgLoc(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder={t('mdm_location')} />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-clinical-text font-bold py-2 rounded flex justify-center items-center gap-1 transition-colors">
                    <Plus size={16} /> {t('mdm_add_org')}
                  </button>
                </form>

                <div className="overflow-x-auto rounded-xl border border-clinical-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-clinical-card text-clinical-muted">
                      <tr>
                        <th className="p-3">{t('mdm_id')}</th>
                        <th className="p-3">{t('mdm_name')}</th>
                        <th className="p-3">{t('mdm_type')}</th>
                        <th className="p-3">{t('mdm_location')}</th>
                        <th className="p-3 text-right">{t('mdm_actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-clinical-border">
                      {orgs.map(o => (
                        <tr key={o.id} className="hover:bg-clinical-bg transition-colors">
                          <td className="p-3 font-mono text-xs text-clinical-muted">{o.id}</td>
                          <td className="p-3 font-bold text-clinical-text">{o.name}</td>
                          <td className="p-3">
                             <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-clinical-bg text-clinical-muted">
                                {o.type === 'Hospital' ? t('org_type_hospital') : o.type === 'BloodCenter' ? `${t('org_type_bloodcenter')} (${o.chairsCount || 3} Chairs)` : o.type === 'Hub' ? t('org_type_hub') : o.type}
                             </span>
                          </td>
                          <td className="p-3 text-clinical-muted">{o.location}</td>
                          <td className="p-3 text-right">
                             <button onClick={() => setEditingOrg(o)} className="p-2 text-clinical-muted hover:text-clinical-text transition-colors">
                                <Edit2 size={16} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingOrg && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-clinical-bg backdrop-blur-md p-4">
                    <form onSubmit={handleUpdateOrg} className="clinical-card max-w-lg w-full bg-clinical-card border border-clinical-border rounded-3xl overflow-hidden shadow-2xl">
                       <div className="p-6 border-b border-clinical-border bg-clinical-bg flex justify-between items-center">
                          <h3 className="text-sm font-black text-clinical-text uppercase italic tracking-widest">{t('mdm_edit_org')}</h3>
                          <button type="button" onClick={() => setEditingOrg(null)} className="p-2 hover:bg-clinical-bg rounded-lg text-clinical-muted hover:text-white transition-colors"><X size={20} /></button>
                       </div>
                       <div className="p-8 space-y-6">
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_name')}</label>
                             <input value={editingOrg.name} onChange={e=>setEditingOrg({...editingOrg, name: e.target.value})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_type')}</label>
                                <select value={editingOrg.type} onChange={e=>setEditingOrg({...editingOrg, type: e.target.value})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all">
                                   <option value="Hospital">{t('org_type_hospital')}</option>
                                   <option value="BloodCenter">{t('org_type_bloodcenter')}</option>
                                   <option value="Hub">{t('org_type_hub')}</option>
                                </select>
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_location')}</label>
                                <input value={editingOrg.location} onChange={e=>setEditingOrg({...editingOrg, location: e.target.value})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all" />
                             </div>
                          </div>
                          {editingOrg.type === 'BloodCenter' && (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">Active Phlebotomy Chairs (1-6)</label>
                                <input type="number" min={1} max={6} value={editingOrg.chairsCount || 3} onChange={e=>setEditingOrg({...editingOrg, chairsCount: parseInt(e.target.value) || 3})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all" />
                             </div>
                          )}
                       </div>
                       <div className="p-6 bg-clinical-bg/50 border-t border-clinical-border flex justify-end gap-3">
                          <button type="button" onClick={() => setEditingOrg(null)} className="px-6 py-2 text-[10px] font-black text-clinical-muted hover:text-clinical-text uppercase tracking-widest transition-colors">{t('mdm_cancel')}</button>
                          <button type="submit" className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">{t('mdm_save')}</button>
                       </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {tab === 'MSD' && (
              <div>
                <h2 className="text-xl font-bold text-clinical-text mb-6 flex items-center gap-2 border-b border-clinical-border pb-4">
                  <Users className="text-clinical-muted" /> {t('mdm_msd_tactical')}
                </h2>

                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-clinical-bg p-4 rounded-xl border border-clinical-border">
                  <input required value={uName} onChange={e=>setUName(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder={t('mdm_username')} />
                  <input required value={uPass} onChange={e=>setUPass(e.target.value)} type="password" className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder={t('mdm_password')} />
                  <select value={uRole} onChange={e=>setURole(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     <optgroup label={`─── ${t('mdm_optgrp_lims')} ───`}>
                        <option value="DonorScreener">{t('mdm_role_ds_desc')}</option>
                        <option value="Nurse">{t('mdm_role_nurse_desc')}</option>
                        <option value="LIMS_Simulator">{t('mdm_role_lims_desc')}</option>
                      </optgroup>
                      <optgroup label={`─── ${t('mdm_optgrp_hosp')} ───`}>
                        <option value="HospitalOperator">{t('mdm_role_hosp_desc')}</option>
                      </optgroup>
                      <optgroup label={`─── ${t('mdm_optgrp_log')} ───`}>
                        <option value="WarehouseIssuer">{t('mdm_role_wh_desc')}</option>
                        <option value="Dispatcher">{t('mdm_role_disp_desc')}</option>
                        <option value="Courier">{t('mdm_role_cour_desc')}</option>
                      </optgroup>
                      <optgroup label={`─── ${t('mdm_optgrp_admin')} ───`}>
                        <option value="Manager">{t('mdm_role_mgr_desc')}</option>
                        <option value="Admin">{t('mdm_role_admin_desc')}</option>
                      </optgroup>
                  </select>
                  <select required value={uOrgId} onChange={e=>setUOrgId(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <input value={uEmail} onChange={e=>setUEmail(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Email" />
                  <input value={uPhone} onChange={e=>setUPhone(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Phone" />
                  <input value={uDept} onChange={e=>setUDept(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder={t('mdm_department')} />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-clinical-text font-bold py-2 rounded flex justify-center items-center gap-1 transition-colors">
                    <Plus size={16} /> {t('mdm_add_user')}
                  </button>
                </form>

                {/* Filter and Search Row */}
                <div className="flex flex-col md:flex-row gap-4 mb-4 bg-clinical-bg p-4 rounded-xl border border-clinical-border items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_search')}:</span>
                    <input value={userFilter} onChange={e=>setUserFilter(e.target.value)} className="bg-clinical-card border border-clinical-border rounded p-1.5 text-xs focus:border-indigo-500 outline-none w-32" placeholder={`${t('mdm_username')}...`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_filter_org')}:</span>
                    <select value={orgFilter} onChange={e=>setOrgFilter(e.target.value)} className="bg-clinical-card border border-clinical-border rounded p-1.5 text-xs focus:border-indigo-500 outline-none w-32">
                       <option value="ALL">{t('mdm_all_orgs')}</option>
                       {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_role')}:</span>
                    <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="bg-clinical-card border border-clinical-border rounded p-1.5 text-xs focus:border-indigo-500 outline-none w-32">
                       <option value="ALL">{t('mdm_all_roles')}</option>
                       <option value="DonorScreener">DonorScreener</option>
                       <option value="Nurse">Nurse</option>
                       <option value="LIMS_Simulator">LIMS_Simulator</option>
                       <option value="HospitalOperator">HospitalOperator</option>
                       <option value="WarehouseIssuer">WarehouseIssuer</option>
                       <option value="Dispatcher">Dispatcher</option>
                       <option value="Courier">Courier</option>
                       <option value="Manager">Manager</option>
                       <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>
 
                <div className="overflow-x-auto rounded-xl border border-clinical-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-clinical-card text-clinical-muted">
                      <tr>
                        <th className="p-3">{t('mdm_tbl_user')}</th>
                        <th className="p-3">{t('mdm_tbl_role_org')}</th>
                        <th className="p-3">{t('mdm_tbl_contact')}</th>
                        <th className="p-3 text-right">{t('mdm_actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-clinical-border">
                      {users.filter(u => {
                        if (orgFilter !== 'ALL' && u.orgId !== orgFilter) return false;
                        if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
                        if (userFilter && !u.username.toLowerCase().includes(userFilter.toLowerCase())) return false;
                        return true;
                      }).map(u => (
                        <tr key={u.id} className={`hover:bg-clinical-bg transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                          <td className="p-3 font-bold text-clinical-text">
                            <div className="flex items-center gap-3">
                               <div className="relative w-10 h-10 rounded-xl bg-clinical-card border border-clinical-border overflow-hidden flex items-center justify-center group/photo">
                                  {u.photoUrl ? (
                                    <img src={u.photoUrl} className="w-full h-full object-cover" alt="User" />
                                  ) : (
                                    <Users size={18} className="text-clinical-text" />
                                  )}
                                  <label className="absolute inset-0 bg-rose-600/60 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                     <Camera size={14} className="text-clinical-text" />
                                     <input type="file" className="hidden" accept="image/*" onChange={e => handlePhotoUpload(u.id, e)} />
                                  </label>
                               </div>
                               <div>
                                  <p className="text-[12px] font-black uppercase tracking-tighter">{u.username}</p>
                                  <p className="text-[9px] text-clinical-muted font-mono">{u.id}</p>
                                  {!u.isActive && <span className="text-[9px] bg-rose-950 text-rose-500 px-1.5 py-0.5 rounded border border-rose-900 font-black tracking-widest">{t('mdm_suspended')}</span>}
                               </div>
                            </div>
                          </td>
                          <td className="p-3">
                             <div className="flex flex-col gap-1">
                                <span className="px-2 py-0.5 w-fit rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950/50 text-indigo-600 border border-indigo-900/30">{u.role}</span>
                                <span className="text-[10px] text-clinical-muted">{u.orgName}</span>
                             </div>
                          </td>
                          <td className="p-3">
                             <div className="flex flex-col text-[10px] text-clinical-muted">
                                <span>{u.details?.email || t('mdm_no_email')}</span>
                                <span>{u.details?.phone || t('mdm_no_phone')}</span>
                             </div>
                          </td>
                          <td className="p-3 text-right flex items-center justify-end gap-2">
                             <button onClick={() => setEditingUser(u)} className="p-2 text-clinical-muted hover:text-clinical-text transition-colors">
                                <Edit2 size={16} />
                             </button>
                             <button onClick={() => handleSuspendUser(u.id, u.isActive)} className={`text-[9px] px-3 py-1 rounded-lg border font-black uppercase tracking-widest transition-all ${u.isActive ? 'bg-rose-950/30 text-rose-500 border-rose-900' : 'bg-lime-950/30 text-lime-500 border-lime-900'}`}>
                               {u.isActive ? t('mdm_suspend') : t('mdm_activate')}
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 rounded-xl border border-fuchsia-900/30 bg-fuchsia-950/20">
                   <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                     <Key size={12} /> {t('mdm_rbac_hint_title')}
                   </p>
                   <p className="text-[10px] text-clinical-muted">{t('mdm_rbac_hint_desc')}</p>
                 </div>

                {editingUser && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-clinical-bg backdrop-blur-md p-4">
                    <form onSubmit={handleUpdateUser} className="clinical-card max-w-lg w-full bg-clinical-card border border-clinical-border rounded-3xl overflow-hidden shadow-2xl">
                       <div className="p-6 border-b border-clinical-border bg-clinical-bg flex justify-between items-center">
                          <h3 className="text-sm font-black text-clinical-text uppercase italic tracking-widest">{t('mdm_edit_user')}</h3>
                          <button type="button" onClick={() => setEditingUser(null)} className="p-2 hover:bg-clinical-bg rounded-lg text-clinical-muted hover:text-white transition-colors"><X size={20} /></button>
                       </div>
                       <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                           <div className="grid grid-cols-2 gap-6">
                              <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_username')}</label>
                                 <input value={editingUser.username} onChange={e=>setEditingUser({...editingUser, username: e.target.value})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all" />
                              </div>
                              <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_password')}</label>
                                 <input type="text" value={editingUser.password || ''} onChange={e=>setEditingUser({...editingUser, password: e.target.value})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all font-mono" placeholder={t('mdm_new_password_placeholder')} />
                              </div>
                           </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_role')}</label>
                                <select value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role: e.target.value})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all">
                                   <optgroup label={`─── ${t('mdm_optgrp_lims')} ───`}>
                                      <option value="DonorScreener">{t('mdm_role_ds_desc')}</option>
                                      <option value="Nurse">{t('mdm_role_nurse_desc')}</option>
                                      <option value="LIMS_Simulator">{t('mdm_role_lims_desc')}</option>
                                   </optgroup>
                                   <optgroup label={`─── ${t('mdm_optgrp_hosp')} ───`}>
                                      <option value="HospitalOperator">{t('mdm_role_hosp_desc')}</option>
                                   </optgroup>
                                   <optgroup label={`─── ${t('mdm_optgrp_log')} ───`}>
                                      <option value="WarehouseIssuer">{t('mdm_role_wh_desc')}</option>
                                      <option value="Dispatcher">{t('mdm_role_disp_desc')}</option>
                                      <option value="Courier">{t('mdm_role_cour_desc')}</option>
                                   </optgroup>
                                   <optgroup label={`─── ${t('mdm_optgrp_admin')} ───`}>
                                      <option value="Manager">{t('mdm_role_mgr_desc')}</option>
                                      <option value="Admin">{t('mdm_role_admin_desc')}</option>
                                   </optgroup>
                                </select>
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">{t('mdm_filter_org')}</label>
                                <select value={editingUser.orgId} onChange={e=>setEditingUser({...editingUser, orgId: e.target.value})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all">
                                   {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">Email</label>
                                <input value={editingUser.details?.email || ''} onChange={e=>setEditingUser({...editingUser, details: {...editingUser.details, email: e.target.value}})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all" />
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-clinical-muted uppercase tracking-widest">Phone</label>
                                <input value={editingUser.details?.phone || ''} onChange={e=>setEditingUser({...editingUser, details: {...editingUser.details, phone: e.target.value}})} className="bg-clinical-bg border border-clinical-border rounded-xl p-3 text-xs text-clinical-text outline-none focus:border-rose-500 transition-all" />
                             </div>
                          </div>
                       </div>
                       <div className="p-6 bg-clinical-bg/50 border-t border-clinical-border flex justify-end gap-3">
                          <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2 text-[10px] font-black text-clinical-muted hover:text-clinical-text uppercase tracking-widest transition-colors">{t('mdm_cancel')}</button>
                          <button type="submit" className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">{t('mdm_save')}</button>
                       </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {tab === 'RBAC' && (
              <div>
                <h2 className="text-xl font-bold text-clinical-text mb-2 flex items-center gap-2 border-b border-clinical-border pb-4">
                  <Key className="text-fuchsia-500" /> {t('mdm_rbac_title')}
                </h2>
                <p className="text-sm text-clinical-muted mb-6">{t('mdm_rbac_matrix_desc')}</p>

                {/* Role Matrix Table */}
                <div className="overflow-x-auto rounded-2xl border border-fuchsia-900/30 mb-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-fuchsia-950/40">
                        <th className="p-4 text-left text-xs font-black uppercase tracking-widest text-fuchsia-300">{t('mdm_rbac_table_role')}</th>
                        <th className="p-4 text-center text-xs font-black uppercase tracking-widest text-clinical-muted">{t('lims_stage_registration')}</th>
                        <th className="p-4 text-center text-xs font-black uppercase tracking-widest text-clinical-muted">{t('lims_stage_screening')}</th>
                        <th className="p-4 text-center text-xs font-black uppercase tracking-widest text-clinical-muted">{t('lims_stage_phlebotomy')}</th>
                        <th className="p-4 text-center text-xs font-black uppercase tracking-widest text-clinical-muted">{t('lims_stage_logistics')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-clinical-border">
                      {[
                        {
                          role: 'DonorScreener',
                          label: t('mdm_role_ds_desc'),
                          color: 'text-sky-400',
                          desc: t('mdm_rbac_policy_lims_desc_1'),
                          access: [true, false, false, false]
                        },
                        {
                          role: 'Nurse',
                          label: t('mdm_role_nurse_desc'),
                          color: 'text-rose-400',
                          desc: t('mdm_rbac_policy_lims_desc_1') + ' & ' + t('mdm_rbac_policy_lims_desc_2'),
                          access: [false, true, true, false]
                        },
                        {
                          role: 'LIMS_Simulator',
                          label: t('mdm_role_lims_desc'),
                          color: 'text-amber-400',
                          desc: t('mdm_rbac_policy_lims_desc_2') + ' & ' + t('mdm_rbac_policy_lims_desc_3'),
                          access: [false, false, false, true]
                        },
                        {
                          role: 'Admin',
                          label: t('mdm_role_admin_desc'),
                          color: 'text-fuchsia-400',
                          desc: t('mdm_rbac_policy_admin_desc_2'),
                          access: [true, true, true, true]
                        },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-clinical-bg/50 transition-colors">
                          <td className="p-4">
                            <p className={`text-xs font-black uppercase tracking-tight ${row.color}`}>{row.label}</p>
                            <p className="text-[11px] text-clinical-muted mt-1">{row.desc}</p>
                          </td>
                          {row.access.map((allowed, i) => (
                            <td key={i} className="p-4 text-center">
                              {allowed ? (
                                <div className="flex flex-col items-center gap-1">
                                  <CheckCircle size={12} className="text-emerald-500" />
                                  <span className="text-[8px] text-emerald-400 font-black uppercase">Allowed</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Lock size={12} className="text-slate-600" />
                                  <span className="text-[8px] text-slate-500 font-black uppercase">Locked</span>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Default Subsystem Permissions Container */}
                <div className="mb-8 p-6 rounded-2xl border border-indigo-900/30 bg-indigo-950/20 shadow-lg">
                   <h3 className="text-base font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Shield size={16} className="text-indigo-400 animate-pulse" /> {t('mdm_rbac_default_perms_title')}
                   </h3>
                   <p className="text-sm text-clinical-muted leading-relaxed whitespace-pre-line font-medium">
                     {t('mdm_rbac_default_perms_desc')}
                   </p>
                </div>

                {/* RBAC Policy Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl border border-sky-900/30 bg-sky-950/20 shadow-md">
                    <p className="text-sm font-black text-sky-300 uppercase tracking-widest mb-3">
                      {t('mdm_rbac_policy_lims_title')}
                    </p>
                    <ul className="text-xs text-clinical-muted space-y-2 leading-relaxed">
                      <li>• {t('mdm_rbac_policy_lims_desc_1')}</li>
                      <li>• {t('mdm_rbac_policy_lims_desc_2')}</li>
                      <li>• {t('mdm_rbac_policy_lims_desc_3')}</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-2xl border border-amber-900/30 bg-amber-950/20 shadow-md">
                    <p className="text-sm font-black text-amber-300 uppercase tracking-widest mb-3">
                      {t('mdm_rbac_policy_hub_title')}
                    </p>
                    <ul className="text-xs text-clinical-muted space-y-2 leading-relaxed">
                      <li>• {t('mdm_rbac_policy_hub_desc_1')}</li>
                      <li>• {t('mdm_rbac_policy_hub_desc_2')}</li>
                      <li>• {t('mdm_rbac_policy_hub_desc_3')}</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-2xl border border-fuchsia-900/30 bg-fuchsia-950/20 shadow-md col-span-1 md:col-span-3 lg:col-span-1">
                    <p className="text-sm font-black text-fuchsia-300 uppercase tracking-widest mb-3">
                      {t('mdm_rbac_policy_admin_title')}
                    </p>
                    <ul className="text-xs text-clinical-muted space-y-2 leading-relaxed mb-3">
                      <li>• {t('mdm_rbac_policy_admin_desc_1')}</li>
                      <li>• {t('mdm_rbac_policy_admin_desc_2')}</li>
                    </ul>
                    <div className="p-2.5 rounded bg-rose-950/30 border border-rose-900/50 text-[11px] text-rose-400 font-bold">
                      {t('mdm_rbac_policy_admin_warn')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'Catalog' && (
              <div>
                <h2 className="text-xl font-bold text-clinical-text mb-6 flex items-center gap-2 border-b border-clinical-border pb-4">
                  <Shield className="text-clinical-muted" /> {t('mdm_catalog_isbt')}
                </h2>

                <form onSubmit={handleAddProduct} className="grid grid-cols-6 gap-4 mb-8 bg-clinical-bg p-4 rounded-xl border border-clinical-border">
                  <input required value={pCode} onChange={e=>setPCode(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none font-mono" placeholder={t('mdm_cat_code_placeholder')} />
                  <input required value={pAlias} onChange={e=>setPAlias(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none col-span-2" placeholder={t('mdm_cat_alias_placeholder')} />
                  <select value={pClass} onChange={e=>setPClass(e.target.value)} className="bg-clinical-bg border border-clinical-border rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     <option value="RBC">{t('mdm_cat_legend_rbc')}</option>
                     <option value="PLT">{t('mdm_cat_legend_plt')}</option>
                     <option value="FFP">{t('mdm_cat_legend_ffp')}</option>
                  </select>
                  <div className="flex flex-col gap-1 justify-center">
                    <label className="flex items-center gap-2 text-[10px] text-clinical-muted uppercase font-bold cursor-pointer">
                      <input type="checkbox" checked={pAbo} onChange={e=>setPAbo(e.target.checked)} /> {t('mdm_cat_abo_req')}
                    </label>
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-clinical-text font-bold py-2 rounded flex justify-center items-center gap-1 transition-colors">
                    <Plus size={16} /> {t('mdm_add_product')}
                  </button>
                </form>

                <div className="overflow-x-auto rounded-xl border border-clinical-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-clinical-card text-clinical-muted">
                      <tr>
                        <th className="p-3">{t('mdm_cat_col_code')}</th>
                        <th className="p-3">{t('mdm_cat_col_alias')}</th>
                        <th className="p-3">{t('mdm_cat_col_rules')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-clinical-border">
                      {products.map(p => (
                        <tr key={p.productCode} className="hover:bg-clinical-bg transition-colors">
                          <td className="p-3 font-mono text-indigo-600 font-bold">{p.productCode}</td>
                          <td className="p-3 text-clinical-text">{p.alias}</td>
                          <td className="p-3 text-xs flex gap-2">
                             {p.aboRequired ? t('mdm_cat_abo_enabled') : t('mdm_cat_abo_disabled')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Clinical Legend Section */}
                <div className="mt-12 pt-8 border-t border-clinical-border">
                  <h3 className="text-base font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Shield size={18} className="text-indigo-400" /> {t('mdm_cat_clinical_legend_title')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                     {/* RBC */}
                     <div className="p-5 rounded-2xl border border-rose-900/30 bg-rose-950/20 shadow-md flex flex-col gap-2">
                        <span className="text-[12px] font-black text-rose-400 uppercase tracking-wider">🔴 {t('mdm_cat_legend_rbc')}</span>
                        <p className="text-xs text-clinical-muted leading-relaxed">{t('mdm_cat_legend_rbc_desc')}</p>
                     </div>

                     {/* PLT */}
                     <div className="p-5 rounded-2xl border border-amber-900/30 bg-amber-950/20 shadow-md flex flex-col gap-2">
                        <span className="text-[12px] font-black text-amber-400 uppercase tracking-wider">🟡 {t('mdm_cat_legend_plt')}</span>
                        <p className="text-xs text-clinical-muted leading-relaxed">{t('mdm_cat_legend_plt_desc')}</p>
                     </div>

                     {/* FFP */}
                     <div className="p-5 rounded-2xl border border-sky-900/30 bg-sky-950/20 shadow-md flex flex-col gap-2">
                        <span className="text-[12px] font-black text-sky-400 uppercase tracking-wider">🔵 {t('mdm_cat_legend_ffp')}</span>
                        <p className="text-xs text-clinical-muted leading-relaxed">{t('mdm_cat_legend_ffp_desc')}</p>
                     </div>

                     {/* CRYO */}
                     <div className="p-5 rounded-2xl border border-teal-900/30 bg-teal-950/20 shadow-md flex flex-col gap-2">
                        <span className="text-[12px] font-black text-teal-400 uppercase tracking-wider">🟢 {t('mdm_cat_legend_cryo')}</span>
                        <p className="text-xs text-clinical-muted leading-relaxed">{t('mdm_cat_legend_cryo_desc')}</p>
                     </div>

                     {/* WB */}
                     <div className="p-5 rounded-2xl border border-fuchsia-900/30 bg-fuchsia-950/20 shadow-md flex flex-col gap-2">
                        <span className="text-[12px] font-black text-fuchsia-400 uppercase tracking-wider">🟣 {t('mdm_cat_legend_wb')}</span>
                        <p className="text-xs text-clinical-muted leading-relaxed">{t('mdm_cat_legend_wb_desc')}</p>
                     </div>
                  </div>

                  {/* ABO Required Warning Banner */}
                  <div className="p-6 rounded-2xl border border-rose-600/30 bg-gradient-to-r from-rose-950/40 to-slate-900/40 shadow-xl flex flex-col gap-3">
                     <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-sm font-black text-rose-400 uppercase tracking-widest">{t('mdm_cat_abo_reg_title')}</span>
                     </div>
                     <p className="text-xs text-clinical-muted leading-relaxed font-semibold">
                        {t('mdm_cat_abo_reg_warn')}
                     </p>
                     <div className="flex items-center gap-2 text-[10px] text-rose-400 font-bold uppercase tracking-wider bg-rose-950/30 w-fit px-3 py-1 rounded border border-rose-900/50">
                        🛡️ {t('mdm_cat_abo_status_active')}
                     </div>
                  </div>
                </div>
              </div>
            )}

         </div>
      </div>
    </div>
  );
}
