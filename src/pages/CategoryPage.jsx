import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiSearch, FiSliders, FiRefreshCw } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { getMenuItemsByCategory } from '../services/menuService';
import '../pizza-page.css';
import ProductCard from '../components/ProductCard';

// Import hero banner images (stays local — Vite assets)
import burgerHeroImg  from '../assets/images/burger.png';
import pastaHeroImg   from '../assets/images/pasta.png';
import saladHeroImg   from '../assets/images/salad.png';
import drinksHeroImg  from '../assets/images/drinks.png';
import dessertHeroImg from '../assets/images/desserts.png';

// Static config per category: title, subtitle, eyebrow, hero image
// Data is now fetched from the API — not stored here.
const categoryConfigs = {
  burger: {
    title: 'Delicious Veg Burgers',
    subtitle: 'Freshly grilled vegetarian burgers made with premium ingredients.',
    eyebrow: 'Handcrafted Stacks',
    image: burgerHeroImg,
  },
  pasta: {
    title: 'Authentic Italian Pasta',
    subtitle: 'Creamy and cheesy Italian pasta made with authentic herbs and fresh ingredients.',
    eyebrow: 'Italian Classics',
    image: pastaHeroImg,
  },
  salad: {
    title: 'Healthy Fresh Salads',
    subtitle: 'Healthy, colorful salads made with fresh vegetables and homemade dressings.',
    eyebrow: 'Fresh & Green',
    image: saladHeroImg,
  },
  drinks: {
    title: 'Refreshing Drinks & Shakes',
    subtitle: 'Refreshing shakes, mojitos, lemonades and signature beverages.',
    eyebrow: 'Cool Refreshments',
    image: drinksHeroImg,
  },
  desserts: {
    title: 'Sweet Desserts',
    subtitle: 'Delicious cakes, brownies, cheesecakes and sweet treats for every craving.',
    eyebrow: 'Sweet Endings',
    image: dessertHeroImg,
  },
};

// Map UI filter labels to API param objects
const FILTER_PARAMS = {
  'All':       {},
  'Under ₹200': { maxPrice: 200 },
  'Top Rated':  { minRating: 4.7 },
};

// Map UI sort values to API sort param
const SORT_MAP = {
  default:    undefined,
  'price-low':  'price_asc',
  'price-high': 'price_desc',
  rating:       'rating',
};

export default function CategoryPage({ category }) {
  const { cartCount } = useCart();
  const config = categoryConfigs[category];

  // All hooks must be declared before any conditional return
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [sortBy, setSortBy]             = useState('default');

  const debounceTimer = useRef(null);

  // Debounce search: only update debouncedQuery 300ms after the user stops typing
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  // Fetch items whenever category, filter, sort, or debounced search changes
  const fetchItems = async (cat, query, filter, sort) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 50,
        ...(query && { search: query }),
        ...FILTER_PARAMS[filter],
        ...(SORT_MAP[sort] && { sort: SORT_MAP[sort] }),
      };
      const result = await getMenuItemsByCategory(cat, params);
      setItems(result.items);
    } catch (err) {
      setError(err.message || 'Unable to load menu. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(category, debouncedQuery, selectedFilter, sortBy);
  }, [category, debouncedQuery, selectedFilter, sortBy]);

  // Guard: must be after all hooks
  if (!config) {
    return (
      <main className="pizza-page" style={{ minHeight: '100vh' }}>
        <div style={{ padding: '120px 20px', textAlign: 'center', background: '#f8f5ed' }}>
          <h2 style={{ color: '#26150f', marginBottom: 12 }}>Category Not Found</h2>
          <p style={{ color: '#6c554a', marginBottom: 24 }}>This category doesn't exist or hasn't been added yet.</p>
          <a href="/order" style={{ color: '#d4a373', fontWeight: 600, textDecoration: 'underline' }}>Browse all categories →</a>
        </div>
      </main>
    );
  }

  const retry = () => fetchItems(category, debouncedQuery, selectedFilter, sortBy);

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

      {/* Hero Banner */}
      <section
        className="pizza-hero"
        style={{
          background: `linear-gradient(90deg, rgba(38, 21, 15, 0.96) 5%, rgba(62, 39, 35, 0.78)), url(${config.image}) center/cover`
        }}
      >
        <p className="eyebrow">{config.eyebrow}</p>
        <h1>
          {config.title.split(' ').slice(0, -1).join(' ')}
          <br />
          <em>{config.title.split(' ').slice(-1)}</em>
        </h1>
        <p>{config.subtitle}</p>
      </section>

      {/* Breadcrumb */}
      <div className="category-breadcrumb-container">
        <div className="category-breadcrumb">
          <Link to="/">Home</Link>
          <span className="separator">/</span>
          <span className="active">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
        </div>
      </div>

      <section className="pizza-menu" style={{ paddingTop: '20px' }}>
        {/* Controls: Search, Filters, Sort */}
        <div className="menu-controls">
          <div className="search-bar-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder={`Search for your favorite ${category}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-sort-wrapper">
            <div className="filter-tabs">
              {['All', 'Under ₹200', 'Top Rated'].map((tag) => (
                <button
                  key={tag}
                  className={`filter-tab-btn ${selectedFilter === tag ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="sort-select-wrapper">
              <FiSliders className="sort-icon" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-dropdown-select"
              >
                <option value="default">Default Sort</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Popularity</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pizza-menu-heading" style={{ marginTop: '30px' }}>
          <div>
            <p className="eyebrow">Our {category} collection</p>
            <h2>Freshly Prepared Just For You.</h2>
          </div>
          <span>
            {loading ? '— ITEMS' : `${items.length.toString().padStart(2, '0')} ITEMS`}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="menu-loading-state" aria-live="polite" aria-busy="true">
            <div className="menu-spinner" />
            <p>Loading {category}…</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="menu-error-state" role="alert">
            <p className="menu-error-message">⚠ {error}</p>
            <button className="menu-retry-btn" onClick={retry}>
              <FiRefreshCw /> Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="no-products-found">
            <h3>No items match your criteria.</h3>
            <p>Try refining your search or filters.</p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && items.length > 0 && (
          <div className="pizza-grid">
            {items.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} category={category} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
