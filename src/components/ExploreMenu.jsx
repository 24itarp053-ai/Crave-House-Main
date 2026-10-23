import React, { useState, useEffect } from 'react';
import { getCategories } from '../services/menuService';
import { categories as fallbackCategories } from '../data/categories';
import CategoryCard from './CategoryCard';

export default function ExploreMenu() {
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
    <section id="categories" className="explore-menu section">
      <div className="explore-heading">
        <p className="eyebrow">A world of flavour</p>
        <h2>Explore Our Menu</h2>
        <p>Discover our delicious collection of freshly prepared food and refreshing beverages.</p>
      </div>

      <div className="explore-grid">
        {categories.map((category, index) => (
          <CategoryCard key={category.slug || category.name} category={category} index={index} />
        ))}
      </div>
    </section>
  );
}
