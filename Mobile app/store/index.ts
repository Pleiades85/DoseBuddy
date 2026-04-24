import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import ordersReducer from './slices/ordersSlice';
import remindersReducer from './slices/remindersSlice';

// Create the store with middleware configuration to handle Firebase Timestamps
const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    orders: ordersReducer,
    reminders: remindersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'cart/addToCart',
          'cart/updateQuantity',
          'orders/setOrders',
          'orders/addOrder',
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'cart.items',
          'orders.orders',
          'auth.user.createdAt',
          'auth.user.updatedAt',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          'payload.medication.createdAt',
          'payload.medication.updatedAt',
          'payload.medication.startDate',
          'payload.createdAt',
          'payload.updatedAt',
        ],
      },
    }),
});

// Export the store directly
export { store };

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;