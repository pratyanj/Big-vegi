import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingTrip, ShoppingItem } from '../types';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Calendar, User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface EditableTripItemProps {
  item: ShoppingItem; 
  onSave: (newItem: ShoppingItem) => void | Promise<void>; 
  canEdit: boolean;
}

const EditableTripItem: React.FC<EditableTripItemProps> = ({ 
  item, 
  onSave, 
  canEdit 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);

  useEffect(() => {
    setEditedItem(item);
  }, [item]);

  if (isEditing) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 p-3 bg-white dark:bg-stone-900 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm col-span-1 sm:col-span-2">
        <div className="flex-1">
          <input
            type="text"
            value={editedItem.name}
            onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Item name"
          />
        </div>
        <div className="w-full sm:w-20">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={editedItem.quantity}
            onChange={(e) => setEditedItem({ ...editedItem, quantity: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="w-full sm:w-20">
          <select
            value={editedItem.unit}
            onChange={(e) => setEditedItem({ ...editedItem, unit: e.target.value as any })}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="pcs">pcs</option>
          </select>
        </div>
        <div className="w-full sm:w-24">
          <input
            type="number"
            min="0"
            step="0.01"
            value={editedItem.price}
            onChange={(e) => setEditedItem({ ...editedItem, price: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1 justify-end mt-2 sm:mt-0">
          <button
            onClick={() => {
              if (editedItem.name.trim() === '' || editedItem.quantity <= 0 || editedItem.price < 0) {
                alert('Please fill in valid item details');
                return;
              }
              onSave(editedItem);
              setIsEditing(false);
            }}
            className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
            title="Save"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              setEditedItem(item);
              setIsEditing(false);
            }}
            className="p-1.5 text-stone-600 dark:text-stone-300 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-900/50 rounded-lg border border-stone-100 dark:border-stone-800/80 group">
      <div>
        <p className="font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">{item.quantity} {item.unit}</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-semibold text-stone-700 dark:text-stone-300">₹{item.price.toFixed(2)}</p>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all focus:opacity-100"
            title="Edit Item"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function History() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.flatId) return;

    // Filter by flatId and sort in-memory to bypass index requirements
    const q = query(collection(db, 'trips'), where('flatId', '==', user.flatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: ShoppingTrip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push({ id: doc.id, ...doc.data() } as ShoppingTrip);
      });

      // Sort by date descending in-memory
      tripsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTrips(tripsData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'trips');
    });

    return () => unsubscribe();
  }, [user?.flatId]);

  const handleDelete = async (tripId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this shopping trip from your history? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'trips', tripId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}`);
    }
  };

  const handleUpdateTripItem = async (trip: ShoppingTrip, itemIndex: number, newItem: ShoppingItem) => {
    try {
      const updatedItems = [...trip.items];
      updatedItems[itemIndex] = newItem;
      
      const newTotalCost = updatedItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      
      await updateDoc(doc(db, 'trips', trip.id!), {
        items: updatedItems,
        totalCost: newTotalCost
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${trip.id}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8 text-stone-500 dark:text-stone-400">Loading history...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Shopping History</h2>

      <div className="space-y-4">
        {trips.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 text-center text-stone-500 dark:text-stone-400">
            No shopping trips recorded yet.
          </div>
        ) : (
          trips.map((trip) => (
            <div key={trip.id} className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-50 dark:bg-stone-900/50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 dark:text-stone-100 text-lg">
                      {format(new Date(trip.date), 'MMMM d, yyyy')}
                    </p>
                    <div className="flex items-center text-stone-500 dark:text-stone-400 text-sm mt-1">
                      <UserIcon size={14} className="mr-1" />
                      {trip.buyerName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{trip.totalCost.toFixed(2)}
                  </p>
                  {user?.id === trip.buyerId && (
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Delete Trip"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                <h4 className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">Items Purchased</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trip.items.map((item, index) => {
                    const tripDate = new Date(trip.date);
                    const isWithin7Days = (new Date().getTime() - tripDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
                    const canEdit = user?.id === trip.buyerId && isWithin7Days;

                    return (
                      <EditableTripItem
                        key={index}
                        item={item}
                        canEdit={canEdit}
                        onSave={(newItem) => handleUpdateTripItem(trip, index, newItem)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
