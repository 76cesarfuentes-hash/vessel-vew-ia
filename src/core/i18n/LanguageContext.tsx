import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'es' | 'en';

interface Translations {
  [key: string]: {
    es: string;
    en: string;
  };
}

export const translations: Translations = {
  // Brand & Header
  appTitle: {
    es: 'Mesa de Control y Operaciones TOS',
    en: 'TOS Operations & Control Center'
  },
  activeTerminal: {
    es: 'Terminal Activa',
    en: 'Active Terminal'
  },
  gateOpen: {
    es: 'Gate Abierto',
    en: 'Gate Open'
  },
  gateClosed: {
    es: 'Gate Cerrado',
    en: 'Gate Closed'
  },
  baplieLoaded: {
    es: 'BAPLIE Cargado',
    en: 'BAPLIE Loaded'
  },
  movinsLoaded: {
    es: 'MOVINS Cargado',
    en: 'MOVINS Loaded'
  },
  noFile: {
    es: 'Sin Archivo',
    en: 'No File'
  },
  demoDataLoaded: {
    es: 'Datos Demo Realistas Cargados',
    en: 'Realistic Demo Data Loaded'
  },

  // Contact Menu
  contactMenuTitle: {
    es: 'Contacto y Soporte Técnico TOS',
    en: 'TOS Technical Support & Contact'
  },
  contactSubtitle: {
    es: 'Atención operativa 24/7 para planificación de estiba y sistemas portuarios.',
    en: '24/7 operational assistance for vessel stowage planning & port systems.'
  },
  emailLabel: {
    es: 'Correo Electrónico (Email)',
    en: 'Email Address'
  },
  emailValue: {
    es: 'soporte.tos@terminal.com',
    en: 'soporte.tos@terminal.com'
  },
  phoneLabel: {
    es: 'Teléfono / Móvil Directo',
    en: 'Direct Phone / Mobile'
  },
  phoneValue: {
    es: '+52 (55) 8432-9000 / +52 (55) 9876-5432',
    en: '+52 (55) 8432-9000 / +52 (55) 9876-5432'
  },
  vhfChannel: {
    es: 'Canal VHF Operativo: Canal 16 / Ext. 4020',
    en: 'VHF Operational Channel: Ch. 16 / Ext. 4020'
  },
  sendEmailBtn: {
    es: 'Enviar Correo',
    en: 'Send Email'
  },
  callPhoneBtn: {
    es: 'Llamar Teléfono',
    en: 'Call Support'
  },
  closeBtn: {
    es: 'Cerrar',
    en: 'Close'
  },

  // Navigation Tabs
  tabEstiba: {
    es: 'Matriz Estiba',
    en: 'Stowage Matrix'
  },
  tabPlanos: {
    es: 'Reportes y Planos',
    en: 'Plans & Reports'
  },
  tabCuadre: {
    es: 'Cuadre y Conciliación',
    en: 'Reconciliation'
  },
  tabMovins: {
    es: 'Validador MOVINS',
    en: 'MOVINS Validator'
  },
  tabAgents: {
    es: 'Copilot Agente IA',
    en: 'AI Copilot Agent'
  },
  tabComparador: {
    es: 'Comparador BAPLIE',
    en: 'BAPLIE Comparator'
  },
  tabMiniplan: {
    es: 'MiniPlan Pro',
    en: 'MiniPlan Pro'
  },
  tabMovimientos: {
    es: 'Movimientos Operativos',
    en: 'Operating Movements'
  },
  tabManualEngine: {
    es: 'Motor de Ajuste',
    en: 'Stowage Engine'
  },
  tabAutoExcel: {
    es: 'Auto Planner Excel',
    en: 'Auto Excel Planner'
  },

  // Test Mode Warning
  testModeTitle: {
    es: 'MODO PRUEBA ACTIVO (Máx 5 Ingresos por IP)',
    en: 'TEST MODE ACTIVE (Max 5 Logins per IP)'
  },
  testModeSub: {
    es: 'Límite de prueba configurado a 5 accesos por dirección IP.',
    en: 'Test access limit set to 5 entries per IP address.'
  },

  // Auth & Login
  loginTitle: {
    es: 'MESA DE PLANIFICACIÓN DE ESTIBA TOS',
    en: 'TOS STOWAGE PLANNING DESK'
  },
  loginSubtitle: {
    es: 'Plataforma de Control Terminal & Estiba Portuaria BAPLIE/MOVINS EDI',
    en: 'Terminal Control & Port Stowage Platform BAPLIE/MOVINS EDI'
  },
  usernameLabel: {
    es: 'Usuario',
    en: 'Username'
  },
  passwordLabel: {
    es: 'Contraseña',
    en: 'Password'
  },
  loginBtn: {
    es: 'Iniciar Sesión',
    en: 'Sign In'
  },
  loggingIn: {
    es: 'Autenticando...',
    en: 'Authenticating...'
  },
  logoutBtn: {
    es: 'Cerrar Sesión',
    en: 'Log Out'
  },

  // General Actions
  loadBaplie: {
    es: 'Cargar BAPLIE',
    en: 'Upload BAPLIE'
  },
  loadMovins: {
    es: 'Cargar MOVINS',
    en: 'Upload MOVINS'
  },
  loadDemo: {
    es: 'Cargar Demo',
    en: 'Load Demo'
  },
  gateConfig: {
    es: 'Configurar Gate',
    en: 'Configure Gate'
  },
  manoMasLarga: {
    es: 'Mano Más Larga',
    en: 'Longest Crane'
  },
  shareTransmit: {
    es: 'Transmitir / Compartir',
    en: 'Share / Transmit'
  },
  contactUs: {
    es: 'Contacto',
    en: 'Contact Us'
  },
  language: {
    es: 'Idioma',
    en: 'Language'
  },
  spanishLatino: {
    es: 'Español Latino (ES)',
    en: 'Latin Spanish (ES)'
  },
  englishUS: {
    es: 'English (EN)',
    en: 'English (EN)'
  },

  // Containers & Summary
  totalContainers: {
    es: 'Total Contenedores',
    en: 'Total Containers'
  },
  dgUnits: {
    es: 'Peligrosos (DG/IMO)',
    en: 'Dangerous (DG/IMO)'
  },
  reeferUnits: {
    es: 'Refrigerados (RF)',
    en: 'Reefers (RF)'
  },
  emptyUnits: {
    es: 'Vacíos (MT)',
    en: 'Empties (MT)'
  },
  outOfGauge: {
    es: 'Sobredimensión (OOG)',
    en: 'Out of Gauge (OOG)'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('tos_app_lang') as Language) || 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('tos_app_lang', lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const entry = translations[key];
    if (entry) {
      return entry[language] || entry.es || defaultText || key;
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
