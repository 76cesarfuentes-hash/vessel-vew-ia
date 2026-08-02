export type RoleName = 'Administrador' | 'Supervisor' | 'Operador' | 'Consulta';

export type UserStatus = 'Activo' | 'Suspendido' | 'Bloqueado' | 'Deshabilitado';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  role: RoleName;
  status: UserStatus;
  createdAt: string;
  lastAccess: string | null;
  mustChangePassword?: boolean;
}

export interface Permission {
  code: string;
  name: string;
  description: string;
}

export interface RolePermissions {
  role: RoleName;
  permissions: string[]; // Permission codes
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userRole: RoleName;
  action: string;
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'DENIED';
  ip: string;
  userAgent: string;
  details?: string;
}

export interface FailedLoginEntry {
  username: string;
  ip: string;
  timestamp: number;
}

export interface SessionEntry {
  sessionId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ip: string;
  userAgent: string;
}

export interface PasswordHistoryEntry {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: string;
}
