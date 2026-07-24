import React, { createContext, useContext, useState, useEffect } from 'react';
import { cachedUser, me, signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => cachedUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const freshUser = await me();
        setUser(freshUser);
      } catch (err) {
        setUser(null);
        apiSignOut();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signIn = async (credentials) => {
    const u = await apiSignIn(credentials);
    setUser(u);
    return u;
  };

  const signUp = async (credentials) => {
    const u = await apiSignUp(credentials);
    setUser(u);
    return u;
  };

  const signOut = () => {
    apiSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
