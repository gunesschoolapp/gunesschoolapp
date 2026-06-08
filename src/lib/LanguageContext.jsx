import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('gunes_language');
      return saved === 'en' || saved === 'tr' ? saved : 'tr';
    } catch {
      return 'tr';
    }
  });

  const setLanguage = (lang) => {
    if (lang === 'tr' || lang === 'en') {
      setLanguageState(lang);
      try {
        localStorage.setItem('gunes_language', lang);
      } catch (e) {
        console.error('Failed to save language choice:', e);
      }
    }
  };

  const t = (key) => {
    const activeDict = translations[language] || translations.tr;
    return activeDict[key] || translations.tr[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
