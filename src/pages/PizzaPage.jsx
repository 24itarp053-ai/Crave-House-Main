import React from 'react';
import CategoryPage from './CategoryPage';

/**
 * PizzaPage
 * Preserved for backward compatibility with existing route imports.
 * Delegates to CategoryPage with 'pizza' category to provide dynamic database loading,
 * search filtering, sorting, and custom category management updates.
 */
export default function PizzaPage() {
  return <CategoryPage category="pizza" />;
}
