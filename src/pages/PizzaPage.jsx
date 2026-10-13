import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiSearch, FiSliders, FiRefreshCw } from 'react-icons/fi';
import PizzaCard from '../components/PizzaCard';
import { useCart } from '../context/CartContext';
import { getMenuItemsByCategory } from '../services/menuService';
import '../pizza-page.css';

export default function PizzaPage() {
  const { cartCount } = useCart();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchPizzas = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMenuItemsByCategory('pizza', { limit: 50 });
      setItems(result.items);
    } catch (err) {
      setError(err.message || 'Unable to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPizzas();
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

      <section className="pizza-hero">
        <p className="eyebrow">Hand-tossed with love</p>
        <h1>
          Pizza, the way it
          <br />
          <em>should be.</em>
        </h1>
        <p>Fresh dough, premium cheese and a little Crave House magic in every slice.</p>
      </section>

      <section className="pizza-menu">
        <div className="pizza-menu-heading">
          <div>
            <p className="eyebrow">Our pizza collection</p>
            <h2>Find your favourite slice.</h2>
          </div>
          <span>
            {loading ? '— PIZZAS' : `${items.length.toString().padStart(2, '0')} PIZZAS`}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="menu-loading-state" aria-live="polite" aria-busy="true">
            <div className="menu-spinner" />
            <p>Loading pizzas…</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="menu-error-state" role="alert">
            <p className="menu-error-message">⚠ {error}</p>
            <button className="menu-retry-btn" onClick={fetchPizzas}>
              <FiRefreshCw /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="no-products-found">
            <h3>No pizzas available right now.</h3>
            <p>Please check back soon.</p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && items.length > 0 && (
          <div className="pizza-grid">
            {items.map((pizza, index) => (
              <PizzaCard key={pizza.id} pizza={pizza} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
