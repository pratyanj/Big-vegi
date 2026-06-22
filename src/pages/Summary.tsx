import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingTrip } from '../types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { PieChart as PieIcon, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { COMMON_VEGETABLES } from '../constants';

const getSampleTrips = (): ShoppingTrip[] => [
  {
    id: 'sample-trip-1',
    date: '2026-06-01T10:00:00.000Z',
    buyerId: 'buyer-1',
    buyerName: 'Alex',
    flatId: 'sample-flat',
    totalCost: 150,
    items: [
      { name: 'Tomato (Tameta)', quantity: 2, unit: 'kg', price: 120 },
      { name: 'Potato (Batata)', quantity: 1.5, unit: 'kg', price: 30 }
    ]
  },
  {
    id: 'sample-trip-2',
    date: '2026-06-05T11:00:00.000Z',
    buyerId: 'buyer-2',
    buyerName: 'Sam',
    flatId: 'sample-flat',
    totalCost: 200,
    items: [
      { name: 'Tomato (Tameta)', quantity: 1, unit: 'kg', price: 70 },
      { name: 'Onion (Dungri)', quantity: 3, unit: 'kg', price: 90 },
      { name: 'Coriander (Kothmir)', quantity: 200, unit: 'g', price: 40 }
    ]
  },
  {
    id: 'sample-trip-3',
    date: '2026-06-10T09:30:00.000Z',
    buyerId: 'buyer-1',
    buyerName: 'Alex',
    flatId: 'sample-flat',
    totalCost: 165,
    items: [
      { name: 'Tomato (Tameta)', quantity: 1.5, unit: 'kg', price: 90 },
      { name: 'Potato (Batata)', quantity: 2, unit: 'kg', price: 45 },
      { name: 'Ginger (Aadu)', quantity: 250, unit: 'g', price: 30 }
    ]
  },
  {
    id: 'sample-trip-4',
    date: '2026-06-15T15:00:00.000Z',
    buyerId: 'buyer-2',
    buyerName: 'Sam',
    flatId: 'sample-flat',
    totalCost: 110,
    items: [
      { name: 'Tomato (Tameta)', quantity: 2.5, unit: 'kg', price: 100 },
      { name: 'Onion (Dungri)', quantity: 2, unit: 'kg', price: 60 }
    ]
  },
  {
    id: 'sample-trip-5',
    date: '2026-06-20T12:00:00.000Z',
    buyerId: 'buyer-1',
    buyerName: 'Alex',
    flatId: 'sample-flat',
    totalCost: 180,
    items: [
      { name: 'Tomato (Tameta)', quantity: 1, unit: 'kg', price: 50 },
      { name: 'Green Chili (Marcha)', quantity: 500, unit: 'g', price: 50 },
      { name: 'Potato (Batata)', quantity: 4, unit: 'kg', price: 80 }
    ]
  }
];

const getDisplayVegiName = (vegiKey: string) => {
  const matched = COMMON_VEGETABLES.find(v => v.toLowerCase().trim() === vegiKey.toLowerCase().trim());
  if (matched) return matched;
  return vegiKey.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function Summary() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVegi, setSelectedVegi] = useState<string>('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#292524' : '#f5f5f4';
  const tickColor = isDark ? '#a8a29e' : '#78716c';
  const tooltipBg = isDark ? '#1c1917' : '#ffffff';
  const tooltipBorder = isDark ? '#292524' : '#e7e5e4';

  useEffect(() => {
    if (!user?.flatId) {
      if (user?.id === 'demo-local-user' || user?.email === 'demo@bigvegi.app') {
        setTrips(getSampleTrips());
        setLoading(false);
      }
      return;
    }

    // Filter by flatId and sort in-memory to bypass index requirements
    const q = query(collection(db, 'trips'), where('flatId', '==', user.flatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData: ShoppingTrip[] = [];
      snapshot.forEach((doc) => {
        tripsData.push({ id: doc.id, ...doc.data() } as ShoppingTrip);
      });

      // Sort by date ascending in-memory
      tripsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (tripsData.length === 0 && (user?.id === 'demo-local-user' || user?.email === 'demo@bigvegi.app')) {
        setTrips(getSampleTrips());
      } else {
        setTrips(tripsData);
      }
      setLoading(false);
    }, (error) => {
      if (user?.id === 'demo-local-user' || user?.email === 'demo@bigvegi.app') {
        setTrips(getSampleTrips());
        setLoading(false);
      } else {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'trips');
      }
    });

    return () => unsubscribe();
  }, [user?.flatId, user?.id, user?.email]);

  // Group items by name to build available veggies dropdown
  const itemPrices: Record<string, { date: string, price: number, unit: string }[]> = {};
  
  trips.forEach(trip => {
    const dateStr = format(parseISO(trip.date), 'MMM dd');
    trip.items.forEach(item => {
      const name = item.name.toLowerCase().trim();
      if (!itemPrices[name]) {
        itemPrices[name] = [];
      }
      let pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0;
      if (item.unit === 'g') {
        pricePerUnit = pricePerUnit * 1000;
      }
      
      itemPrices[name].push({
        date: dateStr,
        price: Number(pricePerUnit.toFixed(2)),
        unit: item.unit === 'g' ? 'kg' : item.unit
      });
    });
  });

  const purchasedVegis = Object.keys(itemPrices).sort();

  useEffect(() => {
    if (purchasedVegis.length > 0 && !selectedVegi) {
      // Default to the most purchased item
      const mostPurchased = Object.entries(itemPrices)
        .sort((a, b) => b[1].length - a[1].length)[0]?.[0];
      setSelectedVegi(mostPurchased || purchasedVegis[0]);
    }
  }, [trips, selectedVegi, purchasedVegis]);

  if (loading) {
    return <div className="flex justify-center p-8 text-stone-500 dark:text-stone-400">Loading summary...</div>;
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

  // Refactored detailed chronological purchases for the selected vegetable
  const selectedVegiPurchases = selectedVegi ? trips.flatMap(trip => {
    return trip.items
      .filter(item => item.name.toLowerCase().trim() === selectedVegi.toLowerCase().trim())
      .map(item => {
        let pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0;
        if (item.unit === 'g') {
          pricePerUnit = pricePerUnit * 1000;
        }
        return {
          date: format(parseISO(trip.date), 'MMM dd'),
          timestamp: new Date(trip.date).getTime(),
          price: Number(pricePerUnit.toFixed(2)),
          unit: item.unit === 'g' ? 'kg' : item.unit,
          buyerName: trip.buyerName,
          quantity: item.quantity
        };
      });
  }).sort((a, b) => a.timestamp - b.timestamp) : [];

  // Price tracking and difference metrics
  const totalPurchases = selectedVegiPurchases.length;
  const latestPurchase = selectedVegiPurchases[totalPurchases - 1];
  const previousPurchase = totalPurchases > 1 ? selectedVegiPurchases[totalPurchases - 2] : null;

  const latestPrice = latestPurchase ? latestPurchase.price : 0;
  const previousPrice = previousPurchase ? previousPurchase.price : 0;
  const priceDiff = latestPrice - previousPrice;
  const priceDiffPct = previousPrice > 0 ? (priceDiff / previousPrice) * 100 : 0; // standard percentage diff calculation

  const prices = selectedVegiPurchases.map(p => p.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? Number((prices.reduce((sum, p) => sum + p, 0) / prices.length).toFixed(2)) : 0;
  const unitStr = latestPurchase ? `₹/${latestPurchase.unit}` : '₹/unit';

  const lineChartData = selectedVegiPurchases.map((p, idx) => ({
    displayDate: p.date,
    price: p.price,
    buyer: p.buyerName,
    qty: p.quantity,
    unit: p.unit,
    index: idx + 1
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-lg max-w-[200px]">
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{data.displayDate}</p>
          <div className="mt-1.5 flex flex-col gap-0.5">
            <p className="text-sm font-extrabold text-stone-800 dark:text-stone-100">
              ₹{data.price} <span className="text-xs font-normal text-stone-500">/{data.unit}</span>
            </p>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Qty: <span className="font-semibold">{data.qty} {data.unit}</span>
            </p>
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Buyer: <span className="font-semibold">{data.buyer}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Financial Summary</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending by Person */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800">
          <div className="flex items-center space-x-3 text-stone-800 dark:text-stone-100 mb-6">
            <PieIcon size={24} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-lg">This Month's Spending</h3>
          </div>
          
          {barChartData.length > 0 ? (
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: tickColor }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor }} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    cursor={{ fill: isDark ? '#292524' : '#f5f5f4' }}
                    contentStyle={{ 
                      backgroundColor: tooltipBg, 
                      borderColor: tooltipBorder, 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                    itemStyle={{ color: isDark ? '#f5f5f4' : '#1c1917' }}
                    labelStyle={{ color: isDark ? '#a8a29e' : '#78716c', fontWeight: 'bold' }}
                    formatter={(value: number) => [`₹${value}`, 'Total Spent']}
                  />
                  <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-stone-500 dark:text-stone-400">
              No data for this month yet.
            </div>
          )}
        </div>

        {/* Price Trends & Tracking */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 text-stone-800 dark:text-stone-100">
              <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-lg">Price Trends</h3>
            </div>
            {purchasedVegis.length > 0 && (
              <select
                value={selectedVegi}
                onChange={(e) => setSelectedVegi(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-stone-100 text-xs font-semibold"
              >
                {purchasedVegis.map(vegi => (
                  <option key={vegi} value={vegi}>
                    {getDisplayVegiName(vegi)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Metrics dashboard for selected vegi */}
          {selectedVegiPurchases.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {/* Current/Latest Price card */}
              <div className="bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800/80 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500">Current Price</span>
                <div className="mt-1 flex flex-col">
                  <span className="text-base sm:text-lg font-extrabold text-stone-800 dark:text-stone-100">₹{latestPrice}</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">per {latestPurchase?.unit}</span>
                </div>
                {/* Difference Badge */}
                {totalPurchases > 1 ? (
                  <div className="mt-1 flex items-center">
                    {priceDiff < 0 ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <ArrowDownRight size={10} />
                        {Math.abs(priceDiff).toFixed(2)} ({Math.abs(priceDiffPct).toFixed(1)}%)
                      </span>
                    ) : priceDiff > 0 ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                        <ArrowUpRight size={10} />
                        +{priceDiff.toFixed(2)} (+{priceDiffPct.toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                        <Minus size={10} />
                        0.00 (0%)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="mt-1 text-[10px] text-stone-400 dark:text-stone-500 font-medium">First purchase</span>
                )}
              </div>

              {/* Average Price card */}
              <div className="bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800/80 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500">Average Price</span>
                <div className="mt-1 flex flex-col">
                  <span className="text-base sm:text-lg font-extrabold text-stone-800 dark:text-stone-100">₹{avgPrice}</span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">per {latestPurchase?.unit}</span>
                </div>
                <span className="mt-1 text-[10px] text-stone-400 dark:text-stone-500 font-medium">Across {totalPurchases} buys</span>
              </div>

              {/* Min/Max Range card */}
              <div className="bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800/80 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-500">Min / Max Range</span>
                <div className="mt-1 flex flex-col">
                  <div className="flex justify-between items-center text-[11px] text-stone-600 dark:text-stone-300">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Min: ₹{minPrice}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">Max: ₹{maxPrice}</span>
                  </div>
                </div>
                <div className="mt-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full h-1 overflow-hidden relative">
                  {maxPrice > minPrice && (
                    <div 
                      className="absolute bg-emerald-500 h-full rounded-full" 
                      style={{
                        left: '0%',
                        right: `${Math.max(0, 100 - ((latestPrice - minPrice) / (maxPrice - minPrice)) * 100)}%`
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          
          {lineChartData.length > 0 && selectedVegi ? (
            <div className="h-60 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: tickColor }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor }} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-stone-500 dark:text-stone-400">
              Not enough data to show trends.
            </div>
          )}
        </div>

      </div>
      
      {/* Detailed Breakdown */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 overflow-hidden">
        <div className="p-6 border-b border-stone-100 dark:border-stone-800">
          <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">Flatmate Balances</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Who paid what this month</p>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {Object.entries(personTotals).length === 0 ? (
            <div className="p-6 text-center text-stone-500 dark:text-stone-400">No expenses this month.</div>
          ) : (
            Object.entries(personTotals).map(([name, total]) => (
              <div key={name} className="p-4 sm:p-6 flex justify-between items-center">
                <span className="font-medium text-stone-900 dark:text-stone-100">{name}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{(total as number).toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
