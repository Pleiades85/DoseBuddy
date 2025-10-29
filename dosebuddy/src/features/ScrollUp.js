import React, { useState, useEffect } from 'react';
import "../texture/ScrollUp.css"; 

const ScrollUp = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Scroll to top smoothly
  const scrollUp = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div className="scroll-to-top">
      {isVisible && (
        <button 
          onClick={scrollUp} 
          className="scroll-to-top-btn"
          aria-label="Go to top"
        >
          <i class="bi bi-airplane-engines"></i>
        </button>
      )}
    </div>
  );
};

export default ScrollUp;