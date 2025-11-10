import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { X, Menu, Layout, MapPin, Users, UserCircle, LogOut, Package, ArrowRightLeft, Settings, ChevronDown, Building2, Truck, ShoppingCart } from 'lucide-react';

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
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isKanbanOpen, setIsKanbanOpen] = useState(false);
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

  // Auto-open manage dropdown if current route is in manage section
  useEffect(() => {
    const managePaths = ['/departments', '/locations', '/persons', '/users'];
    if (managePaths.includes(location.pathname)) {
      setIsManageOpen(true);
    }
  }, [location.pathname]);

  // Auto-open kanban dropdown if current route is in kanban section
  useEffect(() => {
    const kanbanPaths = ['/', '/kanbans/receiving', '/kanbans/purchasing'];
    if (kanbanPaths.includes(location.pathname)) {
      setIsKanbanOpen(true);
    }
  }, [location.pathname]);

  // Close dropdowns when sidebar is collapsed
  useEffect(() => {
    if (isCollapsed) {
      setIsManageOpen(false);
      setIsKanbanOpen(false);
    }
  }, [isCollapsed]);

  const menuItems = [
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Package,
    },
    {
      name: 'Movements',
      path: '/movements',
      icon: ArrowRightLeft,
    },
  ];

  const kanbanItems = [
    {
      name: 'Kanban Purchasing',
      path: '/kanbans/purchasing',
      icon: ShoppingCart,
    },
    {
      name: 'Kanban Receiving',
      path: '/kanbans/receiving',
      icon: Truck,
    },
  ];

  const manageItems = [
    {
      name: 'Departments',
      path: '/departments',
      icon: Building2,
    },
    {
      name: 'Locations',
      path: '/locations',
      icon: MapPin,
    },
    {
      name: 'Personnel',
      path: '/persons',
      icon: UserCircle,
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
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Kanban Dropdown */}
            {!isCollapsed ? (
              <div className="space-y-1">
                <button
                  onClick={() => setIsKanbanOpen(!isKanbanOpen)}
                  className={`
                    flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isKanbanOpen || kanbanItems.some(item => location.pathname === item.path)
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Layout className="w-5 h-5 flex-shrink-0" />
                    <span className="ml-3 truncate">Kanbans</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform duration-300 ease-in-out ${
                      isKanbanOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Dropdown Menu Items with Animation */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isKanbanOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="ml-8 mt-1 space-y-1">
                    {kanbanItems.map((item, index) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`
                            flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                            ${isKanbanOpen 
                              ? 'translate-x-0 opacity-100' 
                              : '-translate-x-2 opacity-0'
                            }
                          `}
                          style={{
                            transitionDelay: isKanbanOpen ? `${index * 30}ms` : `${(kanbanItems.length - index - 1) * 20}ms`,
                          }}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="ml-3 truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Collapsed state: show individual icons
              kanbanItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    title={item.name}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                  </Link>
                );
              })
            )}

            {/* Main Menu Items */}
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

            {/* Manage Dropdown */}
            {!isCollapsed ? (
              <div className="space-y-1">
                <button
                  onClick={() => setIsManageOpen(!isManageOpen)}
                  className={`
                    flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isManageOpen || manageItems.some(item => location.pathname === item.path)
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    <span className="ml-3 truncate">Manage</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform duration-300 ease-in-out ${
                      isManageOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Dropdown Menu Items with Animation */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isManageOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="ml-8 mt-1 space-y-1">
                    {manageItems.map((item, index) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`
                            flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                            ${isManageOpen 
                              ? 'translate-x-0 opacity-100' 
                              : '-translate-x-2 opacity-0'
                            }
                          `}
                          style={{
                            transitionDelay: isManageOpen ? `${index * 30}ms` : `${(manageItems.length - index - 1) * 20}ms`,
                          }}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="ml-3 truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Collapsed state: show individual icons
              manageItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    title={item.name}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                  </Link>
                );
              })
            )}
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
