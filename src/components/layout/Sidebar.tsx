import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Trophy, 
  BarChart3, 
  Gift, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
};

const NavItem = ({ to, icon, label, active }: NavItemProps) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active
        ? 'bg-indigo-100 text-indigo-900 font-medium'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <span className="text-lg">{icon}</span>
    <span>{label}</span>
  </Link>
);

type SidebarProps = {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
};

const Sidebar = ({ isMobileOpen, setIsMobileOpen }: SidebarProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = React.useMemo(() => {
    // Base items for all users
    const items = [
      { to: '/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
    ];

    // Role-specific items
    if (user?.role === 'super_admin') {
      items.push(
        { to: '/clients', icon: <Users size={20} />, label: 'Clients' },
        { to: '/contests', icon: <Trophy size={20} />, label: 'Contests' },
        { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
        { to: '/settings', icon: <Settings size={20} />, label: 'Settings' }
      );
    } else if (user?.role === 'client') {
      items.push(
        { to: '/dealers', icon: <Users size={20} />, label: 'Dealers' },
        { to: '/contests', icon: <Trophy size={20} />, label: 'Contests' },
        { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' }
      );
    } else if (user?.role === 'dealer') {
      items.push(
        { to: '/sales', icon: <BarChart3 size={20} />, label: 'Sales' },
        { to: '/contests', icon: <Trophy size={20} />, label: 'Contests' },
        { to: '/rewards', icon: <Gift size={20} />, label: 'Rewards' }
      );
    }

    return items;
  }, [user?.role]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:static lg:z-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Link to="/" className="flex items-center gap-2">
              <Trophy className="h-7 w-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Revino</span>
            </Link>
            <button 
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setIsMobileOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.to}
                />
              ))}
            </div>
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
            >
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Mobile menu button */}
      <button
        className="fixed bottom-4 right-4 lg:hidden z-20 h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu size={24} />
      </button>
    </>
  );
};

export default Sidebar;