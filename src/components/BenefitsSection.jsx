import React from 'react';
import { FiClock, FiHeart, FiShoppingBag, FiPhone } from 'react-icons/fi';

const benefits = [
  {
    icon: FiClock,
    title: 'Fast delivery',
    description: 'Your favourites, right on time.',
  },
  {
    icon: FiHeart,
    title: 'Fresh food',
    description: 'Made from kitchen to table.',
  },
  {
    icon: FiShoppingBag,
    title: 'Best price',
    description: 'Great taste, honest value.',
  },
  {
    icon: FiPhone,
    title: 'Always here',
    description: 'Warm service, seven days a week.',
  },
];

import restaurantConfig from '../config/restaurantConfig';

export default function BenefitsSection() {
  return (
    <section className="benefits">
      <p className="eyebrow">The {restaurantConfig.name} promise</p>
      <div>
        {benefits.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <article key={index}>
              <IconComponent />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
