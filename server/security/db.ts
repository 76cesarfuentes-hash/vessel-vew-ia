import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  RolePermissions,
  Permission,
  AuditLogEntry,
  FailedLoginEntry,
  SessionEntry,
  PasswordHistoryEntry,
  RoleName
} from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'security_db.json');

interface SecuritySchema {
  users: User[];
  rolesPermissions: RolePermissions[];
  permissions: Permission[];
  sessions: SessionEntry[];
  auditLogs: AuditLogEntry[];
  failedLogins: FailedLoginEntry[];
  passwordHistory: PasswordHistoryEntry[];
  ipLoginCounts?: Record<string, number>;
}

const DEFAULT_PERMISSIONS: Permission[] = [
  { code: 'VIEW_DASHBOARD', name: 'Ver Dashboard', description: 'Acceso a matriz y vista principal' },
  { code: 'VIEW_BAIAS', name: 'Ver Bahías y Planos', description: 'Visualización de cortes y bahías' },
  { code: 'VIEW_MINIPLAN', name: 'Ver Mini Plan', description: 'Acceso al Mini Plan Pro' },
  { code: 'VIEW_RECAP', name: 'Ver Cuadre y Recap POD', description: 'Consultas de conciliación y recap' },
  { code: 'VIEW_MOVINS', name: 'Ver Validador MOVINS', description: 'Auditoría de archivos MOVINS' },
  { code: 'USE_AI_COPILOT', name: 'Usar Agente de IA', description: 'Interacción con el Copilot de Voz e IA' },
  { code: 'UPLOAD_FILES', name: 'Cargar EDI (BAPLIE/MOVINS)', description: 'Capacidad de importar BAPLIE o MOVINS' },
  { code: 'EXECUTE_STOWAGE_ADJUST', name: 'Ejecutar Ajustes de Estiba', description: 'Modificar la posición de contenedores' },
  { code: 'EXPORT_REPORTS', name: 'Exportar Datos (PDF/Excel)', description: 'Descarga de reportes operativos' },
  { code: 'MANAGE_USERS', name: 'Administración de Usuarios', description: 'Creación y edición de cuentas de usuario' },
  { code: 'VIEW_AUDIT_LOGS', name: 'Ver Auditoría de Seguridad', description: 'Acceso a registros de eventos y logs' }
];

const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'Administrador',
    permissions: DEFAULT_PERMISSIONS.map(p => p.code)
  },
  {
    role: 'Planner',
    permissions: DEFAULT_PERMISSIONS.map(p => p.code)
  },
  {
    role: 'Supervisor',
    permissions: [
      'VIEW_DASHBOARD', 'VIEW_BAIAS', 'VIEW_MINIPLAN', 'VIEW_RECAP',
      'VIEW_MOVINS', 'USE_AI_COPILOT', 'UPLOAD_FILES', 'EXECUTE_STOWAGE_ADJUST',
      'EXPORT_REPORTS', 'VIEW_AUDIT_LOGS'
    ]
  },
  {
    role: 'Operador',
    permissions: [
      'VIEW_DASHBOARD', 'VIEW_BAIAS', 'VIEW_MINIPLAN', 'VIEW_RECAP',
      'VIEW_MOVINS', 'USE_AI_COPILOT', 'UPLOAD_FILES', 'EXECUTE_STOWAGE_ADJUST',
      'EXPORT_REPORTS'
    ]
  },
  {
    role: 'Consulta',
    permissions: ['VIEW_DASHBOARD']
  },
  {
    role: 'Invitado',
    permissions: ['VIEW_DASHBOARD']
  }
];

class SecurityDatabase {
  private data: SecuritySchema;

  constructor() {
    this.data = {
      users: [],
      rolesPermissions: DEFAULT_ROLE_PERMISSIONS,
      permissions: DEFAULT_PERMISSIONS,
      sessions: [],
      auditLogs: [],
      failedLogins: [],
      passwordHistory: []
    };
    this.initDatabase();
  }

  private initDatabase() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = {
          users: parsed.users || [],
          rolesPermissions: DEFAULT_ROLE_PERMISSIONS,
          permissions: DEFAULT_PERMISSIONS,
          sessions: parsed.sessions || [],
          auditLogs: parsed.auditLogs || [],
          failedLogins: parsed.failedLogins || [],
          passwordHistory: parsed.passwordHistory || [],
          ipLoginCounts: parsed.ipLoginCounts || {}
        };
      }

      // 1. Ensure Admin User (Programador / Admin)
      const adminPassHash = bcrypt.hashSync('Michael01$', 12);
      let adminUser = this.data.users.find(
        u => u.username.toLowerCase() === 'admin' || u.username.toLowerCase() === 'michael' || u.username.toLowerCase() === 'michael01' || u.username.toLowerCase() === 'admin_tos' || u.username.toLowerCase() === 'programador' || u.id === 'usr_admin_001'
      );

      if (!adminUser) {
        adminUser = {
          id: 'usr_admin_001',
          name: 'Michael - Administrador',
          email: 'admin.tos@terminal.com',
          username: 'admin',
          passwordHash: adminPassHash,
          role: 'Administrador',
          status: 'Activo',
          createdAt: new Date().toISOString(),
          lastAccess: null,
          mustChangePassword: false,
          isPaidPlan: true
        };
        this.data.users.push(adminUser);
      } else {
        adminUser.username = 'admin';
        adminUser.passwordHash = adminPassHash;
        adminUser.role = 'Administrador';
        adminUser.status = 'Activo';
        adminUser.mustChangePassword = false;
        adminUser.isPaidPlan = true;
      }

      // 2. Ensure Planner User (Modo de Paga)
      const plannerPassHash = bcrypt.hashSync('Planner123$!', 12);
      let plannerUser = this.data.users.find(
        u => u.username.toLowerCase() === 'planner' || u.id === 'usr_planner_001'
      );

      if (!plannerUser) {
        plannerUser = {
          id: 'usr_planner_001',
          name: 'Planificador de Estiba (Paga)',
          email: 'planner@terminal.com',
          username: 'planner',
          passwordHash: plannerPassHash,
          role: 'Planner',
          status: 'Activo',
          createdAt: new Date().toISOString(),
          lastAccess: null,
          mustChangePassword: false,
          isPaidPlan: true
        };
        this.data.users.push(plannerUser);
      } else {
        plannerUser.username = 'planner';
        plannerUser.passwordHash = plannerPassHash;
        plannerUser.role = 'Planner';
        plannerUser.status = 'Activo';
        plannerUser.mustChangePassword = false;
        plannerUser.isPaidPlan = true;
      }

      // Clear any failed logins for admin and planner
      this.data.failedLogins = this.data.failedLogins.filter(
        f => f.username.toLowerCase() !== 'admin' && f.username.toLowerCase() !== 'admin_tos' && f.username.toLowerCase() !== 'planner'
      );

      this.save();
    } catch (err) {
      console.error('Error initializing SecurityDatabase:', err);
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving SecurityDatabase:', err);
    }
  }

  // User Management
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    const clean = username.trim().toLowerCase();
    return this.data.users.find(
      u => u.username.toLowerCase() === clean ||
           u.email.toLowerCase() === clean ||
           ((clean === 'admin' || clean === 'admin_tos' || clean === 'programador' || clean === 'michael' || clean === 'michael01') && (u.username.toLowerCase() === 'admin' || u.username.toLowerCase() === 'admin_tos' || u.id === 'usr_admin_001')) ||
           (clean === 'planner' && (u.username.toLowerCase() === 'planner' || u.id === 'usr_planner_001')) ||
           (clean === 'invitado' && (u.username.toLowerCase() === 'invitado' || u.id === 'usr_invitado_001'))
    );
  }

  public addUser(user: User): void {
    this.data.users.push(user);
    this.save();
  }

  public updateUser(user: User): void {
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      this.data.users[idx] = user;
      this.save();
    }
  }

  // Password History
  public getPasswordHistory(userId: string): PasswordHistoryEntry[] {
    return this.data.passwordHistory.filter(ph => ph.userId === userId);
  }

  public addPasswordHistory(userId: string, passwordHash: string): void {
    this.data.passwordHistory.push({
      id: `pwh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      passwordHash,
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  // Audit Logs
  public getAuditLogs(): AuditLogEntry[] {
    return this.data.auditLogs.slice(-1000).reverse(); // Return latest 1000 logs
  }

  public addAuditLog(log: AuditLogEntry): void {
    this.data.auditLogs.push(log);
    // Keep max 5000 audit logs to optimize size
    if (this.data.auditLogs.length > 5000) {
      this.data.auditLogs = this.data.auditLogs.slice(-5000);
    }
    this.save();
  }

  // Failed Logins Tracking
  public getFailedLogins(username: string): FailedLoginEntry[] {
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
    return this.data.failedLogins.filter(
      f => f.username.toLowerCase() === username.toLowerCase() && f.timestamp > fifteenMinsAgo
    );
  }

  public addFailedLogin(username: string, ip: string): number {
    const now = Date.now();
    this.data.failedLogins.push({ username: username.toLowerCase(), ip, timestamp: now });
    this.save();
    return this.getFailedLogins(username).length;
  }

  public clearFailedLogins(username: string): void {
    this.data.failedLogins = this.data.failedLogins.filter(
      f => f.username.toLowerCase() !== username.toLowerCase()
    );
    this.save();
  }

  // Sessions Management
  public addSession(session: SessionEntry): void {
    this.data.sessions.push(session);
    this.save();
  }

  public getSession(sessionId: string): SessionEntry | undefined {
    return this.data.sessions.find(s => s.sessionId === sessionId);
  }

  public removeSession(sessionId: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.sessionId !== sessionId);
    this.save();
  }

  public invalidateAllUserSessions(userId: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.userId !== userId);
    this.save();
  }

  // IP Login Tracking for Test Mode
  public getIpLoginCount(ip: string): number {
    if (!this.data.ipLoginCounts) {
      this.data.ipLoginCounts = {};
    }
    return this.data.ipLoginCounts[ip] || 0;
  }

  public incrementIpLoginCount(ip: string): number {
    if (!this.data.ipLoginCounts) {
      this.data.ipLoginCounts = {};
    }
    const current = this.data.ipLoginCounts[ip] || 0;
    this.data.ipLoginCounts[ip] = current + 1;
    this.save();
    return this.data.ipLoginCounts[ip];
  }

  // Roles & Permissions
  public getPermissionsForRole(role: RoleName): string[] {
    const found = this.data.rolesPermissions.find(r => r.role === role);
    return found ? found.permissions : [];
  }

  public getAllPermissions(): Permission[] {
    return this.data.permissions;
  }

  public getAllRolesPermissions(): RolePermissions[] {
    return this.data.rolesPermissions;
  }
}

export const db = new SecurityDatabase();
