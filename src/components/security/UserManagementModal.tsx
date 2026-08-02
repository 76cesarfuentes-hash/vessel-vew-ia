import React, { useState, useEffect } from 'react';
import { UserProfile, RoleName, UserStatus } from '../../core/security/types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Mail,
  User as UserIcon
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New User Form State
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<RoleName>('Operador');

  // Reset Password State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState<string>('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setError('No se pudo obtener la lista de usuarios.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al crear usuario.');
        return;
      }

      setSuccessMsg(`Usuario ${newUsername} creado exitosamente.`);
      setShowCreateForm(false);
      setNewName('');
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');
      fetchUsers();
    } catch (err) {
      setError('Error de comunicación con el servidor.');
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSuccessMsg('Estado de usuario actualizado.');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al actualizar estado.');
      }
    } catch (err) {
      setError('Error de conexión.');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: RoleName) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setSuccessMsg('Rol de usuario actualizado.');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al actualizar rol.');
      }
    } catch (err) {
      setError('Error de conexión.');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetPasswordVal) return;
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordVal })
      });
      if (res.ok) {
        setSuccessMsg('Contraseña restablecida exitosamente.');
        setResetUserId(null);
        setResetPasswordVal('');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al restablecer contraseña.');
      }
    } catch (err) {
      setError('Error al restablecer contraseña.');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 font-sans">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0A1A2B] border border-cyan-500/60 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.2)] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D2238] to-[#0A1A2B] border-b border-cyan-500/40 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-400/60 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.3)] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-wider flex items-center gap-2 uppercase font-mono">
                ADMINISTRACIÓN DE USUARIOS Y PERMISOS RBAC
              </h3>
              <p className="text-xs font-mono text-cyan-300/80">
                Gestión de cuentas, asignación de roles corporativos y control de acceso.
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
        <div className="p-4 bg-[#071320] border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por usuario, nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-[#050E1A] border border-cyan-500/30 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> REFRESCAR
            </button>
            <button
              onClick={() => { setShowCreateForm(!showCreateForm); setError(null); }}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-black rounded-xl border border-cyan-300 flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
            >
              <UserPlus className="w-4 h-4" /> NUEVO USUARIO
            </button>
          </div>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="m-4 mb-0 p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {successMsg && (
          <div className="m-4 mb-0 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Create User Form Drawer */}
        {showCreateForm && (
          <div className="m-4 p-4 bg-[#081726] border border-cyan-500/50 rounded-xl space-y-3 font-mono animate-fadeIn">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" /> REGISTRAR NUEVO USUARIO EMPRESARIAL
            </h4>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">NOMBRE COMPLETO</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#050E1A] border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">CORREO CORPORATIVO</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#050E1A] border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">NOMBRE DE USUARIO</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#050E1A] border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">CONTRASEÑA INICIAL SEGUIRA</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 car, M/m, Num, Esp"
                  className="w-full px-3 py-1.5 bg-[#050E1A] border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">ROL DE SEGURIDAD</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleName)}
                  className="w-full px-3 py-1.5 bg-[#050E1A] border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Operador">Operador</option>
                  <option value="Consulta">Consulta</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg uppercase"
                >
                  CREAR USUARIO
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-cyan-300 text-[11px] uppercase bg-[#071320]/80">
                <th className="p-3">USUARIO / NOMBRE</th>
                <th className="p-3">CORREO</th>
                <th className="p-3">ROL</th>
                <th className="p-3">ESTADO</th>
                <th className="p-3">ÚLTIMO ACCESO</th>
                <th className="p-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-[10px] text-cyan-400">@{u.username}</div>
                  </td>
                  <td className="p-3 text-slate-300">{u.email}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u.id, e.target.value as RoleName)}
                      className="bg-[#050E1A] border border-slate-700 text-xs text-cyan-300 rounded px-2 py-1 focus:outline-none"
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Operador">Operador</option>
                      <option value="Consulta">Consulta</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.status}
                      onChange={(e) => handleUpdateUserStatus(u.id, e.target.value as UserStatus)}
                      className={`text-xs font-bold rounded px-2 py-1 border focus:outline-none ${
                        u.status === 'Activo'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                          : u.status === 'Suspendido'
                          ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                          : 'bg-rose-950/80 border-rose-500 text-rose-400'
                      }`}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Suspendido">Suspendido</option>
                      <option value="Bloqueado">Bloqueado</option>
                      <option value="Deshabilitado">Deshabilitado</option>
                    </select>
                  </td>
                  <td className="p-3 text-slate-400 text-[11px]">
                    {u.lastAccess ? new Date(u.lastAccess).toLocaleString() : 'Sin accesos'}
                  </td>
                  <td className="p-3 text-right">
                    {resetUserId === u.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="password"
                          placeholder="Nueva contraseña"
                          value={resetPasswordVal}
                          onChange={(e) => setResetPasswordVal(e.target.value)}
                          className="bg-[#050E1A] border border-slate-700 px-2 py-0.5 text-xs text-white rounded"
                        />
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="px-2 py-0.5 bg-amber-600 text-slate-950 text-xs font-bold rounded"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setResetUserId(null)}
                          className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setResetUserId(u.id); setResetPasswordVal(''); }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded text-[11px] font-bold flex items-center gap-1 ml-auto"
                        title="Restablecer contraseña de usuario"
                      >
                        <KeyRound className="w-3 h-3" /> RESET PASS
                      </button>
                    )}
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
