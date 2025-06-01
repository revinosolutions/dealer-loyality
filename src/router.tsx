import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const AdminProductsPage = React.lazy(() => import('./pages/AdminProductsPage'));
const OrdersPage = React.lazy(() => import('./pages/OrdersPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const InventoryManagementPage = React.lazy(() => import('./pages/InventoryManagementPage'));
const InventoryAllocationPage = React.lazy(() => import('./pages/InventoryAllocationPage'));
const ClientsPage = React.lazy(() => import('./pages/ClientsPage'));
const DealersPage = React.lazy(() => import('./pages/DealersPage'));
const ContestsPage = React.lazy(() => import('./pages/ContestsPage'));
const CreateContestPage = React.lazy(() => import('./pages/CreateContestPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const RewardsPage = React.lazy(() => import('./pages/RewardsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SuperAdminProfilePage = React.lazy(() => import('./pages/SuperAdminProfilePage'));
const SalesPage = React.lazy(() => import('./pages/SalesPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const SuperAdminSettingsPage = React.lazy(() => import('./pages/SuperAdminSettingsPage'));
const SuperAdminPage = React.lazy(() => import('./pages/SuperAdminPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const AdminManagementPage = React.lazy(() => import('./pages/AdminManagementPage'));
const PlatformAnalyticsPage = React.lazy(() => import('./pages/platform-analytics/PlatformAnalyticsPage'));
const DealerSlotsPage = React.lazy(() => import('./pages/DealerSlotsPage'));
const CreateDealerSlotPage = React.lazy(() => import('./pages/CreateDealerSlotPage'));
const DealerSlotDetailsPage = React.lazy(() => import('./pages/DealerSlotDetailsPage'));
const EditDealerSlotPage = React.lazy(() => import('./pages/EditDealerSlotPage'));
const ClientOrdersPage = React.lazy(() => import('./pages/ClientOrdersPage'));
const DealerCatalogPage = React.lazy(() => import('./pages/DealerCatalogPage'));
const AdminProductsCatalogPage = React.lazy(() => import('./pages/AdminProductsCatalogPage'));
const AdminPurchaseRequestsPage = React.lazy(() => import('./pages/AdminPurchaseRequestsPage'));
const ClientPurchaseRequestsPage = React.lazy(() => import('./pages/ClientPurchaseRequestsPage'));
const ClientProductsPage = React.lazy(() => import('./pages/ClientProductsPage.tsx'));

// Protected layout with sidebar and header
const ProtectedLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// Main router component
const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route index element={
        <Suspense fallback={<LoadingSpinner />}>
          <HomePage />
        </Suspense>
      } />
      <Route path="login" element={
        <Suspense fallback={<LoadingSpinner />}>
          <LoginPage />
        </Suspense>
      } />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedLayout />}>
          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Orders */}
          <Route path="dashboard/orders" element={<OrdersPage />} />
          
          {/* Client Orders */}
          <Route path="dashboard/client-orders" element={<ClientOrdersPage />} />
          
          {/* Admin Products Catalog for Clients */}
          <Route path="dashboard/admin-products-catalog" element={<AdminProductsCatalogPage />} />
          
          {/* Purchase Requests */}
          <Route path="dashboard/admin-purchase-requests" element={<AdminPurchaseRequestsPage />} />
          <Route path="dashboard/client-purchase-requests" element={<ClientPurchaseRequestsPage />} />
          
          {/* Client Inventory with Approved Stock */}
          <Route path="dashboard/client-inventory" element={<ClientProductsPage />} />
          
          {/* Dealer Slots */}
          <Route path="dashboard/dealer-slots" element={<DealerSlotsPage />} />
          <Route path="dashboard/dealer-slots/create" element={<CreateDealerSlotPage />} />
          <Route path="dashboard/dealer-slots/:slotId" element={<DealerSlotDetailsPage />} />
          <Route path="dashboard/dealer-slots/:slotId/edit" element={<EditDealerSlotPage />} />
          
          {/* Dealer Catalog */}
          <Route path="dashboard/dealer-catalog" element={<DealerCatalogPage />} />
          
          {/* Dealer Management */}
          <Route path="dashboard/dealers" element={<DealersPage />} />
          
          {/* Inventory */}
          <Route path="dashboard/inventory" element={<Navigate to="/dashboard/inventory-management" replace />} />
          <Route path="dashboard/inventory-management" element={<InventoryManagementPage />} />
          <Route path="dashboard/inventory-allocation" element={<InventoryAllocationPage />} />
          
          {/* Clients & Dealers */}
          <Route path="dashboard/clients" element={<ClientsPage />} />
          
          {/* Contests */}
          <Route path="dashboard/contests" element={<ContestsPage />} />
          <Route path="dashboard/contests/create" element={<CreateContestPage />} />
          
          {/* Analytics */}
          <Route path="dashboard/analytics" element={<AnalyticsPage />} />
          <Route path="dashboard/platform-analytics" element={<PlatformAnalyticsPage />} />
          
          {/* Rewards */}
          <Route path="dashboard/rewards" element={<RewardsPage />} />
          
          {/* Sales */}
          <Route path="dashboard/sales" element={<SalesPage />} />
          
          {/* Profile */}
          <Route path="dashboard/profile" element={<ProfilePage />} />
          <Route path="dashboard/superadmin/profile" element={<SuperAdminProfilePage />} />

          {/* Settings */}
          <Route path="dashboard/settings" element={<SettingsPage />} />
          <Route path="dashboard/superadmin/settings" element={<SuperAdminSettingsPage />} />
          
          {/* Admin Management */}
          <Route path="dashboard/admin" element={<AdminManagementPage />} />
          <Route path="dashboard/admin-products" element={<AdminProductsPage />} />
          
          {/* SuperAdmin */}
          <Route path="dashboard/superadmin" element={<SuperAdminPage />} />
        </Route>
      </Route>

      {/* Not found */}
      <Route path="*" element={
        <Suspense fallback={<LoadingSpinner />}>
          <NotFoundPage />
        </Suspense>
      } />
    </Routes>
  );
};

// Change this line to export AppRouter as a named export
export { AppRouter };
export default AppRouter;