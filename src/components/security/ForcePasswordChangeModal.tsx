import React, { useState } from 'react';
import { useAuth } from '../../core/security/AuthContext';
import { ShieldAlert, KeyRound, Check, X, AlertTriangle } from 'lucide-react';

interface ForcePasswordChangeModalProps {
  onSuccess: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ onSuccess }) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Policy Checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword
  };

  const isPolicyMet = checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special && checks.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Por favor complete todos los campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmación de contraseña no coincide.');
      return;
    }

    if (!isPolicyMet) {
      setError('La nueva contraseña debe cumplir con todas las políticas de seguridad.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await changePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Error al actualizar contraseña.');
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-[#0A1A2B] border-2 border-amber-500/80 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-500/30">
          <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-500/80 flex items-center justify-center text-amber-400 shrink-0">
            <KeyRound className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black font-mono text-white tracking-wider uppercase">
              CAMBIO OBLIGATORIO DE CONTRASEÑA
            </h2>
            <p className="text-xs font-mono text-amber-300/80">
              Por políticas de ciberseguridad, debe actualizar su contraseña inicial.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
              CONTRASEÑA ACTUAL
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-[#050E1A] border border-amber-500/40 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
              NUEVA CONTRASEÑA SEGUIRA
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-[#050E1A] border border-amber-500/40 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
              CONFIRMAR NUEVA CONTRASEÑA
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-[#050E1A] border border-amber-500/40 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Password Policy Requirements Checklist */}
          <div className="bg-[#050E1A] p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
            <p className="font-bold text-slate-300 uppercase mb-2 text-[11px]">
              REQUISITOS DE LA POLÍTICA DE SEGURIDAD:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${checks.length ? 'text-emerald-400' : 'text-slate-400'}`}>
                {checks.length ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Mínimo 8 caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.uppercase ? 'text-emerald-400' : 'text-slate-400'}`}>
                {checks.uppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Una letra Mayúscula</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.lowercase ? 'text-emerald-400' : 'text-slate-400'}`}>
                {checks.lowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Una letra Minúscula</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.number ? 'text-emerald-400' : 'text-slate-400'}`}>
                {checks.number ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Un Número (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.special ? 'text-emerald-400' : 'text-slate-400'}`}>
                {checks.special ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Un Carácter Especial</span>
              </div>
              <div className={`flex items-center gap-1.5 ${checks.match ? 'text-emerald-400' : 'text-slate-400'}`}>
                {checks.match ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Contraseñas Coinciden</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isPolicyMet}
            className="w-full mt-4 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black font-mono text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'ACTUALIZANDO...' : 'GUARDAR Y CONTINUAR'}
          </button>
        </form>
      </div>
    </div>
  );
};
