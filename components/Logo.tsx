import React from 'react';

const Logo: React.FC<{ className?: string; size?: number; variant?: 'white' | 'blue' }> = ({ className = '', size = 40 }) => {
  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <img 
        src="/favicon.png" 
        alt="FamPals" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;
