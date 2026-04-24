/**
 * Firebase Data Serialization Utilities
 * Converts Firebase Timestamp objects to serializable Date strings/numbers
 * before storing in Redux
 */

/**
 * Converts Firebase Timestamp to ISO string
 */
export const serializeTimestamp = (timestamp: any): string | null => {
  if (!timestamp) return null;
  
  // Check if it's a Firebase Timestamp
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // Check if it's already a Date
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // Check if it has seconds property (Firestore Timestamp structure)
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  
  return null;
};

/**
 * Serializes a medication object for Redux storage
 */
export const serializeMedication = (medication: any) => {
  if (!medication) return null;
  
  return {
    ...medication,
    createdAt: medication.createdAt ? serializeTimestamp(medication.createdAt) : null,
    updatedAt: medication.updatedAt ? serializeTimestamp(medication.updatedAt) : null,
    startDate: medication.startDate ? serializeTimestamp(medication.startDate) : null,
    expiryDate: medication.expiryDate ? serializeTimestamp(medication.expiryDate) : null,
  };
};

/**
 * Serializes an order object for Redux storage
 */
export const serializeOrder = (order: any) => {
  if (!order) return null;
  
  return {
    ...order,
    createdAt: order.createdAt ? serializeTimestamp(order.createdAt) : null,
    updatedAt: order.updatedAt ? serializeTimestamp(order.updatedAt) : null,
    paidAt: order.paidAt ? serializeTimestamp(order.paidAt) : null,
    items: order.items?.map((item: any) => ({
      ...item,
      // Serialize any timestamps in items if needed
    })) || [],
  };
};

/**
 * Serializes a user object for Redux storage
 */
export const serializeUser = (user: any) => {
  if (!user) return null;
  
  return {
    ...user,
    createdAt: user.createdAt ? serializeTimestamp(user.createdAt) : null,
    updatedAt: user.updatedAt ? serializeTimestamp(user.updatedAt) : null,
  };
};

/**
 * Deserializes a date string back to Date object (when needed)
 */
export const deserializeTimestamp = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};