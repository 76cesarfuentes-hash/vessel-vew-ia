import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../../core/security/types';
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter
} from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterResult, setFilterResult] = useState<string>('ALL');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.ip.includes(searchTerm);

    const matchesFilter = filterResult === 'ALL' || log.result === filterResult;

    return matchesSearch && matchesFilter;
  });

  const exportAuditCsv = () => {
    const headers = ['ID', 'Fecha/Hora', 'Usuario', 'Rol', 'Acción', 'Resultado', 'IP', 'Detalles'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      l.username,
      l.userRole,
      l.action,
      l.result,
      l.ip,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_TOS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 font-sans">
      <div className="w-full max-w-6xl h-[88vh] bg-[#0A1A2B] border border-cyan-500/60 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.2)] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D2238] to-[#0A1A2B] border-b border-cyan-500/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.3)] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-wider flex items-center gap-2 uppercase font-mono">
                REGISTROS Y AUDITORÍA DE SEGURIDAD EMPRESARIAL
              </h3>
              <p className="text-xs font-mono text-cyan-300/80">
                Trazabilidad inmutable de eventos de acceso, cargas EDI, ajustes de estiba y exportaciones.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-[#071320] border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar por usuario, acción, IP o detalle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#050E1A] border border-cyan-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="px-3 py-1.5 bg-[#050E1A] border border-cyan-500/30 text-xs text-cyan-300 rounded-xl focus:outline-none"
            >
              <option value="ALL">Todos los Resultados</option>
              <option value="SUCCESS">SUCCESS (Éxito)</option>
              <option value="FAILED">FAILED (Fallido)</option>
              <option value="BLOCKED">BLOCKED (Bloqueado)</option>
              <option value="DENIED">DENIED (Denegado)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> ACTUALIZAR
            </button>
            <button
              onClick={exportAuditCsv}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black rounded-xl border border-cyan-300 flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
            >
              <Download className="w-4 h-4" /> EXPORTAR CSV
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-cyan-300 text-[11px] uppercase bg-[#071320]/80">
                <th className="p-3">FECHA Y HORA</th>
                <th className="p-3">USUARIO</th>
                <th className="p-3">ROL</th>
                <th className="p-3">ACCIÓN</th>
                <th className="p-3">RESULTADO</th>
                <th className="p-3">IP / ORIGEN</th>
                <th className="p-3">DETALLES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 text-slate-300 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-white">
                    @{log.username}
                  </td>
                  <td className="p-3 text-cyan-300 text-[11px]">
                    {log.userRole}
                  </td>
                  <td className="p-3 font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                    {log.action}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                      log.result === 'SUCCESS'
                        ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                        : log.result === 'BLOCKED'
                        ? 'bg-rose-950 border border-rose-500 text-rose-400'
                        : 'bg-amber-950 border border-amber-500 text-amber-400'
                    }`}>
                      {log.result === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                      {log.result === 'BLOCKED' && <XCircle className="w-3 h-3" />}
                      {log.result === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                      {log.result}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                    {log.ip}
                  </td>
                  <td className="p-3 text-slate-300 text-[11px] max-w-xs truncate" title={log.details}>
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
