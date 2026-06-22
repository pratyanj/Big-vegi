import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingTrip } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { PlusCircle, ShoppingBag, TrendingUp, Plus, Trash2, CheckCircle2, Circle, Loader2, ClipboardList } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import { COMMON_VEGETABLES } from '../constants';

interface ShoppingListItem {
  id?: string;
  name: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pcs';
  addedBy: string;
  addedByName: string;
  checked: boolean;
  createdAt: string;
  flatId: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [recentTrips, setRecentTrips] = useState<ShoppingTrip[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  // Checklist State
  const [checklistItems, setChecklistItems] = useState<ShoppingListItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<'kg' | 'g' | 'pcs'>('kg');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user?.flatId) return;

    // Fetch all trips for the flat and process them in-memory to avoid index requirements
    const q = query(collection(db, 'trips'), where('flatId', '==', user.flatId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTrips: ShoppingTrip[] = [];
      snapshot.forEach((doc) => {
        allTrips.push({ id: doc.id, ...doc.data() } as ShoppingTrip);
      });

      // 1. Sort and get recent trips
      const sortedTrips = [...allTrips].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecentTrips(sortedTrips.slice(0, 5));

      // 2. Compute monthly total
      const monthStartStr = startOfMonth(new Date()).toISOString();
      const monthEndStr = endOfMonth(new Date()).toISOString();
      let total = 0;
      allTrips.forEach((trip) => {
        if (trip.date >= monthStartStr && trip.date <= monthEndStr) {
          total += trip.totalCost || 0;
        }
      });
      setMonthlyTotal(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
    });

    return () => unsubscribe();
  }, [user?.flatId]);

  // Load checklist items
  useEffect(() => {
    if (!user?.flatId) {
      setChecklistItems([]);
      setChecklistLoading(false);
      return;
    }

    const q = query(collection(db, 'shopping_list'), where('flatId', '==', user.flatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsList: ShoppingListItem[] = [];
      snapshot.forEach((doc) => {
        itemsList.push({ id: doc.id, ...doc.data() } as ShoppingListItem);
      });
      
      // Sort: unchecked first, then newest first
      itemsList.sort((a, b) => {
        if (a.checked !== b.checked) {
          return a.checked ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setChecklistItems(itemsList);
      setChecklistLoading(false);
    }, (error) => {
      setChecklistLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'shopping_list');
    });

    return () => unsubscribe();
  }, [user?.flatId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.flatId) return;
    if (!name.trim()) return;

    setIsAdding(true);
    try {
      const newItem = {
        name: name.trim(),
        quantity: Number(quantity) || 1,
        unit,
        addedBy: user.id,
        addedByName: user.name,
        checked: false,
        createdAt: new Date().toISOString(),
        flatId: user.flatId
      };

      await addDoc(collection(db, 'shopping_list'), newItem);
      setName('');
      setQuantity(1);
      setUnit('kg');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shopping_list');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleChecked = async (item: ShoppingListItem) => {
    if (!item.id) return;
    try {
      await updateDoc(doc(db, 'shopping_list', item.id), {
        checked: !item.checked
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shopping_list/${item.id}`);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'shopping_list', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shopping_list/${itemId}`);
    }
  };

  const activeCount = checklistItems.filter(i => !i.checked).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Dashboard</h2>
        <Link 
          to="/new-trip" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors text-sm font-semibold shadow-sm"
        >
          <PlusCircle size={18} />
          <span>New Trip</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Stats and Trips List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-3 text-stone-500 dark:text-stone-400 mb-2">
                <TrendingUp size={20} className="text-emerald-500" />
                <h3 className="font-semibold text-sm">This Month's Total</h3>
              </div>
              <p className="text-4xl font-bold text-stone-900 dark:text-stone-50">
                ₹{monthlyTotal.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-3 text-stone-500 dark:text-stone-400 mb-2">
                <ShoppingBag size={20} className="text-blue-500" />
                <h3 className="font-semibold text-sm">Recent Trips</h3>
              </div>
              <p className="text-4xl font-bold text-stone-900 dark:text-stone-50">
                {recentTrips.length}
              </p>
            </div>
          </div>

          {/* Recent Trips Card */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden">
            <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/40">
              <h3 className="font-bold text-stone-800 dark:text-stone-100 text-base">Recent Shopping Trips</h3>
              <Link to="/profile" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-semibold">
                View All in Settings
              </Link>
            </div>
            
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {recentTrips.length === 0 ? (
                <div className="p-8 text-center text-stone-500 dark:text-stone-400 text-sm">
                  No recent trips. Go buy some veggies!
                </div>
              ) : (
                recentTrips.map((trip) => (
                  <div key={trip.id} className="p-4 sm:p-5 flex justify-between items-center hover:bg-stone-50/60 dark:hover:bg-stone-800/20 transition-colors">
                    <div>
                      <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{trip.buyerName}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {format(new Date(trip.date), 'MMM d, yyyy • h:mm a')}
                      </p>
                      <p className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5 rounded-md font-medium mt-1.5 inline-block">
                        {trip.items.length} {trip.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base text-stone-900 dark:text-stone-50">₹{trip.totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Shared Checklist Widget */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden flex flex-col h-full min-h-[450px]">
            {/* Header */}
            <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-stone-800 dark:text-stone-100 text-base">Checklist</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                {activeCount} active
              </span>
            </div>

            {/* Quick Add Form */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/20 dark:bg-stone-900/10">
              <form onSubmit={handleAddItem} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="dash-veg-suggestions"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Veggie name..."
                    className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-sm"
                    disabled={isAdding}
                    required
                  />
                  <datalist id="dash-veg-suggestions">
                    {COMMON_VEGETABLES.map((veg) => (
                      <option key={veg} value={veg} />
                    ))}
                  </datalist>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-16 px-2 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-sm text-center"
                    disabled={isAdding}
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-20 px-2 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-sm"
                    disabled={isAdding}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isAdding || !name.trim()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-xl transition-colors flex items-center justify-center space-x-1 disabled:opacity-50 text-sm shadow-xs"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto max-h-[380px] p-4 space-y-2">
              {checklistLoading ? (
                <div className="flex justify-center items-center py-12 text-stone-500 dark:text-stone-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : checklistItems.length === 0 ? (
                <div className="text-center py-16 text-stone-400 dark:text-stone-500 text-sm border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
                  Checklist is empty.
                </div>
              ) : (
                checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors group"
                  >
                    <button
                      onClick={() => toggleChecked(item)}
                      className="flex items-center space-x-2.5 text-left flex-1 min-w-0"
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-stone-300 dark:text-stone-550 hover:text-emerald-600 dark:hover:text-emerald-500 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <p className={`font-semibold text-sm ${item.checked ? 'text-stone-400 line-through dark:text-stone-500' : 'text-stone-800 dark:text-stone-100'}`}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400">
                          {item.quantity} {item.unit} • by {item.addedByName}
                        </p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteItem(item.id!)}
                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
