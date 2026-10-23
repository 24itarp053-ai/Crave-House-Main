import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

import { API_BASE_URL as API_URL } from '../services/apiConfig';

/**
 * Validate and clean user object structure
 */
const validateUser = (userObj) => {
  if (!userObj || typeof userObj !== 'object') return null;
  if (
    typeof userObj.name === 'string' &&
    typeof userObj.email === 'string' &&
    (userObj.role === 'customer' || userObj.role === 'admin' || userObj.role === 'owner')
  ) {
    return {
      id: userObj.id || userObj._id,
      name: userObj.name,
      email: userObj.email,
      phone: userObj.phone,
      role: userObj.role
    };
  }
  return null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from JWT on reload
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('craveHouseToken');
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          
          if (data.success && data.user) {
            const cleaned = validateUser(data.user);
            setUser(cleaned);
            if (cleaned) {
              localStorage.setItem('craveHouseUser', JSON.stringify(cleaned));
            }
          } else {
            // Token is invalid/expired, clear storage
            localStorage.removeItem('craveHouseToken');
            localStorage.removeItem('craveHouseUser');
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to restore auth session:', error);
          // Fallback to offline/cached user if available
          const stored = localStorage.getItem('craveHouseUser');
          if (stored) {
            try {
              setUser(validateUser(JSON.parse(stored)));
            } catch (e) {}
          }
        }
      } else {
        // Clear cached user if no token exists
        localStorage.removeItem('craveHouseUser');
        setUser(null);
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  /**
   * Log in user using backend credentials verification.
   */
  const login = async (email, password, expectedRole) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!data.success) {
        setLoading(false);
        return { success: false, error: data.message || 'Invalid email or password.' };
      }

      // Verify role matches selected screen (matches mock behavior)
      if (expectedRole && data.user.role !== expectedRole) {
        setLoading(false);
        const roleLabel = expectedRole === 'owner' ? 'Restaurant Owner' : expectedRole === 'admin' ? 'Admin' : 'Customer';
        return {
          success: false,
          error: `Access denied. This account does not have access as ${roleLabel}.`
        };
      }

      const cleanedUser = validateUser(data.user);
      
      // Store JWT token and cleaned user details
      localStorage.setItem('craveHouseToken', data.token);
      if (cleanedUser) {
        localStorage.setItem('craveHouseUser', JSON.stringify(cleanedUser));
      }

      setUser(cleanedUser);
      setLoading(false);
      return { success: true, user: cleanedUser };
    } catch (err) {
      setLoading(false);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  /**
   * Register customer user using backend.
   */
  const register = async (name, email, password, phone) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, phone })
      });
      const data = await res.json();

      setLoading(false);
      if (data.success) {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.message || 'Registration failed.' };
      }
    } catch (err) {
      setLoading(false);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  /**
   * Log out active session
   */
  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('craveHouseToken');
      localStorage.removeItem('craveHouseUser');
    } catch (error) {
      console.error('Error clearing storage on logout:', error);
    }
  };

  const updateCurrentUser = (updatedUser) => {
    const cleaned = validateUser(updatedUser);
    if (cleaned) {
      setUser(cleaned);
      localStorage.setItem('craveHouseUser', JSON.stringify(cleaned));
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        updateCurrentUser
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
