import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, Language } from '../../core/i18n/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: { code: Language; label: string; flag: string; nativeName: string }[] = [
    {
      code: 'es',
      label: 'Español Latino',
      nativeName: 'Español (Latinoamérica)',
      flag: '🇲🇽'
    },
    {
      code: 'en',
      label: 'English',
      nativeName: 'English (US)',
      flag: '🇺🇸'
    }
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative inline-block text-left font-mono" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-cyan-500/40 hover:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        title="Traductor / Selección de Idioma (Español Latino / English)"
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
        <span className="text-base leading-none">{currentLang.flag}</span>
        {!compact && (
          <span className="text-[11px] font-bold text-slate-200 hidden sm:inline">
            {currentLang.label}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#091524] border border-cyan-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.6)] py-2 z-50 animate-fade-in backdrop-blur-md">
          <div className="px-3 py-1.5 border-b border-cyan-500/20 text-[10px] uppercase font-bold text-cyan-400 flex items-center justify-between">
            <span>Traductor / Language</span>
            <Globe className="w-3 h-3 text-cyan-400" />
          </div>

          <div className="p-1 space-y-1">
            {languages.map(lang => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 border border-cyan-400/60 text-cyan-200 font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <div>
                      <div className="font-bold leading-tight">{lang.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{lang.nativeName}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
