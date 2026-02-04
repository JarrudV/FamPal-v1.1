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
      className="fixed bottom-6 inset-x-0 mx-auto w-16 h-16 bg-sky-500 rounded-full shadow-xl shadow-sky-200 flex items-center justify-center text-white text-2xl z-40 active:scale-95 transition-transform"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      🏠
    </button>
  );
};

export default HomeFab;
