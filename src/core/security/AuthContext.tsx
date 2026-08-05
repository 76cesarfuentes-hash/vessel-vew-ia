import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from './types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  testModeWarning: string | null;
  setTestModeWarning: (msg: string | null) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  registerGuest: (name?: string, email?: string, username?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permissionCode: string) => boolean;
  logClientAudit: (action: string, details?: string, result?: 'SUCCESS' | 'FAILED') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr_admin_001',
  name: 'Administrador General',
  email: 'admin@poseidon-tos.com',
  username: 'admin',
  role: 'Administrador',
  status: 'Activo',
  createdAt: '2025-01-01T00:00:00.000Z',
  lastAccess: new Date().toISOString(),
  mustChangePassword: false,
  permissions: ['*'],
  isPaidPlan: true
};

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_ADMIN_USER);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testModeWarning, setTestModeWarning] = useState<string | null>(null);

  // Check auth session on load
  const refreshProfile = async () => {
    try {
      const token = localStorage.getItem('tos_auth_token');
      if (!token) {
        setUser(DEFAULT_ADMIN_USER);
        setIsLoading(false);
        return;
      }
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache', 'Authorization': `Bearer ${token}` };

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || DEFAULT_ADMIN_USER);
      } else {
        localStorage.removeItem('tos_auth_token');
        setUser(DEFAULT_ADMIN_USER);
      }
    } catch (err) {
      setUser(DEFAULT_ADMIN_USER);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  // 30-Minute Inactivity Auto-Logout Mechanism
  useEffect(() => {
    if (!user) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.warn('Cierre de sesión automático por 30 minutos de inactividad.');
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [user]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Error al iniciar sesión.' };
      }

      if (data.token) {
        localStorage.setItem('tos_auth_token', data.token);
      }

      if (data.testModeWarning) {
        setTestModeWarning(data.testModeWarning);
      }

      setUser(data.user);
      return {
        success: true,
        mustChangePassword: data.user?.mustChangePassword
      };
    } catch (err: any) {
      return { success: false, error: 'Error de conexión con el servidor de autenticación.' };
    }
  };

  const registerGuest = async (name?: string, email?: string, username?: string, password?: string) => {
    try {
      const res = await fetch('/api/auth/register-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Error al registrar invitado.' };
      }

      if (data.token) {
        localStorage.setItem('tos_auth_token', data.token);
      }

      if (data.testModeWarning) {
        setTestModeWarning(data.testModeWarning);
      }

      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error de conexión con el servidor.' };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('tos_auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch('/api/auth/logout', { method: 'POST', headers });
    } catch (err) {
      console.warn('Logout network error:', err);
    } finally {
      localStorage.removeItem('tos_auth_token');
      setUser(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const token = localStorage.getItem('tos_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al cambiar contraseña.' };
      }

      if (data.token) {
        localStorage.setItem('tos_auth_token', data.token);
      }

      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Error de conexión con el servidor.' };
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    return user.permissions ? user.permissions.includes(permissionCode) : false;
  };

  const logClientAudit = async (action: string, details?: string, result: 'SUCCESS' | 'FAILED' = 'SUCCESS') => {
    if (!user) return;
    try {
      const token = localStorage.getItem('tos_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/audit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, details, result })
      });
    } catch (err) {
      // Silent catch for background audit
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        testModeWarning,
        setTestModeWarning,
        login,
        registerGuest,
        logout,
        changePassword,
        hasPermission,
        logClientAudit,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
