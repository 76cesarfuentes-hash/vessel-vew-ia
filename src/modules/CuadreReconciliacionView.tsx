import React, { useState } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { parseExcelContainerList } from '../core/parser/excelParser';
import { Container } from '../core/models/container';
import { NO_DATA } from '../core/parser/portNormalizer';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { FileSpreadsheet, Play, AlertTriangle, ArrowRightLeft } from 'lucide-react';

export const CuadreReconciliacionView: React.FC = () => {
  const { filteredContainers, parsedContainers, excelReconciliationList, setExcelList } = useStowageStore();

  const [reconciliationResults, setReconciliationResults] = useState<{
    matched: Container[];
    missingInExcel: Container[];
    surplusInExcel: Partial<Container>[];
    isExecuted: boolean;
  }>({
    matched: [],
    missingInExcel: [],
    surplusInExcel: [],
    isExecuted: false
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      const parsedExcel = parseExcelContainerList(buffer);
      setExcelList(parsedExcel);
    };
    reader.readAsArrayBuffer(file);
  };

  const executeReconciliation = () => {
    if (filteredContainers.length === 0 || excelReconciliationList.length === 0) return;

    const workBaplie: Container[] = JSON.parse(JSON.stringify(filteredContainers));
    const workExcel: Partial<Container>[] = JSON.parse(JSON.stringify(excelReconciliationList));
    const matched: Container[] = [];

    const cleanId = (id: string | undefined) => id ? String(id).replace(/[^A-Z0-9]/gi, '').toUpperCase() : '';
    const isGeneric = (id: string | undefined) => !id || id === NO_DATA || /^X+$/.test(id.trim().toUpperCase());

    // Pass 1: Exact Container ID Match
    workBaplie.forEach(bp => {
      if (isGeneric(bp.id)) return;
      const bpId = cleanId(bp.id);
      const exIdx = workExcel.findIndex(ex => cleanId(ex.id) === bpId);

      if (exIdx > -1) {
        bp.matched = true;
        matched.push(bp);
        workExcel.splice(exIdx, 1);
      }
    });

    // Pass 2: Attribute Signature Match for Generic IDs
    workBaplie.forEach(bp => {
      if (bp.matched || !isGeneric(bp.id)) return;

      const exIdx = workExcel.findIndex(ex => {
        if ((ex as any).matched) return false;
        if (ex.iso !== bp.iso) return false;
        if (ex.pod !== bp.pod) return false;
        if (ex.status !== bp.status) return false;
        return true;
      });

      if (exIdx > -1) {
        bp.id = workExcel[exIdx].id || bp.id;
        bp.matched = true;
        matched.push(bp);
        workExcel.splice(exIdx, 1);
      }
    });

    const missingInExcel = workBaplie.filter(bp => !bp.matched);
    const surplusInExcel = workExcel;

    setReconciliationResults({
      matched,
      missingInExcel,
      surplusInExcel,
      isExecuted: true
    });
  };

  return (
    <div className="bg-[#0B1726] border border-slate-800 rounded-lg p-5 shadow-lg flex flex-col h-full overflow-hidden text-slate-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-3">
        <div>
          <h2 className="font-mono text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400" /> MOTOR DE RECONCILIACIÓN Y CUADRE INTELIGENTE
          </h2>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            Compara la colección BAPLIE filtrada (<span className="text-cyan-400">{filteredContainers.length}</span> unidades) contra la lista Excel de control.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold py-1.5 px-3 rounded text-xs tracking-wider flex items-center gap-1.5 shadow border border-emerald-400 transition-all">
            <FileSpreadsheet className="w-4 h-4" /> 2. CARGAR LISTA EXCEL
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={executeReconciliation}
            disabled={filteredContainers.length === 0 || excelReconciliationList.length === 0}
            className={`font-mono font-bold py-1.5 px-4 rounded text-xs tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              filteredContainers.length > 0 && excelReconciliationList.length > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-300 shadow-md'
                : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" /> EJECUTAR CUADRE SOBRE FILTRADOS ({filteredContainers.length})
          </button>
        </div>
      </div>

      {/* Cumulative Filter Toolbar */}
      <FilterToolbar />

      {/* Main Content Area */}
      {reconciliationResults.isExecuted ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto pr-1 font-mono">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#070D18] border border-slate-800 p-3 rounded text-center">
              <span className="text-[10px] text-slate-400 block uppercase">BAPLIE Filtrado</span>
              <span className="text-xl font-bold text-white">{filteredContainers.length}</span>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-800/80 p-3 rounded text-center">
              <span className="text-[10px] text-emerald-400 block uppercase">Match Exitoso</span>
              <span className="text-xl font-bold text-emerald-400">{reconciliationResults.matched.length}</span>
            </div>
            <div className="bg-red-950/30 border border-red-800/80 p-3 rounded text-center">
              <span className="text-[10px] text-red-400 block uppercase">Sobrantes Excel</span>
              <span className="text-xl font-bold text-red-400">{reconciliationResults.surplusInExcel.length}</span>
            </div>
          </div>

          {/* Missing in Excel Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> DISCREPANCIAS: EXISTE EN BAPLIE FILTRADO, NO EN EXCEL ({reconciliationResults.missingInExcel.length})
            </h3>
            <div className="overflow-auto border border-slate-800 rounded bg-[#070D18] max-h-48">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0D1826] text-slate-400 border-b border-slate-800 text-[10px]">
                    <th className="p-2">CONTENEDOR</th>
                    <th className="p-2">POSICIÓN</th>
                    <th className="p-2">ISO</th>
                    <th className="p-2">POL</th>
                    <th className="p-2">POD</th>
                    <th className="p-2">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationResults.missingInExcel.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-emerald-400">
                        ✓ No hay discrepancias en el BAPLIE filtrado
                      </td>
                    </tr>
                  ) : (
                    reconciliationResults.missingInExcel.map((c, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-2 font-bold text-slate-200">{c.id}</td>
                        <td className="p-2 text-cyan-400">{c.position}</td>
                        <td className="p-2 text-slate-300">{c.iso}</td>
                        <td className="p-2 text-slate-400">{c.pol}</td>
                        <td className="p-2 text-amber-400 font-bold">{c.pod}</td>
                        <td className="p-2 text-slate-400">{c.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Surplus in Excel Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center justify-between">
              <span>⚠️ DISCREPANCIAS: EXISTE EN EXCEL, NO EN BAPLIE FILTRADO ({reconciliationResults.surplusInExcel.length})</span>
            </h3>
            <div className="overflow-auto border border-slate-800 rounded bg-[#070D18] max-h-48">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0D1826] text-slate-400 border-b border-slate-800 text-[10px]">
                    <th className="p-2">CONTENEDOR</th>
                    <th className="p-2">ISO</th>
                    <th className="p-2">POL</th>
                    <th className="p-2">POD</th>
                    <th className="p-2">IMO</th>
                    <th className="p-2">TEMP</th>
                    <th className="p-2">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationResults.surplusInExcel.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-emerald-400">
                        ✓ Cuadre Perfecto. No hay sobrantes en Excel.
                      </td>
                    </tr>
                  ) : (
                    reconciliationResults.surplusInExcel.map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-2 font-bold text-slate-200">{r.id}</td>
                        <td className="p-2 text-cyan-400">{r.iso}</td>
                        <td className="p-2 text-slate-400">{r.pol}</td>
                        <td className="p-2 text-amber-400 font-bold">{r.pod}</td>
                        <td className="p-2 text-red-400">{r.imoClass || '-'}</td>
                        <td className="p-2 text-cyan-300">{r.temp || 'DRY'}</td>
                        <td className="p-2 text-slate-400">{r.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 font-mono">
          <FileSpreadsheet className="w-16 h-16 text-slate-600 mb-3" />
          <p className="text-xs text-slate-400 max-w-md">
            Cargue la lista Excel de control y presione <strong className="text-amber-400">EJECUTAR CUADRE</strong> para reconciliar contra la colección BAPLIE activa.
          </p>
        </div>
      )}
    </div>
  );
};
