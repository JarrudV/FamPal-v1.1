import React, { useId } from 'react';

const Logo: React.FC<{ className?: string; size?: number; variant?: 'white' | 'blue' | 'dark' }> = ({ className = '', size = 40, variant = 'dark' }) => {
  const uid = useId();
  const bgId = `logo-bg${uid}`;
  const fGradId = `logo-fg${uid}`;

  const bgFill = variant === 'white' ? '#FFFFFF' : `url(#${bgId})`;
  const bgStops = variant === 'white'
    ? [{ offset: '0%', color: '#FFFFFF' }, { offset: '100%', color: '#FFFFFF' }]
    : [{ offset: '0%', color: '#0F0A2A' }, { offset: '100%', color: '#2D1B69' }];

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            {bgStops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <linearGradient id={fGradId} x1="20" y1="15" x2="65" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="50%" stopColor="#D946EF" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill={bgFill} />
        <path
          d="M28 22 C28 18, 31 15, 35 15 L70 15 C74 15, 74 15, 74 19 L74 23 C74 27, 74 27, 70 27 L42 27 L42 43 L64 43 C68 43, 68 43, 68 47 L68 51 C68 55, 68 55, 64 55 L42 55 L42 80 C42 84, 42 84, 38 84 L32 84 C28 84, 28 84, 28 80 Z"
          fill={`url(#${fGradId})`}
        />
        <path
          d="M68 15 C68 15, 76 15, 76 23 L76 24"
          stroke={`url(#${fGradId})`}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="76" cy="18" r="8" fill="#F97316" />
        <circle cx="76" cy="16" r="3" fill={variant === 'white' ? '#FFFFFF' : '#0F0A2A'} />
      </svg>
    </div>
  );
};

export default Logo;
