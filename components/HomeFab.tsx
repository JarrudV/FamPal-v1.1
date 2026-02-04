import React from 'react';

interface HomeFabProps {
  visible: boolean;
  onClick: () => void;
}

const HomeFab: React.FC<HomeFabProps> = ({ visible, onClick }) => {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      aria-label="Go home"
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 sm:bottom-8 w-16 h-16 bg-sky-500 rounded-full shadow-xl shadow-sky-200 flex items-center justify-center text-white text-2xl z-40 active:scale-95 transition-transform safe-area-inset-bottom"
    >
      🏠
    </button>
  );
};

export default HomeFab;
