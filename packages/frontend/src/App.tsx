import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Skeleton from './components/ui/Skeleton';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import Layout from './components/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useAuthStore } from './store/authStore';

// Lazy load components for better performance
const KanbanPurchasingPage = lazy(() => import('./pages/KanbanPurchasingPage'));
const KanbanReceivingPage = lazy(() => import('./pages/KanbanReceivingPage'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const StoredLogPage = lazy(() => import('./pages/StoredLogPage'));
const InventoryManager = lazy(() => import('./pages/InventoryManager'));
const LocationsPage = lazy(() => import('./pages/LocationsPage'));
const PersonsPage = lazy(() => import('./pages/PersonsPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const MovementManager = lazy(() => import('./pages/MovementManager'));
const BulkMovementPage = lazy(() => import('./pages/BulkMovementPage'));
const PublicBulkMovementConfirmation = lazy(() => import('./pages/PublicBulkMovementConfirmation'));
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
        <ErrorBoundary>
          <Routes>
            {/* Public form route - accessible to everyone, no Layout */}
            <Route path="/form/:token" element={
              <div className="min-h-screen bg-gray-50">
                <Suspense fallback={<PageLoader />}>
                  <PublicForm />
                </Suspense>
              </div>
            } />

            {/* Public bulk movement confirmation route - accessible to everyone, no Layout */}
            <Route path="/bulk-movement/confirm/:token" element={
              <div className="min-h-screen bg-gray-50">
                <Suspense fallback={<PageLoader />}>
                  <PublicBulkMovementConfirmation />
                </Suspense>
              </div>
            } />
            
            {/* Login route - redirect to home if already authenticated */}
            <Route path="/login" element={
              isAuthenticated && user ? (
                <Navigate to="/" replace />
              ) : (
                <div className="min-h-screen bg-gray-50">
                  <Suspense fallback={<PageLoader />}>
                    <LoginForm />
                  </Suspense>
                </div>
              )
            } />

            {/* Protected routes - require authentication, use Layout */}
            <Route path="/" element={
              <Navigate to="/kanbans/purchasing" replace />
            } />
            <Route path="/kanbans/purchasing" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <KanbanPurchasingPage />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/kanbans/receiving" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <KanbanReceivingPage />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/stored-log" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <StoredLogPage />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/kanban/:id" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <KanbanBoard />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/locations" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <LocationsPage />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/persons" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <PersonsPage />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/departments" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <DepartmentsPage />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/inventory" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <InventoryManager />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/movements" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <MovementManager />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/bulk-movements" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <BulkMovementPage />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />
            <Route path="/users" element={
              <Layout>
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <UserManagement />
                  </Suspense>
                </ProtectedRoute>
              </Layout>
            } />

            {/* Fallback routes */}
            <Route path="*" element={
              isAuthenticated && user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } />
          </Routes>
        </ErrorBoundary>

        {/* Toast Container */}
        <ToastContainer />
      </>
    </ErrorBoundary>
  );
}

export default App;