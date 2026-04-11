import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingTrip } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { PlusCircle, ShoppingBag, TrendingUp } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function Dashboard() {
  const [recentTrips, setRecentTrips] = useState<ShoppingTrip[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  useEffect(() => {
    // Get recent trips
    const q = query(collection(db, 'trips'), orderBy('date', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips: ShoppingTrip[] = [];
      snapshot.forEach((doc) => {
        const trip = { id: doc.id, ...doc.data() } as ShoppingTrip;
        trips.push(trip);
      });
      setRecentTrips(trips);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
    });

    // We need a separate query for monthly total if there are more than 5 trips
    const monthStartStr = startOfMonth(new Date()).toISOString();
    const monthEndStr = endOfMonth(new Date()).toISOString();
    
    const qMonth = query(collection(db, 'trips'), orderBy('date', 'desc'));
    const unsubscribeMonth = onSnapshot(qMonth, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date >= monthStartStr && data.date <= monthEndStr) {
          total += data.totalCost || 0;
        }
      });
      setMonthlyTotal(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
    });

    return () => {
      unsubscribe();
      unsubscribeMonth();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-800">Dashboard</h2>
        <Link 
          to="/new-trip" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
        >
          <PlusCircle size={20} />
          <span className="hidden sm:inline">New Trip</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-center space-x-3 text-stone-500 mb-2">
            <TrendingUp size={20} className="text-emerald-500" />
            <h3 className="font-medium">This Month's Total</h3>
          </div>
          <p className="text-4xl font-bold text-stone-900">
            ₹{monthlyTotal.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-center space-x-3 text-stone-500 mb-2">
            <ShoppingBag size={20} className="text-blue-500" />
            <h3 className="font-medium">Recent Trips</h3>
          </div>
          <p className="text-4xl font-bold text-stone-900">
            {recentTrips.length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h3 className="font-bold text-stone-800 text-lg">Recent Shopping Trips</h3>
          <Link to="/history" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
            View All
          </Link>
        </div>
        
        <div className="divide-y divide-stone-100">
          {recentTrips.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              No recent trips. Go buy some veggies!
            </div>
          ) : (
            recentTrips.map((trip) => (
              <div key={trip.id} className="p-4 sm:p-6 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <p className="font-medium text-stone-900">{trip.buyerName}</p>
                  <p className="text-sm text-stone-500">
                    {format(new Date(trip.date), 'MMM d, yyyy • h:mm a')}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {trip.items.length} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-stone-900">₹{trip.totalCost.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
