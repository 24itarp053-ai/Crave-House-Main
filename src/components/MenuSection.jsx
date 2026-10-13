import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowUpRight, FiStar } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { getMenuItems } from '../services/menuService';
import '../pizza-page.css';

const revealAnimation = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

export default function MenuSection() {
  const { addToCart } = useCart();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPopular = async () => {
      try {
        let result = await getMenuItems({ popular: true, limit: 8 });
        if (!result || !result.items || result.items.length === 0) {
          result = await getMenuItems({ limit: 8 });
        }
        if (!cancelled) {
          setMenuItems(result?.items || []);
          setError(null);
        }
      } catch (err) {
        try {
          const fallbackResult = await getMenuItems({ limit: 8 });
          if (!cancelled) {
            setMenuItems(fallbackResult?.items || []);
            setError(null);
          }
        } catch (fallbackErr) {
          if (!cancelled) setError('Unable to load popular items.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPopular();
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="menu" className="section menu">
      <motion.div {...revealAnimation} className="center-head">
        <p className="eyebrow">Our signature selection</p>
        <h2>Popular on the table.</h2>
        <p>Little moments of joy, plated fresh for you.</p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="menu-loading-state" style={{ padding: '40px 0' }}>
          <div className="menu-spinner" />
          <p>Loading popular items…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="menu-error-state" role="alert" style={{ padding: '40px 0' }}>
          <p className="menu-error-message">⚠ {error}</p>
        </div>
      )}

      {/* Cards */}
      {!loading && !error && menuItems.length > 0 && (
        <div className="menu-grid">
          {menuItems.map((item, index) => (
            <motion.article
              key={item.id}
              {...revealAnimation}
              transition={{ delay: (index % 4) * 0.06 }}
              className="food-card"
            >
              <div className={`food-img ${item.category?.slug || 'pizza'}`}>
                <img loading="lazy" src={item.image} alt={item.name} />
                <span>VEG</span>
              </div>

              <div className="food-info">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>

                <div className="price-row">
                  <b>{item.price}</b>
                  <small>
                    <FiStar /> {item.rating}
                  </small>
                </div>

                <button
                  className="add"
                  onClick={() => addToCart(item, 1, item.category?.slug || 'pizza')}
                >
                  Add to cart <FiArrowUpRight />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
