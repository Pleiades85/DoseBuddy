import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, Medication } from '../types';

interface CartState {
  items: CartItem[];
  pharmacyId: string | null;
}

const initialState: CartState = {
  items: [],
  pharmacyId: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ medication: Medication; pharmacyId: string }>) => {
      const existingItem = state.items.find(
        item => item.medication.id === action.payload.medication.id &&
          item.pharmacyId === action.payload.pharmacyId
      );

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({
          medication: action.payload.medication,
          quantity: 1,
          pharmacyId: action.payload.pharmacyId,
        });
      }
      state.pharmacyId = action.payload.pharmacyId;
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.medication.id !== action.payload);
    },
    updateQuantity: (state, action: PayloadAction<{ medicationId: string; quantity: number; price?: number }>) => {
      const item = state.items.find(item => item.medication.id === action.payload.medicationId);
      if (item) {
        item.quantity = action.payload.quantity;
        if (action.payload.price !== undefined) {
          item.medication.price = action.payload.price;
        }
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.pharmacyId = null;
    },
    setPharmacy: (state, action: PayloadAction<string>) => {
      state.pharmacyId = action.payload;
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, setPharmacy } = cartSlice.actions;
export default cartSlice.reducer;