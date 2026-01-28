
import React from 'react';
import Logo from './Logo';

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#7DD3FC] via-[#0EA5E9] to-[#0369A1] flex flex-col items-center justify-center px-8 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-white/20 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-indigo-900/20 blur-3xl"></div>

      <div className="relative mb-8 animate-bounce-slow">
        <Logo size={100} variant="white" className="shadow-2xl rounded-[32px]" />
      </div>

      <h1 className="text-4xl font-black text-center mb-4 tracking-tighter">FamPals</h1>
      <p className="text-white/90 text-center mb-12 max-w-xs font-semibold leading-relaxed">
        Curated family adventures, right in your pocket.
      </p>

      <div className="w-full max-w-xs space-y-4 relative z-10">
        <button 
          onClick={onLogin}
          className="w-full bg-white text-[#0369A1] h-16 rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
          Sign in with Google
        </button>
        <button 
          onClick={onLogin}
          className="w-full bg-white/10 backdrop-blur-sm text-white h-16 rounded-3xl font-black border border-white/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
        >
          Guest Mode
        </button>
      </div>

      <p className="absolute bottom-10 text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">
        Verified Kid & Pet Spots
      </p>
    </div>
  );
};

export default Login;
