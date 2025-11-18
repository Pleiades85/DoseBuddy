import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";
import Navbar from "../components/navbar.js";
import dosebg from "../images/dosebackground.jpg";
import React, { useRef, useEffect } from "react";

// state management

export default function Welcome() {
  const navigate = useNavigate();
  const cardContainerRef = useRef(null);

  const newsList = [
    { title: "Article 1", desc: "Something interesting" },
    { title: "Article 2", desc: "Something interesting" },
    { title: "Article 3", desc: "Something interesting" },
    { title: "Article 4", desc: "Something interesting" },
    { title: "Article 5", desc: "Something interesting" },
    { title: "Article 6", desc: "Something interesting" },
    { title: "Article 7", desc: "Something interesting" },
    { title: "Article 8", desc: "Something interesting" },
  ];

  // Scroll button logic
  const scrollLeft = () => {
    if (cardContainerRef.current) {
      const card = cardContainerRef.current.querySelector(".card");
      if (card) {
        const gap = parseInt(window.getComputedStyle(card).marginRight) || 20;
        const cardWidth = card.offsetWidth + gap;
        cardContainerRef.current.scrollBy({
          left: -cardWidth,
          behavior: "smooth",
        });
      }
    }
  };

  const scrollRight = () => {
    if (cardContainerRef.current) {
      const card = cardContainerRef.current.querySelector(".card");
      if (card) {
        const gap = parseInt(window.getComputedStyle(card).marginRight) || 20;
        const cardWidth = card.offsetWidth + gap;
        cardContainerRef.current.scrollBy({
          left: cardWidth,
          behavior: "smooth",
        });
      }
    }
  };

  // prevent vertical mouse wheel scrolling inside the news section
  useEffect(() => {
    const container = cardContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // Prevent default vertical scroll behavior
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY; // scroll horizontally instead
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Fade-in animation logic
  useEffect(() => {
    const fadeElems = document.querySelectorAll(".fade-in");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    fadeElems.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="welcome-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="background-left"></div>
        <div className="background-right"></div>

        <div className="title-screen">
          <h1 className="welcome-title">
            Welcome to DoesBuddy<span>&copy;</span>
          </h1>
          <p className="welcome-subtitle">
            Your Trusted Friend in Medicinal Management
          </p>
          <div className="welcome-buttons">
            <button onClick={() => navigate("/signup")} className="auth-button">
              Let's get started
            </button>
          </div>
        </div>
      </section>
    
      {/* Latest News Section */}
      <div className="latestnews-wrapper fade-in">
        <div className="latestnews-title">
          <h3>Latest News</h3>
          <p>Around our app:</p>
        </div>

        {/* Left Arrow */}
        <button className="arrow left-arrow" onClick={scrollLeft}>
          {"<"}
        </button>

        <section className="news-section" ref={cardContainerRef}>
          {newsList.map((item, index) => (
            <div className="card fade-in" key={index}>
              <img src={dosebg} alt="logo" />
              <div className="card-content">
                <h1>{item.title}</h1>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Right Arrow */}
        <button className="arrow right-arrow" onClick={scrollRight}>
          {">"}
        </button>
      </div>
      
    </div>
  );
}
