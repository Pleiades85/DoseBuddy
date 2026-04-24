import * as Location from 'expo-location';
import { MAX_NEARBY_PHARMACIES, PHARMACY_SEARCH_RADIUS } from '../utils/constants';

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  distance: string;
  deliveryTime: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  phone?: string;
  isOpen?: boolean;
}

export const placesService = {
  /**
   * Fetches nearby pharmacies using Google Places API
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @returns List of formatted pharmacy objects
   */
  async getNearbyPharmacies(latitude: number, longitude: number): Promise<Pharmacy[]> {
    try {
      const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      
      if (!GOOGLE_PLACES_API_KEY) {
        console.warn('Google Places API key not found');
        return this.getDefaultPharmacies();
      }

      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${PHARMACY_SEARCH_RADIUS}&type=pharmacy&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results) {
        return data.results.slice(0, MAX_NEARBY_PHARMACIES).map((place: any) => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          distance: this.calculateDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          ),
          deliveryTime: this.estimateDeliveryTime(
            this.calculateDistance(
              latitude,
              longitude,
              place.geometry.location.lat,
              place.geometry.location.lng,
              true
            )
          ),
          rating: place.rating || 4.5,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          isOpen: place.opening_hours?.open_now
        }));
      }
      
      return this.getDefaultPharmacies();
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
      return this.getDefaultPharmacies();
    }
  },

  /**
   * Returns default mock pharmacies for fallback/testing
   */
  getDefaultPharmacies(): Pharmacy[] {
    return [
      {
        id: '1',
        name: 'City Pharmacy',
        address: '123 Main St, Your City',
        distance: '0.5 miles',
        deliveryTime: '30-45 min',
        rating: 4.8,
      },
      {
        id: '2',
        name: 'Health Plus Pharmacy',
        address: '456 Oak Ave, Your City',
        distance: '1.2 miles',
        deliveryTime: '45-60 min',
        rating: 4.6,
      },
      {
        id: '3',
        name: 'MediQuick Pharmacy',
        address: '789 Pine Rd, Your City',
        distance: '0.8 miles',
        deliveryTime: '35-50 min',
        rating: 4.9,
      },
    ];
  },

  /**
   * Calculates distance between two coordinates
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number, inMiles = false): string {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    if (inMiles) {
      return (distance * 0.621371).toFixed(1); // Convert to miles
    }
    return `${(distance * 0.621371).toFixed(1)} mi`;
  },

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  estimateDeliveryTime(distanceStr: string): string {
    const distance = parseFloat(distanceStr);
    if (distance < 1) return '20-30 min';
    if (distance < 2) return '30-40 min';
    if (distance < 3) return '40-50 min';
    return '50-60 min';
  }
};
