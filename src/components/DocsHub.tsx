import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { DocsView } from './DocsView';
import { ArrowLeft, BookOpen, FileText, Globe, ExternalLink, ChevronRight, Activity } from 'lucide-react';

type Mode = 'landing' | 'tech' | 'portal';

const TECH_DOC_PATH = '/vn-becs-technical-review.html';

export function DocsHub({ onClose }: { onClose: () => void }) {
  const { lang, setLang } = useI18n();
  const [mode, setMode] = useState<Mode>('landing');

  const L = (zh: string, en: string, vi: string) =>
    lang === 'zh-TW' ? zh : lang === 'vi' ? vi : en;
  const iframeLang = lang === 'zh-TW' ? 'zh' : lang;

  // Reusable trilingual language switcher (rose pills)
  const LangSwitch = () => (
    <div className="flex items-center gap-1 bg-clinical-bg p-1 rounded-xl border border-clinical-border">
      <Globe size={14} className="text-clinical-muted mx-1" />
      {([['en', 'EN'], ['zh-TW', '繁'], ['vi', 'VI']] as const).map(([code, label]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
            lang === code
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'
              : 'text-clinical-muted hover:text-clinical-text'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // ---- Technical Review (embedded HTML) ----
  if (mode === 'tech') {
    return (
      <div className="flex flex-col h-screen bg-clinical-bg text-clinical-text overflow-hidden font-sans">
        <header className="p-4 border-b border-clinical-border bg-clinical-bg flex items-center justify-between shadow-lg shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMode('landing')} className="p-2 bg-clinical-bg hover:bg-slate-700 rounded-lg text-clinical-muted transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg border border-rose-500/30">
                <FileText className="text-rose-600" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-clinical-text uppercase tracking-widest text-sm">VN-BECS Technical Review</h1>
                <p className="text-[10px] text-clinical-muted uppercase tracking-wide">{L('系統技術總覽', 'System Technical Overview', 'Tổng quan Kỹ thuật Hệ thống')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={`${TECH_DOC_PATH}?lang=${iframeLang}`} target="_blank" rel="noopener noreferrer"
               className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-clinical-border text-clinical-muted hover:bg-rose-600 hover:text-white hover:border-rose-600 text-[10px] font-black uppercase tracking-widest transition-all">
              {L('新分頁開啟', 'Open in new tab', 'Mở tab mới')} <ExternalLink size={14} />
            </a>
            <LangSwitch />
          </div>
        </header>
        <div className="flex-1 bg-white">
          {/* key forces reload when language changes so the doc re-syncs */}
          <iframe
            key={iframeLang}
            src={`${TECH_DOC_PATH}?lang=${iframeLang}`}
            className="w-full h-full border-none"
            title="VN-BECS Technical Review"
          />
        </div>
      </div>
    );
  }

  // ---- Document Portal (existing system docs) ----
  if (mode === 'portal') {
    return <DocsView onBack={() => setMode('landing')} />;
  }

  // ---- Landing: two entry points ----
  return (
    <div className="min-h-screen bg-clinical-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/10 blur-[120px] rounded-full animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-clinical-border text-clinical-muted hover:bg-clinical-primary hover:text-white hover:border-clinical-primary text-[10px] font-black uppercase tracking-widest transition-all">
            <ArrowLeft size={16} /> {L('返回', 'Back', 'Quay lại')}
          </button>
          <LangSwitch />
        </div>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-rose-600 rounded-3xl mx-auto mb-5 flex items-center justify-center text-white shadow-lg shadow-rose-900/40">
            <BookOpen size={32} />
          </div>
          <h2 className="text-3xl font-black text-clinical-text uppercase italic tracking-tighter">
            {L('操作手冊', 'Operations Manual', 'Sổ tay Vận hành')}
          </h2>
          <p className="text-clinical-muted text-[11px] font-black uppercase tracking-[0.3em] mt-2 italic">
            {L('請選擇文件入口', 'Choose a document entry', 'Chọn cổng tài liệu')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Entry 1: Technical Review */}
          <button
            onClick={() => setMode('tech')}
            className="group text-left clinical-card bg-clinical-card border border-clinical-border rounded-3xl p-8 shadow-xl hover:border-rose-500 hover:shadow-rose-900/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-5 group-hover:bg-rose-600 group-hover:text-white text-rose-600 transition-all">
              <FileText size={26} />
            </div>
            <h3 className="text-lg font-black text-clinical-text mb-2 tracking-tight">VN-BECS Technical Review</h3>
            <p className="text-clinical-muted text-sm leading-relaxed mb-5">
              {L(
                '系統技術總覽：專案目的、系統範圍、合規檢核、系統關聯與作業流程圖、各子系統功能、狀態機、架構與部署。',
                'System technical overview: purpose, scope, compliance, relationship & workflow diagrams, subsystems, state machine, architecture & deployment.',
                'Tổng quan kỹ thuật: mục đích, phạm vi, tuân thủ, sơ đồ quan hệ & quy trình, phân hệ, máy trạng thái, kiến trúc & triển khai.'
              )}
            </p>
            <span className="inline-flex items-center gap-1 text-rose-600 text-[11px] font-black uppercase tracking-widest group-hover:gap-2 transition-all">
              {L('開啟', 'Open', 'Mở')} <ChevronRight size={14} />
            </span>
          </button>

          {/* Entry 2: Document Portal */}
          <button
            onClick={() => setMode('portal')}
            className="group text-left clinical-card bg-clinical-card border border-clinical-border rounded-3xl p-8 shadow-xl hover:border-indigo-500 hover:shadow-indigo-900/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 transition-all">
              <Activity size={26} />
            </div>
            <h3 className="text-lg font-black text-clinical-text mb-2 tracking-tight">Document Portal</h3>
            <p className="text-clinical-muted text-sm leading-relaxed mb-5">
              {L(
                '系統操作文件與 SOP 對齊：各子系統 (LIMS / LAB / HUB / HOSPITAL / NATIONAL / MDM) 操作手冊與情境式教學。',
                'System operations documents & SOP alignment: per-subsystem (LIMS / LAB / HUB / HOSPITAL / NATIONAL / MDM) manuals and scenario guides.',
                'Tài liệu vận hành & đối chiếu SOP: sổ tay từng phân hệ (LIMS / LAB / HUB / HOSPITAL / NATIONAL / MDM) và hướng dẫn theo tình huống.'
              )}
            </p>
            <span className="inline-flex items-center gap-1 text-indigo-600 text-[11px] font-black uppercase tracking-widest group-hover:gap-2 transition-all">
              {L('開啟', 'Open', 'Mở')} <ChevronRight size={14} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
