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