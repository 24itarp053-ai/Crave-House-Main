import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowUpRight, FiClock, FiStar } from 'react-icons/fi';
import foodCollage from '../assets/crave-food-collage.png';

const revealAnimation = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

export default function HeroSection() {
  return (
    <section id="home" className="hero">
      <div className="hero-bg" />

      <div className="hero-inner">
        <motion.div {...revealAnimation} className="hero-copy">
          <p className="eyebrow">✦ The taste you deserve</p>
          <h1>
            Delicious food,<em> delivered fast.</em>
          </h1>
          <p className="lead">
            Fresh ingredients. Fast delivery. Premium taste.
            <br />
            Made with love.
          </p>

          <div className="actions">
            <Link className="button" to="/order">
              Order now <FiArrowUpRight />
            </Link>
            <Link className="button ghost" to="/book-table">
              Book a table
            </Link>
          </div>

          <div className="hero-meta">
            <span>
              <FiStar /> 4.9/5 guest love
            </span>
            <span>
              <FiClock /> 25 min delivery
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9 }}
          className="hero-dish"
        >
          <img src={foodCollage} alt="A selection of Crave House dishes" />
          <div className="dish-note">
            made with
            <br />
            <b>heart</b> ♥
          </div>
        </motion.div>
      </div>

      <a className="scroll" href="#categories">
        SCROLL TO EXPLORE <span />
      </a>
    </section>
  );
}
