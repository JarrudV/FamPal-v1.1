
import React, { useState } from 'react';
import Logo from './Logo';

type LoginProps = {
  onLogin: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string, displayName: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<boolean | undefined>;
  onGuestLogin: () => void;
  error: string | null;
};

type AuthMode = 'main' | 'email-signin' | 'email-signup' | 'forgot-password';

const Login: React.FC<LoginProps> = ({ onLogin, onEmailSignIn, onEmailSignUp, onForgotPassword, onGuestLogin, error }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    onLogin().finally(() => setIsLoggingIn(false));
  };

  const handleEmailSignIn = async () => {
    if (!email.trim()) { setLocalError('Please enter your email.'); return; }
    if (!password) { setLocalError('Please enter your password.'); return; }
    setLocalError(null);
    setIsLoggingIn(true);
    await onEmailSignIn(email.trim(), password);
    setIsLoggingIn(false);
  };

  const handleEmailSignUp = async () => {
    if (!displayName.trim()) { setLocalError('Please enter your name.'); return; }
    if (!email.trim()) { setLocalError('Please enter your email.'); return; }
    if (!password) { setLocalError('Please enter a password.'); return; }
    if (password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
    setLocalError(null);
    setIsLoggingIn(true);
    await onEmailSignUp(email.trim(), password, displayName.trim());
    setIsLoggingIn(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setLocalError('Please enter your email address.'); return; }
    setLocalError(null);
    setIsLoggingIn(true);
    const success = await onForgotPassword(email.trim());
    setIsLoggingIn(false);
    if (success) setResetSent(true);
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setLocalError(null);
    setResetSent(false);
    setShowPassword(false);
  };

  const clearErrors = () => { if (localError) setLocalError(null); };
  const displayError = localError || error;

  const inputClass = "w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/40 h-14 rounded-2xl px-4 border border-white/15 focus:border-purple-400/60 focus:outline-none transition-colors text-sm";
  const primaryBtnClass = "w-full bg-gradient-to-r from-[#A855F7] via-[#D946EF] to-[#EC4899] text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-purple-500/30 active:scale-95 transition-all text-sm disabled:opacity-50";
  const secondaryBtnClass = "w-full bg-white/10 backdrop-blur-sm text-white h-14 rounded-2xl font-bold border border-white/15 active:scale-95 transition-all text-sm hover:bg-white/15";

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#0F0A2A] via-[#1A1145] to-[#2D1B69] flex flex-col items-center justify-center px-8 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-72 h-72 rounded-full bg-purple-600/20 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 rounded-full bg-blue-600/15 blur-3xl"></div>
      <div className="absolute top-[30%] left-[60%] w-48 h-48 rounded-full bg-pink-500/10 blur-3xl"></div>

      <div className="relative mb-6 animate-bounce-slow">
        <Logo size={80} variant="dark" className="shadow-2xl rounded-[28px]" />
      </div>

      <h1 className="text-3xl font-black text-center mb-2 tracking-tighter">FamPals</h1>
      <p className="text-white/90 text-center mb-8 max-w-xs font-semibold leading-relaxed text-sm">
        Verified kid & pet-friendly spots, right in your pocket.
      </p>

      <div className="w-full max-w-xs space-y-3 relative z-10">
        {displayError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative text-xs" role="alert">
            <span>{displayError}</span>
          </div>
        )}

        {authMode === 'main' && (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className={primaryBtnClass}
            >
              {isLoggingIn ? 'Signing in...' : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
                  Sign in with Google
                </>
              )}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/15"></div>
              <span className="text-white/40 text-xs font-medium">or</span>
              <div className="flex-1 h-px bg-white/15"></div>
            </div>

            <button
              onClick={() => switchMode('email-signin')}
              className={secondaryBtnClass}
            >
              <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
              Sign in with Email
            </button>

            <button
              onClick={() => switchMode('email-signup')}
              className="w-full text-white/70 text-xs font-medium py-2 hover:text-white transition-colors"
            >
              Don't have an account? <span className="underline font-bold text-white/90">Create one</span>
            </button>

            <button
              onClick={onGuestLogin}
              className="w-full text-white/50 text-[11px] font-medium py-1 hover:text-white/70 transition-colors"
            >
              Continue as Guest
            </button>
          </>
        )}

        {authMode === 'email-signin' && (
          <>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(e.target.value); clearErrors(); }}
              className={inputClass}
              autoComplete="email"
              autoFocus
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearErrors(); }}
                className={inputClass}
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && handleEmailSignIn()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>

            <button
              onClick={handleEmailSignIn}
              disabled={isLoggingIn}
              className={primaryBtnClass}
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex justify-between items-center">
              <button
                onClick={() => switchMode('forgot-password')}
                className="text-white/70 text-xs hover:text-white transition-colors"
              >
                Forgot password?
              </button>
              <button
                onClick={() => switchMode('email-signup')}
                className="text-white/70 text-xs hover:text-white transition-colors"
              >
                Create account
              </button>
            </div>

            <button
              onClick={() => switchMode('main')}
              className="w-full text-white/60 text-xs font-medium py-2 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to login options
            </button>
          </>
        )}

        {authMode === 'email-signup' && (
          <>
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); clearErrors(); }}
              className={inputClass}
              autoComplete="name"
              autoFocus
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(e.target.value); clearErrors(); }}
              className={inputClass}
              autoComplete="email"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={e => { setPassword(e.target.value); clearErrors(); }}
                className={inputClass}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); clearErrors(); }}
              className={inputClass}
              autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleEmailSignUp()}
            />

            <button
              onClick={handleEmailSignUp}
              disabled={isLoggingIn}
              className={primaryBtnClass}
            >
              {isLoggingIn ? 'Creating account...' : 'Create Account'}
            </button>

            <button
              onClick={() => switchMode('email-signin')}
              className="w-full text-white/70 text-xs font-medium py-2 hover:text-white transition-colors"
            >
              Already have an account? <span className="underline font-bold text-white/90">Sign in</span>
            </button>

            <button
              onClick={() => switchMode('main')}
              className="w-full text-white/60 text-xs font-medium py-1 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to login options
            </button>
          </>
        )}

        {authMode === 'forgot-password' && (
          <>
            {resetSent ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-4 rounded-xl text-sm text-center">
                <p className="font-bold mb-1">Reset email sent!</p>
                <p className="text-xs">Check your inbox for a password reset link.</p>
              </div>
            ) : (
              <>
                <p className="text-white/80 text-sm text-center mb-1">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearErrors(); }}
                  className={inputClass}
                  autoComplete="email"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                />
                <button
                  onClick={handleForgotPassword}
                  disabled={isLoggingIn}
                  className={primaryBtnClass}
                >
                  {isLoggingIn ? 'Sending...' : 'Send Reset Link'}
                </button>
              </>
            )}

            <button
              onClick={() => switchMode('email-signin')}
              className="w-full text-white/60 text-xs font-medium py-2 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to sign in
            </button>
          </>
        )}
      </div>

      <p className="absolute bottom-10 text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">
        Verified Kid & Pet Spots
      </p>
    </div>
  );
};

export default Login;
