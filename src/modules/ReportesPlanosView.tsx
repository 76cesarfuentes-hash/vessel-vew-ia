import React, { useState } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { exportToExcel, exportToPDF, exportRestowsToExcel, ExportValidationResult } from '../core/services/exportService';
import { detectRestows } from '../core/business/restowEngine';
import { RestowAnalysisModal } from '../components/restow/RestowAnalysisModal';
import { BayMatrix } from '../components/bay/BayMatrix';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { ExportValidationModal } from '../components/common/ExportValidationModal';
import { Download, FileText, Printer, Layers, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export const ReportesPlanosView: React.FC = () => {
  const {
    filteredContainers,
    parsedContainers,
    uniqueBays,
    activeTerminalKey,
    activeTerminal,
    setSelectedContainer
  } = useStowageStore();

  const [levelFilter, setLevelFilter] = useState<'ALL' | 'DECK' | 'HOLD'>('ALL');
  const [isRestowModalOpen, setIsRestowModalOpen] = useState<boolean>(false);
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    type: 'ERROR' | 'SUCCESS';
    title: string;
    message: string;
    details?: { visibleCount: number; exportedCount: number };
  }>({
    isOpen: false,
    type: 'SUCCESS',
    title: '',
    message: ''
  });

  const sortedBays = [...uniqueBays].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const handleExportExcel = () => {
    const res = exportToExcel(filteredContainers, 'Reporte_Estiba_Filtrado');
    setValidationModal({
      isOpen: true,
      type: res.success ? 'SUCCESS' : 'ERROR',
      title: res.success ? 'EXCEL GENERADO CORRECTAMENTE' : 'EXPORT VALIDATION FAILED',
      message: res.message,
      details: {
        visibleCount: res.visibleCount,
        exportedCount: res.exportedCount
      }
    });
  };

  const handleExportRestows = () => {
    const restowItems = detectRestows(filteredContainers.length > 0 ? filteredContainers : parsedContainers, activeTerminalKey);
    const res = exportRestowsToExcel(restowItems, `Reporte_Restibas_${activeTerminalKey}`);
    setValidationModal({
      isOpen: true,
      type: res.success ? 'SUCCESS' : 'ERROR',
      title: res.success ? 'REPORTES DE RESTIBAS GENERADO' : 'EXPORT VALIDATION FAILED',
      message: res.message,
      details: {
        visibleCount: res.visibleCount,
        exportedCount: res.exportedCount
      }
    });
  };

  const handleExportPDF = () => {
    const res = exportToPDF(filteredContainers, activeTerminalKey, 'Reporte_Estiba_Planos_Mini');
    setValidationModal({
      isOpen: true,
      type: res.success ? 'SUCCESS' : 'ERROR',
      title: res.success ? 'PDF GENERADO CORRECTAMENTE' : 'EXPORT VALIDATION FAILED',
      message: res.message,
      details: {
        visibleCount: res.visibleCount,
        exportedCount: res.exportedCount
      }
    });
  };

  return (
    <div className="bg-[#0B1726] border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col h-full overflow-hidden text-slate-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-3">
        <div>
          <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Printer className="w-4 h-4 text-cyan-400" /> GENERADOR DE REPORTES Y MINI-PLANOS (SINGLE SOURCE OF TRUTH)
          </h2>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            Misma colección de datos filtrados para Pantalla, Excel y PDF. Cero discrepancias.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRestowModalOpen(true)}
            className="bg-amber-800 hover:bg-amber-700 text-white font-mono font-bold text-xs py-1.5 px-3.5 rounded border border-amber-400 shadow transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ver auditoría completa de restibas y malla de pesos"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-300" /> RESTIBAS / BUENA ESTIBA
          </button>

          <button
            onClick={handleExportRestows}
            className="bg-emerald-800 hover:bg-emerald-700 text-white font-mono font-bold text-xs py-1.5 px-3.5 rounded border border-emerald-400 shadow transition-all flex items-center gap-1.5 cursor-pointer"
            title="Descargar reporte Excel exclusivo de restibas"
          >
            <Download className="w-3.5 h-3.5" /> EXCEL RESTIBAS
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs py-1.5 px-3.5 rounded border border-emerald-400 shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> EXCEL PLANO ({filteredContainers.length})
          </button>
          
          <button
            onClick={handleExportPDF}
            className="bg-red-700 hover:bg-red-600 text-white font-mono font-bold text-xs py-1.5 px-3.5 rounded border border-red-400 shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> PDF + PLANOS MINI ({filteredContainers.length})
          </button>
        </div>
      </div>

      {/* Cumulative Filter Engine Toolbar */}
      <FilterToolbar />

      {/* Main Mini Bay Plans Canvas */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#03060E] rounded border border-slate-900 p-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 font-mono text-xs">
          <span className="font-bold text-cyan-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" /> PLANOS MINI DE BAHÍAS FILTRADAS ({sortedBays.length} BAHÍAS RENDERIZADAS | {filteredContainers.length} UNIDADES)
          </span>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="bg-[#070D18] border border-slate-700 text-cyan-300 font-mono text-[10px] font-bold rounded px-2.5 py-1 focus:outline-none"
          >
            <option value="ALL">VISTA COMPLETA (CUBIERTA + BODEGA)</option>
            <option value="DECK">SÓLO CUBIERTA (DECK)</option>
            <option value="HOLD">SÓLO BODEGA (HOLD)</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto pr-1">
          {sortedBays.length > 0 && filteredContainers.length > 0 ? (
            <div className="flex flex-wrap gap-6 justify-center items-start">
              {sortedBays.map(bayId => {
                const relatedFortyBay = parseInt(bayId, 10) % 2 !== 0
                  ? (parseInt(bayId, 10) % 4 === 1 ? (parseInt(bayId, 10) + 1).toString().padStart(2, '0') : (parseInt(bayId, 10) - 1).toString().padStart(2, '0'))
                  : null;

                const bayContainers = filteredContainers.filter(c =>
                  c.bay === bayId || (c.size === 40 && relatedFortyBay === bayId)
                );

                if (bayContainers.length === 0) return null;

                return (
                  <div key={bayId} className="transform scale-90 origin-top bg-[#0B1726]/80 p-2 rounded border border-slate-800 shadow-md">
                    <BayMatrix
                      bayId={bayId}
                      containers={bayContainers}
                      activeTerminalKey={activeTerminalKey}
                      onSelectContainer={(c) => setSelectedContainer(c)}
                      levelFilter={levelFilter}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 font-mono text-xs">
              No hay contenedores que coincidan con los filtros seleccionados. Ajuste los filtros superiores.
            </div>
          )}
        </div>
      </div>

      {/* Export Validation Result Modal */}
      <ExportValidationModal
        isOpen={validationModal.isOpen}
        type={validationModal.type}
        title={validationModal.title}
        message={validationModal.message}
        details={validationModal.details}
        onClose={() => setValidationModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Restow & Weight Audit Modal */}
      <RestowAnalysisModal
        isOpen={isRestowModalOpen}
        onClose={() => setIsRestowModalOpen(false)}
        containers={filteredContainers.length > 0 ? filteredContainers : parsedContainers}
        activeTerminalKey={activeTerminalKey}
      />
    </div>
  );
};
