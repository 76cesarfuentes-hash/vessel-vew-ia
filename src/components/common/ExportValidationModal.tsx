import React from 'react';
import { AlertOctagon, CheckCircle2, X } from 'lucide-react';

interface ExportValidationModalProps {
  isOpen: boolean;
  type: 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
  details?: {
    visibleCount: number;
    exportedCount: number;
  };
  onClose: () => void;
}

export const ExportValidationModal: React.FC<ExportValidationModalProps> = ({
  isOpen,
  type,
  title,
  message,
  details,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
      <div className={`max-w-md w-full bg-[#0B1726] border rounded-lg shadow-2xl p-5 overflow-hidden text-slate-100 ${
        type === 'ERROR' ? 'border-red-500/80 shadow-red-950/50' : 'border-emerald-500/80 shadow-emerald-950/50'
      }`}>
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            {type === 'ERROR' ? (
              <AlertOctagon className="w-6 h-6 text-red-400 flex-shrink-0 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            )}
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${
                type === 'ERROR' ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {title}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">VALIDACIÓN DE MOTOR DE REPORTES</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs mb-5">
          <div className={`p-3 rounded border text-xs leading-relaxed ${
            type === 'ERROR' ? 'bg-red-950/40 border-red-800 text-red-200' : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
          }`}>
            {message}
          </div>

          {details && (
            <div className="bg-[#070D18] border border-slate-800 p-3 rounded grid grid-cols-2 gap-2 text-center text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 block uppercase">Unidades en Pantalla</span>
                <span className="text-base font-bold text-white">{details.visibleCount}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase">Unidades Procesadas</span>
                <span className={`text-base font-bold ${
                  details.visibleCount === details.exportedCount ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {details.exportedCount}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`font-bold py-1.5 px-4 rounded text-xs tracking-wider transition-all cursor-pointer ${
              type === 'ERROR'
                ? 'bg-red-600 hover:bg-red-500 text-white shadow'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
            }`}
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    </div>
  );
};
