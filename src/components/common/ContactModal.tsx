import React from 'react';
import { Mail, Phone, Headphones, Radio, X, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../core/i18n/LanguageContext';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-cyan-950/50 text-slate-100 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              {t('contactMenuTitle', 'Contacto y Soporte Técnico TOS')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('contactSubtitle', 'Atención operativa 24/7 para planificación de estiba y sistemas portuarios.')}
            </p>
          </div>
        </div>

        {/* Contact Cards */}
        <div className="space-y-3 my-5">
          {/* Email Card */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl hover:border-cyan-500/40 transition-colors flex items-start gap-3">
            <div className="p-2.5 bg-cyan-950 text-cyan-400 rounded-lg shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-400 font-mono block">
                {t('emailLabel', 'Correo Electrónico (Email)')}
              </span>
              <a
                href="mailto:soporte.tos@terminal.com"
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 truncate block transition-colors"
              >
                soporte.tos@terminal.com
              </a>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Respuesta inmediata mesa de ayuda BAPLIE/EDI
              </span>
            </div>
          </div>

          {/* Phone Card */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl hover:border-cyan-500/40 transition-colors flex items-start gap-3">
            <div className="p-2.5 bg-emerald-950 text-emerald-400 rounded-lg shrink-0 mt-0.5">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-400 font-mono block">
                {t('phoneLabel', 'Teléfono / Móvil Directo')}
              </span>
              <a
                href="tel:+525584329000"
                className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 block transition-colors"
              >
                +52 (55) 8432-9000
              </a>
              <a
                href="tel:+525598765432"
                className="text-xs font-semibold text-slate-300 hover:text-white block transition-colors mt-0.5"
              >
                +52 (55) 9876-5432 (Móvil Guardias)
              </a>
            </div>
          </div>

          {/* VHF / Terminal Operations Desk */}
          <div className="p-3.5 bg-slate-950/80 border border-amber-500/20 rounded-xl flex items-center gap-3">
            <Radio className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200/90 font-mono">
              {t('vhfChannel', 'Canal VHF Operativo: Canal 16 / Ext. 4020')}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <a
            href="mailto:soporte.tos@terminal.com"
            className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-950/50"
          >
            <Mail className="w-4 h-4" />
            <span>{t('sendEmailBtn', 'Enviar Correo')}</span>
          </a>

          <a
            href="tel:+525584329000"
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/50"
          >
            <Phone className="w-4 h-4" />
            <span>{t('callPhoneBtn', 'Llamar Support')}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
