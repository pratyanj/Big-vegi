import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag } from 'lucide-react';

export default function Login() {
  const { login, loginAsDemo, user, loading } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    setErrorMsg(null);
    setIsLoggingIn(true);
    try {
      await login();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || JSON.stringify(err) || 'Authentication failed. Please verify your Google setup.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg(null);
    setIsDemoLoggingIn(true);
    try {
      await loginAsDemo();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || JSON.stringify(err) || 'Demo access failed.');
    } finally {
      setIsDemoLoggingIn(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-2xl shadow-xl p-8 text-center border border-stone-100 dark:border-stone-800">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-50 mb-2">Big Vegi</h1>
        <p className="text-stone-500 dark:text-stone-400 mb-6">
          Track vegetable and fruit purchases, split costs, and view monthly summaries with your flatmates.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm rounded-xl text-left border border-red-100 dark:border-red-900/50 break-words">
            <span className="font-semibold">Sign-in Error:</span>
            <p className="mt-1 font-mono text-xs">{errorMsg}</p>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Note: Android Google Sign-In requires your debug SHA-1 key to be registered in Firebase Console.
            </p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoggingIn || isDemoLoggingIn}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

        <button
          onClick={handleDemoLogin}
          disabled={isLoggingIn || isDemoLoggingIn}
          className="w-full bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2 mt-3 shadow-xs"
        >
          <span>{isDemoLoggingIn ? 'Entering...' : 'Try Demo Mode'}</span>
        </button>
      </div>
    </div>
  );
}
