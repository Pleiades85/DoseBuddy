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
      {/* Two-column section under Latest News */}
      <div className="bottom-section fade-in">
        {/* Left column */}
        <div className="bottom-left">
          <p>
            Lorem ipsum dolor sit amet. At laboriosam distinctio et autem
            veritatis est optio quia ad molestiae magni aut nihil deserunt sed
            vitae tempore. Et sequi iure ut natus accusamus ut voluptatum odit
            et tempora dolores. Qui repudiandae corrupti sed quae tenetur est
            dicta galisum qui praesentium delectus. Eum quaerat molestiae quo
            corporis repudiandae aut illo quidem cum officiis necessitatibus aut
            illum nobis. Non enim aliquam est alias ducimus ut laboriosam odio
            est repellat sint! Non praesentium tempore aut pariatur placeat id
            blanditiis sint vel vero tempore et sunt magni. Sit praesentium sunt
            id sequi unde ea officiis molestiae. Ea voluptatibus ullam qui atque
            aliquam rem veniam tempore eum maxime consequatur aut molestias
            doloribus.
          </p>
        </div>

        {/* Right column (existing card) */}
        <div className="bottom-rightcard fade-in">
          <h3 className="section-title">About</h3>

          <div className="section-list">
            <p>Something interesting</p>
            <p>Something interesting</p>
            <p>Something interesting</p>
            <p>Something interesting</p>
            <p>Something interesting</p>
          </div>

          {/* new subsection inside right side card */}
          <h4 className="card-subtitle">Who We Are</h4>
          <p className="card-description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam
            vitae facilisis mi. Duis nec orci ac nibh interdum tempus eu ac
            nunc.
          </p>
        </div>
      </div>

      {/* footer Links */}
      <div className="footer-links fade-in">
        <div className="footer-column">
          <h4>Company</h4>
          <a href="#">About Us</a>
          <a href="#">Our Products</a>
          <a href="#">Helping Communities</a>
          <a href="#">Our Voice</a>
        </div>

        <div className="footer-column">
          <h4>Resources</h4>
          <a href="#">Suppliers</a>
          <a href="#">Distribution Channel</a>
          <a href="#">Media Centre</a>
          <a href="#">DoseBuddy and Pfizer's Partnership</a>
        </div>

        <div className="footer-column">
          <h4>Support</h4>
          <a href="#">Healthcare Professionals</a>
          <a href="#">Careers</a>
          <a href="#">Contact Us</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Use</a>
        </div>
      </div>
    </div>
  );
}
