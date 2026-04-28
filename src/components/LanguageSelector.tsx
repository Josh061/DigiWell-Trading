import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/i18n/translations';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'mobile';
  className?: string;
}

export default function LanguageSelector({ variant = 'default', className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, languageNames, languageFlags, availableLanguages } = useLanguage();
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

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
        >
          <span className="text-base">{languageFlags[language]}</span>
          <span className="hidden sm:inline">{language.toUpperCase()}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-white/20 overflow-hidden z-50">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/10 transition-colors ${
                  language === lang ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-white'
                }`}
              >
                <span className="text-lg">{languageFlags[lang]}</span>
                <span className="flex-1 text-sm">{languageNames[lang]}</span>
                {language === lang && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Globe className="w-4 h-4 text-white" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-slate-800 rounded-lg shadow-xl border border-white/20 overflow-hidden z-50">
            <div className="px-3 py-2 border-b border-white/10">
              <span className="text-xs text-white/60 uppercase tracking-wider">Language</span>
            </div>
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/10 transition-colors ${
                  language === lang ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-white'
                }`}
              >
                <span className="text-lg">{languageFlags[lang]}</span>
                <span className="flex-1 text-sm">{languageNames[lang]}</span>
                {language === lang && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/20"
      >
        <Globe className="w-4 h-4" />
        <span className="text-base">{languageFlags[language]}</span>
        <span className="text-sm font-medium">{languageNames[language]}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-xl shadow-2xl border border-white/20 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-semibold text-white">Select Language</span>
            </div>
          </div>
          <div className="py-1">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                  language === lang ? 'bg-[#D4AF37]/20' : ''
                }`}
              >
                <span className="text-xl">{languageFlags[lang]}</span>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${language === lang ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {languageNames[lang]}
                  </div>
                  <div className="text-xs text-white/50">{lang.toUpperCase()}</div>
                </div>
                {language === lang && (
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center">
                    <Check className="w-3 h-3 text-slate-900" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
