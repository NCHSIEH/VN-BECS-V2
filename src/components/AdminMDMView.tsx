import React, { useState, useEffect } from 'react';
import { Shield, Building, Users, ArrowLeft, Plus, Edit2, Camera, Trash2, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function AdminMDMView({ onBack }: { onBack: () => void }) {
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<'Orgs' | 'MSD' | 'Catalog'>('MSD');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Org form
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('Hospital');
  const [orgLoc, setOrgLoc] = useState('');

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
      body: JSON.stringify({ name: orgName, type: orgType, location: orgLoc })
    });
    setOrgName(''); setOrgLoc('');
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

  return (
    <div className="flex flex-col h-full bg-[#0b1120] text-slate-800">
      <header className="p-4 border-b border-indigo-200 bg-[#020617] flex items-center justify-between shadow-lg">
         <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-600 transition-colors">
              <ArrowLeft size={18} />
           </button>
           <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                 <Shield className="text-indigo-600" size={20} />
              </div>
              <div>
                 <h1 className="font-bold text-indigo-600 uppercase tracking-widest text-sm">{t('mdm_title')}</h1>
                 <p className="text-[10px] text-slate-600 uppercase tracking-wide">{t('mdm_subtitle')}</p>
              </div>
           </div>
         </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-6 gap-6">
         {/* Sidebar MDM */}
         <div className="w-64 flex flex-col gap-2">
            <button onClick={() => setTab('Orgs')} className={`p-4 rounded-xl flex items-center gap-3 transition-all ${tab === 'Orgs' ? 'bg-indigo-600 text-slate-800 shadow-lg' : 'bg-slate-900/50 text-slate-600 hover:bg-slate-800'}`}>
               <Building size={18} /> <span className="text-xs font-bold uppercase tracking-widest">{t('mdm_orgs')}</span>
            </button>
            <button onClick={() => setTab('MSD')} className={`p-4 rounded-xl flex items-center gap-3 transition-all ${tab === 'MSD' ? 'bg-indigo-600 text-slate-800 shadow-lg' : 'bg-slate-900/50 text-slate-600 hover:bg-slate-800'}`}>
               <Users size={18} /> <span className="text-xs font-bold uppercase tracking-widest">{t('mdm_msd')}</span>
            </button>
            <button onClick={() => setTab('Catalog')} className={`p-4 rounded-xl flex items-center gap-3 transition-all ${tab === 'Catalog' ? 'bg-indigo-600 text-slate-800 shadow-lg' : 'bg-slate-900/50 text-slate-600 hover:bg-slate-800'}`}>
               <Shield size={18} /> <span className="text-xs font-bold uppercase tracking-widest">{t('mdm_catalog')}</span>
            </button>
         </div>

         {/* Content */}
         <div className="flex-1 bg-[#020617] border border-slate-800 rounded-2xl p-6 overflow-y-auto">
            {tab === 'Orgs' && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                  <Building className="text-slate-600" /> {t('mdm_org_dir')}
                </h2>
                
                <form onSubmit={handleAddOrg} className="grid grid-cols-4 gap-4 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                  <input required value={orgName} onChange={e=>setOrgName(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Name" />
                  <select value={orgType} onChange={e=>setOrgType(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     <option>Hospital</option>
                     <option>BloodCenter</option>
                     <option>Hub</option>
                  </select>
                  <input required value={orgLoc} onChange={e=>setOrgLoc(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Location" />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-slate-800 font-bold py-2 rounded flex justify-center items-center gap-1 transition-colors">
                    <Plus size={16} /> {t('mdm_add_org')}
                  </button>
                </form>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-600">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">{t('mdm_name')}</th>
                        <th className="p-3">{t('mdm_type')}</th>
                        <th className="p-3">{t('mdm_location')}</th>
                        <th className="p-3 text-right">{t('mdm_actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orgs.map(o => (
                        <tr key={o.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 font-mono text-xs text-slate-600">{o.id}</td>
                          <td className="p-3 font-bold text-slate-700">{o.name}</td>
                          <td className="p-3">
                             <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-600">{o.type}</span>
                          </td>
                          <td className="p-3 text-slate-600">{o.location}</td>
                          <td className="p-3 text-right">
                             <button onClick={() => setEditingOrg(o)} className="p-2 text-slate-600 hover:text-slate-800 transition-colors">
                                <Edit2 size={16} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingOrg && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <form onSubmit={handleUpdateOrg} className="clinical-card max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <div className="p-6 border-b border-slate-800 bg-slate-50 flex justify-between items-center">
                          <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest">{t('mdm_edit_org')}</h3>
                          <button type="button" onClick={() => setEditingOrg(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-white transition-colors"><X size={20} /></button>
                       </div>
                       <div className="p-8 space-y-6">
                          <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Name</label>
                             <input value={editingOrg.name} onChange={e=>setEditingOrg({...editingOrg, name: e.target.value})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Type</label>
                                <select value={editingOrg.type} onChange={e=>setEditingOrg({...editingOrg, type: e.target.value})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all">
                                   <option>Hospital</option>
                                   <option>BloodCenter</option>
                                   <option>Hub</option>
                                </select>
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Location</label>
                                <input value={editingOrg.location} onChange={e=>setEditingOrg({...editingOrg, location: e.target.value})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all" />
                             </div>
                          </div>
                       </div>
                       <div className="p-6 bg-slate-50/50 border-t border-slate-800 flex justify-end gap-3">
                          <button type="button" onClick={() => setEditingOrg(null)} className="px-6 py-2 text-[10px] font-black text-slate-600 hover:text-slate-800 uppercase tracking-widest transition-colors">{t('mdm_cancel')}</button>
                          <button type="submit" className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">{t('mdm_save')}</button>
                       </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {tab === 'MSD' && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                  <Users className="text-slate-600" /> {t('mdm_msd_tactical')}
                </h2>

                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                  <input required value={uName} onChange={e=>setUName(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Username" />
                  <input required value={uPass} onChange={e=>setUPass(e.target.value)} type="password" className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Password" />
                  <select value={uRole} onChange={e=>setURole(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     <option>HospitalOperator</option>
                     <option>Nurse</option>
                     <option>WarehouseIssuer</option>
                     <option>Dispatcher</option>
                     <option>Courier</option>
                     <option>Manager</option>
                     <option>Admin</option>
                  </select>
                  <select required value={uOrgId} onChange={e=>setUOrgId(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <input value={uEmail} onChange={e=>setUEmail(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Email" />
                  <input value={uPhone} onChange={e=>setUPhone(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Phone" />
                  <input value={uDept} onChange={e=>setUDept(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" placeholder="Department" />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-slate-800 font-bold py-2 rounded flex justify-center items-center gap-1 transition-colors">
                    <Plus size={16} /> {t('mdm_add_user')}
                  </button>
                </form>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-600">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Role & Org</th>
                        <th className="p-3">Contact Info</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.id} className={`hover:bg-slate-900/50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                          <td className="p-3 font-bold text-slate-700">
                            <div className="flex items-center gap-3">
                               <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center group/photo">
                                  {u.photoUrl ? (
                                    <img src={u.photoUrl} className="w-full h-full object-cover" alt="User" />
                                  ) : (
                                    <Users size={18} className="text-slate-700" />
                                  )}
                                  <label className="absolute inset-0 bg-rose-600/60 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                     <Camera size={14} className="text-slate-800" />
                                     <input type="file" className="hidden" accept="image/*" onChange={e => handlePhotoUpload(u.id, e)} />
                                  </label>
                               </div>
                               <div>
                                  <p className="text-[12px] font-black uppercase tracking-tighter">{u.username}</p>
                                  <p className="text-[9px] text-slate-600 font-mono">{u.id}</p>
                                  {!u.isActive && <span className="text-[9px] bg-rose-950 text-rose-500 px-1.5 py-0.5 rounded border border-rose-900 font-black tracking-widest">{t('mdm_suspended')}</span>}
                               </div>
                            </div>
                          </td>
                          <td className="p-3">
                             <div className="flex flex-col gap-1">
                                <span className="px-2 py-0.5 w-fit rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950/50 text-indigo-600 border border-indigo-900/30">{u.role}</span>
                                <span className="text-[10px] text-slate-600">{u.orgName}</span>
                             </div>
                          </td>
                          <td className="p-3">
                             <div className="flex flex-col text-[10px] text-slate-600">
                                <span>{u.details?.email || 'No Email'}</span>
                                <span>{u.details?.phone || 'No Phone'}</span>
                             </div>
                          </td>
                          <td className="p-3 text-right flex items-center justify-end gap-2">
                             <button onClick={() => setEditingUser(u)} className="p-2 text-slate-600 hover:text-slate-800 transition-colors">
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

                {editingUser && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <form onSubmit={handleUpdateUser} className="clinical-card max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                       <div className="p-6 border-b border-slate-800 bg-slate-50 flex justify-between items-center">
                          <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest">{t('mdm_edit_user')}</h3>
                          <button type="button" onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-white transition-colors"><X size={20} /></button>
                       </div>
                       <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                           <div className="grid grid-cols-2 gap-6">
                              <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Username</label>
                                 <input value={editingUser.username} onChange={e=>setEditingUser({...editingUser, username: e.target.value})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all" />
                              </div>
                              <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Password</label>
                                 <input type="text" value={editingUser.password || ''} onChange={e=>setEditingUser({...editingUser, password: e.target.value})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all font-mono" placeholder="New Password" />
                              </div>
                           </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Role</label>
                                <select value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role: e.target.value})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all">
                                   <option>HospitalOperator</option>
                                   <option>Nurse</option>
                                   <option>WarehouseIssuer</option>
                                   <option>Dispatcher</option>
                                   <option>Courier</option>
                                   <option>Manager</option>
                                   <option>Admin</option>
                                </select>
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Organization</label>
                                <select value={editingUser.orgId} onChange={e=>setEditingUser({...editingUser, orgId: e.target.value})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all">
                                   {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Email</label>
                                <input value={editingUser.details?.email || ''} onChange={e=>setEditingUser({...editingUser, details: {...editingUser.details, email: e.target.value}})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all" />
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Phone</label>
                                <input value={editingUser.details?.phone || ''} onChange={e=>setEditingUser({...editingUser, details: {...editingUser.details, phone: e.target.value}})} className="bg-slate-50 border border-slate-800 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition-all" />
                             </div>
                          </div>
                       </div>
                       <div className="p-6 bg-slate-50/50 border-t border-slate-800 flex justify-end gap-3">
                          <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2 text-[10px] font-black text-slate-600 hover:text-slate-800 uppercase tracking-widest transition-colors">{t('mdm_cancel')}</button>
                          <button type="submit" className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">{t('mdm_save')}</button>
                       </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {tab === 'Catalog' && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                  <Shield className="text-slate-600" /> {t('mdm_catalog_isbt')}
                </h2>

                <form onSubmit={handleAddProduct} className="grid grid-cols-6 gap-4 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                  <input required value={pCode} onChange={e=>setPCode(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none font-mono" placeholder="Code" />
                  <input required value={pAlias} onChange={e=>setPAlias(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none col-span-2" placeholder="Description" />
                  <select value={pClass} onChange={e=>setPClass(e.target.value)} className="bg-[#0b1120] border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none">
                     <option>RBC</option>
                     <option>PLT</option>
                     <option>FFP</option>
                  </select>
                  <div className="flex flex-col gap-1 justify-center">
                    <label className="flex items-center gap-2 text-[10px] text-slate-600 uppercase font-bold cursor-pointer">
                      <input type="checkbox" checked={pAbo} onChange={e=>setPAbo(e.target.checked)} /> ABO Req
                    </label>
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-slate-800 font-bold py-2 rounded flex justify-center items-center gap-1 transition-colors">
                    <Plus size={16} /> {t('mdm_add_product')}
                  </button>
                </form>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-600">
                      <tr>
                        <th className="p-3">Product Code</th>
                        <th className="p-3">Alias</th>
                        <th className="p-3">Rules</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map(p => (
                        <tr key={p.productCode} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 font-mono text-indigo-600 font-bold">{p.productCode}</td>
                          <td className="p-3 text-slate-700">{p.alias}</td>
                          <td className="p-3 text-xs flex gap-2">
                             {p.aboRequired ? "ABO Check Enabled" : "ABO Check Disabled"}
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
  );
}
