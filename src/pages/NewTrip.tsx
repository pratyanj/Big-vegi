import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingItem } from '../types';
import { Camera, Upload, Plus, Trash2, Save, Loader2, Edit2, Check, X } from 'lucide-react';
import { detectGroceries } from '../services/geminiService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { COMMON_VEGETABLES } from '../constants';

interface TripItemState extends ShoppingItem {
  id: string;
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
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
        <div className="flex-1">
          <label className="block text-xs font-medium text-stone-500 mb-1">Item Name</label>
          <input
            type="text"
            list="vegetable-list"
            value={item.name}
            onChange={(e) => updateItem(index, 'name', e.target.value)}
            placeholder="e.g. Tomatoes"
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <datalist id="vegetable-list">
            {COMMON_VEGETABLES.map((veg) => (
              <option key={veg} value={veg} />
            ))}
          </datalist>
        </div>
        <div className="w-full sm:w-24">
          <label className="block text-xs font-medium text-stone-500 mb-1">Qty</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={item.quantity === 0 ? '' : item.quantity}
            onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-full sm:w-24">
          <label className="block text-xs font-medium text-stone-500 mb-1">Unit</label>
          <select
            value={item.unit}
            onChange={(e) => updateItem(index, 'unit', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="pcs">pcs</option>
          </select>
        </div>
        <div className="w-full sm:w-32">
          <label className="block text-xs font-medium text-stone-500 mb-1">Price (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.price === 0 ? '' : item.price}
            onChange={(e) => updateItem(index, 'price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <button
            onClick={() => {
              if (item.name.trim() === '' || item.quantity <= 0 || item.price <= 0) {
                alert('Please fill in all fields (Name, Quantity > 0, Price > 0)');
                return;
              }
              setIsEditing(false);
            }}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Done"
          >
            <Check size={20} />
          </button>
          <button
            onClick={() => removeItem(index)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-200 group">
      <div>
        <p className="font-medium text-stone-900">{item.name}</p>
        <p className="text-sm text-stone-500">{item.quantity} {item.unit}</p>
      </div>
      <div className="flex items-center gap-4">
        <p className="font-semibold text-stone-700">₹{Number(item.price).toFixed(2)}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit Item"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => removeItem(index)}
            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
  const [newItem, setNewItem] = useState<ShoppingItem>({ name: '', quantity: 0, unit: 'kg', price: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('draftTripItems', JSON.stringify(items));
  }, [items]);

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

      // Simple hash for caching exact images
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
          // Ignore quota exceeded errors
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
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCost = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const saveTrip = async () => {
    if (!user) return;
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Validate items
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
        items: items.map(item => ({
          name: item.name,
          quantity: Number(item.quantity),
          unit: item.unit,
          price: Number(item.price)
        }))
      };

      await addDoc(collection(db, 'trips'), tripData);
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
        <h2 className="text-2xl font-bold text-stone-800">New Shopping Trip</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
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
            className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-4 rounded-xl flex flex-col items-center justify-center transition-colors disabled:opacity-50"
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
            className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 py-4 rounded-xl flex flex-col items-center justify-center transition-colors"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="font-medium">Add Manually</span>
          </button>
        </div>

        <div className="space-y-4">
          {isDetecting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-200 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 bg-stone-200 rounded w-24"></div>
                    <div className="h-3 bg-stone-200 rounded w-16"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-5 bg-stone-200 rounded w-12"></div>
                    <div className="flex gap-1">
                      <div className="w-9 h-9 bg-stone-200 rounded-lg"></div>
                      <div className="w-9 h-9 bg-stone-200 rounded-lg"></div>
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
              className="text-center py-8 text-stone-500"
            >
              No items added yet. Scan a list, take a photo of veggies, or add manually.
            </motion.div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-8 pt-6 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xl font-bold text-stone-900">
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
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-800">Add Item</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    list="modal-vegetable-list"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    <label className="block text-sm font-medium text-stone-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0.1" step="0.1"
                      value={newItem.quantity === 0 ? '' : newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as any })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0" step="0.01"
                    value={newItem.price === 0 ? '' : newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newItem.name.trim() || newItem.quantity <= 0 || newItem.price <= 0) {
                      alert('Please fill in all fields (Name, Quantity > 0, Price > 0)');
                      return;
                    }
                    setItems([{ id: crypto.randomUUID(), ...newItem }, ...items]);
                    setNewItem({ name: '', quantity: 0, unit: 'kg', price: 0 });
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
