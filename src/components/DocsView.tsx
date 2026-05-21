import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { docsTranslations, DocModule, DocSection, DocsLanguageDict } from '../lib/i18nDocs';
import { ArrowLeft, BookOpen, Layers, Settings, Truck, Syringe, ClipboardCheck, Globe, ExternalLink, Activity, Beaker, Stethoscope, Package } from 'lucide-react';

export function DocsView({ onBack }: { onBack: () => void }) {
  const { t, lang, setLang } = useI18n();
  const [activeDoc, setActiveDoc] = useState<keyof DocsLanguageDict>('Sys');

  // Load the current language dictionary from our docs mapping. Fallback to 'en'.
  const currentDocs = docsTranslations[lang] || docsTranslations['en'];
  const moduleData: DocModule = currentDocs[activeDoc];

  const menuItems = [
    { id: 'Sys', icon: <Layers size={18} />, label: currentDocs.Sys.title },
    { id: 'LIMS', icon: <Activity size={18} />, label: currentDocs.LIMS.title },
    { id: 'LAB', icon: <Beaker size={18} />, label: currentDocs.LAB.title },
    { id: 'HUB', icon: <Package size={18} />, label: currentDocs.HUB.title },
    { id: 'HOSPITAL', icon: <Stethoscope size={18} />, label: currentDocs.HOSPITAL.title },
    { id: 'NATIONAL', icon: <Globe size={18} />, label: currentDocs.NATIONAL.title },
    { id: 'MDM', icon: <Settings size={18} />, label: currentDocs.MDM.title },
  ] as const;

  // Render a section block based on its type
  const renderSection = (section: DocSection, idx: number) => {
    switch (section.type) {
      case 'text':
        return (
          <div key={idx} className="mb-6">
            {section.subtitle && <h3 className="text-cyan-400 font-bold mb-2 uppercase tracking-widest text-sm">{section.subtitle}</h3>}
            <p className="text-slate-600 leading-relaxed text-sm">{section.content}</p>
          </div>
        );
      case 'list':
        return (
          <div key={idx} className="mb-6 bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
            {section.subtitle && <h3 className="text-cyan-400 font-bold mb-4 uppercase tracking-widest text-sm">{section.subtitle}</h3>}
            <ul className="space-y-3">
              {section.items?.map((item, i) => (
                 <li key={i} className="flex gap-3 text-sm text-slate-700 items-start">
                   <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0"></div>
                   <span className="leading-relaxed">{item}</span>
                 </li>
              ))}
            </ul>
          </div>
        );
      case 'steps':
        return (
          <div key={idx} className="mb-6 bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
            {section.subtitle && <h3 className="text-cyan-400 font-bold mb-4 uppercase tracking-widest text-sm">{section.subtitle}</h3>}
            <div className="flex flex-col gap-4">
              {section.items?.map((item, i) => (
                 <div key={i} className="flex gap-4 items-center bg-[#0b1120] p-3 rounded-lg border border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center shrink-0 border border-lime-500/50 font-bold">{i + 1}</div>
                    <div className="text-sm text-slate-700 font-mono leading-relaxed">{item}</div>
                 </div>
              ))}
            </div>
          </div>
        );
      case 'table':
        return (
          <div key={idx} className="mb-6">
            {section.subtitle && <h3 className="text-cyan-400 font-bold mb-3 uppercase tracking-widest text-sm">{section.subtitle}</h3>}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-600 uppercase tracking-widest text-[10px]">
                  <tr>
                    {section.tableData?.headers.map((h, i) => <th key={i} className="p-4">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-[#0b1120]">
                  {section.tableData?.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                      {row.map((cell, j) => (
                        <td key={j} className={`p-4 ${j === 0 ? 'font-bold text-cyan-400' : 'text-slate-600'}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'alert':
        const bgColors = {
          info: 'bg-cyan-950/20 border-cyan-900/50',
          warning: 'bg-orange-950/20 border-orange-900/50',
          danger: 'bg-rose-950/20 border-rose-900/50'
        };
        const textColors = {
          info: 'text-cyan-400',
          warning: 'text-orange-600',
          danger: 'text-rose-600'
        };
        const activeColor = section.alertType || 'info';
        return (
          <div key={idx} className={`mb-6 border p-6 rounded-xl ${bgColors[activeColor]}`}>
            <h4 className={`font-bold mb-2 uppercase tracking-widest text-xs flex items-center gap-2 ${textColors[activeColor]}`}>
              <Settings size={14} /> {section.subtitle || 'Important Note'}
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">{section.content}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b1120] text-slate-800 overflow-hidden font-sans">
      <header className="p-4 border-b border-indigo-200 bg-[#020617] flex items-center justify-between shadow-lg shrink-0">
         <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-600 transition-colors">
              <ArrowLeft size={18} />
           </button>
           <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                 <BookOpen className="text-indigo-600" size={20} />
              </div>
              <div>
                 <h1 className="font-bold text-slate-800 uppercase tracking-widest text-sm">{t('doc_title')}</h1>
                 <p className="text-[10px] text-slate-600 uppercase tracking-wide">{t('doc_subtitle')}</p>
              </div>
           </div>
         </div>
         
         {/* Language Switcher */}
         <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700">
            <Globe size={14} className="text-slate-600 ml-2" />
            <select 
              value={lang} 
              onChange={e => setLang(e.target.value as 'en' | 'zh-TW' | 'vi')}
              className="bg-transparent border-none text-xs text-slate-700 focus:ring-0 outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-800">English</option>
              <option value="zh-TW" className="bg-slate-800">繁體中文</option>
              <option value="vi" className="bg-slate-800">Tiếng Việt</option>
            </select>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-[#020617] border-r border-slate-800 flex flex-col p-4 overflow-y-auto shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-10">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 px-2">Table of Contents</div>
          <div className="flex flex-col gap-2">
            {menuItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveDoc(item.id)}
                className={`flex items-center gap-3 p-3.5 rounded-xl text-sm transition-all text-left group ${activeDoc === item.id ? 'bg-indigo-900/40 text-indigo-600 border border-indigo-800/50 font-bold shadow-lg' : 'text-slate-600 hover:bg-slate-800 hover:text-white border border-transparent'}`}
              >
                <div className={`${activeDoc === item.id ? 'text-indigo-600' : 'text-slate-600 group-hover:text-slate-700'}`}>
                  {item.icon}
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 lg:p-12 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0b1120] to-[#0b1120]">
          
          {/* External Manual Call-to-Action */}
          <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-cyan-900/40 to-indigo-900/40 border border-cyan-800/50 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-cyan-400 font-bold text-lg mb-1">{lang === 'zh-TW' ? '需要更詳細的情境式教學？' : lang === 'vi' ? 'Cần hướng dẫn chi tiết theo tình huống?' : 'Need detailed scenario-based training?'}</h3>
              <p className="text-slate-600 text-sm">{lang === 'zh-TW' ? '我們準備了萬字級的圖文手把手外部手冊，非常適合初次接觸系統的新手。' : lang === 'vi' ? 'Chúng tôi đã chuẩn bị một sổ tay bên ngoài với hàng ngàn từ và hình ảnh.' : 'We have prepared an extensive external manual with step-by-step guides.'}</p>
            </div>
            <a 
              href={`/docs/manual_${lang === 'zh-TW' ? 'zh' : lang}.html`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-800 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(8,145,178,0.5)] shrink-0"
            >
              <BookOpen size={18} /> {lang === 'zh-TW' ? '開啟完整圖文操作手冊' : lang === 'vi' ? 'Mở Sổ tay Vận hành Đầy đủ' : 'Open Complete Training Manual'} <ExternalLink size={16} />
            </a>
          </div>

          <div className="max-w-4xl mx-auto bg-[#020617]/80 backdrop-blur-md border border-slate-800 rounded-3xl p-8 lg:p-12 shadow-2xl">
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="mb-10 pb-6 border-b border-slate-800">
                 <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{moduleData.title}</h2>
                 <p className="text-slate-600 text-lg leading-relaxed font-light">{moduleData.desc}</p>
               </div>
               
               <div className="space-y-4">
                 {moduleData.sections.map((section, idx) => renderSection(section, idx))}
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
