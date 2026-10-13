import React from 'react';
import { motion } from 'framer-motion';
import foodCollage from '../assets/crave-food-collage.png';

const revealAnimation = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

export default function AboutSection() {
  return (
    <section id="about" className="about">
      <div className="about-image">
        <img loading="lazy" src={foodCollage} alt="Fresh food at Crave House" />
        <span>
          Since
          <br />
          <b>2016</b>
        </span>
      </div>

      <motion.div {...revealAnimation} className="about-copy">
        <p className="eyebrow">Our little story</p>
        <h2>
          More than a meal.
          <br />
          <em>It’s a feeling.</em>
        </h2>
        <p>
          Our journey began with one mission — serve delicious food with unforgettable taste. At
          Crave House, every plate is an invitation to slow down, connect and savour the good stuff.
        </p>

        <div className="feature-list">
          <div>
            <b>01</b>
            <span>
              <strong>Fresh ingredients</strong>
              <small>Picked with care, every day.</small>
            </span>
          </div>
          <div>
            <b>02</b>
            <span>
              <strong>Professional chefs</strong>
              <small>Passion in every detail.</small>
            </span>
          </div>
        </div>

        <div className="hours">
          <span>OPENING HOURS</span>
          <p>
            Monday – Friday <b>10AM – 10PM</b>
          </p>
          <p>
            Saturday – Sunday <b>9AM – 11PM</b>
          </p>
        </div>
      </motion.div>
    </section>
  );
}
