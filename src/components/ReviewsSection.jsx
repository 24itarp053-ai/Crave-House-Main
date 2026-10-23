import React from 'react';
import { motion } from 'framer-motion';

import restaurantConfig from '../config/restaurantConfig';

const revealAnimation = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

const reviews = [
  {
    id: 1,
    name: 'Ananya Sharma',
    comment: 'Every bite feels thoughtfully made. The Paneer Supreme is my forever order!',
    role: 'Verified guest',
  },
  {
    id: 2,
    name: 'Kabir Mehta',
    comment: 'Beautiful place, even better food. Their cold coffee is absolute perfection.',
    role: 'Verified guest',
  },
  {
    id: 3,
    name: 'Riya Patel',
    comment: `${restaurantConfig.name} has become our weekend ritual. Warm people and incredible flavours.`,
    role: 'Verified guest',
  },
];

export default function ReviewsSection() {
  return (
    <section id="reviews" className="section reviews">
      <motion.div {...revealAnimation} className="center-head">
        <p className="eyebrow">From our guests</p>
        <h2>Love at first bite.</h2>
      </motion.div>

      <div className="review-grid">
        {reviews.map((review, index) => (
          <motion.article
            key={review.id}
            {...revealAnimation}
            transition={{ delay: index * 0.12 }}
          >
            <div className="avatar">{review.name[0]}</div>
            <div className="stars">★★★★★</div>
            <p>“{review.comment}”</p>
            <b>{review.name}</b>
            <small>{review.role}</small>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
