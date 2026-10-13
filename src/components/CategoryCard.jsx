import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

export default function CategoryCard({ category, index }) {
  return (
    <motion.article
      className="explore-card"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -9 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link to={category.path} className="explore-card-link" aria-label={category.button}>
        <img
          src={category.image}
          alt={category.name}
          loading="lazy"
          style={{ objectPosition: category.position }}
        />
        <div className="explore-overlay" />
        <div className="explore-content">
          <span className="category-icon" aria-hidden="true">
            {category.icon}
          </span>
          <h3>{category.name}</h3>
          <p>{category.description}</p>
          <span className="explore-button">
            {category.button} <FiArrowRight />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
