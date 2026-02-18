import React from 'react';

const Logo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 40 }) => {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src="/favicon.png"
        alt="FamPals"
        width={size}
        height={size}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;
