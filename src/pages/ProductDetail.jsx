import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiShoppingBag, FiStar, FiPlus, FiMinus, FiShoppingCart, FiRefreshCw } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { getMenuItemById, getMenuItemsByCategory } from '../services/menuService';
import '../pizza-page.css';
import ProductCard from '../components/ProductCard';
import BrandLogo from '../components/BrandLogo';

export default function ProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [quantity, setQuantity]         = useState(1);
  const [item, setItem]                 = useState(null);
  const [related, setRelated]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const { cartCount, addToCart } = useCart();

  // Extract category from path (e.g. "/menu/burger/6a7b..." → "burger") or item document
  const pathCategory = location.pathname.split('/')[2];
  const category = (pathCategory && pathCategory !== 'menu' && pathCategory !== id)
    ? pathCategory
    : (item?.category?.slug || 'pizza');

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setQuantity(1);
  }, [category, id]);

  // Fetch the individual product
  useEffect(() => {
    let cancelled = false;
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      setItem(null);
      setRelated([]);
      try {
        const data = await getMenuItemById(id);
        if (!cancelled) setItem(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load product. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchItem();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch related products once item is loaded
  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    const fetchRelated = async () => {
      try {
        const result = await getMenuItemsByCategory(category, { limit: 6 });
        if (!cancelled) {
          setRelated(result.items.filter(r => r.id !== item.id).slice(0, 3));
        }
      } catch (_) {
        // Related products failing silently is acceptable
      }
    };
    fetchRelated();
    return () => { cancelled = true; };
  }, [item, category]);

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '120px 20px', textAlign: 'center', background: '#f8f5ed', minHeight: '100vh' }}>
        <div className="menu-spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#6c554a' }}>Loading product…</p>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: '120px 20px', textAlign: 'center', background: '#f8f5ed', minHeight: '100vh' }}>
        <p style={{ color: '#b5452a', fontSize: '1.1rem', marginBottom: 16 }}>⚠ {error}</p>
        <button
          className="menu-retry-btn"
          onClick={() => {
            setError(null);
            setLoading(true);
            getMenuItemById(id)
              .then(data => { setItem(data); setLoading(false); })
              .catch(err => { setError(err.message); setLoading(false); });
          }}
        >
          <FiRefreshCw /> Retry
        </button>
        <br /><br />
        <Link to={`/menu/${category}`} style={{ color: '#4e342e', fontWeight: 600, textDecoration: 'underline' }}>
          ← Back to {category} collection
        </Link>
      </div>
    );
  }

  // ── Not Found ────────────────────────────────────────────────────────────────
  if (!item) {
    return (
      <div style={{ padding: '120px 20px', textAlign: 'center', background: '#f8f5ed', minHeight: '100vh' }}>
        <h2>Product Not Found</h2>
        <p>The product you are looking for does not exist or has been moved.</p>
        <Link to="/" style={{ color: '#4e342e', fontWeight: 600, textDecoration: 'underline' }}>Back to Home</Link>
      </div>
    );
  }

  // Resolve nutrition: use API data when available, fall back to a minimal placeholder
  const nutrition = item.nutrition && item.nutrition.calories
    ? item.nutrition
    : { calories: '—', protein: '—', fat: '—', carbs: '—' };

  return (
    <main className="pizza-page">
      <header className="pizza-nav">
        <BrandLogo />

        <button onClick={() => navigate(-1)} className="pizza-back" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <FiArrowLeft /> Go Back
        </button>

        <Link to="/cart" className="pizza-cart" aria-label="Shopping cart">
          <FiShoppingBag /> Cart <b>{cartCount}</b>
        </Link>
      </header>

      {/* Details Container */}
      <div className="product-details-container">
        <div className="product-details-content">

          {/* Left Column: Image */}
          <motion.div
            className="product-details-media"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="details-image-wrapper">
              <img src={item.image} alt={item.name} />
              <span className="veg-badge-large">● 100% VEG</span>
            </div>
          </motion.div>

          {/* Right Column: Info & Actions */}
          <motion.div
            className="product-details-info"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="info-category-tag">{category.toUpperCase()}</span>
            <h1>{item.name}</h1>

            <div className="info-meta">
              <span className="info-price">{item.price}</span>
              <span className="info-rating">
                <FiStar className="star-icon" /> {item.rating} / 5.0
              </span>
            </div>

            <p className="info-description">{item.description}</p>

            <div className="info-divider" />

            {/* Ingredients */}
            <div className="info-section">
              <h3>Ingredients</h3>
              <p>{item.ingredients || 'Information not available.'}</p>
            </div>

            {/* Nutrition */}
            <div className="info-section">
              <h3>Nutrition (Per Serving)</h3>
              <div className="nutrition-grid">
                <div className="nutrition-item">
                  <span className="nutrition-val">{nutrition.calories}</span>
                  <span className="nutrition-lbl">Energy</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-val">{nutrition.protein}</span>
                  <span className="nutrition-lbl">Protein</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-val">{nutrition.fat}</span>
                  <span className="nutrition-lbl">Fat</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-val">{nutrition.carbs}</span>
                  <span className="nutrition-lbl">Carbs</span>
                </div>
              </div>
            </div>

            <div className="info-divider" />

            {/* Add to Cart Controls */}
            <div className="details-actions">
              <div className="qty-selector">
                <button onClick={handleDecrement} aria-label="Decrease quantity"><FiMinus /></button>
                <span>{quantity}</span>
                <button onClick={handleIncrement} aria-label="Increase quantity"><FiPlus /></button>
              </div>

              <button
                className="details-add-btn"
                onClick={() => addToCart(item, quantity, category)}
              >
                <FiShoppingCart /> Add to Cart
              </button>
            </div>

            <button
              className="details-back-link"
              onClick={() => navigate(`/menu/${category}`)}
            >
              <FiArrowLeft /> Back to {category} collection
            </button>
          </motion.div>

        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="pizza-menu related-section" style={{ background: '#f5efe4', borderTop: '1px solid #e8decb' }}>
          <div className="pizza-menu-heading">
            <div>
              <p className="eyebrow">Pair it with something nice</p>
              <h2>Related {category}s</h2>
            </div>
            <span>MORE TO CRAVE</span>
          </div>

          <div className="pizza-grid">
            {related.map((rel, idx) => (
              <ProductCard key={rel.id} product={rel} index={idx} category={category} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
