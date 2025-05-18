import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { ProductProvider } from './contexts/ProductContext';
import { OrderProvider } from './contexts/OrderContext';
import { ReportingProvider } from './contexts/ReportingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ContestProvider } from './contexts/ContestContext';
import { DataProvider } from './contexts/DataContext';
import App from './App';
import './index.css';

// Import token refreshing utility
import { initializeTokenRefresh } from './utils/authTokenRefresherESM';
// Import network recovery service
import { checkAndRecoverFromNetworkErrors } from './utils/networkRecoveryService';
// Import client auth fix
import { fixClientAuth } from './fixClientAuthModule';

// Initialize token refresh mechanism
initializeTokenRefresh();

// Run network recovery check in the background
setTimeout(async () => {
  try {
    // Fix client auth issues automatically
    fixClientAuth();
    // Check for network issues
    await checkAndRecoverFromNetworkErrors();
  } catch (e) {
    console.error('Error during startup recovery:', e);
  }
}, 2000);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ContestProvider>
            <ProductProvider>
              <InventoryProvider>
                <OrderProvider>
                  <ReportingProvider>
                    <DataProvider>
                      <App />
                    </DataProvider>
                  </ReportingProvider>
                </OrderProvider>
              </InventoryProvider>
            </ProductProvider>
          </ContestProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);