
import React from 'react';

const Logo: React.FC<{ className?: string; size?: number; variant?: 'white' | 'blue' }> = ({ className = '', size = 40, variant = 'blue' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        {/* Background rounded shape */}
        <rect width="100" height="100" rx="28" fill={variant === 'blue' ? 'url(#logo_grad)' : '#FFFFFF'} />
        
        {/* Abstract Mountain/Path Path */}
        <path 
          d="M30 65L50 35L70 65H30Z" 
          fill={variant === 'blue' ? '#FFFFFF' : '#0EA5E9'} 
          fillOpacity="0.3" 
        />
        <path 
          d="M40 65L50 50L60 65H40Z" 
          fill={variant === 'blue' ? '#FFFFFF' : '#0EA5E9'} 
        />
        
        {/* Compass Point */}
        <circle cx="50" cy="30" r="4" fill={variant === 'blue' ? '#FFFFFF' : '#0EA5E9'} />
        
        <defs>
          <linearGradient id="logo_grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7DD3FC" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;
