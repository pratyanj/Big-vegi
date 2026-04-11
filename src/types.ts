export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: 'g' | 'kg' | 'pcs';
  price: number;
}

export interface ShoppingTrip {
  id: string;
  date: string;
  totalCost: number;
  buyerId: string;
  buyerName: string;
  items: ShoppingItem[];
}
