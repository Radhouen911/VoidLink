import React, { useEffect, useRef } from 'react';
import './StarField.css';

const StarField = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Star properties
    const stars = [];
    const numStars = 200;
    const colors = ['#ffffff', '#c77dff', '#7c77c6', '#9d4edd', '#ddd6fe'];

    // Create stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    // Shooting stars
    const shootingStars = [];
    
    const createShootingStar = () => {
      if (Math.random() < 0.003) { // 0.3% chance per frame
        shootingStars.push({
          x: -50,
          y: Math.random() * canvas.height * 0.5,
          speed: Math.random() * 8 + 4,
          length: Math.random() * 80 + 20,
          opacity: 1,
          decay: Math.random() * 0.02 + 0.01
        });
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw and update regular stars
      stars.forEach(star => {
        // Twinkling effect
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        
        // Slow movement
        star.y += star.speed;
        if (star.y > canvas.height + 10) {
          star.y = -10;
          star.x = Math.random() * canvas.width;
        }

        // Draw star
        ctx.save();
        ctx.globalAlpha = star.opacity * twinkle;
        ctx.fillStyle = star.color;
        ctx.shadowBlur = star.size * 2;
        ctx.shadowColor = star.color;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Create new shooting stars
      createShootingStar();

      // Draw and update shooting stars
      shootingStars.forEach((shootingStar, index) => {
        shootingStar.x += shootingStar.speed;
        shootingStar.y += shootingStar.speed * 0.3;
        shootingStar.opacity -= shootingStar.decay;

        if (shootingStar.opacity <= 0 || shootingStar.x > canvas.width + 100) {
          shootingStars.splice(index, 1);
          return;
        }

        // Draw shooting star trail
        const gradient = ctx.createLinearGradient(
          shootingStar.x - shootingStar.length,
          shootingStar.y,
          shootingStar.x,
          shootingStar.y
        );
        gradient.addColorStop(0, 'rgba(199, 125, 255, 0)');
        gradient.addColorStop(1, `rgba(199, 125, 255, ${shootingStar.opacity})`);

        ctx.save();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(shootingStar.x - shootingStar.length, shootingStar.y);
        ctx.lineTo(shootingStar.x, shootingStar.y);
        ctx.stroke();
        
        // Draw bright head
        ctx.fillStyle = `rgba(255, 255, 255, ${shootingStar.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#c77dff';
        ctx.beginPath();
        ctx.arc(shootingStar.x, shootingStar.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="star-field-canvas" />;
};

export default StarField;