import React, { useState } from 'react';
import { useAuth } from '../../core/security/AuthContext';
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal';
import { UserManagementModal } from './UserManagementModal';
import { AuditLogsModal } from './AuditLogsModal';
import {
  UserCheck,
  Shield,
  KeyRound,
  Users,
  FileText,
  LogOut,
  ChevronDown
} from 'lucide-react';

export const UserSecurityBar: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState<boolean>(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState<boolean>(false);

  if (!user) return null;

  const roleColors: Record<string, string> = {
    Administrador: 'bg-rose-950/90 text-rose-300 border-rose-500/80',
    Supervisor: 'bg-amber-950/90 text-amber-300 border-amber-500/80',
    Operador: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80',
    Consulta: 'bg-slate-800 text-slate-300 border-slate-600'
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-[#050E1A]/90 border border-cyan-500/40 rounded-xl px-2.5 py-1 text-xs font-mono shadow-inner">
        {/* User Info & Role Badge */}
        <div className="flex items-center gap-2 pr-2 border-r border-cyan-500/30">
          <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-400/80 flex items-center justify-center text-cyan-300 text-[10px] font-black">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-white text-[11px] leading-tight">{user.name}</div>
            <div className="text-[9px] text-cyan-400 leading-none">@{user.username}</div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${roleColors[user.role] || roleColors.Consulta}`}>
            {user.role}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* User Management Button (RBAC: MANAGE_USERS) */}
          {hasPermission('MANAGE_USERS') && (
            <button
              onClick={() => setIsUserMgmtOpen(true)}
              className="p-1.5 sm:px-2 sm:py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-400 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Administración de Usuarios y Roles RBAC"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline text-[10px] font-bold">USUARIOS</span>
            </button>
          )}

          {/* Audit Logs Button (RBAC: VIEW_AUDIT_LOGS) */}
          {hasPermission('VIEW_AUDIT_LOGS') && (
            <button
              onClick={() => setIsAuditLogsOpen(true)}
              className="p-1.5 sm:px-2 sm:py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-400 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Registros y Auditoría de Seguridad"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-[10px] font-bold">AUDITORÍA</span>
            </button>
          )}

          {/* Change Password Button */}
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="p-1.5 sm:px-2 sm:py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            title="Cambiar Contraseña"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline text-[10px] font-bold">CLAVE</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-1.5 sm:px-2 sm:py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-rose-200 border border-rose-500/60 rounded-lg flex items-center gap-1 transition-all cursor-pointer ml-1"
            title="Cerrar Sesión Segura"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px] font-black">SALIR</span>
          </button>
        </div>
      </div>

      {/* Force / Change Password Modal */}
      {isPasswordModalOpen && (
        <ForcePasswordChangeModal
          onSuccess={() => setIsPasswordModalOpen(false)}
        />
      )}

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
      />

      {/* Audit Logs Modal */}
      <AuditLogsModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
      />
    </>
  );
};
