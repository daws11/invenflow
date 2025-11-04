import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Skeleton from './components/ui/Skeleton';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import Layout from './components/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useAuthStore } from './store/authStore';

// Lazy load components for better performance
const KanbanList = lazy(() => import('./pages/KanbanList'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const LocationsPage = lazy(() => import('./pages/LocationsPage'));
const PublicForm = lazy(() => import('./pages/PublicForm'));
const LoginForm = lazy(() => import('./components/LoginForm'));
const UserManagement = lazy(() => import('./components/UserManagement'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full p-6">
      <div className="space-y-4">
        <Skeleton variant="text" height={32} width="60%" />
        <Skeleton variant="text" height={20} width="40%" />
        <div className="space-y-3 mt-6">
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </div>
      </div>
    </div>
  </div>
);

function App() {
  const { isAuthenticated, user, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    // Check if user is authenticated on app start
    const token = localStorage.getItem('auth_token');
    if (token && !isAuthenticated) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, fetchCurrentUser]);

  return (
    <ErrorBoundary>
      <>
        {isAuthenticated && user ? (
          <Layout>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <KanbanList />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/kanban/:id" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <KanbanBoard />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/locations" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <LocationsPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <UserManagement />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/login" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </Layout>
        ) : (
          <div className="min-h-screen bg-gray-50">
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={
                  <Suspense fallback={<PageLoader />}>
                    <LoginForm />
                  </Suspense>
                } />
                <Route path="/form/:token" element={
                  <Suspense fallback={<PageLoader />}>
                    <PublicForm />
                  </Suspense>
                } />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </ErrorBoundary>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer />
      </>
    </ErrorBoundary>
  );
}

export default App;