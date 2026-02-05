import React, { createContext, useState, useCallback } from 'react';
import { translations } from './translations';

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  const getTranslation = useCallback((key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  const switchLanguage = useCallback((lang) => {
    if (['en', 'zh'].includes(lang)) {
      setLanguage(lang);
      console.log(`Language switched to: ${lang}`);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, getTranslation, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
