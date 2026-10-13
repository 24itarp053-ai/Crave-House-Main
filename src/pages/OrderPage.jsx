import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { categories } from '../data/categories';
import CategoryCard from '../components/CategoryCard';
import Footer from '../components/Footer';
import '../pizza-page.css';

export default function OrderPage() {
  const { cartCount } = useCart();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <main className="pizza-page">
      <header className="pizza-nav">
        <Link to="/" className="pizza-brand">
          <span>CH</span>
          <i>Crave House</i>
        </Link>

        <Link to="/" className="pizza-back">
          <FiArrowLeft /> Back to home
        </Link>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      <section className="pizza-hero" style={{ background: '#26150f' }}>
        <p className="eyebrow">A world of flavour</p>
        <h1>
          Start Your
          <br />
          <em>Crave Order.</em>
        </h1>
        <p>Choose a category below to explore our delicious collection of freshly prepared food and refreshing beverages.</p>
      </section>

      <section className="pizza-menu" style={{ paddingTop: '50px', paddingBottom: '80px' }}>
        <div className="pizza-menu-heading">
          <div>
            <p className="eyebrow">Explore Categories</p>
            <h2>Select a category to start ordering</h2>
          </div>
          <span>06 CATEGORIES</span>
        </div>

        <div className="explore-grid" style={{ marginTop: '40px' }}>
          {categories.map((category, index) => (
            <CategoryCard key={category.name} category={category} index={index} />
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
