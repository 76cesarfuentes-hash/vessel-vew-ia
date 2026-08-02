import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from './auth.js';
import { db } from './db.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: any;
    sessionId: string;
    permissions: string[];
  };
}

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Enterprise OWASP Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Check Authorization header or Cookie
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('tos_auth_token='));
    if (authCookie) {
      token = authCookie.split('=')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Debe iniciar sesión.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido. Por favor inicie sesión nuevamente.' });
  }

  // Verify active session in DB
  const session = db.getSession(payload.sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Sesión terminada. Vuelva a autenticarse.' });
  }

  // Verify user status in DB
  const user = db.getUserById(payload.userId);
  if (!user || user.status !== 'Activo') {
    return res.status(403).json({ error: 'Cuenta de usuario inactiva, suspendida o bloqueada.' });
  }

  const permissions = db.getPermissionsForRole(user.role);

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    sessionId: payload.sessionId,
    permissions
  };

  next();
}

export function requirePermission(permissionCode: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        error: `Acceso denegado. Permiso requerido no otorgado: ${permissionCode}`
      });
    }

    next();
  };
}

// Input Sanitizer to sanitize strings against XSS / HTML injection
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(sanitizeInput);
    }
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
}
