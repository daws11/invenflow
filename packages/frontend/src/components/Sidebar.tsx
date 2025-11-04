import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { X, Menu, Layout, MapPin, Users, LogOut, Package } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, onCollapseChange }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const previousPathRef = useRef(location.pathname);

  // Auto-collapse based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      const collapsed = window.innerWidth < 1024 && !mobile;
      setIsMobile(mobile);
      setIsCollapsed(collapsed);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;

    if (previousPath !== location.pathname && isMobile && isOpen) {
      onToggle();
    }
  }, [location.pathname, isMobile, isOpen, onToggle]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (!isMobile) return;

    const previousOverflow = document.body.style.overflow;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isMobile, isOpen]);

  // Notify parent when collapse state changes (desktop layout adjustment)
  useEffect(() => {
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

  const menuItems = [
    {
      name: 'Kanbans',
      path: '/',
      icon: Layout,
    },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Package,
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

  const mobileWidth = 'w-[min(19rem,calc(100vw-3rem))] sm:w-80';
  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
  const baseWidth = isMobile ? mobileWidth : sidebarWidth;
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50
    ${baseWidth}
    bg-white shadow-lg border-r border-gray-200
    transform transition-all duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    lg:translate-x-0
    ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
  `;

  const overlayClasses = `
    fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-[1px]
    transition-opacity duration-200 ease-in-out
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
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={sidebarClasses}
        data-state={isOpen ? 'open' : 'closed'}
        data-viewport={isMobile ? 'mobile' : 'desktop'}
      >
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
