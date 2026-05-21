import React, { useState } from 'react';
import { X, Palette, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../lib/i18n';

export type ThemeType =
  | 'classic-medical-blue'
  | 'classic-editorial'
  | 'warm-minimalist'
  | 'nordic-crisp'
  | 'oceanic-healing'
  | 'tech-lavender'
  | 'minty-aqua'
  | 'slate-corporate'
  | 'frosted-glacier'
  | 'aurora-glow';

export interface ThemeOption {
  id: ThemeType;
  name: string;
  category: 'clinical-white' | 'medical-blue' | 'glassmorphism';
  description: string;
  bgPreview: string; // Tailwind background or CSS color preview
  colors: string[]; // preview colors: [bg, card, primary, text]
  accentName: string;
}

interface ThemeSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeType;
  onSelectTheme: (theme: ThemeType) => void;
}

export function ThemeSwitcher({ isOpen, onClose, currentTheme, onSelectTheme }: ThemeSwitcherProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'clinical-white' | 'medical-blue' | 'glassmorphism'>('all');
  const { t } = useI18n();

  const themes: ThemeOption[] = [
    // Category 1: Clinical White
    {
      id: 'classic-editorial',
      name: t('theme_name_classic_editorial'),
      category: 'clinical-white',
      description: t('theme_desc_classic_editorial'),
      bgPreview: 'bg-[#f4f0ea]',
      colors: ['#f4f0ea', '#ffffff', '#002d72', '#111111'],
      accentName: t('theme_accent_classic_editorial')
    },
    {
      id: 'warm-minimalist',
      name: t('theme_name_warm_minimalist'),
      category: 'clinical-white',
      description: t('theme_desc_warm_minimalist'),
      bgPreview: 'bg-[#efe6dc]',
      colors: ['#efe6dc', '#fffdfb', '#c2410c', '#3c2f2f'],
      accentName: t('theme_accent_warm_minimalist')
    },
    {
      id: 'nordic-crisp',
      name: t('theme_name_nordic_crisp'),
      category: 'clinical-white',
      description: t('theme_desc_nordic_crisp'),
      bgPreview: 'bg-[#dbe6e1]',
      colors: ['#dbe6e1', '#ffffff', '#065f46', '#0a251c'],
      accentName: t('theme_accent_nordic_crisp')
    },
    // Category 2: Medical Blue
    {
      id: 'classic-medical-blue',
      name: t('theme_name_classic_medical_blue'),
      category: 'medical-blue',
      description: t('theme_desc_classic_medical_blue'),
      bgPreview: 'bg-[#f0f6ff]',
      colors: ['#f0f6ff', '#ffffff', '#1e40af', '#0f172a'],
      accentName: t('theme_accent_classic_medical_blue')
    },
    {
      id: 'oceanic-healing',
      name: t('theme_name_oceanic_healing'),
      category: 'medical-blue',
      description: t('theme_desc_oceanic_healing'),
      bgPreview: 'bg-[#ffe4db]',
      colors: ['#ffe4db', '#ffffff', '#f95738', '#3d1b13'],
      accentName: t('theme_accent_oceanic_healing')
    },
    {
      id: 'slate-corporate',
      name: t('theme_name_slate_corporate'),
      category: 'medical-blue',
      description: t('theme_desc_slate_corporate'),
      bgPreview: 'bg-[#0f172a]',
      colors: ['#0f172a', '#1e293b', '#00f5ff', '#ffffff'],
      accentName: t('theme_accent_slate_corporate')
    },
    // Category 3: Glassmorphism / Special
    {
      id: 'tech-lavender',
      name: t('theme_name_tech_lavender'),
      category: 'glassmorphism',
      description: t('theme_desc_tech_lavender'),
      bgPreview: 'bg-[#05060e]',
      colors: ['#05060e', '#0e1122', '#a78bfa', '#e2e8f0'],
      accentName: t('theme_accent_tech_lavender')
    },
    {
      id: 'minty-aqua',
      name: t('theme_name_minty_aqua'),
      category: 'glassmorphism',
      description: t('theme_desc_minty_aqua'),
      bgPreview: 'bg-[#000000]',
      colors: ['#000000', '#060906', '#00ff00', '#39ff14'],
      accentName: t('theme_accent_minty_aqua')
    },
    {
      id: 'frosted-glacier',
      name: t('theme_name_frosted_glacier'),
      category: 'glassmorphism',
      description: t('theme_desc_frosted_glacier'),
      bgPreview: 'bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd]',
      colors: ['#bae6fd', 'rgba(255,255,255,0.45)', '#0284c7', '#072242'],
      accentName: t('theme_accent_frosted_glacier')
    },
    {
      id: 'aurora-glow',
      name: t('theme_name_aurora_glow'),
      category: 'glassmorphism',
      description: t('theme_desc_aurora_glow'),
      bgPreview: 'bg-gradient-to-br from-[#09061c] via-[#150c2d] to-[#2b0b30]',
      colors: ['#150c2d', 'rgba(18,12,45,0.55)', '#ec4899', '#fdf4ff'],
      accentName: t('theme_accent_aurora_glow')
    }
  ];

  const filteredThemes = activeCategory === 'all'
    ? themes
    : themes.filter(t => t.category === activeCategory);

  const categories = [
    { id: 'all', name: t('theme_category_all') },
    { id: 'clinical-white', name: t('theme_category_clinical_white') },
    { id: 'medical-blue', name: t('theme_category_medical_blue') },
    { id: 'glassmorphism', name: t('theme_category_glassmorphism') }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-8">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-clinical-bg/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-5xl bg-clinical-card border border-clinical-border rounded-[32px] p-6 sm:p-10 relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all duration-300"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Palette size={18} className="text-clinical-primary" />
                  <p className="text-[10px] font-black text-clinical-muted uppercase tracking-[0.2em] italic">{t('theme_switcher_protocol_title')}</p>
                </div>
                <h2 className="text-3xl font-black text-clinical-text uppercase italic tracking-tight font-sans">{t('theme_switcher_title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-3 bg-clinical-bg/50 hover:bg-clinical-bg rounded-full text-clinical-muted hover:text-clinical-text transition-all border border-clinical-border shadow-sm hover:rotate-90 duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-clinical-border">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeCategory === cat.id
                      ? 'bg-clinical-primary text-white shadow-md shadow-clinical-primary/30'
                      : 'bg-clinical-bg/50 border border-clinical-border text-clinical-muted hover:bg-clinical-bg hover:text-clinical-text'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Themes Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
              {filteredThemes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => onSelectTheme(theme.id)}
                  className={`group relative overflow-hidden p-5 rounded-[24px] border text-left flex flex-col justify-between min-h-[140px] transition-all duration-300 ${
                    currentTheme === theme.id
                      ? 'bg-clinical-bg/80 border-clinical-primary shadow-lg shadow-clinical-primary/10'
                      : 'bg-clinical-card/40 border-clinical-border hover:border-clinical-primary/40 hover:bg-clinical-bg/30 shadow-sm'
                  }`}
                >
                  {/* Small Preview Box */}
                  <div className="absolute right-4 top-4 flex gap-1 bg-clinical-bg/80 p-1.5 rounded-xl border border-clinical-border shadow-inner group-hover:scale-105 transition-all">
                    {theme.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-slate-300/40"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  {/* Theme Info */}
                  <div className="pr-20">
                    <div className="flex items-center gap-2 mb-1.5 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        theme.category === 'clinical-white' ? 'bg-slate-100 text-slate-800' :
                        theme.category === 'medical-blue' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {theme.category === 'clinical-white' ? t('theme_label_clinical_white') :
                         theme.category === 'medical-blue' ? t('theme_label_medical_blue') : t('theme_label_glassmorphism')}
                      </span>
                      <span className="text-[8px] font-bold text-clinical-muted uppercase tracking-widest">
                        {theme.accentName}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-clinical-text leading-tight mb-2 flex items-center gap-1.5 group-hover:text-clinical-primary transition-colors font-sans">
                      {theme.name}
                    </h3>
                    <p className="text-[10px] text-clinical-muted font-medium leading-relaxed max-w-md font-sans">
                      {theme.description}
                    </p>
                  </div>

                  {/* Active Indicator & Selection */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-clinical-border">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-clinical-muted/65 italic">
                      ID: {theme.id}
                    </span>
                    {currentTheme === theme.id ? (
                      <div className="flex items-center gap-1 text-clinical-primary">
                        <Check size={12} strokeWidth={3} />
                        <span className="text-[8px] font-black uppercase tracking-widest font-sans">{t('theme_active')}</span>
                      </div>
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-widest text-clinical-muted group-hover:text-clinical-text transition-colors font-sans">{t('theme_click_to_apply')}</span>
                    )}
                  </div>

                  {currentTheme === theme.id && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-clinical-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-clinical-border flex justify-between items-center text-clinical-muted">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500 animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-[0.3em] italic">{t('theme_switcher_footer_pulse')}</p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-clinical-primary text-white hover:opacity-90 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 font-sans"
              >
                {t('theme_switcher_close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
