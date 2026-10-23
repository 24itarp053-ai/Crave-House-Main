import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { getCategories } from '../services/menuService';
import { categories as fallbackCategories } from '../data/categories';
import CategoryCard from '../components/CategoryCard';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import '../pizza-page.css';

export default function OrderPage() {
  const { cartCount } = useCart();
  const [categories, setCategories] = useState(fallbackCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    async function load() {
      try {
        const data = await getCategories();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        console.warn('Could not load dynamic categories, using cached defaults:', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const countStr = categories.length < 10 ? `0${categories.length}` : `${categories.length}`;

  return (
    <main className="pizza-page">
      <header className="pizza-nav">
        <BrandLogo />

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
          <span>{countStr} CATEGORIES</span>
        </div>

        <div className="explore-grid" style={{ marginTop: '40px' }}>
          {categories.map((category, index) => (
            <CategoryCard key={category.slug || category.name} category={category} index={index} />
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
