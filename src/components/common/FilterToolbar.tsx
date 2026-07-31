import React from 'react';
import { useStowageStore } from '../../core/stores/useStowageStore';
import { Filter, RotateCcw, Search, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { normalizePortCode, NO_DATA } from '../../core/parser/portNormalizer';

export const FilterToolbar: React.FC = () => {
  const {
    parsedContainers,
    filteredContainers,
    activeOperationView,
    setOperationView,
    filters,
    setFilters,
    resetFilters
  } = useStowageStore();

  // Extract unique filter dropdown values from parsedContainers
  const getUniqueValues = (key: keyof typeof parsedContainers[0]) => {
    const set = new Set<string>();
    parsedContainers.forEach(c => {
      const val = c[key];
      if (val && typeof val === 'string' && val !== NO_DATA && val !== '-') {
        set.add(val);
      }
    });
    return Array.from(set).sort();
  };

  const uniqueOperators = getUniqueValues('operator');
  const uniquePods = Array.from(new Set(parsedContainers.map(c => normalizePortCode(c.pod)))).filter(p => p && p !== NO_DATA).sort();
  const uniquePols = Array.from(new Set(parsedContainers.map(c => normalizePortCode(c.pol)))).filter(p => p && p !== NO_DATA).sort();
  const uniqueBays = getUniqueValues('bay').sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const uniqueRows = getUniqueValues('row').sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const uniqueTiers = getUniqueValues('tier').sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const uniqueIsos = getUniqueValues('iso');
  const uniqueImoClasses = getUniqueValues('imoClass');

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'searchQuery') return typeof val === 'string' && val.trim() !== '';
    return val !== 'ALL';
  }).length;

  return (
    <div className="bg-[#070D18] border border-slate-800 rounded-lg p-3 mb-4 shadow-md font-mono text-xs text-slate-200">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            MOTOR DE FILTRADO CUMULATIVO Y RESTRICCIONES
          </span>
          <span
            onClick={() => setOperationView(activeOperationView === 'DESCARGA' ? 'CARGA' : 'DESCARGA')}
            className={`cursor-pointer text-[10px] font-bold px-2.5 py-0.5 rounded border transition-all ${
              activeOperationView === 'DESCARGA'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-600 hover:bg-cyan-900'
                : 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
            }`}
            title="Haz clic para alternar entre vista de Descarga y Carga"
          >
            VISTA: {activeOperationView}
          </span>
          {activeFiltersCount > 0 && (
            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {activeFiltersCount} Filtro{activeFiltersCount > 1 ? 's' : ''} Activo{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Result Counter Badge */}
          <div className="bg-[#0D1826] border border-slate-700 px-3 py-1 rounded text-[11px] font-bold">
            Mostrando: <span className="text-cyan-400">{filteredContainers.length}</span> / <span className="text-slate-400">{parsedContainers.length}</span> unidades
          </div>

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid of Cumulative Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {/* Category */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Categoría</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ category: e.target.value as any })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODAS</option>
            <option value="IMPORT">IMPORTACIÓN</option>
            <option value="EXPORT">EXPORTACIÓN</option>
            <option value="TRANSIT">TRÁNSITO</option>
          </select>
        </div>

        {/* Status (Full / Empty) */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Estado (F/E)</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as any })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODOS</option>
            <option value="FULL">FULL (LLENO)</option>
            <option value="EMPTY">EMPTY (VACÍO)</option>
          </select>
        </div>

        {/* Cargo Type */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Tipo Carga</label>
          <select
            value={filters.cargoType}
            onChange={(e) => setFilters({ cargoType: e.target.value as any })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODOS LOS TIPOS</option>
            <option value="DG">PELIGROSO (DG)</option>
            <option value="RF">REEFER (RF)</option>
            <option value="OS">SOBREDIM. (OOG)</option>
            <option value="TK">TANQUE (TK)</option>
            <option value="DC">SECA (DRY/DC)</option>
          </select>
        </div>

        {/* Shipping Line / Operator */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Línea Naviera</label>
          <select
            value={filters.operator}
            onChange={(e) => setFilters({ operator: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODAS</option>
            {uniqueOperators.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        {/* POD */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Puerto Descarga (POD)</label>
          <select
            value={filters.pod}
            onChange={(e) => setFilters({ pod: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODOS (POD)</option>
            {uniquePods.map(pod => (
              <option key={pod} value={pod}>{pod}</option>
            ))}
          </select>
        </div>

        {/* POL */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Puerto Carga (POL)</label>
          <select
            value={filters.pol}
            onChange={(e) => setFilters({ pol: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODOS (POL)</option>
            {uniquePols.map(pol => (
              <option key={pol} value={pol}>{pol}</option>
            ))}
          </select>
        </div>

        {/* Bay */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Bahía (Bay)</label>
          <select
            value={filters.bay}
            onChange={(e) => setFilters({ bay: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODAS</option>
            {uniqueBays.map(b => (
              <option key={b} value={b}>BAY {b}</option>
            ))}
          </select>
        </div>

        {/* Row */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Fila (Row)</label>
          <select
            value={filters.row}
            onChange={(e) => setFilters({ row: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODAS</option>
            {uniqueRows.map(r => (
              <option key={r} value={r}>ROW {r}</option>
            ))}
          </select>
        </div>

        {/* Tier */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Nivel (Tier)</label>
          <select
            value={filters.tier}
            onChange={(e) => setFilters({ tier: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODOS</option>
            {uniqueTiers.map(t => (
              <option key={t} value={t}>TIER {t}</option>
            ))}
          </select>
        </div>

        {/* ISO Type */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Código ISO</label>
          <select
            value={filters.iso}
            onChange={(e) => setFilters({ iso: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODOS ISO</option>
            {uniqueIsos.map(iso => (
              <option key={iso} value={iso}>{iso}</option>
            ))}
          </select>
        </div>

        {/* IMO Class */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Clase IMO</label>
          <select
            value={filters.imoClass}
            onChange={(e) => setFilters({ imoClass: e.target.value })}
            className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">TODAS IMO</option>
            {uniqueImoClasses.map(imo => (
              <option key={imo} value={imo}>IMO {imo}</option>
            ))}
          </select>
        </div>

        {/* Search Query */}
        <div>
          <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">Búsqueda Rápida</label>
          <div className="relative">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              placeholder="Varios N°s (ej: 7542310, 8912341)..."
              className="w-full bg-[#0B1726] border border-slate-700 text-cyan-300 rounded pl-2 pr-6 py-1 text-[11px] focus:outline-none focus:border-cyan-500 placeholder-slate-600"
            />
            <Search className="w-3 h-3 text-slate-500 absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
