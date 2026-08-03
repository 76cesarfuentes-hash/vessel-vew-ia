import React, { useState } from 'react';
import { useAuth } from '../../core/security/AuthContext';
import { useLanguage } from '../../core/i18n/LanguageContext';
import { ContactModal } from '../common/ContactModal';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import appLogoGenerated from '../../assets/images/stowage_app_logo_1785618008257.jpg';
import appLogoPng from '../../assets/logo.png';
import appLogoJpg from '../../assets/logo.jpg';
import { ShieldCheck, Lock, User as UserIcon, LogIn, AlertTriangle, Ship, Globe, Headphones } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string>(appLogoGenerated || appLogoPng || appLogoJpg);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  const handleImgError = () => {
    if (imgSrc === appLogoGenerated) {
      setImgSrc(appLogoPng);
    } else if (imgSrc === appLogoPng) {
      setImgSrc(appLogoJpg);
    } else {
      setImgFailed(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Credenciales inválidas o cuenta bloqueada.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050D18] flex items-center justify-center p-4 select-none overflow-hidden font-sans">
      {/* Background Cybernetic Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Actions (Language Switcher & Contact) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Contact Support Button */}
        <button
          onClick={() => setIsContactOpen(true)}
          className="py-1.5 px-3 bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/30 text-cyan-300 hover:text-white rounded-xl text-xs font-mono flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
        >
          <Headphones className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('contactUs', 'Contacto')}</span>
        </button>

        {/* Language Switcher */}
        <LanguageSwitcher />
      </div>

      {/* Main Login Card Container */}
      <div className="w-full max-w-md bg-[#0A1A2B]/90 border border-cyan-500/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,229,255,0.15)] backdrop-blur-xl relative z-10">
        
        {/* Header with App Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            {!imgFailed ? (
              <img
                src={imgSrc}
                onError={handleImgError}
                alt="Logo Corporativo TOS"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,229,255,0.4)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-950 via-[#0A1A2B] to-blue-950 border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,229,255,0.4)] flex flex-col items-center justify-center p-2 text-cyan-400">
                <Ship className="w-9 h-9 text-cyan-300" />
                <span className="text-[10px] font-black font-mono tracking-widest mt-1 text-cyan-400">TOS PORT</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-cyan-950 border border-cyan-400 text-cyan-400 p-1 rounded-full shadow">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="text-lg font-black font-mono text-white tracking-widest uppercase">
            {t('loginTitle', 'SISTEMA TOS PORTUARIO')}
          </h1>
          <p className="text-[11px] font-mono text-cyan-300/80 mt-1 uppercase tracking-wider">
            {t('loginSubtitle', 'CONTROL DE ACCESO SEGURO EMPRESARIAL')}
          </p>

          {/* Test Mode Limit Info Badge */}
          <div className="mt-3 px-3 py-1 bg-amber-950/60 border border-amber-500/40 rounded-lg text-[10px] font-mono text-amber-300 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{t('testModeTitle', 'MODO PRUEBA ACTIVO (Máx 5 Ingresos por IP)')}</span>
          </div>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-950/90 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('usernameLabel', 'USUARIO')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#050E1A] border border-cyan-500/40 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('passwordLabel', 'CONTRASEÑA')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#050E1A] border border-cyan-500/40 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('loggingIn', 'VERIFICANDO...')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                {t('loginBtn', 'INGRESAR')}
              </span>
            )}
          </button>
        </form>

        {/* Secure Architecture Footer */}
        <div className="mt-6 pt-4 border-t border-cyan-500/20 text-center">
          <p className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            PROTECCIÓN EMPRESARIAL OWASP • RBAC AUTHENTICATION
          </p>
        </div>
      </div>

      {/* Contact Support Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};

