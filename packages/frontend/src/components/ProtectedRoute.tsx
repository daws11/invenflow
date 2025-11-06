import { useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAuthenticated, fetchCurrentUser, loading } = useAuthStore();

  useEffect(() => {
    // Check authentication status on mount
    if (!loading && !isAuthenticated) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Try to fetch current user if token exists
        // fetchCurrentUser will redirect to /login if token is expired/invalid
        fetchCurrentUser().catch(() => {
          // Fallback: if fetchCurrentUser fails, ensure redirect to login
          // (though fetchCurrentUser already handles redirect internally)
          navigate('/login');
        });
      } else {
        // No token, redirect to login
        navigate('/login');
      }
    }
  }, [isAuthenticated, loading, navigate, fetchCurrentUser]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <svg className="animate-spin -ml-1 mr-3 h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated and not loading, redirect will happen via useEffect
  return null;
}