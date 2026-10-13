import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowUpRight } from 'react-icons/fi';
import { categories } from '../data/categories';

const revealAnimation = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

export default function CategoriesSection() {
  return (
    <section id="categories" className="section categories">
      <motion.div {...revealAnimation} className="section-head">
        <div>
          <p className="eyebrow">Find your craving</p>
          <h2>Made for every mood.</h2>
        </div>
        <a href="#menu">
          View full menu <FiArrowUpRight />
        </a>
      </motion.div>

      <div className="category-grid">
        {categories.map((category, index) => (
          <motion.a
            key={category.name}
            {...revealAnimation}
            transition={{ delay: index * 0.06 }}
            href="#menu"
            className={`category ${category.slug}`}
          >
            <div>
              <span>0{index + 1}</span>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
            </div>
            <i>↗</i>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
