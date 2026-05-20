import React from 'react';
import { Role } from '../types';
import { useI18n } from '../lib/i18n';

export function LimsFlowIndicator({ activeTab }: { activeTab: string }) {
  const { t } = useI18n();
  const limsSteps = [
    { id: 'DONOR', label: t('flow_lims_donor'), sop: 'SOP 1' },
    { id: 'LAB', label: t('flow_lims_lab'), sop: 'SOP 2' },
    { id: 'PROCESS', label: t('flow_lims_process'), sop: 'SOP 9' },
    { id: 'RELEASE', label: t('flow_lims_release'), sop: 'QA' }
  ];
  return (
    <div className="bg-[#0b1120]/80 border-b border-slate-700 p-3 overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-2 text-xs font-bold w-max mx-auto px-4">
        <span className="text-slate-500 mr-2 uppercase tracking-widest hidden lg:inline">{t('flow_lims_title')}</span>
        {limsSteps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={`px-4 py-1.5 rounded-full flex flex-col items-center justify-center transition-all ${
              activeTab === step.id 
                ? 'bg-blue-400 border border-blue-950/300 shadow-[0_0_10px_rgba(59,130,246,0.3)] text-white'
                : 'bg-[#020617]/50 text-slate-500 border border-slate-700'
            }`}>
              <span className="text-[10px] font-mono opacity-80 leading-none mb-0.5">{step.sop}</span>
              <span className="leading-none">{step.label}</span>
            </div>
            {idx < limsSteps.length - 1 && (
              <div className="text-slate-400 font-black">➔</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function FlowIndicator({ role }: { role: Role }) {
  const { t } = useI18n();

  if (role === 'LIMS_Simulator') return null; // Handled internally by DonorCenterSimulatorView

  const mainSteps = [
    { roles: ['HospitalOperator'], label: t('flow_sc_order'), sop: 'SOP 10' },
    { roles: ['Dispatcher'], label: t('flow_sc_dispatch'), sop: 'SOP 4' },
    { roles: ['WarehouseIssuer'], label: t('flow_sc_outbound'), sop: 'SOP 3' },
    { roles: ['Courier'], label: t('flow_sc_tracking'), sop: 'SOP 5' },
    { roles: ['Nurse'], label: t('flow_sc_bedside'), sop: 'SOP 6' },
    { roles: ['Manager', 'Auditor', 'MedicalReviewer'], label: t('flow_sc_review'), sop: 'KPIs' }
  ];

  const currentStepIdx = mainSteps.findIndex(s => s.roles.includes(role));

  return (
    <div className="bg-[#0b1120]/80 border-b border-slate-700 p-3 overflow-x-auto custom-scrollbar shadow-inner">
      <div className="flex items-center gap-2 text-xs font-bold w-max mx-auto px-4">
        <span className="text-slate-500 mr-2 uppercase tracking-widest hidden xl:inline">{t('flow_sc_title')}</span>
        {mainSteps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className={`px-4 py-1.5 rounded-full flex flex-col items-center justify-center transition-all whitespace-nowrap ${
              currentStepIdx === idx 
                ? 'bg-lime-400 border border-lime-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] text-white font-extrabold'
                : currentStepIdx > idx 
                  ? 'bg-lime-950/40 text-lime-400 border border-lime-900/50'
                  : 'bg-[#020617]/50 text-slate-500 border border-slate-700'
            }`}>
              <span className="text-[10px] font-mono opacity-80 leading-none mb-0.5 font-bold tracking-wider">{step.sop}</span>
              <span className="leading-none">{step.label}</span>
            </div>
            {idx < mainSteps.length - 1 && (
              <div className={`text-sm ${currentStepIdx > idx ? 'text-lime-950/300 font-bold' : 'text-slate-400'}`}>➔</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
