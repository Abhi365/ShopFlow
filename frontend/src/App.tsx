import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import MFAEnrollPage from '@/pages/MFAEnrollPage';
import CatalogPage from '@/pages/CatalogPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import MerchantDashboardPage from '@/pages/MerchantDashboardPage';
import OrdersPage from '@/pages/OrdersPage';

export default function App(): React.ReactElement {
  const { isAuthenticated, role } = useAuth();
  const isMerchant = role === 'merchant' || role === 'admin';

  return (
    <BrowserRouter>
      <NavBar isAuthenticated={isAuthenticated} isMerchant={isMerchant} />
      <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route
          path="/checkout"
          element={isAuthenticated ? <CheckoutPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/dashboard"
          element={isMerchant ? <MerchantDashboardPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/orders"
          element={isMerchant ? <OrdersPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/settings/mfa"
          element={isAuthenticated ? <MFAEnrollPage /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
