import React, { useState, useEffect } from 'react';
import StarField from './StarField';
import './IntroAnimation.css';

const IntroAnimation = ({ onComplete }) => {
  const [phase, setPhase] = useState('initial'); // initial -> reveal -> split -> fade

  useEffect(() => {
    const timeline = [
      { delay: 500, action: () => setPhase('reveal') },
      { delay: 3500, action: () => setPhase('fade') },
      { delay: 4500, action: () => onComplete() }
    ];

    const timeouts = timeline.map(({ delay, action }) => 
      setTimeout(action, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  const letters = ['V', 'O', 'I', 'D', 'L', 'I', 'N', 'K'];

  return (
    <div className={`intro-animation ${phase}`}>
      <StarField />
      
      <div className="intro-content">
        {/* Main VOIDLINK text */}
        <div className="intro-title">
          {letters.map((letter, index) => (
            <span
              key={index}
              className="intro-letter"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Subtitle that appears during reveal */}
        <div className="intro-subtitle">
          Zero-Trust Messaging Platform
        </div>

        {/* Particle effects */}
        <div className="intro-particles">
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              className="intro-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Energy waves */}
        <div className="energy-waves">
          <div className="energy-wave wave-1"></div>
          <div className="energy-wave wave-2"></div>
          <div className="energy-wave wave-3"></div>
        </div>
      </div>
    </div>
  );
};

export default IntroAnimation;