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
    // Redirect to staff login for admin/owner routes, customer login otherwise
    const isStaffRoute = allowedRoles && (allowedRoles.includes('admin') || allowedRoles.includes('owner'));
    return <Navigate to={isStaffRoute ? '/staff-login' : '/login'} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home if user does not have the required role
    return <Navigate to="/" replace />;
  }

  return children;
}
