import React from 'react';
import { Logo } from './Navbar';

import restaurantConfig from '../config/restaurantConfig';

export default function Footer() {
  return (
    <footer>
      <Logo />
      <p>Good food. Good people. Good moments.</p>
      <div>
        <a href="#home">Home</a>
        <a href="#menu">Menu</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>
      <small>© {new Date().getFullYear()} {restaurantConfig.name}. Made with flavour.</small>
    </footer>
  );
}
