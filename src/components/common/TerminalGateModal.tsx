import React from 'react';
import { TERMINAL_PROFILES } from '../../core/models/terminal';
import { Anchor, ShieldCheck, X } from 'lucide-react';
import appLogo from '../../assets/logo.jpg';

interface TerminalGateModalProps {
  isOpen: boolean;
  activeTerminalKey: string;
  onSelectTerminal: (key: string) => void;
  onClose?: () => void;
}

export const TerminalGateModal: React.FC<TerminalGateModalProps> = ({
  isOpen,
  activeTerminalKey,
  onSelectTerminal,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050D18]/95 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0B1A28] border border-cyan-500/40 rounded-xl p-8 max-w-xl w-full shadow-[0_0_50px_rgba(0,229,255,0.15)] text-center relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <img
            src={appLogo}
            alt="Logo TOS"
            className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,229,255,0.4)]"
            referrerPolicy="no-referrer"
          />
        </div>

        <h2 className="text-xl font-bold font-mono text-white tracking-widest uppercase mb-2">
          SELECCIONE TERMINAL MARÍTIMA
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-6 max-w-md mx-auto">
          La terminal seleccionada clasifica automáticamente los contenedores en <span className="text-orange-400 font-bold">Importación</span> (Color Naranja Fijo), <span className="text-slate-400 font-bold">Tránsito</span> (Gris) y <span className="text-cyan-400 font-bold">Exportación</span>.
        </p>

        {/* Terminal Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {Object.values(TERMINAL_PROFILES).map(term => {
            const isSelected = activeTerminalKey === term.key;
            return (
              <button
                key={term.key}
                onClick={() => onSelectTerminal(term.key)}
                className={`p-4 rounded-lg border text-left font-mono transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                    : 'bg-[#122436] border-slate-700/80 text-slate-300 hover:border-cyan-500/50 hover:bg-[#182F45]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-cyan-300">{term.key}</span>
                  {isSelected && <ShieldCheck className="w-4 h-4 text-cyan-400" />}
                </div>
                <div className="text-xs font-semibold text-white">{term.name}</div>
                <div className="text-[10px] text-slate-400 mt-1">{term.description}</div>
              </button>
            );
          })}
        </div>

        <div className="text-[10px] font-mono text-slate-500">
          Puedes cambiar de terminal en cualquier momento desde la barra superior.
        </div>
      </div>
    </div>
  );
};
