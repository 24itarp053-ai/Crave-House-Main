import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowUpRight, FiStar } from 'react-icons/fi';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, index, category }) {
  const { addToCart } = useCart();
  return (
    <motion.article
      className="pizza-card"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -8 }}
    >
      <div className="pizza-image">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="veg-badge">● VEG</span>
      </div>

      <div className="pizza-info">
        <div>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
        </div>

        <div className="pizza-price">
          <strong>{product.price}</strong>
          <span>
            <FiStar /> {product.rating}
          </span>
        </div>

        <div className="pizza-actions">
          <button 
            className="pizza-add"
            onClick={() => addToCart(product, 1, category)}
          >
            Add to cart <FiArrowUpRight />
          </button>
          <Link to={`/menu/${category}/${product.id}`} className="pizza-details" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
            View details
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
