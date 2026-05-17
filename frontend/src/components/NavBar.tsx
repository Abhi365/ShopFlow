import React from 'react';
import { Link } from 'react-router-dom';
import { logout } from '@/api/auth';
import { setAccessToken } from '@/api/client';

interface NavBarProps {
  isAuthenticated: boolean;
  isMerchant: boolean;
}

export default function NavBar({ isAuthenticated, isMerchant }: NavBarProps): React.ReactElement {
  async function handleLogout(): Promise<void> {
    await logout();
    setAccessToken(null);
    window.location.href = '/login';
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">ShopFlow</Link>
      <nav>
        <Link to="/catalog">Shop</Link>
        <Link to="/cart">Cart</Link>
        {isMerchant && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/orders">Orders</Link>
          </>
        )}
        {isAuthenticated ? (
          <button onClick={() => void handleLogout()}>Sign out</button>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
