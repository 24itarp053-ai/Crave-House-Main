import React from 'react';
import { categories } from '../data/categories';
import CategoryCard from './CategoryCard';

export default function ExploreMenu() {
  return (
    <section id="categories" className="explore-menu section">
      <div className="explore-heading">
        <p className="eyebrow">A world of flavour</p>
        <h2>Explore Our Menu</h2>
        <p>Discover our delicious collection of freshly prepared food and refreshing beverages.</p>
      </div>

      <div className="explore-grid">
        {categories.map((category, index) => (
          <CategoryCard key={category.name} category={category} index={index} />
        ))}
      </div>
    </section>
  );
}
