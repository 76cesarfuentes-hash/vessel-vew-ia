import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { User, AuditLogEntry, RoleName } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_super_secret_jwt_key_2026_tos_platform';
const TOKEN_EXPIRY = '8h'; // JWT token valid for 8 hours

export interface JwtPayload {
  userId: string;
  username: string;
  role: RoleName;
  sessionId: string;
}

export function generateToken(user: User, sessionId: string): string {
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    sessionId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function logAudit(
  userId: string,
  username: string,
  userRole: RoleName,
  action: string,
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'DENIED',
  ip: string,
  userAgent: string,
  details?: string
): void {
  const entry: AuditLogEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userId,
    username,
    userRole,
    action,
    result,
    ip: ip || '127.0.0.1',
    userAgent: userAgent || 'Unknown Browser',
    details
  };
  db.addAuditLog(entry);
}

export function sanitizeUser(user: User) {
  const { passwordHash, ...cleanUser } = user;
  const permissions = db.getPermissionsForRole(user.role);
  return {
    ...cleanUser,
    permissions
  };
}

// Password Strength Validator
export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra minúscula.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un carácter especial.' };
  }
  return { valid: true };
}
