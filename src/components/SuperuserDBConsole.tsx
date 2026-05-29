import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Network, AlertTriangle, Play, Check, Search, Sparkles, 
  RefreshCw, Lock, Unlock, X, Grid, FileSpreadsheet, Plus, Trash2, 
  ArrowLeft, CheckCircle, HelpCircle, Save, ChevronRight, Info
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

import { SchemaField, TABLE_SCHEMAS, LOCAL_T, RELATION_GROUPS } from './SuperuserDBConsole.data';

export function SuperuserDBConsole({ onBack }: { onBack: () => void }) {
  const { lang } = useI18n();
  const currentLang = (lang === 'zh-TW' || lang === 'en' || lang === 'vi') ? lang : 'zh-TW';
  const lt = LOCAL_T[currentLang];

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Tab & Table Selection states
  const [activeGroupId, setActiveGroupId] = useState('G1');
  const [activeTable, setActiveTable] = useState('organizations');
  const [currentView, setCurrentView] = useState<'grid' | 'schema'>('grid');

  // Database State
  const [dbData, setDbData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('SYNCHRONIZED'); // SYNCHRONIZED, SAVING, ERROR

  // Cell Selection states (Excel-style)
  const [selectedCell, setSelectedCell] = useState<{ row: number; colName: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; colName: string } | null>(null);
  const [formulaValue, setFormulaValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Relational Validation Error overlays
  const [validationError, setValidationError] = useState<{
    type: 'PK_VIOLATION' | 'FK_VIOLATION' | 'DELETE_RESTRICTED' | 'GENERIC';
    title: string;
    message: string;
    details?: string[];
  } | null>(null);

  // Interactive Schema Designer state
  const [hoveredSchemaTable, setHoveredSchemaTable] = useState<string | null>(null);

  // Fetch full dataset
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('superuser_token');
      const response = await fetch('/api/v1/mdm/relational', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.success) {
        setDbData(json.data);
      } else {
        console.error("Fetch DB error:", json.error);
      }
    } catch (e) {
      console.error("Connection failure fetching relational data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // Handle Authentication submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    try {
      const response = await fetch('/api/v1/mdm/relational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auth',
          username: authUsername,
          password: authPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('superuser_token', data.token);
        setIsAuthenticated(true);
        // Record login audit event
        await fetch('/api/v1/audit-events', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`
          },
          body: JSON.stringify({
            actorRole: 'Admin',
            eventType: 'SUPERUSER_LOGIN',
            objectId: data.user.id,
            details: `Superuser logged in successfully: ${data.user.username} (Role: ${data.user.role})`
          })
        }).catch(() => {});
      } else {
        setAuthError(data.error || lt.auth_err);
      }
    } catch (err) {
      setAuthError('無法連線至後端驗證服務。');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Safe mutations with constraint checking
  const executeMutation = async (type: 'insert' | 'update' | 'delete', table: string, rowId: string, payload?: any) => {
    setSyncStatus('SAVING');
    try {
      const token = sessionStorage.getItem('superuser_token');
      const response = await fetch('/api/v1/mdm/relational', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'mutation',
          type,
          table,
          rowId,
          data: payload
        })
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setSyncStatus('ERROR');
        // Trigger gorgeous Relational Constraint Blocker dialog
        const errType = json.error || 'GENERIC';
        setValidationError({
          type: errType,
          title: errType === 'PRIMARY_KEY_VIOLATION' ? lt.err_duplicate_pk : 
                 errType === 'FOREIGN_KEY_VIOLATION' ? lt.err_invalid_fk : 
                 errType === 'DELETE_RESTRICTED' ? lt.err_restrict_delete : lt.err_db_op,
          message: json.message || '資料庫因關聯限制，不允許執行此項增刪修改操作。',
          details: json.details || []
        });

        // Audit constraint violation
        await fetch('/api/v1/audit-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorRole: 'Admin',
            eventType: 'RELATIONAL_VIOLATION_BLOCKED',
            objectId: rowId,
            details: `Relational Blocked [${type.toUpperCase()} on ${table}]: ${json.message}`
          })
        }).catch(() => {});

        return false;
      }

      setSyncStatus('SYNCHRONIZED');
      // Refresh local copy
      await fetchAllData();
      return true;
    } catch (err) {
      setSyncStatus('ERROR');
      return false;
    }
  };

  // Table fields schema helper
  const fields = TABLE_SCHEMAS[activeTable] || [];
  const rows = dbData[activeTable] || [];

  // Get Primary Key field name
  const pkField = fields.find(f => f.isPk)?.name || 'id';

  // Excel active cell coordinates helper (e.g. C3)
  const getCellCoordinates = () => {
    if (!selectedCell) return '';
    const colIndex = fields.findIndex(f => f.name === selectedCell.colName);
    if (colIndex === -1) return '';
    const colLetter = String.fromCharCode(65 + colIndex); // A, B, C...
    const rowNum = selectedCell.row + 1; // 1, 2, 3...
    return `${colLetter}${rowNum}`;
  };

  // Selection handler
  const handleCellSelect = (rowIndex: number, colName: string, val: any) => {
    setSelectedCell({ row: rowIndex, colName });
    setFormulaValue(String(val !== undefined && val !== null ? val : ''));
    setEditingCell(null);
  };

  // Start double click cell edit
  const handleCellDoubleClick = (rowIndex: number, colName: string, val: any) => {
    setSelectedCell({ row: rowIndex, colName });
    setFormulaValue(String(val !== undefined && val !== null ? val : ''));
    setEditingCell({ row: rowIndex, colName });
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  };

  // Cell Value Commit (Excel-style cell exit)
  const handleCommitValue = async (newVal: string) => {
    if (!selectedCell) return;
    const { row, colName } = selectedCell;
    const rowData = rows[row];
    const rowId = rowData[pkField];
    const originalVal = rowData[colName];

    // No change
    if (String(originalVal === undefined ? '' : originalVal) === newVal) {
      setEditingCell(null);
      return;
    }

    // Block PK modification (highly dangerous in running system)
    if (colName === pkField) {
      setValidationError({
        type: 'PK_VIOLATION',
        title: lt.err_pk_title,
        message: lt.err_pk_desc,
        details: [lt.err_pk_tip1, lt.err_pk_tip2]
      });
      setEditingCell(null);
      setFormulaValue(String(originalVal || ''));
      return;
    }

    // Execute backend-validated relational update
    const payload = { [colName]: newVal };
    const ok = await executeMutation('update', activeTable, rowId, payload);
    if (!ok) {
      // Revert in Formula Bar
      setFormulaValue(String(originalVal || ''));
    }
    setEditingCell(null);
  };

  // Add row simulation
  const handleAddRow = async () => {
    // Generate a temporary high-uniqueness PK ID based on table prefix
    const prefix = activeTable === 'organizations' ? 'ORG' : 
                   activeTable === 'users' ? 'USR' : 
                   activeTable === 'resources' ? 'RES' :
                   activeTable === 'rare_donors' ? 'RDR' :
                   activeTable === 'donors' ? 'DNR' : 
                   activeTable === 'questionnaires' ? 'QST' :
                   activeTable === 'donations' ? 'DON' :
                   activeTable === 'lab_tests' ? 'TST' :
                   activeTable === 'components' ? 'CMP' :
                   activeTable === 'patients' ? 'PAT' :
                   activeTable === 'orders' ? 'ORD' :
                   activeTable === 'crossmatch' ? 'XM' :
                   activeTable === 'transfusions' ? 'TF' :
                   activeTable === 'adverse_reactions' ? 'AR' :
                   activeTable === 'product_catalog' ? 'PRD' :
                   activeTable === 'inventory' ? 'INV' :
                   activeTable === 'transport_jobs' ? 'TRN' : 'REC';
    
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    const newId = `${prefix}-${randomNum}`;

    // Create an empty mock object with fields default values
    const emptyRow: Record<string, any> = {};
    fields.forEach(f => {
      if (!f.isPk) {
        emptyRow[f.name] = f.type === 'number' ? 0 : f.type === 'boolean' ? false : '';
      }
    });

    await executeMutation('insert', activeTable, newId, emptyRow);
  };

  // Delete row simulation
  const handleDeleteRow = async () => {
    if (!selectedCell) {
      setValidationError({
        type: 'GENERIC',
        title: lt.err_select_title,
        message: lt.err_select_desc
      });
      return;
    }

    const rowData = rows[selectedCell.row];
    const rowId = rowData[pkField];

    // Relational deletion challenge
    await executeMutation('delete', activeTable, rowId);
  };

  // Handle active group switch, auto-select first table of group
  const handleGroupSwitch = (groupId: string) => {
    setActiveGroupId(groupId);
    const grp = RELATION_GROUPS.find(g => g.id === groupId);
    if (grp && grp.tables.length > 0) {
      setActiveTable(grp.tables[0]);
      setSelectedCell(null);
      setEditingCell(null);
      setFormulaValue('');
    }
  };

  // Credentials challenge screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-2xl p-4 selection:bg-rose-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
        
        <div className="w-full max-w-md bg-slate-900/40 border border-violet-500/20 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative overflow-hidden backdrop-blur-3xl animate-float">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/40 relative group">
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Lock size={28} className="text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-widest uppercase italic">{lt.auth_title}</h2>
              <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest mt-1">{lt.auth_sub}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            {authError && (
              <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex gap-3 items-start animate-shake">
                <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold text-rose-300 leading-relaxed">{authError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lt.auth_user}</label>
                <input 
                  required
                  type="text" 
                  value={authUsername} 
                  onChange={e => setAuthUsername(e.target.value)} 
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-violet-500 text-white rounded-2xl px-4 py-3.5 text-xs outline-none transition-all font-mono shadow-inner"
                  placeholder={lt.auth_input_user}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lt.auth_pass}</label>
                <input 
                  required
                  type="password" 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)} 
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-violet-500 text-white rounded-2xl px-4 py-3.5 text-xs outline-none transition-all font-mono shadow-inner"
                  placeholder={lt.auth_input_pass}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={onBack}
                className="flex-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl py-4 transition-all"
              >
                {lt.auth_btn_back}
              </button>
              <button 
                type="submit" 
                disabled={isAuthenticating}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl py-4 transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Unlock size={14} /> {lt.auth_btn_submit}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secure watermark */}
          <div className="mt-8 pt-4 border-t border-slate-900 text-center flex justify-center items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase tracking-widest">
            <span>{lt.watermark}</span>
            <span>·</span>
            <span>{lt.sec_terminal}</span>
          </div>
        </div>
      </div>
    );
  }

  // Active group meta helper
  const activeGroup = RELATION_GROUPS.find(g => g.id === activeGroupId)!;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

      {/* Ribbon Header */}
      <header className="p-4 border-b border-slate-900 bg-slate-950 flex flex-col md:flex-row items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-800">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Database className="text-indigo-400 animate-pulse" size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                {lt.console_title}
                <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded font-black tracking-widest uppercase">{lt.admin_terminal}</span>
              </h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{lt.console_sub}</p>
            </div>
          </div>
        </div>

        {/* Console Ribbon Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Synchronized status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
            syncStatus === 'SYNCHRONIZED' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : 
            syncStatus === 'SAVING' ? 'bg-amber-950/30 text-amber-400 border-amber-900/50 animate-pulse' : 
            'bg-rose-950/30 text-rose-400 border-rose-900/50'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'SYNCHRONIZED' ? 'bg-emerald-500' : 
              syncStatus === 'SAVING' ? 'bg-amber-500 animate-ping' : 
              'bg-rose-500'
            }`} />
            {syncStatus === 'SYNCHRONIZED' && lt.sync_ok}
            {syncStatus === 'SAVING' && lt.sync_saving}
            {syncStatus === 'ERROR' && lt.sync_err}
          </div>

          <button onClick={() => setCurrentView('grid')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${currentView === 'grid' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}>
            <FileSpreadsheet size={13} /> {lt.btn_grid}
          </button>
          <button onClick={() => setCurrentView('schema')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${currentView === 'schema' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}>
            <Network size={13} /> {lt.btn_schema}
          </button>
          <button onClick={fetchAllData} disabled={loading} className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Relational Dependency Groups Ribbon Selector */}
      <div className="px-6 py-3 border-b border-slate-900 bg-slate-950/70 backdrop-blur flex flex-wrap gap-2.5 z-10">
        {RELATION_GROUPS.map(grp => (
          <button 
            key={grp.id} 
            onClick={() => handleGroupSwitch(grp.id)} 
            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeGroupId === grp.id ? `bg-gradient-to-r ${grp.color} text-white shadow-lg` : 'bg-slate-900/50 text-slate-400 border-slate-850 hover:text-slate-200'
            }`}
          >
            <span className="font-mono text-[9px] bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/10">{grp.id}</span>
            {grp.name_keys[currentLang]}
          </button>
        ))}
      </div>

      {/* Table list within active group */}
      <div className="px-6 py-2 bg-slate-900/30 border-b border-slate-900 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lt.tbl_active}</span>
          <div className="flex gap-1">
            {activeGroup.tables.map(tbl => (
              <button 
                key={tbl} 
                onClick={() => { setActiveTable(tbl); setSelectedCell(null); setEditingCell(null); setFormulaValue(''); }} 
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                  activeTable === tbl ? 'bg-indigo-950 text-indigo-400 border-indigo-900/80 shadow-inner' : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                📊 {tbl}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[10px] text-indigo-400 font-semibold italic flex items-center gap-1.5">
          <Info size={12} className="shrink-0 animate-bounce" />
          {activeGroup.description_keys[currentLang]}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">

        {/* SCHEMA VIEW */}
        {currentView === 'schema' && (
          <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar bg-slate-950 flex flex-col gap-6 selection:bg-transparent select-none">
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Network className="text-indigo-400" size={18} /> {lt.schema_title}
              </h2>
              <p className="text-xs text-slate-400">{lt.schema_sub}</p>
            </div>

            {/* Interactive Dependency Grid Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-2">
              {RELATION_GROUPS.map(grp => (
                <div key={grp.id} className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-3xl flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">{grp.name_keys[currentLang]}</span>
                    <span className="font-mono text-[9px] bg-slate-950/80 px-2 py-0.5 rounded border border-white/5 font-black tracking-widest">{grp.id}</span>
                  </div>
                  
                  {/* Tables in this group */}
                  <div className="space-y-3">
                    {grp.tables.map(tbl => {
                      const isHovered = hoveredSchemaTable === tbl;
                      const hasFk = TABLE_SCHEMAS[tbl].some(f => f.fk);
                      const fks = TABLE_SCHEMAS[tbl].filter(f => f.fk).map(f => f.fk!.table);

                      return (
                        <div 
                          key={tbl}
                          onMouseEnter={() => setHoveredSchemaTable(tbl)}
                          onMouseLeave={() => setHoveredSchemaTable(null)}
                          className={`p-3 rounded-xl border transition-all duration-300 relative cursor-pointer ${
                            isHovered ? 'bg-indigo-950/50 border-indigo-500 scale-[1.02] shadow-lg shadow-indigo-900/20' : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-slate-100 flex items-center gap-1.5">
                              <Grid size={12} className="text-slate-400" /> {tbl}
                            </span>
                            <span className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold font-mono">
                              {TABLE_SCHEMAS[tbl].length} cols
                            </span>
                          </div>

                          {/* Render dependencies details */}
                          <div className="mt-2.5 pt-2 border-t border-slate-850/60 flex flex-col gap-1 text-[9px]">
                            {TABLE_SCHEMAS[tbl].map(field => {
                              if (field.isPk) {
                                return (
                                  <div key={field.name} className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                                    <span className="px-1 bg-emerald-950/60 border border-emerald-900 text-[8px] rounded uppercase scale-90">PK</span>
                                    <span>{field.name}</span>
                                  </div>
                                );
                              }
                              if (field.fk) {
                                return (
                                  <div key={field.name} className="flex items-center gap-1 text-rose-400 font-semibold font-mono">
                                    <span className="px-1 bg-rose-950/60 border border-rose-900 text-[8px] rounded uppercase scale-90">FK</span>
                                    <span>{field.name} ➔ {field.fk.table}.{field.fk.field}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>

                          {/* Hover Connection Indicators */}
                          {isHovered && hasFk && (
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-rose-500 rounded-full animate-ping pointer-events-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Relation Legend / Rules Banner */}
            <div className="mt-4 p-6 rounded-2xl border border-rose-900/30 bg-rose-950/10 backdrop-blur flex flex-col gap-3">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle size={14} className="animate-pulse" /> {lt.schema_legend}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                {lt.schema_legend_sub}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[10px] space-y-1.5">
                  <span className="font-bold text-slate-200">{lt.schema_rule1}</span>
                  <p className="text-slate-400 leading-relaxed">{lt.schema_rule1_desc}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[10px] space-y-1.5">
                  <span className="font-bold text-slate-200">{lt.schema_rule2}</span>
                  <p className="text-slate-400 leading-relaxed">{lt.schema_rule2_desc}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[10px] space-y-1.5">
                  <span className="font-bold text-slate-200">{lt.schema_rule3}</span>
                  <p className="text-slate-400 leading-relaxed">{lt.schema_rule3_desc}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXCEL GRID VIEW */}
        {currentView === 'grid' && (
          <div className="absolute inset-0 flex flex-col overflow-hidden">
            
            {/* Excel Formula Bar (fx) */}
            <div className="px-6 py-2 border-b border-slate-900 bg-slate-950 flex items-center gap-3 select-none">
              <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
                <div className="px-2 py-1 bg-slate-900 border border-slate-800 text-indigo-400 rounded text-[10px] font-black font-mono tracking-widest min-w-[45px] text-center shadow-inner">
                  {getCellCoordinates() || 'N/A'}
                </div>
              </div>

              {/* fx label */}
              <div className="font-mono italic font-black text-slate-400 text-xs tracking-wider flex items-center select-none">
                fx
              </div>

              {/* Active Cell Value Input Box */}
              <input 
                type="text"
                disabled={!selectedCell || editingCell?.colName === pkField}
                value={formulaValue}
                onChange={e => {
                  setFormulaValue(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCommitValue(formulaValue);
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Escape') {
                    if (selectedCell) {
                      const rowData = rows[selectedCell.row];
                      setFormulaValue(String(rowData[selectedCell.colName] || ''));
                    }
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onBlur={() => handleCommitValue(formulaValue)}
                className="flex-1 bg-slate-900/60 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 text-white rounded-lg px-3 py-1.5 text-xs outline-none transition-all font-mono"
                placeholder={selectedCell ? (editingCell?.colName === pkField ? lt.bar_pk_blocked : lt.bar_placeholder) : lt.bar_no_select}
              />

              {/* Action Buttons for rows */}
              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-3">
                <button 
                  onClick={handleAddRow}
                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-550 border border-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus size={12} /> {lt.btn_add_row}
                </button>
                <button 
                  onClick={handleDeleteRow}
                  className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Trash2 size={12} /> {lt.btn_delete_row}
                </button>
              </div>
            </div>

            {/* Editable Spreadsheet Sheet */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-950 select-none">
              {loading ? (
                <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center bg-slate-950/80 backdrop-blur-md">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-lg" />
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest animate-pulse">Loading relational data...</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center p-8 text-center bg-slate-950/40">
                  <AlertTriangle size={36} className="text-amber-500 animate-bounce" />
                  <h3 className="text-sm font-black text-slate-200">{lt.tbl_empty_title}</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">{lt.tbl_empty_desc}</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse border-spacing-0 select-none">
                  {/* Header Row */}
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 z-20 select-none border-b border-slate-900">
                    <tr>
                      {/* Excel Row Index Header cell */}
                      <th className="w-[50px] bg-slate-950/90 text-center font-mono text-[9px] font-black border-r border-slate-900 select-none shadow-sm py-2 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-500">
                        Index
                      </th>
                      {fields.map((field, colIdx) => {
                        const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
                        return (
                          <th 
                            key={field.name} 
                            className="bg-slate-950/90 border-r border-slate-900 select-none font-mono text-center px-4 py-2 hover:bg-slate-900 transition-colors shadow-sm min-w-[160px]"
                          >
                            <div className="text-[9px] text-slate-500 font-bold block leading-none select-none mb-1 uppercase tracking-wider">{colLetter}</div>
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[10px] text-slate-200 font-black tracking-tight">{field.name}</span>
                              {field.isPk && (
                                <span className="text-[7px] bg-emerald-950/80 text-emerald-400 border border-emerald-900/60 px-1 rounded font-black font-mono scale-90 uppercase">PK</span>
                              )}
                              {field.fk && (
                                <span className="text-[7px] bg-rose-950/80 text-rose-400 border border-rose-900/60 px-1 rounded font-black font-mono scale-90 uppercase" title={`Foreign Key: references ${field.fk.table}.${field.fk.field}`}>FK</span>
                              )}
                            </div>
                            <div className="text-[8px] text-slate-500 font-medium select-none truncate mt-0.5 leading-none">
                              {field.label_keys ? (field.label_keys[currentLang] || field.label) : field.label}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Body rows */}
                  <tbody className="divide-y divide-slate-900 select-none">
                    {rows.map((row, rowIndex) => {
                      const rowNumber = rowIndex + 1;
                      const rowId = row[pkField];

                      return (
                        <tr 
                          key={rowId || rowIndex} 
                          className="hover:bg-slate-900/20 group/row transition-colors"
                        >
                          {/* Row Index number cell */}
                          <td className="bg-slate-950 text-center font-mono text-[9px] font-black border-r border-slate-900 text-slate-500 py-1.5 select-none bg-gradient-to-r from-slate-950 to-slate-900 group-hover/row:text-slate-300">
                            {rowNumber}
                          </td>

                          {/* Row cells */}
                          {fields.map(field => {
                            const val = row[field.name];
                            const isCellSelected = selectedCell?.row === rowIndex && selectedCell?.colName === field.name;
                            const isCellEditing = editingCell?.row === rowIndex && editingCell?.colName === field.name;

                            return (
                              <td 
                                key={field.name}
                                onClick={() => handleCellSelect(rowIndex, field.name, val)}
                                onDoubleClick={() => handleCellDoubleClick(rowIndex, field.name, val)}
                                className={`border-r border-slate-900 px-4 py-1.5 font-mono text-xs cursor-pointer select-none transition-all duration-75 relative max-w-[250px] truncate ${
                                  isCellSelected ? 'bg-indigo-950/30' : 'bg-transparent'
                                }`}
                              >
                                {isCellEditing ? (
                                  <input 
                                    ref={editInputRef}
                                    type="text"
                                    value={formulaValue}
                                    onChange={e => setFormulaValue(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        handleCommitValue(formulaValue);
                                      } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                        setFormulaValue(String(val || ''));
                                      }
                                    }}
                                    onBlur={() => handleCommitValue(formulaValue)}
                                    className="absolute inset-0 w-full h-full bg-slate-900 text-white font-mono text-xs px-4 border-2 border-indigo-500 outline-none select-text"
                                  />
                                ) : (
                                  <span className={`select-none ${
                                    field.isPk ? 'text-indigo-400 font-bold' : 
                                    field.fk ? 'text-rose-400 font-medium' : 'text-slate-200'
                                  }`}>
                                    {val === undefined || val === null ? (
                                      <span className="text-slate-700 italic select-none">NULL</span>
                                    ) : typeof val === 'boolean' ? (
                                      val ? 'TRUE' : 'FALSE'
                                    ) : (
                                      String(val)
                                    )}
                                  </span>
                                )}

                                {/* Selected blue cell active border marker */}
                                {isCellSelected && !isCellEditing && (
                                  <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none select-none z-10" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Grid footer info stats bar */}
            <footer className="px-6 py-2 border-t border-slate-900 bg-slate-950 text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center justify-between select-none">
              <div className="flex gap-4">
                <span>{lt.footer_tbl}: {activeTable}</span>
                <span>{lt.footer_rows}: {rows.length} Rows</span>
                <span>{lt.footer_pk}: {pkField}</span>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-400">
                <Sparkles size={11} className="animate-spin" />
                <span>{lt.footer_active}</span>
              </div>
            </footer>
          </div>
        )}
      </div>

      {/* GORGEOUS RELATIONAL CONSTRAINT BLOCKER OVERLAY DIALOG */}
      {validationError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 selection:bg-rose-500/20">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.2)] animate-shake">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-rose-950/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-500">
                  <AlertTriangle size={20} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest">{validationError.title}</h3>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">VN-BECS Integrity Engine Rule Warning</p>
                </div>
              </div>
              <button 
                onClick={() => setValidationError(null)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-8 space-y-6">
              <p className="text-xs font-semibold text-slate-200 leading-relaxed bg-rose-950/20 border border-rose-900/30 p-4 rounded-2xl">
                {validationError.message}
              </p>
              
              {validationError.details && validationError.details.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">系統分析診斷建議 (Diagnostic Details):</span>
                  <ul className="space-y-2 bg-slate-950/80 border border-slate-850 p-4 rounded-2xl text-[10px] text-slate-300 leading-relaxed font-mono">
                    {validationError.details.map((d, i) => (
                      <li key={i} className="flex gap-2 items-start text-rose-300">
                        <span className="text-rose-500 shrink-0 select-none">➔</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-950/50 border-t border-slate-850 flex justify-end gap-3">
              <button 
                onClick={() => setValidationError(null)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                {lt.dialog_return}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
