import { Routes, Route, Link } from 'react-router-dom'
import KanbanList from './pages/KanbanList'
import KanbanBoard from './pages/KanbanBoard'
import LocationsPage from './pages/LocationsPage'
import PublicForm from './pages/PublicForm'
import ToastContainer from './components/ToastContainer'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
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
              </nav>
            </div>
            <div className="flex items-center">
              <p className="text-sm text-gray-500 hidden sm:block">Inventory Management Kanban</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<KanbanList />} />
          <Route path="/kanban/:id" element={<KanbanBoard />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/form/:token" element={<PublicForm />} />
        </Routes>
      </main>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  )
}

export default App