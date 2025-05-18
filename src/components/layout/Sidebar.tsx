import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  TrophyIcon,
  CogIcon,
  UserIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  ServerIcon,
  Cog6ToothIcon,
  TagIcon,
  ShoppingBagIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  InboxIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const { user, logout } = useAuth();

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const isDealer = user?.role === 'dealer';

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      window.location.href = '/login';
    }
  };

  // Get the correct profile path based on user role
  const getProfilePath = () => {
    if (isSuperAdmin) {
      return '/dashboard/superadmin/profile';
    }
    return '/dashboard/profile';
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Admin Management', href: '/dashboard/admin', icon: BuildingStorefrontIcon, roles: ['admin', 'superadmin'] },
    { name: 'Products', href: '/dashboard/admin-products', icon: CubeIcon, roles: ['admin', 'superadmin'] },
    { name: 'Inventory', href: '/dashboard/inventory-management', icon: ClipboardDocumentListIcon, roles: ['admin', 'superadmin'] },
    { name: 'Client Inventory', href: '/dashboard/client-inventory', icon: ClipboardDocumentListIcon, roles: ['client', 'client_admin'] },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCartIcon },
    { name: 'Purchase Requests', href: isAdmin ? '/dashboard/admin-purchase-requests' : '/dashboard/client-purchase-requests', icon: DocumentTextIcon },
    { name: 'Clients', href: '/dashboard/clients', icon: UserGroupIcon, roles: ['admin', 'superadmin'] },
    { name: 'Contests', href: '/dashboard/contests', icon: TrophyIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
    { name: 'Profile', href: getProfilePath(), icon: UserIcon },
  ];

  // Client-specific navigation items
  const clientNavigation = [
    { name: 'Product Orders', href: '/dashboard/client-orders', icon: ShoppingBagIcon },
    { name: 'Admin Products', href: '/dashboard/admin-products-catalog', icon: CubeIcon },
    { name: 'Purchase Requests', href: '/dashboard/client-purchase-requests', icon: InboxIcon },
    { name: 'Dealer Slots', href: '/dashboard/dealer-slots', icon: TagIcon },
    { name: 'Dealers', href: '/dashboard/dealers', icon: UsersIcon },
  ];

  // Dealer-specific navigation items
  const dealerNavigation: typeof navigation = [];

  // Admin-specific navigation items - keep empty, items moved to main navigation
  const adminNavigation: typeof navigation = [];

  // SuperAdmin-specific navigation items
  const superAdminNavigation = [
    { name: 'Super Admin Console', href: '/dashboard/superadmin', icon: ShieldCheckIcon },
    { name: 'Organizations', href: '/dashboard/superadmin?tab=organizations', icon: BuildingOfficeIcon },
    { name: 'Admin Users', href: '/dashboard/superadmin?tab=admins', icon: UsersIcon },
    { name: 'System Settings', href: '/dashboard/superadmin?tab=settings', icon: Cog6ToothIcon },
    { name: 'Platform Analytics', href: '/dashboard/platform-analytics', icon: ChartBarIcon },
  ];

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (isSuperAdmin) {
      return ['Dashboard'].includes(item.name);
    }
    if (isAdmin) {
      // Admin sees specific navigation items
      return ['Dashboard', 'Admin Management', 'Products', 'Inventory', 'Orders', 'Purchase Requests', 'Clients', 'Contests', 'Analytics', 'Settings', 'Profile'].includes(item.name);
    }
    if (isClient) {
      return ['Dashboard', 'Orders', 'Client Inventory', 'Profile', 'Settings'].includes(item.name);
    }
    if (isDealer) {
      return ['Dashboard', 'Orders', 'Clients', 'Profile', 'Settings'].includes(item.name);
    }
    return false;
  });

  let navItems = filteredNavigation;
  if (isSuperAdmin) {
    navItems = [...navItems, ...superAdminNavigation];
  } else if (isClient) {
    navItems = [...navItems, ...clientNavigation];
  } else if (isDealer) {
    navItems = [...navItems, ...dealerNavigation];
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-gray-200 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
            <span className="text-xl font-bold text-white">Revino</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
                end={item.href === '/'}
              >
                <item.icon
                  className="mr-3 h-6 w-6 flex-shrink-0"
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name}
                </p>
                <p className="text-xs font-medium text-gray-500">
                  {user?.role}
                </p>
              </div>
            </div>
            
            {/* Sign out button */}
            <button
              onClick={handleLogout}
              className="mt-4 w-full py-2 flex items-center justify-center text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;