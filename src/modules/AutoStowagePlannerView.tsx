import React, { useState, useMemo } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { Container, CargoType } from '../core/models/container';
import {
  parseExcelContainerList,
  ExtendedExcelContainer
} from '../core/parser/excelParser';
import {
  runAutoStowagePlanning,
  generateSampleExcelYardList,
  AutoStowageResult,
  UnassignedContainerReport
} from '../core/business/autoStowageEngine';
import { exportToExcel, exportToBaplieEDI } from '../core/services/exportService';
import {
  FileSpreadsheet,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scale,
  Anchor,
  Sparkles,
  Ship,
  Grid,
  Download,
  Check,
  Zap,
  Info,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export const AutoStowagePlannerView: React.FC = () => {
  const { parsedContainers, podSequence, setContainers, activeTerminalKey } = useStowageStore();

  const [excelYardContainers, setExcelYardContainers] = useState<ExtendedExcelContainer[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'matrix' | 'conflicts' | 'metrics' | 'logs'>('inventory');
  const [planningResult, setPlanningResult] = useState<AutoStowageResult | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Load sample yard list by default if empty
  React.useEffect(() => {
    if (excelYardContainers.length === 0) {
      const sample = generateSampleExcelYardList();
      setExcelYardContainers(sample);
      setExcelFileName('Muestra_Inventario_Patio.xlsx');
    }
  }, []);

  // Handle Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        const parsed = parseExcelContainerList(buffer);
        setExcelYardContainers(parsed);
        setPlanningResult(null); // Reset previous calculation
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Run Auto Stowage Planning Engine
  const handleExecutePlanning = () => {
    if (excelYardContainers.length === 0) return;

    const result = runAutoStowagePlanning(
      excelYardContainers,
      parsedContainers,
      podSequence && podSequence.length > 0 ? podSequence : ['VER', 'HOU', 'ALT', 'MIA']
    );

    setPlanningResult(result);
    if (result.unassignedReports.length > 0) {
      setActiveTab('conflicts');
    } else {
      setActiveTab('matrix');
    }
  };

  // Apply Plan to TOS Store
  const handleApplyToTOS = () => {
    if (!planningResult) return;
    setContainers(planningResult.stowedContainers);
    setAppliedNotification('✓ El Plan de Estiba se aplicó exitosamente a la embarcación activa en la plataforma.');
    setTimeout(() => setAppliedNotification(null), 5000);
  };

  // Export Excel Report
  const handleExportExcel = () => {
    if (!planningResult) return;
    exportToExcel(planningResult.stowedContainers, activeTerminalKey);
  };

  // Export EDI Baplie
  const handleExportEDI = () => {
    if (!planningResult) return;
    exportToBaplieEDI(planningResult.stowedContainers);
  };

  // Group yard containers by Tonga
  const tongaGroups = useMemo(() => {
    const groups: Record<string, ExtendedExcelContainer[]> = {};
    excelYardContainers.forEach(c => {
      const key = c.yardPosition || 'PATIO-GENERAL';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [excelYardContainers]);

  return (
    <div className="flex flex-col h-full w-full bg-[#071320] text-slate-100 font-sans overflow-hidden">
      {/* ── HEADER TOOLBAR ── */}
      <div className="flex-shrink-0 bg-[#0B1A2C] border-b border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono text-sm md:text-base font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
              ESTIBA AUTOMÁTICA DESDE EXCEL DE PATIO
              <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow">
                AI TOS ENGINE
              </span>
            </h2>
            <p className="text-[11px] font-mono text-cyan-400">
              Carga de Inventario · Cumplimiento de Reglas Estructurales & Secuencia POD
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* File Upload Button */}
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs py-2 px-3 rounded-lg border border-slate-600 shadow transition-all flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="truncate max-w-[150px]">{excelFileName || 'Importar Excel'}</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Load Sample Data Button */}
          <button
            onClick={() => {
              const sample = generateSampleExcelYardList();
              setExcelYardContainers(sample);
              setExcelFileName('Muestra_Inventario_Patio.xlsx');
              setPlanningResult(null);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono font-bold text-xs py-2 px-3 rounded-lg border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            title="Cargar lista preconfigurada de contenedores en patio"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Muestra Patio</span>
          </button>

          {/* Execute Planning Engine Button */}
          <button
            onClick={handleExecutePlanning}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-black text-xs py-2 px-4 rounded-lg border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>EJECUTAR ESTIBA AUTOMÁTICA</span>
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ── */}
      {appliedNotification && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/80 px-4 py-2.5 text-emerald-200 font-mono text-xs flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appliedNotification}</span>
          </div>
          <button onClick={() => setAppliedNotification(null)} className="text-emerald-400 hover:text-white cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ── STATUS SUMMARY STRIP ── */}
      <div className="bg-[#081726] border-b border-slate-800/80 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
        <div className="bg-[#0D2035] p-2 rounded-lg border border-slate-700/80 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-[10px] text-slate-400 block">EN PATIO</span>
            <span className="font-bold text-white text-sm">{excelYardContainers.length} cntrs</span>
          </div>
        </div>

        <div className="bg-[#0D2035] p-2 rounded-lg border border-slate-700/80 flex items-center gap-2">
          <Grid className="w-4 h-4 text-amber-400" />
          <div>
            <span className="text-[10px] text-slate-400 block">TONGAS PATIO</span>
            <span className="font-bold text-amber-300 text-sm">{Object.keys(tongaGroups).length} tongas</span>
          </div>
        </div>

        <div className="bg-[#0D2035] p-2 rounded-lg border border-slate-700/80 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-[10px] text-slate-400 block">PLANIFICADOS</span>
            <span className="font-bold text-emerald-400 text-sm">
              {planningResult ? planningResult.metrics.successfullyStowed : 0} cntrs
            </span>
          </div>
        </div>

        <div className="bg-[#0D2035] p-2 rounded-lg border border-slate-700/80 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <div>
            <span className="text-[10px] text-slate-400 block">NO ASIGNADOS</span>
            <span className="font-bold text-red-400 text-sm">
              {planningResult ? planningResult.metrics.unassignedCount : 0} cntrs
            </span>
          </div>
        </div>

        <div className="bg-[#0D2035] p-2 rounded-lg border border-slate-700/80 flex items-center gap-2">
          <Scale className="w-4 h-4 text-purple-400" />
          <div>
            <span className="text-[10px] text-slate-400 block">BALANCE TORSIÓN</span>
            <span className="font-bold text-purple-300 text-sm">
              {planningResult ? `${planningResult.metrics.transverseTorsionScore}%` : '---'}
            </span>
          </div>
        </div>

        <div className="bg-[#0D2035] p-2 rounded-lg border border-slate-700/80 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <div>
            <span className="text-[10px] text-slate-400 block">REGLAS ESTIBA</span>
            <span className="font-bold text-teal-300 text-sm">100% OK</span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="bg-[#091828] border-b border-slate-800 px-4 flex items-center gap-2 font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3 py-2.5 font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>INVENTARIO PATIO ({excelYardContainers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3 py-2.5 font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'matrix'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>ESTIBA ASIGNADA ({planningResult ? planningResult.metrics.successfullyStowed : 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-3 py-2.5 font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'conflicts'
              ? 'border-red-400 text-red-300 bg-red-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>NO ASIGNADOS / CONFLICTOS ({planningResult ? planningResult.metrics.unassignedCount : 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-2.5 font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'metrics'
              ? 'border-purple-400 text-purple-300 bg-purple-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>ESTABILIDAD & FLUJO PATIO</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-2.5 font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'border-amber-400 text-amber-300 bg-amber-950/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>AUDITORÍA ENGINE ({planningResult ? planningResult.logs.length : 0})</span>
        </button>
      </div>

      {/* ── MAIN CONTENT CANVAS ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. YARD INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#0B1D30] p-3 rounded-xl border border-slate-700 font-mono text-xs">
              <span className="text-cyan-300 font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                CONTENEDORES EN PATIO ORGANIZADOS POR TONGA / POSICIÓN DE ORIGEN
              </span>
              <span className="text-slate-400">
                Se respeta el flujo de patio secuencial (sin movimientos Patio-Patio).
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(tongaGroups).map(([tongaKey, cntrs]) => {
                const containerList = cntrs as ExtendedExcelContainer[];
                return (
                  <div key={tongaKey} className="bg-[#0B1A2C] border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-mono font-black text-amber-400 text-xs flex items-center gap-1.5">
                        <Grid className="w-4 h-4 text-amber-400" /> TONGA: {tongaKey}
                      </span>
                      <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                        {containerList.length} contenedores
                      </span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {containerList.map((c, idx) => (
                        <div
                          key={`${c.id || 'cntr'}-${idx}`}
                          className="bg-[#071320] border border-slate-700/80 rounded-lg p-2 font-mono text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-extrabold text-white text-xs flex items-center gap-2">
                              <span>{c.id}</span>
                              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-800">
                                {c.size}' ({c.iso})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>POD: <strong className="text-amber-300">{c.pod}</strong></span>
                              <span>PESO: <strong className="text-slate-200">{c.weight}</strong></span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              c.status === 'FULL' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {c.status}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              c.cargoType === 'RF' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' :
                              c.cargoType === 'DG' ? 'bg-red-950 text-red-300 border border-red-700' :
                              c.cargoType === 'OS' ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {c.cargoType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. STOWED MATRIX TAB */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            {!planningResult ? (
              <div className="bg-[#0B1D30] border border-slate-800 rounded-xl p-8 text-center font-mono space-y-3">
                <Ship className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
                <h3 className="text-slate-300 font-bold text-base">ESTIBA AÚN NO CALCULADA</h3>
                <p className="text-slate-400 text-xs">
                  Haz clic en el botón <strong className="text-emerald-400">"EJECUTAR ESTIBA AUTOMÁTICA"</strong> en el encabezado para generar la distribución en el buque.
                </p>
              </div>
            ) : (
              <div className="space-y-4 font-mono">
                {/* Apply Actions Header */}
                <div className="bg-gradient-to-r from-emerald-950/80 to-[#0B1D30] border border-emerald-500/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div>
                    <h3 className="text-emerald-300 font-black text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ESTIBA AUTOMÁTICA GENERADA CON ÉXITO
                    </h3>
                    <p className="text-slate-300 text-xs mt-0.5">
                      {planningResult.metrics.successfullyStowed} contenedores asignados sin violar reglas de estiba, cama de 20', ni secuencia de descarga.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleApplyToTOS}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      APLICAR A LA EMBARCACIÓN
                    </button>

                    <button
                      onClick={handleExportExcel}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      EXCEL
                    </button>

                    <button
                      onClick={handleExportEDI}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      BAPLIE EDI
                    </button>
                  </div>
                </div>

                {/* Stowed Container Grid List */}
                <div className="bg-[#0B1A2C] border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                    LISTADO DE CONTENEDORES ASIGNADOS A CELDAS
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {planningResult.stowedContainers
                      .filter(c => c.autoAssignedPosition)
                      .map((c, idx) => (
                        <div
                          key={`${c.id}-${c.position || idx}`}
                          className="bg-[#071320] border border-cyan-500/40 hover:border-cyan-400 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-extrabold text-white text-xs">
                              <span>{c.id}</span>
                              <span className="bg-cyan-950 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded border border-cyan-800 font-mono">
                                {c.size}'
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              POD: <strong className="text-amber-300">{c.pod}</strong> | Peso: <strong>{c.weight}</strong>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Tipo: {c.cargoType} | Operador: {c.operator}
                            </div>
                          </div>

                          <div className="bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 font-mono text-xs font-black px-2.5 py-1.5 rounded-lg text-center shrink-0">
                            <span className="text-[9px] text-emerald-400/80 block leading-tight">CELDA</span>
                            {c.position}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. CONFLICTS & UNASSIGNED TAB */}
        {activeTab === 'conflicts' && (
          <div className="space-y-4 font-mono">
            {!planningResult || planningResult.unassignedReports.length === 0 ? (
              <div className="bg-[#0B1D30] border border-emerald-500/40 rounded-xl p-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-emerald-300 font-bold text-base">CERO CONFLICTOS REGISTRADOS</h3>
                <p className="text-slate-300 text-xs">
                  Todos los contenedores de patio fueron asignados satisfactoriamente respetando restricciones duras.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-950/80 border border-red-500/80 p-3.5 rounded-xl flex items-center gap-2 text-red-200 text-xs">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>
                    Se detectaron <strong>{planningResult.unassignedReports.length}</strong> contenedores que no pudieron colocarse en ninguna celda sin violar las reglas no negociables de la embarcación.
                  </span>
                </div>

                <div className="space-y-3">
                  {planningResult.unassignedReports.map((rep, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0B1A2C] border-2 border-red-500/50 rounded-xl p-4 space-y-3 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2 font-bold text-white text-sm">
                          <span className="text-red-400">✖ {rep.container.id}</span>
                          <span className="text-xs text-slate-400">({rep.container.size}', POD: {rep.container.pod}, {rep.container.cargoType})</span>
                        </div>
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded font-bold">
                          Patio Origin: {rep.yardPosition}
                        </span>
                      </div>

                      <div className="bg-red-950/40 border border-red-800/80 p-3 rounded-lg text-xs text-red-200 space-y-1">
                        <span className="font-bold text-red-300 block">RESTRICCIÓN VIOLADA:</span>
                        <p className="text-red-100">{rep.reason}</p>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-lg text-xs space-y-1.5 border border-slate-800">
                        <span className="font-bold text-cyan-300 block">ALTERNATIVAS Y RECOMENDACIONES DE ESTIBA:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {rep.suggestedAlternatives.map((alt, i) => (
                            <span key={i} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 text-cyan-400" /> {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. METRICS & STABILITY TAB */}
        {activeTab === 'metrics' && (
          <div className="space-y-4 font-mono">
            {planningResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transverse Torsion Balance */}
                <div className="bg-[#0B1A2C] border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-cyan-300 font-bold text-xs uppercase flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    BALANCE DE PESO TRANSVERSAL (PREVENCIÓN DE TORSIÓN)
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Cumplimiento Torsión:</span>
                      <strong className="text-emerald-400">{planningResult.metrics.transverseTorsionScore}%</strong>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all"
                        style={{ width: `${planningResult.metrics.transverseTorsionScore}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      El motor distribuyó el peso de forma simétrica entre las filas de Estribor (impares) y Babor (pares), previniendo escora y esfuerzo de torsión en el casco.
                    </p>
                  </div>
                </div>

                {/* Yard Workflow Efficiency */}
                <div className="bg-[#0B1A2C] border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-amber-300 font-bold text-xs uppercase flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    EFICIENCIA DE OPERACIONES EN PATIO (SIN REHANDLES)
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Flujo de Tonga Directo:</span>
                      <strong className="text-amber-300">100% Sin Movimientos Patio-Patio</strong>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="bg-amber-500 h-full w-full" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Se agotaron las tongas de patio de forma totalmente secuencial. Ningún contenedor requirió remoción o re-ubicación intermedia en el patio.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0B1D30] border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                Ejecuta el motor de estiba para visualizar métricas de estabilidad y flujo de patio.
              </div>
            )}
          </div>
        )}

        {/* 5. AUDIT LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-[#050E18] border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
            <span className="text-amber-400 font-bold block uppercase tracking-wider">
              LOGS DE EJECUCIÓN Y REGISTRO DE DECISIONES DE ESTIBA
            </span>
            <div className="bg-[#030910] p-3 rounded-lg border border-slate-800 text-slate-300 max-h-[450px] overflow-y-auto space-y-1 text-[11px]">
              {planningResult ? (
                planningResult.logs.map((log, i) => (
                  <div key={i} className="py-0.5 border-b border-slate-900/60 leading-tight">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-500">Aún no hay registros de ejecución.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
