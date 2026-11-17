import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    let active = true;
    // Old browser flags are never accepted as authentication.
    try { localStorage.removeItem('mc_tracker_auth_token'); localStorage.removeItem('mc_tracker_username'); } catch {}
    api('/api/auth/session').then(data => {
      if (active) { setUser(data.user); setSetupRequired(data.setupRequired); }
    }).catch(() => { if (active) setAuthError('Cannot reach the tracker backend. Please check the server and reload.'); })
      .finally(() => { if (active) setIsLoadingAuth(false); });
    const expired = () => { setUser(null); setAuthError('Your session expired or your key was revoked. Please sign in again.'); };
    window.addEventListener('tracker:unauthorized', expired);
    return () => { active = false; window.removeEventListener('tracker:unauthorized', expired); };
  }, []);

  async function authenticate(path, body) {
    try {
      const data = await api(path, { method: 'POST', body });
      setUser(data.user); setSetupRequired(false); setShowSwitchModal(false); setAuthError('');
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  }
  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} });
      setUser(null); setShowSwitchModal(false); setAuthError('');
    } catch (error) { setAuthError(error.message); }
  }
  const hasScope = scope => Boolean(user && (user.authMethod === 'password' || user.scopes.includes(scope)));

  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), currentUser: user?.username ?? '',
    isLoadingAuth, setupRequired, authError, showSwitchModal, setShowSwitchModal, hasScope, logout,
    login: (password, username) => authenticate('/api/auth/login', { password, username }),
    loginWithKey: apiKey => authenticate('/api/auth/key-login', { apiKey }),
    setup: data => authenticate('/api/auth/setup', data),
    switchUser: username => authenticate('/api/auth/player', { username }),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
