import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const STORAGE_KEYS = {
  AUTH_TOKEN: 'mc_tracker_auth_token',
  USERNAME: 'mc_tracker_username',
};

const EXPECTED_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'minecraft';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USERNAME);

      if (storedToken === 'authenticated' && storedUser) {
        setIsAuthenticated(true);
        setCurrentUser(storedUser);
      }
    } catch (e) {
      console.warn('LocalStorage error reading auth:', e);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const login = (password, username) => {
    const trimmedPass = (password || '').trim();
    const trimmedUser = (username || '').trim();

    if (!trimmedUser) {
      return { success: false, error: 'Please enter a Minecraft display name.' };
    }

    if (EXPECTED_PASSWORD && trimmedPass !== EXPECTED_PASSWORD) {
      return { success: false, error: 'Incorrect site password. Please try again.' };
    }

    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'authenticated');
    localStorage.setItem(STORAGE_KEYS.USERNAME, trimmedUser);
    setIsAuthenticated(true);
    setCurrentUser(trimmedUser);

    return { success: true };
  };

  const switchUser = (newUsername) => {
    const trimmed = (newUsername || '').trim();
    if (!trimmed) return false;
    localStorage.setItem(STORAGE_KEYS.USERNAME, trimmed);
    setCurrentUser(trimmed);
    setShowSwitchModal(false);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    setIsAuthenticated(false);
    setCurrentUser('');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        isLoadingAuth,
        login,
        switchUser,
        logout,
        showSwitchModal,
        setShowSwitchModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
