import React, { useEffect, useState } from 'react';

const Snowfall: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<number[]>([]);

  useEffect(() => {
    // Generate static array for snowflakes to render
    setSnowflakes(Array.from({ length: 50 }, (_, i) => i));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {snowflakes.map((i) => {
        const left = Math.random() * 100;
        const animationDuration = 5 + Math.random() * 10;
        const opacity = 0.3 + Math.random() * 0.7;
        const size = 0.5 + Math.random() * 1.5;

        return (
          <div
            key={i}
            className="absolute top-[-20px] text-white animate-snow-fall"
            style={{
              left: `${left}%`,
              animationDuration: `${animationDuration}s`,
              opacity: opacity,
              fontSize: `${size}rem`,
              animationDelay: `-${Math.random() * 10}s`
            }}
          >
            ❄
          </div>
        );
      })}
    </div>
  );
};

export default Snowfall;
