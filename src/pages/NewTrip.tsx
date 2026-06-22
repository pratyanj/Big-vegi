import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingItem } from '../types';
import { Camera, Upload, Plus, Trash2, Save, Loader2, Edit2, Check, X } from 'lucide-react';
import { detectGroceries } from '../services/geminiService';
import { collection, addDoc, doc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { COMMON_VEGETABLES } from '../constants';

interface TripItemState extends ShoppingItem {
  id: string;
  checklistId?: string;
}

interface NewTripItemProps {
  item: ShoppingItem; 
  index: number; 
  updateItem: (index: number, field: keyof ShoppingItem, value: any) => void; 
  removeItem: (index: number) => void; 
}

const NewTripItem: React.FC<NewTripItemProps> = ({ 
  item, 
  index, 
  updateItem, 
  removeItem 
}) => {
  const [isEditing, setIsEditing] = useState(item.name === '');

  if (isEditing) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
        <div className="flex-1">
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Item Name</label>
          <input
            type="text"
            list="vegetable-list"
            value={item.name}
            onChange={(e) => updateItem(index, 'name', e.target.value)}
            placeholder="e.g. Tomatoes"
            className="w-full px-3 py-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <datalist id="vegetable-list">
            {COMMON_VEGETABLES.map((veg) => (
              <option key={veg} value={veg} />
            ))}
          </datalist>
        </div>
        <div className="w-full sm:w-24">
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Qty</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={item.quantity}
            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-full sm:w-24">
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Unit</label>
          <select
            value={item.unit}
            onChange={(e) => updateItem(index, 'unit', e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="pcs">pcs</option>
          </select>
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Price (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.price}
            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <button
            onClick={() => {
              if (item.name.trim() === '') {
                alert('Item name cannot be empty');
                return;
              }
              setIsEditing(false);
            }}
            className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
            title="Done"
          >
            <Check size={20} />
          </button>
          <button
            onClick={() => removeItem(index)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Remove"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-stone-200 dark:border-stone-800/80 group">
      <div>
        <p className="font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{item.quantity} {item.unit}</p>
      </div>
      <div className="flex items-center gap-4">
        <p className="font-semibold text-stone-700 dark:text-stone-300">₹{Number(item.price).toFixed(2)}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
            title="Edit Item"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => removeItem(index)}
            className="p-2 text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Remove Item"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TripItemState[]>(() => {
    const saved = localStorage.getItem('draftTripItems');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<ShoppingItem>({ name: '', quantity: 1, unit: 'kg', price: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('draftTripItems', JSON.stringify(items));
  }, [items]);

  const location = useLocation();
  const [checklistIdsToDelete, setChecklistIdsToDelete] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

  // Load checklist items from Firestore directly within the New Trip page
  useEffect(() => {
    if (!user?.flatId) return;
    const q = query(collection(db, 'shopping_list'), where('flatId', '==', user.flatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.checked) {
          list.push({ id: doc.id, ...data });
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setChecklistItems(list);
    }, (error) => {
      console.error('Error loading checklist in NewTrip:', error);
    });
    return () => unsubscribe();
  }, [user?.flatId]);

  useEffect(() => {
    if (location.state?.checklistItems) {
      const passedItems = location.state.checklistItems;
      const parsedItems = passedItems.map((item: any) => ({
        id: crypto.randomUUID(),
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: 0,
        checklistId: item.id
      }));
      setItems((prev) => [...parsedItems, ...prev]);

      const ids = passedItems.map((item: any) => item.id).filter(Boolean);
      setChecklistIdsToDelete((prev) => [...prev, ...ids]);

      // Clear the router state history to prevent re-adding on reload
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDetecting(true);
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const msgBuffer = new TextEncoder().encode(base64String);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const imageHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const cachedResult = localStorage.getItem(`img_cache_${imageHash}`);
      let detectedItems;

      if (cachedResult) {
        detectedItems = JSON.parse(cachedResult);
      } else {
        detectedItems = await detectGroceries(base64String, file.type);
        try {
          localStorage.setItem(`img_cache_${imageHash}`, JSON.stringify(detectedItems));
        } catch (e) {
        }
      }

      const itemsWithIds = detectedItems.map((item: any) => ({ ...item, id: crypto.randomUUID() }));
      setItems((prev) => [...itemsWithIds, ...prev]);
    } catch (error) {
      console.error('Detection failed', error);
      alert('Failed to detect items. Please try again or add manually.');
    } finally {
      setIsDetecting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addItem = () => {
    setIsAddModalOpen(true);
  };

  const updateItem = (index: number, field: keyof ShoppingItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const itemToRemove = items[index];
    if (itemToRemove.checklistId) {
      setChecklistIdsToDelete((prev) => prev.filter((id) => id !== itemToRemove.checklistId));
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCost = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const saveTrip = async () => {
    if (!user) return;
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const isValid = items.every(item => item.name.trim() !== '' && item.quantity > 0 && item.price >= 0);
    if (!isValid) {
      alert('Please fill in all item details correctly');
      return;
    }

    setIsSaving(true);
    try {
      const tripData = {
        date: new Date().toISOString(),
        totalCost,
        buyerId: user.id,
        buyerName: user.name,
        flatId: user.flatId,
        items: items.map(item => ({
          name: item.name,
          quantity: Number(item.quantity),
          unit: item.unit,
          price: Number(item.price)
        }))
      };

      await addDoc(collection(db, 'trips'), tripData);

      // Clean up checked items from shopping list collection
      if (checklistIdsToDelete.length > 0) {
        const deletePromises = checklistIdsToDelete.map(id => deleteDoc(doc(db, 'shopping_list', id)));
        await Promise.all(deletePromises);
      }

      localStorage.removeItem('draftTripItems');
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trips');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">New Shopping Trip</h2>
      </div>

      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDetecting}
            className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 py-4 rounded-xl flex flex-col items-center justify-center transition-colors disabled:opacity-50"
          >
            {isDetecting ? (
              <Loader2 className="w-8 h-8 mb-2 animate-spin" />
            ) : (
              <Camera className="w-8 h-8 mb-2" />
            )}
            <span className="font-medium">{isDetecting ? 'Detecting...' : 'Scan Veggies or List'}</span>
          </button>
          
          <button
            onClick={addItem}
            className="flex-1 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 py-4 rounded-xl flex flex-col items-center justify-center transition-colors"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-medium">Add Manually</span>
          </button>
        </div>

        {/* Needed from Checklist Horizontal Scrollable Tray */}
        {checklistItems.length > 0 && (
          <div className="mb-6 pb-6 border-b border-stone-100 dark:border-stone-800">
            <h3 className="text-xs uppercase font-bold tracking-wider text-stone-500 dark:text-stone-400 mb-3 text-left">
              Needed from Checklist
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {checklistItems.map((item) => {
                const isImported = items.some((i) => i.checklistId === item.id) || checklistIdsToDelete.includes(item.id);
                return (
                  <button
                    key={item.id}
                    disabled={isImported}
                    onClick={() => {
                      const newItemId = crypto.randomUUID();
                      setItems((prev) => [
                        ...prev,
                        {
                          id: newItemId,
                          name: item.name,
                          quantity: item.quantity,
                          unit: item.unit,
                          price: 0,
                          checklistId: item.id
                        }
                      ]);
                      setChecklistIdsToDelete((prev) => [...prev, item.id]);
                    }}
                    className={`flex-shrink-0 flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                      isImported
                        ? 'bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 opacity-40 cursor-not-allowed scale-95'
                        : 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/80 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-xs active:scale-95'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isImported ? 'bg-stone-400' : 'bg-emerald-500'}`} />
                    <div className="min-w-0 max-w-[120px]">
                      <p className={`font-semibold text-xs truncate ${isImported ? 'line-through text-stone-500' : 'text-stone-800 dark:text-stone-200'}`}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {isDetecting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-stone-200 dark:border-stone-800 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-24"></div>
                    <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-16"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-5 bg-stone-200 dark:bg-stone-800 rounded w-12"></div>
                    <div className="flex gap-1">
                      <div className="w-9 h-9 bg-stone-200 dark:bg-stone-800 rounded-lg"></div>
                      <div className="w-9 h-9 bg-stone-200 dark:bg-stone-800 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <NewTripItem
                  item={item}
                  index={index}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {items.length === 0 && !isDetecting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-stone-500 dark:text-stone-400"
            >
              No items added yet. Scan a list, take a photo of veggies, or add manually.
            </motion.div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xl font-bold text-stone-900 dark:text-stone-50">
              Total: ₹{totalCost.toFixed(2)}
            </div>
            <button
              onClick={saveTrip}
              disabled={isSaving}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>Save Trip</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-stone-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-stone-200 dark:border-stone-800"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">Add Item</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Item Name</label>
                  <input
                    type="text"
                    list="modal-vegetable-list"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                    placeholder="e.g. Tomatoes"
                    autoFocus
                  />
                  <datalist id="modal-vegetable-list">
                    {COMMON_VEGETABLES.map((veg) => (
                      <option key={veg} value={veg} />
                    ))}
                  </datalist>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0.1" step="0.1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Unit</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as any })}
                      className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0" step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newItem.name.trim()) {
                      alert('Item name cannot be empty');
                      return;
                    }
                    setItems([{ id: crypto.randomUUID(), ...newItem }, ...items]);
                    setNewItem({ name: '', quantity: 1, unit: 'kg', price: 0 });
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
                >
                  Add Item
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
