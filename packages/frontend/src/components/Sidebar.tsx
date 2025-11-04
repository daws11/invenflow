import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { X, Menu, Layout, MapPin, Users, LogOut, Home } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Auto-collapse based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsCollapsed(window.innerWidth < 1024 && !mobile);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      onToggle();
    }
  }, [location.pathname, isMobile, onToggle]);

  const menuItems = [
    {
      name: 'Kanbans',
      path: '/',
      icon: Layout,
    },
    {
      name: 'Locations',
      path: '/locations',
      icon: MapPin,
    },
    {
      name: 'Users',
      path: '/users',
      icon: Users,
    },
  ];

  const handleLogout = () => {
    logout();
    if (isMobile) {
      onToggle();
    }
  };

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50
    ${sidebarWidth}
    bg-white shadow-lg border-r border-gray-200
    transform transition-all duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0
    ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
  `;

  const overlayClasses = `
    fixed inset-0 bg-black bg-opacity-50 z-40
    transition-opacity duration-300 ease-in-out
    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
    lg:hidden
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <div
          className={overlayClasses}
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClasses}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!isCollapsed && (
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Layout className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">InvenFlow</span>
              </Link>
            )}

            {isCollapsed && (
              <div className="flex justify-center w-full">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Layout className="w-5 h-5 text-white" />
                </div>
              </div>
            )}

            {/* Close button for mobile */}
            {isMobile && !isCollapsed && (
              <button
                onClick={onToggle}
                className="p-1 rounded-md hover:bg-gray-100 lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}

            {/* Collapse toggle for desktop */}
            {!isMobile && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1 rounded-md hover:bg-gray-100"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Menu className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="ml-3 truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200">
            {!isCollapsed && user && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.role}
                </p>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`
                flex items-center w-full px-3 py-2 text-sm font-medium text-red-600
                hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="ml-3">Logout</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;