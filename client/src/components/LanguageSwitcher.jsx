import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { language, changeLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' }
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        style={{
          appearance: 'none',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '8px 32px 8px 12px',
          color: 'var(--text-main)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontWeight: 500,
          minWidth: '120px'
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <Globe 
        size={14} 
        style={{ 
          position: 'absolute', 
          right: '10px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          pointerEvents: 'none'
        }} 
      />
    </div>
  );
};

export default LanguageSwitcher;
