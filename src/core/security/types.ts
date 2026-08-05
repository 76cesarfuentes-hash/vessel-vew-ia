export type RoleName = 'Administrador' | 'Supervisor' | 'Operador' | 'Consulta' | 'Planner' | 'Invitado';

export type UserStatus = 'Activo' | 'Suspendido' | 'Bloqueado' | 'Deshabilitado';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  role: RoleName;
  status: UserStatus;
  createdAt: string;
  lastAccess: string | null;
  mustChangePassword?: boolean;
  permissions: string[];
  isPaidPlan?: boolean;
  sessionCount?: number;
  maxSessions?: number;
}

export interface AuditLogItem {
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
