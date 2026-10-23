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
