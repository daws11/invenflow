import { Routes, Route } from 'react-router-dom'
import KanbanList from './pages/KanbanList'
import KanbanBoard from './pages/KanbanBoard'
import PublicForm from './pages/PublicForm'
import ToastContainer from './components/ToastContainer'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">InvenFlow</h1>
            <p className="text-sm text-gray-500">Inventory Management Kanban</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<KanbanList />} />
          <Route path="/kanban/:id" element={<KanbanBoard />} />
          <Route path="/form/:token" element={<PublicForm />} />
        </Routes>
      </main>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  )
}

export default App