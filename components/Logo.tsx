import React from 'react';

const Logo: React.FC<{ className?: string; size?: number; variant?: 'white' | 'blue' }> = ({ className = '', size = 40, variant = 'blue' }) => {
  const bgColor = variant === 'white' ? '#FFFFFF' : '#3B82F6';
  const primaryBlue = variant === 'white' ? '#3B82F6' : '#FFFFFF';
  const lightBlue = variant === 'white' ? '#60A5FA' : 'rgba(255,255,255,0.7)';
  const warmOrange = '#F97316';

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="100" height="100" rx="24" fill={bgColor} />
        
        <circle cx="35" cy="55" r="20" fill={primaryBlue} />
        <circle cx="65" cy="55" r="20" fill={lightBlue} />
        <circle cx="50" cy="38" r="14" fill={warmOrange} />
      </svg>
    </div>
  );
};

export default Logo;
