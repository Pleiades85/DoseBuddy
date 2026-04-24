/**
 * Parse a Firestore timestamp into a JavaScript Date.
 * Handles all common Firestore timestamp formats:
 * - { _seconds, _nanoseconds } (Admin SDK JSON serialization)
 * - { seconds, nanoseconds } (Client SDK Timestamp)
 * - Firestore Timestamp with .toDate() method
 * - ISO string
 * - Unix milliseconds number
 * 
 * Returns null if parsing fails.
 */
export const parseFirestoreDate = (timestamp) => {
  if (!timestamp) return null;

  try {
    // Firestore Timestamp with toDate()
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }

    // Admin SDK serialized: { _seconds, _nanoseconds }
    if (timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000);
    }

    // Client SDK: { seconds, nanoseconds }
    if (timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000);
    }

    // Regular number (unix ms)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }

    // ISO string or date string
    if (typeof timestamp === 'string') {
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Format a Firestore timestamp to a human-readable string.
 * @param {*} timestamp - Firestore timestamp in any format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export const formatDate = (timestamp, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  const date = parseFirestoreDate(timestamp);
  if (!date) return 'Unknown';
  return date.toLocaleDateString(undefined, options);
};

/**
 * Format a Firestore timestamp to a short date string (e.g. "Apr 17, 2026")
 */
export const formatDateShort = (timestamp) => {
  return formatDate(timestamp, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Format to date + time (e.g. "Apr 17, 2026, 3:45 PM")
 */
export const formatDateTime = (timestamp) => {
  const date = parseFirestoreDate(timestamp);
  if (!date) return 'Unknown';
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
