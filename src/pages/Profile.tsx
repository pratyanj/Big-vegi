import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import { doc, updateDoc, getDoc, collection, query, where, onSnapshot, deleteField, clearIndexedDbPersistence } from 'firebase/firestore';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, 
  Copy, 
  Check, 
  LogOut, 
  Users, 
  Sun, 
  Moon, 
  Edit2, 
  Save, 
  X, 
  Home,
  RefreshCw,
  AlertTriangle,
  Settings,
  History,
  PieChart
} from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // State variables
  const [flatName, setFlatName] = useState<string>('');
  const [isEditingFlatName, setIsEditingFlatName] = useState(false);
  const [newFlatName, setNewFlatName] = useState('');

  const [displayName, setDisplayName] = useState<string>(user?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  const [roommates, setRoommates] = useState<User[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load flat details
  useEffect(() => {
    if (!user?.flatId) return;

    const flatRef = doc(db, 'flats', user.flatId);
    getDoc(flatRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFlatName(data.name || 'Our Flat Group');
        setNewFlatName(data.name || 'Our Flat Group');
      }
    }).catch((err) => {
      console.error('Error fetching flat details:', err);
    });
  }, [user?.flatId]);

  // Real-time listener for Roommates
  useEffect(() => {
    if (!user?.flatId) {
      setRoommates([]);
      return;
    }

    const q = query(collection(db, 'users'), where('flatId', '==', user.flatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setRoommates(usersData);
    }, (err) => {
      console.error('Error listening to roommates:', err);
    });

    return () => unsubscribe();
  }, [user?.flatId]);

  const handleCopyInviteCode = () => {
    if (!user?.flatId) return;
    navigator.clipboard.writeText(user.flatId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateDoc(doc(db, 'users', user!.id), {
        name: trimmed
      });
      setDisplayName(trimmed);
      setIsEditingName(false);
      setSuccessMsg('Display name updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to update name.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFlatName = async () => {
    const trimmed = newFlatName.trim();
    if (!trimmed || !user?.flatId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateDoc(doc(db, 'flats', user.flatId), {
        name: trimmed
      });
      setFlatName(trimmed);
      setIsEditingFlatName(false);
      setSuccessMsg('Flat group renamed successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to rename flat group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveFlat = async () => {
    if (!user?.flatId) return;
    const confirmLeave = window.confirm(
      'Are you sure you want to leave this flat group? Your roommate balance calculations will no longer include your future purchases.'
    );
    if (!confirmLeave) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const flatRef = doc(db, 'flats', user.flatId);
      const flatSnap = await getDoc(flatRef);
      if (flatSnap.exists()) {
        const currentMembers = flatSnap.data().members || [];
        const updatedMembers = currentMembers.filter((m: string) => m !== user.id);
        await updateDoc(flatRef, { members: updatedMembers });
      }

      // Remove flatId field using deleteField() to satisfy firestore validation rules
      await updateDoc(doc(db, 'users', user.id), {
        flatId: deleteField()
      });

      // Clear local state
      setFlatName('');
      setRoommates([]);
      setSuccessMsg('Successfully left the flat group.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to leave flat group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCache = async () => {
    const confirmClear = window.confirm(
      'Force clearing storage will empty Firestore\'s offline cache and force a complete database resync on reload. Proceed?'
    );
    if (!confirmClear) return;
    try {
      await clearIndexedDbPersistence(db);
      alert('Local persistent cache cleared. Reloading application...');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to clear database cache.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
        <Settings className="text-emerald-600 dark:text-emerald-400" />
        <span>Profile & Settings</span>
      </h2>


      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/50 flex items-center gap-2">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2">
          <Check size={14} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 border-b border-stone-100 dark:border-stone-800 pb-2">
              My Profile
            </h3>
            <div className="flex items-center space-x-4">
              {user?.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt={displayName} 
                  className="w-16 h-16 rounded-full border-2 border-emerald-500 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl border-2 border-emerald-500 shadow-sm">
                  {displayName.charAt(0)}
                </div>
              )}
              <div className="flex-1 space-y-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="px-3 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-sm font-semibold w-full"
                      disabled={isSubmitting}
                      placeholder="Display Name"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={isSubmitting || !newName.trim()}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setNewName(displayName);
                        setIsEditingName(false);
                      }}
                      className="p-1.5 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-lg">{displayName}</h4>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Edit Name"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                <p className="text-sm text-stone-500 dark:text-stone-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-800/80 text-stone-700 dark:text-stone-200 font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>

        {/* System Settings Preferences */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 border-b border-stone-100 dark:border-stone-800 pb-2">
              Preferences
            </h3>
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Theme Settings</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Toggle light/dark appearance</p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors font-semibold text-xs text-stone-700 dark:text-stone-250 shadow-sm"
              >
                {isDark ? (
                  <>
                    <Sun size={14} className="text-amber-500" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon size={14} className="text-blue-500" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Offline Cache Status */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">Offline Local Cache</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Sync database changes in background</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Enabled
              </span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={handleClearCache}
              className="w-full flex items-center justify-center gap-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold py-2 px-4 rounded-xl border border-dashed border-red-200 dark:border-red-900/50 transition-colors text-xs"
            >
              <RefreshCw size={12} />
              <span>Clear Synced Local Cache</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-4 p-5 bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <History size={24} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base">Shopping History</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Review past grocery trips and logs</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/summary')}
          className="flex items-center gap-4 p-5 bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <PieChart size={24} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-base">Financial Summary</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">View veggie price trends and analytics</p>
          </div>
        </button>
      </div>

      {/* Flat group settings card */}
      {user?.flatId ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden">
          <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-50/50 dark:bg-stone-900/40">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Home size={20} />
              </div>
              <div>
                {isEditingFlatName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFlatName}
                      onChange={(e) => setNewFlatName(e.target.value)}
                      className="px-3 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-sm font-semibold"
                      disabled={isSubmitting}
                      placeholder="Flat Group Name"
                    />
                    <button
                      onClick={handleSaveFlatName}
                      disabled={isSubmitting || !newFlatName.trim()}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setNewFlatName(flatName);
                        setIsEditingFlatName(false);
                      }}
                      className="p-1.5 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">{flatName}</h3>
                    <button
                      onClick={() => setIsEditingFlatName(true)}
                      className="p-1 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Rename Flat"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Collaborators shopping directory</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Copy invite code */}
              <button
                onClick={handleCopyInviteCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all shadow-sm"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Code: {user.flatId}</span>
                  </>
                )}
              </button>

              {/* Leave flat */}
              <button
                onClick={handleLeaveFlat}
                className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors border border-red-100 dark:border-red-900/40 shadow-sm"
              >
                Leave Group
              </button>
            </div>
          </div>

          {/* Roommates Directory */}
          <div className="p-6">
            <h4 className="text-xs uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500 mb-4 flex items-center gap-1">
              <Users size={12} />
              <span>Roommates Directory ({roommates.length})</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {roommates.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center space-x-3 p-3 bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800 rounded-xl"
                >
                  {member.photoUrl ? (
                    <img 
                      src={member.photoUrl} 
                      alt={member.name} 
                      className="w-10 h-10 rounded-full shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shadow-sm">
                      {member.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate flex items-center gap-1.5">
                      <span>{member.name}</span>
                      {member.id === user.id && (
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-1 rounded-md font-bold uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 text-center space-y-4">
          <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto text-stone-400 dark:text-stone-500">
            <Home size={32} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">No Flat Group Configured</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm max-w-sm mx-auto mt-1">
              You are currently not associated with a flat group. Set up flat group settings from the sidebar navigation menu or join using an invite code.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
