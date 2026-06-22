import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewTrip from './pages/NewTrip';
import History from './pages/History';
import Summary from './pages/Summary';
import ShoppingList from './pages/ShoppingList';
import Profile from './pages/Profile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from '@capacitor/splash-screen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}

const Splash: React.FC<{ fadeOut: boolean }> = ({ fadeOut }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'linear-gradient(145deg, #0c1a14 0%, #0d1f17 40%, #0f2a1c 70%, #1a3a28 100%)',
      }}
    >
      {/* Ambient radial glow blobs */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 70%)' }}
      />

      {/* Centre column — everything is statically stacked, no absolute children */}
      <div className="flex flex-col items-center gap-8">

        {/* Logo Stack */}
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          {/* Outer pulsing ring */}
          <div
            className="absolute rounded-full border border-emerald-500/20"
            style={{ width: 120, height: 120, animation: 'splashPulse 2.4s ease-in-out infinite' }}
          />
          {/* Mid ring */}
          <div
            className="absolute rounded-full border border-emerald-500/10"
            style={{ width: 148, height: 148, animation: 'splashPulse 2.4s ease-in-out 0.4s infinite' }}
          />
          {/* Spinning arc */}
          <div
            className="absolute rounded-full border-2 border-transparent"
            style={{
              width: 120,
              height: 120,
              borderTopColor: '#10b981',
              borderRightColor: 'rgba(16,185,129,0.3)',
              animation: 'spin 1.2s linear infinite',
            }}
          />

          {/* White logo card */}
          <div
            className="relative flex items-center justify-center bg-white rounded-3xl shadow-2xl"
            style={{ width: 88, height: 88 }}
          >
            {/* Subtle inner gradient overlay */}
            <div
              className="absolute inset-0 rounded-3xl"
              style={{ background: 'linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(240,253,244,0.9) 100%)' }}
            />
            {/* Veggie basket SVG icon */}
            <svg
              className="relative z-10"
              width="52"
              height="52"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Basket body */}
              <path
                d="M8 20h32l-3 18H11L8 20z"
                fill="#d1fae5"
                stroke="#059669"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Basket weave lines */}
              <line x1="16" y1="20" x2="14" y2="38" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.4" />
              <line x1="24" y1="20" x2="24" y2="38" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.4" />
              <line x1="32" y1="20" x2="34" y2="38" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.4" />
              {/* Handle arc */}
              <path
                d="M16 20 C16 10, 32 10, 32 20"
                stroke="#059669"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Tomato */}
              <circle cx="19" cy="17" r="4" fill="#ef4444" />
              <path d="M19 13 C19 11, 21 10, 20 12" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              {/* Leafy green */}
              <ellipse cx="27" cy="16" rx="5" ry="3" fill="#22c55e" transform="rotate(-20 27 16)" />
              <line x1="27" y1="19" x2="27" y2="22" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Brand text */}
        <div className="flex flex-col items-center gap-2" style={{ animation: 'splashFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-white">Big</span>
            <span
              className="text-3xl font-extrabold tracking-tight"
              style={{ color: '#34d399', textShadow: '0 0 24px rgba(52,211,153,0.45)' }}
            >
              Vegi
            </span>
          </div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-emerald-400/70">
            Groceries · Shared
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-2" style={{ animation: 'splashFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.6s both' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              style={{ animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

function AppContent() {
  const { loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [fadeActive, setFadeActive] = useState(false);

  useEffect(() => {
    // Dismiss the native device splash screen immediately to transition to our animated web splash
    SplashScreen.hide().catch((err) => {
      console.warn('Capacitor SplashScreen API not available:', err);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      // Start fade out transition after a brief moment to showcase the beautiful animation
      const fadeTimeout = setTimeout(() => {
        setFadeActive(true);
      }, 800);
      
      const removeTimeout = setTimeout(() => {
        setShowSplash(false);
      }, 1500);

      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(removeTimeout);
      };
    }
  }, [loading]);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="shopping-list" element={<ShoppingList />} />
            <Route path="new-trip" element={<NewTrip />} />
            <Route path="history" element={<History />} />
            <Route path="summary" element={<Summary />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>

      {showSplash && <Splash fadeOut={fadeActive} />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
