import React, { useState } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { exportToExcel } from '../core/services/exportService';
import {
  FileCode,
  ShieldAlert,
  AlertOctagon,
  FileSpreadsheet,
  ArrowRightLeft,
  CheckCircle,
  PackageCheck,
  Ship,
  Sparkles,
  Layers,
  Upload
} from 'lucide-react';

export const MovinsValidatorView: React.FC = () => {
  const {
    parsedDischargeContainers,
    parsedLoadContainers,
    activeOperationView,
    movinsFileName,
    movinsMovements,
    restowReport,
    activeTerminalKey,
    setOperationView,
    loadMovinsContent
  } = useStowageStore();

  const [activeReportTab, setActiveReportTab] = useState<'RESTOWS' | 'UNTOUCHED' | 'ALERTS'>('RESTOWS');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      loadMovinsContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const restows = restowReport?.restowsDetected || [];
  const untouched = restowReport?.untouchedTransitContainers || [];
  const alerts = restowReport?.alerts || [];

  const handleExportRestowReportExcel = () => {
    if (restows.length === 0 && untouched.length === 0) return;

    const dataRestows = restows.map(r => ({
      'Contenedor': r.id,
      'Posición Descarga (Original)': r.originalPosition,
      'Posición Carga (MOVINS/Auto)': r.newPosition,
      'POD Original': r.originalPod,
      'POD Nuevo': r.newPod,
      'ISO': r.iso,
      'Tamaño': `${r.size}'`,
      'Peso (kg)': r.weight,
      'Asignación Automática': r.autoAssignedPosition ? 'SI' : 'NO (MOVINS)',
      'Motivo': r.restowReason
    }));

    const dataUntouched = untouched.map(u => ({
      'Contenedor': u.id,
      'Posición': u.position,
      'POD': u.pod,
      'ISO': u.iso,
      'Tamaño': `${u.size}'`,
      'Estado': u.status,
      'Peso (kg)': u.weight,
      'Operador': u.operator,
      'Observación': 'Sin cambios (No restibado)'
    }));

    exportToExcel(
      [...dataRestows, ...dataUntouched],
      `Reporte_Restibas_y_Transito_${activeTerminalKey}`
    );
  };

  return (
    <div className="bg-[#0B1726] border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col h-full overflow-hidden text-slate-200 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" /> PLANIFICACIÓN MOVINS & REPORTE INTEGRAL DE RESTIBAS
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Genera la planificación de Carga a partir del Tránsito BAPLIE y MOVINS. BAPLIE permanece inmutable en la vista de Descarga.
          </p>
        </div>

        {/* View Switcher & File Upload */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Operation View Toggle Switch */}
          <div className="bg-[#070D18] border border-slate-700 rounded-lg p-1 flex items-center gap-1">
            <button
              onClick={() => setOperationView('DESCARGA')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeOperationView === 'DESCARGA'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              DESCARGA (Arribo: {parsedDischargeContainers.length})
            </button>
            <button
              onClick={() => setOperationView('CARGA')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeOperationView === 'CARGA'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              CARGA (Zarpe: {parsedLoadContainers.length})
            </button>
          </div>

          {/* Upload MOVINS Button */}
          <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-1.5 px-3 rounded text-xs tracking-wider flex items-center gap-1.5 shadow border border-emerald-400 transition-all">
            <Upload className="w-4 h-4" /> CARGAR MOVINS (.EDI)
            <input type="file" accept=".edi,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Export Report */}
          {restowReport && (
            <button
              onClick={handleExportRestowReportExcel}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-700/60 font-bold py-1.5 px-3 rounded text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> EXPORTAR EXCEL RESTIBAS
            </button>
          )}
        </div>
      </div>

      {/* Main Container Content */}
      {restowReport ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
          {/* Executive KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#070D18] border border-slate-800 p-3 rounded text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Arribo (Descarga BAPLIE)</span>
              <span className="text-xl font-bold text-cyan-400">{parsedDischargeContainers.length}</span>
            </div>
            <div className="bg-[#070D18] border border-slate-800 p-3 rounded text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Zarpe (Carga MOVINS + Tránsito)</span>
              <span className="text-xl font-bold text-emerald-400">{parsedLoadContainers.length}</span>
            </div>
            <div className="bg-[#070D18] border border-slate-800 p-3 rounded text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Restibas Detectadas</span>
              <span className="text-xl font-bold text-amber-400">{restows.length}</span>
            </div>
            <div className="bg-[#070D18] border border-slate-800 p-3 rounded text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Tránsito Sin Cambios</span>
              <span className="text-xl font-bold text-slate-300">{untouched.length}</span>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveReportTab('RESTOWS')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeReportTab === 'RESTOWS'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-600'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              SECCIÓN A: RESTIBAS DETECTADAS ({restows.length})
            </button>

            <button
              onClick={() => setActiveReportTab('UNTOUCHED')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeReportTab === 'UNTOUCHED'
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-600'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              SECCIÓN B: TRÁNSITO SIN MOVIMIENTO ({untouched.length})
            </button>

            <button
              onClick={() => setActiveReportTab('ALERTS')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeReportTab === 'ALERTS'
                  ? 'bg-red-950/80 text-red-300 border border-red-600'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              HALLAZGOS Y ADVERTENCIAS ({alerts.length})
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto pr-1">
            {/* SECCIÓN A: RESTIBAS DETECTADAS */}
            {activeReportTab === 'RESTOWS' && (
              <div>
                {restows.length === 0 ? (
                  <div className="bg-[#070D18] border border-slate-800 p-6 text-center text-slate-400 rounded text-xs">
                    ✓ No se detectaron movimientos de restiba en la planificación actual.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded bg-[#070D18]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                          <th className="p-2.5">Contenedor</th>
                          <th className="p-2.5">Pos. Descarga (Orig.)</th>
                          <th className="p-2.5">Pos. Carga (Nave)</th>
                          <th className="p-2.5">POD Orig. → Nuevo</th>
                          <th className="p-2.5">ISO / Size</th>
                          <th className="p-2.5">Peso (kg)</th>
                          <th className="p-2.5">Asignación</th>
                          <th className="p-2.5">Motivo Operacional</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {restows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 font-mono">
                            <td className="p-2.5 font-bold text-amber-300">{r.id}</td>
                            <td className="p-2.5 text-slate-300">{r.originalPosition}</td>
                            <td className="p-2.5 font-bold text-emerald-400">{r.newPosition}</td>
                            <td className="p-2.5 text-cyan-300">
                              {r.originalPod} {r.originalPod !== r.newPod ? `→ ${r.newPod}` : ''}
                            </td>
                            <td className="p-2.5 text-slate-300">{r.iso} ({r.size}')</td>
                            <td className="p-2.5 text-slate-300">{r.weight}</td>
                            <td className="p-2.5">
                              {r.autoAssignedPosition ? (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-2 py-0.5 rounded font-bold">
                                  AUTO-ASIGNADA
                                </span>
                              ) : (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-2 py-0.5 rounded font-bold">
                                  SEGÚN MOVINS
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-300">{r.restowReason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN B: TRÁNSITO SIN MOVIMIENTO */}
            {activeReportTab === 'UNTOUCHED' && (
              <div>
                {untouched.length === 0 ? (
                  <div className="bg-[#070D18] border border-slate-800 p-6 text-center text-slate-400 rounded text-xs">
                    No hay contenedores de tránsito sin movimiento registrados.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded bg-[#070D18]">
                    <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 font-bold flex items-center justify-between">
                      <span>UNIDADES DE TRÁNSITO QUE NO SE VAN A TOCAR ({untouched.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Conservan posición BAPLIE original</span>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                          <th className="p-2.5">Contenedor</th>
                          <th className="p-2.5">Posición BAPLIE</th>
                          <th className="p-2.5">POD</th>
                          <th className="p-2.5">ISO</th>
                          <th className="p-2.5">Estado</th>
                          <th className="p-2.5">Peso (kg)</th>
                          <th className="p-2.5">Operador</th>
                          <th className="p-2.5">Estado Operacional</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {untouched.map((u, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 font-mono">
                            <td className="p-2.5 font-bold text-white">{u.id}</td>
                            <td className="p-2.5 font-bold text-cyan-300">{u.position}</td>
                            <td className="p-2.5 text-slate-300">{u.pod}</td>
                            <td className="p-2.5 text-slate-300">{u.iso} ({u.size}')</td>
                            <td className="p-2.5 text-slate-300">{u.status}</td>
                            <td className="p-2.5 text-slate-300">{u.weight}</td>
                            <td className="p-2.5 text-slate-300">{u.operator}</td>
                            <td className="p-2.5 text-emerald-400 text-[11px]">✓ Intacto en posición original</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* HALLAZGOS Y ADVERTENCIAS */}
            {activeReportTab === 'ALERTS' && (
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="bg-emerald-950/30 border border-emerald-800 text-emerald-400 p-4 rounded text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Simulación y planificación MOVINS ejecutada sin alertas críticas de desbalance o posición.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alt, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                          alt.severity === 'CRÍTICA'
                            ? 'bg-red-950/40 border-red-800 text-red-300'
                            : alt.severity === 'ALTA'
                            ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                            : 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">{alt.title} [{alt.severity}]</div>
                          <div className="text-[11px] opacity-90 mt-0.5">{alt.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
          <FileCode className="w-16 h-16 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-300 mb-1">Cargue el archivo MOVINS (.EDI)</h3>
          <p className="text-xs text-slate-400 max-w-md">
            Al cargar el MOVINS, el sistema generará automáticamente la vista de Carga, detectará las restibas e implementará la reubicación en 6 reglas si hay conflictos.
          </p>
        </div>
      )}
    </div>
  );
};
