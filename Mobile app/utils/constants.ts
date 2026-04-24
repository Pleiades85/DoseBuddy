/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// ============ BUSINESS LOGIC CONSTANTS ============

/** Tax rate for Ontario (HST) */
export const TAX_RATE = 0.13;

/** Delivery fee for orders under the free shipping threshold */
export const DELIVERY_FEE = 4.99;

/** Minimum order amount for free delivery */
export const FREE_DELIVERY_THRESHOLD = 50.00;

/** Access code expiration time (1 year in milliseconds) */
export const ACCESS_CODE_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

// ============ UI/UX CONSTANTS ============

/** Swipe threshold for delete gesture (in pixels) */
export const SWIPE_DELETE_THRESHOLD = 100;

/** Animation duration for swipe delete (in milliseconds) */
export const SWIPE_ANIMATION_DURATION = 300;

/** Maximum length for user input to prevent abuse */
export const MAX_INPUT_LENGTH = 200;

/** Number of nearby pharmacies to display */
export const MAX_NEARBY_PHARMACIES = 5;

/** Default pharmacy search radius (in meters) */
export const PHARMACY_SEARCH_RADIUS = 5000;

// ============ VALIDATION CONSTANTS ============

/** Minimum access code length */
export const ACCESS_CODE_LENGTH = 6;

/** Characters allowed in access codes (excludes confusing characters like 0, O, I, 1) */
export const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ============ API CONSTANTS ============

/** Maximum number of retries for failed API calls */
export const MAX_API_RETRIES = 3;

/** Timeout for API requests (in milliseconds) */
export const API_TIMEOUT_MS = 30000;
