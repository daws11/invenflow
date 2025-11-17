import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  // Update main content margin based on sidebar state
  const mainContentMargin = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64';

  const sidebarWidthValue = sidebarCollapsed ? '4rem' : '16rem';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onCollapseChange={handleCollapseChange}
      />

      {/* Mobile Header with Hamburger Menu */}
      <header className="lg:hidden bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm border-b border-gray-100">
        <div className="px-3 sm:px-4">
          <div className="flex items-center justify-between h-14">
            {/* Hamburger Menu Button */}
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all"
              aria-label="Open sidebar"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>

            {/* Mobile Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M3 6h18M3 12h12M3 18h9"></path>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold leading-tight text-gray-900">InvenFlow</span>
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Control Center</span>
              </div>
            </div>

            {/* Empty div for balance */}
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`${mainContentMargin} transition-all duration-300`}
        style={{ '--sidebar-width': sidebarWidthValue } as React.CSSProperties}
      >
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 md:py-4">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-25"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default Layout;
