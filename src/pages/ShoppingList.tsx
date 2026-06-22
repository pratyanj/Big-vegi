import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, Plus, Trash2, CheckCircle2, Circle, ShoppingCart, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { COMMON_VEGETABLES } from '../constants';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface ShoppingListItem {
  id?: string;
  name: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pcs';
  addedBy: string;
  addedByName: string;
  checked: boolean;
  createdAt: string;
}

export default function ShoppingList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<'kg' | 'g' | 'pcs'>('kg');
  const [isAdding, setIsAdding] = useState(false);

  // Real-time synchronization with Firestore
  useEffect(() => {
    if (!user?.flatId) return;

    // Filter by flatId and sort in-memory to bypass index requirements
    const q = query(collection(db, 'shopping_list'), where('flatId', '==', user.flatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsList: ShoppingListItem[] = [];
      snapshot.forEach((doc) => {
        itemsList.push({ id: doc.id, ...doc.data() } as ShoppingListItem);
      });
      
      // In-memory sort by createdAt descending
      itemsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setItems(itemsList);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'shopping_list');
    });

    return () => unsubscribe();
  }, [user?.flatId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.flatId) return;
    if (!name.trim()) {
      alert('Please enter an item name');
      return;
    }

    setIsAdding(true);
    try {
      const newItem: any = {
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
      
      // Reset form
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

  const handleCheckout = () => {
    const checkedItems = items.filter(item => item.checked);
    if (checkedItems.length === 0) return;
    
    // Pass checked items to New Trip page via router state
    navigate('/new-trip', { 
      state: { 
        checklistItems: checkedItems 
      } 
    });
  };

  const activeItems = items.filter(item => !item.checked);
  const checkedItems = items.filter(item => item.checked);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center space-x-3">
        <ClipboardList className="w-8 h-8 text-emerald-600" />
        <h2 className="text-2xl font-bold text-stone-800">Shared Checklist</h2>
      </div>

      {/* Add Item Form Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
        <form onSubmit={handleAddItem} className="space-y-4">
          <h3 className="font-semibold text-stone-700 text-sm uppercase tracking-wider">Add Item to List</h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Item Name */}
            <div className="flex-1 relative">
              <input
                type="text"
                list="veg-suggestions"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tomato (Tameta)"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                disabled={isAdding}
              />
              <datalist id="veg-suggestions">
                {COMMON_VEGETABLES.map((veg) => (
                  <option key={veg} value={veg} />
                ))}
              </datalist>
            </div>

            {/* Quantity */}
            <div className="w-full sm:w-28 flex gap-2">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="Qty"
                className="w-20 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 text-center"
                disabled={isAdding}
              />
              {/* Unit */}
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                disabled={isAdding}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="pcs">pcs</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAdding}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Items Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-stone-800 text-lg flex items-center justify-between">
          <span>Items to Buy</span>
          <span className="text-sm font-normal text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
            {activeItems.length}
          </span>
        </h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-10 text-stone-500 bg-white border border-stone-100 rounded-xl shadow-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
            <span>Loading checklist items...</span>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="bg-stone-50 text-center p-8 rounded-2xl border border-dashed border-stone-200 text-stone-500">
            No items to buy! Add something above.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {activeItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-xl shadow-xs hover:border-emerald-200 transition-colors group"
                >
                  <div 
                    onClick={() => toggleChecked(item)}
                    className="flex items-center space-x-3 cursor-pointer flex-1"
                  >
                    <Circle className="w-6 h-6 text-stone-300 hover:text-emerald-600 transition-colors flex-shrink-0" />
                    <div>
                      <p className="font-medium text-stone-900">{item.name}</p>
                      <p className="text-xs text-stone-500">
                        {item.quantity} {item.unit} • Added by {item.addedByName}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id!)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Checked Items Section */}
      {checkedItems.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-stone-200/60">
          <h3 className="font-bold text-stone-600 text-lg flex items-center justify-between">
            <span>In Cart / Checked</span>
            <span className="text-sm font-normal text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
              {checkedItems.length}
            </span>
          </h3>

          <div className="space-y-2">
            {checkedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-stone-50/70 border border-stone-100 rounded-xl"
              >
                <div 
                  onClick={() => toggleChecked(item)}
                  className="flex items-center space-x-3 cursor-pointer flex-1"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-stone-500 line-through">{item.name}</p>
                    <p className="text-xs text-stone-400">
                      {item.quantity} {item.unit} • Checked
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id!)}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Checkout Button */}
      {checkedItems.length > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-0 right-0 p-4 max-w-lg mx-auto z-10">
          <button
            onClick={handleCheckout}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-transform transform active:scale-95 duration-100"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Checkout & Log Trip ({checkedItems.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
