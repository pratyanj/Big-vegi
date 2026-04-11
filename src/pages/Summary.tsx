import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingTrip } from '../types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function Summary() {
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'trips'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: ShoppingTrip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push({ id: doc.id, ...doc.data() } as ShoppingTrip);
      });
      setTrips(tripsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8 text-stone-500">Loading summary...</div>;
  }

  // Calculate monthly totals per person
  const currentMonthStart = startOfMonth(new Date()).toISOString();
  const currentMonthEnd = endOfMonth(new Date()).toISOString();
  
  const currentMonthTrips = trips.filter(t => t.date >= currentMonthStart && t.date <= currentMonthEnd);
  
  const personTotals = currentMonthTrips.reduce((acc, trip) => {
    acc[trip.buyerName] = (acc[trip.buyerName] || 0) + trip.totalCost;
    return acc;
  }, {} as Record<string, number>);

  const barChartData = Object.entries(personTotals).map(([name, total]) => ({
    name,
    total: Number((total as number).toFixed(2))
  }));

  // Calculate price history for common items
  // Group items by name and date
  const itemPrices: Record<string, { date: string, price: number, unit: string }[]> = {};
  
  trips.forEach(trip => {
    const dateStr = format(parseISO(trip.date), 'MMM dd');
    trip.items.forEach(item => {
      const name = item.name.toLowerCase().trim();
      if (!itemPrices[name]) {
        itemPrices[name] = [];
      }
      // Calculate price per unit (e.g., per kg)
      let pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0;
      if (item.unit === 'g') {
        pricePerUnit = pricePerUnit * 1000; // convert to per kg
      }
      
      itemPrices[name].push({
        date: dateStr,
        price: Number(pricePerUnit.toFixed(2)),
        unit: item.unit === 'g' ? 'kg' : item.unit
      });
    });
  });

  // Find top 3 most frequently bought items to show in chart
  const topItems = Object.entries(itemPrices)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([name]) => name);

  // Prepare line chart data
  // Get unique dates
  const allDates = Array.from(new Set(trips.map(t => format(parseISO(t.date), 'MMM dd'))));
  
  const lineChartData = allDates.map(date => {
    const dataPoint: any = { date };
    topItems.forEach(item => {
      const priceEntry = itemPrices[item]?.find(p => p.date === date);
      if (priceEntry) {
        dataPoint[item] = priceEntry.price;
      }
    });
    return dataPoint;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-stone-800">Financial Summary</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending by Person */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-center space-x-3 text-stone-800 mb-6">
            <PieIcon size={24} className="text-emerald-600" />
            <h3 className="font-bold text-lg">This Month's Spending</h3>
          </div>
          
          {barChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    cursor={{ fill: '#f5f5f4' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value}`, 'Total Spent']}
                  />
                  <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-stone-500">
              No data for this month yet.
            </div>
          )}
        </div>

        {/* Price Trends */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-center space-x-3 text-stone-800 mb-6">
            <TrendingUp size={24} className="text-blue-600" />
            <h3 className="font-bold text-lg">Price Trends (per kg/pc)</h3>
          </div>
          
          {lineChartData.length > 0 && topItems.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => [`₹${value}`, name]}
                  />
                  {topItems.map((item, index) => (
                    <Line 
                      key={item} 
                      type="monotone" 
                      dataKey={item} 
                      stroke={['#059669', '#2563eb', '#d97706'][index % 3]} 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-stone-500">
              Not enough data to show trends.
            </div>
          )}
        </div>
      </div>
      
      {/* Detailed Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-bold text-stone-800 text-lg">Flatmate Balances</h3>
          <p className="text-sm text-stone-500 mt-1">Who paid what this month</p>
        </div>
        <div className="divide-y divide-stone-100">
          {Object.entries(personTotals).length === 0 ? (
            <div className="p-6 text-center text-stone-500">No expenses this month.</div>
          ) : (
            Object.entries(personTotals).map(([name, total]) => (
              <div key={name} className="p-4 sm:p-6 flex justify-between items-center">
                <span className="font-medium text-stone-900">{name}</span>
                <span className="font-bold text-emerald-600">₹{(total as number).toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
