import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { resolveImage } from '../services/menuService';

export default function CategoryCard({ category, index = 0 }) {
  const targetPath = category.path || `/menu/${category.slug}`;
  const resolvedImg = resolveImage(category.image);
  const buttonText = category.button || `Explore ${category.name}`;
  const iconText = category.icon || '🍽️';

  return (
    <motion.article
      className="explore-card"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -9 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link to={targetPath} className="explore-card-link" aria-label={buttonText}>
        {resolvedImg && (
          <img
            src={resolvedImg}
            alt={category.name}
            loading="lazy"
            style={{ objectPosition: category.position || 'center' }}
          />
        )}
        <div className="explore-overlay" />
        <div className="explore-content">
          <span className="category-icon" aria-hidden="true">
            {iconText}
          </span>
          <h3>{category.name}</h3>
          {category.description && <p>{category.description}</p>}
          <span className="explore-button">
            {buttonText} <FiArrowRight />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
