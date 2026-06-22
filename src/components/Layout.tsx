import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Plus, PlusCircle, History, PieChart, LogOut, ClipboardList, Copy, Users, Loader2, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [flatName, setFlatName] = useState('');
  const [flatCodeInput, setFlatCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flatError, setFlatError] = useState<string | null>(null);

  const handleJoinFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = flatCodeInput.trim().toUpperCase();
    if (!code) return;
    setIsSubmitting(true);
    setFlatError(null);
    try {
      const flatRef = doc(db, 'flats', code);
      const flatSnap = await getDoc(flatRef);
      if (!flatSnap.exists()) {
        setFlatError('Flat code not found. Please verify the code and try again.');
        setIsSubmitting(false);
        return;
      }

      const flatData = flatSnap.data();
      const currentMembers = flatData.members || [];
      if (!currentMembers.includes(user!.id)) {
        await updateDoc(flatRef, {
          members: arrayUnion(user!.id)
        });
      }

      await updateDoc(doc(db, 'users', user!.id), {
        flatId: code
      });
    } catch (err: any) {
      console.error(err);
      setFlatError(err?.message || 'Failed to join flat group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = flatName.trim();
    if (!name) return;
    setIsSubmitting(true);
    setFlatError(null);
    try {
      const code = 'FLAT-' + Math.floor(1000 + Math.random() * 9000);
      const flatRef = doc(db, 'flats', code);

      await setDoc(flatRef, {
        id: code,
        name: name,
        members: [user!.id],
        createdBy: user!.id,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'users', user!.id), {
        flatId: code
      });
    } catch (err: any) {
      console.error(err);
      setFlatError(err?.message || 'Failed to create flat group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/new-trip', label: 'New Trip', icon: PlusCircle },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  if (!user) {
    return null; // Should be handled by protected route
  }

  if (!user.flatId) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-stone-900 rounded-2xl shadow-xl p-8 border border-stone-100 dark:border-stone-800">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
            <Users size={32} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50 text-center mb-2">Setup Flat Group</h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm text-center mb-6">
            To start tracking groceries with roommates, create a new flat group or join an existing one using an invitation code.
          </p>

          {flatError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/50">
              {flatError}
            </div>
          )}

          {/* Join Existing Flat */}
          <form onSubmit={handleJoinFlat} className="space-y-3 mb-6 pb-6 border-b border-stone-100 dark:border-stone-800">
            <h3 className="font-semibold text-stone-700 dark:text-stone-305 text-xs uppercase tracking-wider text-left">Join Existing Flat</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={flatCodeInput}
                onChange={(e) => setFlatCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. FLAT-1234"
                className="flex-1 px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-sm"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !flatCodeInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
              </button>
            </div>
          </form>

          {/* Create New Flat */}
          <form onSubmit={handleCreateFlat} className="space-y-3">
            <h3 className="font-semibold text-stone-700 dark:text-stone-305 text-xs uppercase tracking-wider text-left">Create New Flat Group</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={flatName}
                onChange={(e) => setFlatName(e.target.value)}
                placeholder="e.g. Apartment 4B"
                className="flex-1 px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-sm"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={isSubmitting || !flatName.trim()}
                className="bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white font-semibold px-5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center border border-transparent dark:border-stone-700"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </form>

          {/* Logout Button */}
          <div className="mt-8 pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-center">
            <button
              onClick={logout}
              className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 text-xs flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col md:flex-row">


      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 min-h-screen sticky top-0">
        <div className="p-6 border-b border-stone-200 dark:border-stone-800">
          <h1 className="text-2xl font-bold text-emerald-600">Big Vegi</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors',
                  isActive 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium' 
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                )}
              >
                <Icon size={20} className={isActive ? 'text-emerald-600 dark:text-emerald-450' : 'text-stone-400 dark:text-stone-500'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center space-x-3 mb-4">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{user.name}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
              {user.flatId && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.flatId || '');
                    alert('Flat invitation code copied to clipboard!');
                  }}
                  className="mt-1 flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/40 max-w-full"
                  title="Click to copy flat code"
                >
                  <span className="truncate">Code: {user.flatId}</span>
                  <Copy size={10} className="flex-shrink-0" />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-[calc(1rem+var(--sat))] md:pt-8 pb-24 md:pb-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 max-w-md mx-auto h-16 z-20">
        {/* Unified Shape Background with Drop Shadow */}
        <div className="absolute inset-0 flex pointer-events-none filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
          {/* Left Part */}
          <div className="flex-1 bg-white dark:bg-stone-900 rounded-l-[24px] border-y border-l border-stone-200 dark:border-stone-800" />
          
          {/* Center Cutout Part */}
          <div className="relative w-24 h-16 flex-shrink-0">
            <svg viewBox="0 0 96 64" className="w-full h-full fill-white dark:fill-stone-900">
              <path d="M 0,0 L 16,0 C 24,0 28,36 48,36 C 68,36 72,0 80,0 L 96,0 L 96,64 L 0,64 Z" />
              {/* Top border path */}
              <path 
                d="M 0,0 L 16,0 C 24,0 28,36 48,36 C 68,36 72,0 80,0 L 96,0" 
                fill="none" 
                className="stroke-stone-200 dark:stroke-stone-800" 
                strokeWidth="1" 
              />
              {/* Bottom border path */}
              <path 
                d="M 0,64 L 96,64" 
                fill="none" 
                className="stroke-stone-200 dark:stroke-stone-800" 
                strokeWidth="1" 
              />
            </svg>
          </div>
          
          {/* Right Part */}
          <div className="flex-1 bg-white dark:bg-stone-900 rounded-r-[24px] border-y border-r border-stone-200 dark:border-stone-800" />
        </div>

        {/* Navigation Links Content */}
        <div className="relative z-10 w-full h-full flex">
          {/* Dashboard Link (Left Third) */}
          <Link
            to="/"
            className={clsx(
              'flex-1 flex flex-col items-center justify-center h-full rounded-l-[24px] transition-colors',
              location.pathname === '/' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400'
            )}
          >
            <Home size={22} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Dashboard</span>
          </Link>

          {/* Center Button Area (Middle Third) */}
          <div className="relative w-24 h-full flex items-center justify-center">
            <Link
              to="/new-trip"
              className={clsx(
                'absolute -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 duration-200 border-4 border-stone-50 dark:border-stone-950',
                location.pathname === '/new-trip'
                  ? 'bg-emerald-600 text-white shadow-emerald-250 dark:shadow-emerald-950/50'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-stone-200 dark:shadow-none'
              )}
            >
              <Plus size={28} strokeWidth={2.5} />
            </Link>
          </div>

          {/* Profile Link (Right Third) */}
          <Link
            to="/profile"
            className={clsx(
              'flex-1 flex flex-col items-center justify-center h-full rounded-r-[24px] transition-colors',
              location.pathname === '/profile' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400'
            )}
          >
            <UserIcon size={22} className="mb-0.5" />
            <span className="text-[10px] font-semibold">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
