import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations, getTranslation, isRTL, languageNames, languageFlags } from '@/i18n/translations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  isRTL: boolean;
  languageNames: Record<Language, string>;
  languageFlags: Record<Language, string>;
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage first
    const saved = localStorage.getItem('digiwell_language');
    if (saved && ['en', 'fr', 'es', 'ar', 'zh'].includes(saved)) {
      return saved as Language;
    }
    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (['en', 'fr', 'es', 'ar', 'zh'].includes(browserLang)) {
      return browserLang as Language;
    }
    return 'en';
  });

  // Load user's language preference from database
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('language')
            .eq('user_id', user.id)
            .maybeSingle(); // Use maybeSingle to handle case when no row exists

          if (!error && data?.language && ['en', 'fr', 'es', 'ar', 'zh'].includes(data.language)) {
            setLanguageState(data.language as Language);
            localStorage.setItem('digiwell_language', data.language);
          }
        } catch (error) {
          // Table might not exist yet or no preferences, ignore error
          console.log('Could not load language preference');
        }
      }
    };

    loadUserLanguage();
  }, [user]);


  // Save language preference to database and localStorage
  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('digiwell_language', lang);

    // Update document direction for RTL languages
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // Save to database if user is logged in
    if (user) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            language: lang,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.log('Could not save language preference');
      }
    }
  }, [user]);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string>): string => {
    return getTranslation(language, key, params);
  }, [language]);

  // Update document direction on language change
  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isRTL: isRTL(language),
    languageNames,
    languageFlags,
    availableLanguages: ['en', 'fr', 'es', 'ar', 'zh']
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;
