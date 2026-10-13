import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import ExploreMenu from '../components/ExploreMenu';
import MenuSection from '../components/MenuSection';
import AboutSection from '../components/AboutSection';
import BenefitsSection from '../components/BenefitsSection';
import ReviewsSection from '../components/ReviewsSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';

export default function HomePage() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="progress" />
      <Navbar />
      <HeroSection />
      <ExploreMenu />
      <MenuSection />
      <AboutSection />
      <BenefitsSection />
      <ReviewsSection />
      <ContactSection />
      <Footer />

      {showScrollTop && (
        <button
          className="to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          ↑
        </button>
      )}
    </>
  );
}
