import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowUpRight } from 'react-icons/fi';
import { getCategories } from '../services/menuService';
import { categories as fallbackCategories } from '../data/categories';

const revealAnimation = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

export default function CategoriesSection() {
  const [categories, setCategories] = useState(fallbackCategories);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getCategories();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        console.warn('Could not load dynamic categories, using cached defaults:', err.message);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

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
        {categories.map((category, index) => {
          const targetHref = category.path || `/menu/${category.slug}`;
          return (
            <motion.a
              key={category.slug || category.name}
              {...revealAnimation}
              transition={{ delay: index * 0.06 }}
              href={targetHref}
              className={`category ${category.slug}`}
            >
              <div>
                <span>{index < 9 ? `0${index + 1}` : index + 1}</span>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
              <i>↗</i>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
