import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route protection wrapper component.
 * Ensures the user is authenticated and possesses the required role.
 * @param {object} props { children: ReactNode, allowedRoles?: string[] }
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1c100b', color: '#fff' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to customer login if not logged in
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home if user does not have the required role
    return <Navigate to="/" replace />;
  }

  return children;
}
