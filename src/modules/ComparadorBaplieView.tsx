import React, { useState } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { parseBaplieText } from '../core/parser/baplieParser';
import { compareBaplieVersions, ComparisonDelta } from '../core/business/comparisonEngine';
import { Container } from '../core/models/container';
import { GitCompare, FileCode, PlusCircle, Trash2, Edit3, CheckCircle2 } from 'lucide-react';

export const ComparadorBaplieView: React.FC = () => {
  const { parsedContainers } = useStowageStore();

  const [secondBaplieText, setSecondBaplieText] = useState('');
  const [comparisonResults, setComparisonResults] = useState<{
    deltas: ComparisonDelta[];
    summary: Record<string, number>;
    executed: boolean;
  }>({
    deltas: [],
    summary: { total: 0, added: 0, deleted: 0, modified: 0, unchanged: 0 },
    executed: false
  });

  const handleSecondBaplieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setSecondBaplieText(text);

      const parsedB = parseBaplieText(text);
      const res = compareBaplieVersions(parsedContainers, parsedB.containers);
      setComparisonResults({
        deltas: res.deltas,
        summary: res.summary,
        executed: true
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0B1726] border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col h-full overflow-hidden text-slate-200 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-cyan-400" /> COMPARADOR DE VERSIONES BAPLIE
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Compara el BAPLIE activo en sesión (Versión A) contra un nuevo BAPLIE (.EDI) (Versión B) para auditar deltas.
          </p>
        </div>

        <label className="cursor-pointer bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-1.5 px-4 rounded text-xs tracking-wider flex items-center gap-1.5 shadow border border-cyan-400 transition-all">
          <FileCode className="w-4 h-4" /> CARGAR BAPLIE B (.EDI)
          <input type="file" accept=".edi,.txt" onChange={handleSecondBaplieUpload} className="hidden" />
        </label>
      </div>

      {/* Main Results Scope */}
      {comparisonResults.executed ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-950/30 border border-emerald-800 p-3 rounded text-center">
              <span className="text-[10px] text-emerald-400 block uppercase">Agregados</span>
              <span className="text-xl font-bold text-emerald-400">+{comparisonResults.summary.added}</span>
            </div>
            <div className="bg-red-950/30 border border-red-800 p-3 rounded text-center">
              <span className="text-[10px] text-red-400 block uppercase">Eliminados</span>
              <span className="text-xl font-bold text-red-400">-{comparisonResults.summary.deleted}</span>
            </div>
            <div className="bg-amber-950/30 border border-amber-800 p-3 rounded text-center">
              <span className="text-[10px] text-amber-400 block uppercase">Modificados</span>
              <span className="text-xl font-bold text-amber-400">{comparisonResults.summary.modified}</span>
            </div>
            <div className="bg-[#070D18] border border-slate-800 p-3 rounded text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Sin Cambios</span>
              <span className="text-xl font-bold text-slate-300">{comparisonResults.summary.unchanged}</span>
            </div>
          </div>

          {/* Deltas Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              REGISTRO DE CAMBIOS Y DESVIACIONES ({comparisonResults.deltas.length})
            </h3>

            <div className="overflow-auto border border-slate-800 rounded bg-[#070D18] max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0D1826] text-slate-400 border-b border-slate-800 text-[10px]">
                    <th className="p-2.5">CONTENEDOR</th>
                    <th className="p-2.5">TIPO CAMBIO</th>
                    <th className="p-2.5">DETALLE DE MODIFICACIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.deltas.map((d, idx) => {
                    let badgeClass = 'bg-slate-800 text-slate-300';
                    let icon = <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />;

                    if (d.type === 'ADDED') {
                      badgeClass = 'bg-emerald-950 text-emerald-400 border border-emerald-800';
                      icon = <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />;
                    } else if (d.type === 'DELETED') {
                      badgeClass = 'bg-red-950 text-red-400 border border-red-800';
                      icon = <Trash2 className="w-3.5 h-3.5 text-red-400" />;
                    } else if (d.type === 'MODIFIED') {
                      badgeClass = 'bg-amber-950 text-amber-400 border border-amber-800';
                      icon = <Edit3 className="w-3.5 h-3.5 text-amber-400" />;
                    }

                    return (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-white">{d.containerId}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-max ${badgeClass}`}>
                            {icon} {d.type}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {d.changes.length > 0 ? (
                            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                              {d.changes.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Sin alteraciones</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
          <GitCompare className="w-16 h-16 text-slate-600 mb-3" />
          <p className="text-xs text-slate-400 max-w-md">
            Cargue el segundo archivo BAPLIE (Versión B) para auditar diferencias de estiba, posición, peso, ISO o clase IMO.
          </p>
        </div>
      )}
    </div>
  );
};
