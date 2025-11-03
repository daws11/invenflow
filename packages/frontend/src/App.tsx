import { useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import KanbanList from './pages/KanbanList';
import KanbanBoard from './pages/KanbanBoard';
import LocationsPage from './pages/LocationsPage';
import PublicForm from './pages/PublicForm';
import LoginForm from './components/LoginForm';
import UserManagement from './components/UserManagement';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import { useAuthStore } from './store/authStore';

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
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && user ? (
        <>
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-8">
                  <Link to="/" className="flex items-center">
                    <h1 className="text-2xl font-bold text-gray-900">InvenFlow</h1>
                  </Link>
                  <nav className="hidden md:flex space-x-6">
                    <Link
                      to="/"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Kanbans
                    </Link>
                    <Link
                      to="/locations"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Locations
                    </Link>
                    <Link
                      to="/users"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Users
                    </Link>
                  </nav>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 hidden sm:block">
                    {user.name} ({user.role})
                  </span>
                  <button
                    onClick={() => useAuthStore.getState().logout()}
                    className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={
                <ProtectedRoute>
                  <KanbanList />
                </ProtectedRoute>
              } />
              <Route path="/kanban/:id" element={
                <ProtectedRoute>
                  <KanbanBoard />
                </ProtectedRoute>
              } />
              <Route path="/locations" element={
                <ProtectedRoute>
                  <LocationsPage />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/form/:token" element={<PublicForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

export default App;