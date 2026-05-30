import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fallbackDict } from './i18nFallbackDict';
import { supplementDict } from './i18nSupplement';

export type Language = 'en' | 'zh-TW' | 'vi';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
}

// The baseline fallback dictionary lives in ./i18nFallbackDict (pure data) so
// the system stays functional even if DB translation loading fails. The
// I18nProvider below merges DB-loaded translations over that baseline.

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('becs_lang') : null;
    return (saved as Language) || 'vi';
  });

  const [dbDict, setDbDict] = useState<Record<Language, Record<string, string>>>({
    en: {},
    'zh-TW': {},
    vi: {}
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function loadTranslations() {
      try {
        const response = await fetch('/api/v1/translations');
        if (!response.ok) {
          throw new Error(`Failed to fetch translations: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (Array.isArray(data)) {
          const newDict: Record<Language, Record<string, string>> = {
            en: {},
            'zh-TW': {},
            vi: {}
          };
          
          data.forEach((row: { key: string; lang: string; value: string }) => {
            const l = row.lang as Language;
            if (newDict[l]) {
              newDict[l][row.key] = row.value;
            }
          });
          
          if (isMounted) {
            setDbDict(newDict);
            setIsLoading(false);
          }
        } else {
          throw new Error('Invalid translations response format');
        }
      } catch (err: any) {
        console.error('Error loading translations from database:', err);
        if (isMounted) {
          setLoadError(err.message || 'Unknown database error');
          // If database fails, fallback to static minimal dictionary to avoid crashing
          setIsLoading(false);
        }
      }
    }

    loadTranslations();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('becs_lang', l);
  };

  const t = (key: string, variables?: Record<string, string>) => {
    // Priority: DB dict translation -> Fallback static dict -> Fallback English DB/Static -> key
    let text = dbDict[lang]?.[key] ||
               fallbackDict[lang]?.[key] ||
               supplementDict[lang]?.[key] ||
               dbDict['en']?.[key] ||
               fallbackDict['en']?.[key] ||
               supplementDict['en']?.[key] ||
               key;
               
    if (variables) {
      Object.keys(variables).forEach(k => {
        text = text.split(`{${k}}`).join(variables[k]);
      });
    }
    return text;
  };

  if (isLoading) {
    return (
      <div 
        id="i18n-loading-screen"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f4f1ea] text-[#0f172a] p-6 select-none"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        {/* McKinsey-style Elegant Border */}
        <div className="absolute inset-8 border border-[#0f172a]/10 pointer-events-none rounded-2xl" />
        
        {/* Loading Content */}
        <div className="max-w-xl w-full flex flex-col items-center text-center space-y-8 animate-fade-in">
          {/* Pulsing clinical logo container */}
          <div className="relative flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-lg border border-[#0f172a]/5 animate-pulse">
            <svg className="w-12 h-12 text-rose-600 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
            <div className="absolute -inset-1 border border-dashed border-rose-500/20 rounded-[28px] animate-spin" style={{ animationDuration: '10s' }} />
          </div>

          <div className="space-y-4">
            <h1 className="text-sm font-black uppercase tracking-[0.25em] text-[#0f172a] italic">
              VN-BECS V1.0 COMMAND
            </h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              National Blood Establishment Computer System
            </p>
          </div>

          {/* Elegant Slate Shimmer Loading Indicator */}
          <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-24 bg-rose-600 rounded-full animate-shimmer" style={{
              animation: 'shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }} />
          </div>

          {/* Cycling Status Indicators */}
          <div className="space-y-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 transition-all duration-500">
            <div className="animate-pulse">
              EN: Synchronizing national database & secure clinical protocols...
            </div>
            <div className="opacity-80">
              TW: 正在同步國家級安全數據庫與臨床驗證協定...
            </div>
            <div className="opacity-60">
              VI: Đang đồng bộ hóa cơ sở dữ liệu chỉ huy và giao thức lâm sàng...
            </div>
          </div>
        </div>
        
        {/* Inline CSS for loading animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          .animate-shimmer {
            animation: shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
        `}} />
      </div>
    );
  }

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
