import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingBag, FiMenu, FiX } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

import BrandLogo from './BrandLogo';

export function Logo() {
  return <BrandLogo variant="logo" href="#home" />;
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { cartCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 45);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Menu', href: '#categories' },
    { label: 'About', href: '#about' },
    { label: 'Reviews', href: '#reviews' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header className={isScrolled ? 'nav solid' : 'nav'}>
      <Logo />

      <nav className={isMenuOpen ? 'open' : ''}>
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setIsMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <Link
          to="/book-table"
          className="nav-mobile-only nav-book-link"
          onClick={() => setIsMenuOpen(false)}
        >
          Book a Table
        </Link>
        <div className="nav-mobile-only nav-mobile-divider" />
        {isAuthenticated && user ? (
          <div className="nav-mobile-only nav-mobile-auth">
            <Link
              to={user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/account'}
              className="nav-mobile-user-link"
              onClick={() => setIsMenuOpen(false)}
            >
              My Account ({user.name.split(' ')[0]})
            </Link>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                logout();
              }}
              className="nav-mobile-logout-btn"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="nav-mobile-only nav-mobile-auth">
            <Link
              to="/login"
              className="nav-mobile-login-link"
              onClick={() => setIsMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/register"
              className="nav-mobile-register-link"
              onClick={() => setIsMenuOpen(false)}
            >
              Create Account
            </Link>
          </div>
        )}
      </nav>

      <div className="navtools">
        <Link to="/cart" className="cart" aria-label="Shopping cart">
          <FiShoppingBag />
          <b>{cartCount}</b>
        </Link>
        {isAuthenticated && user ? (
          <>
            <Link
              to={user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/account'}
              className="login navbar-username"
            >
              Hi, {user.name.split(' ')[0]}
            </Link>
            <button onClick={logout} className="navbar-logout-btn" aria-label="Logout">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="login">
            Login
          </Link>
        )}
        <button
          className="hamb"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label="Toggle Navigation Menu"
        >
          {isMenuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </header>
  );
}
