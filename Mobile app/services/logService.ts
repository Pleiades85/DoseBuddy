import { db } from '../config/firebase';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';

export interface LogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: any; // Firestore timestamp
  performedBy?: string;
  pharmacyName?: string;
}

export const logService = {
  // Fetch logs for a specific patient
  getPatientLogs: async (patientId: string, limitCount: number = 20): Promise<LogEntry[]> => {
    try {
      console.log('Fetching logs for patient:', patientId);
      
      const logsRef = collection(db, 'patients', patientId, 'logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
      
      const querySnapshot = await getDocs(q);
      
      const logs: LogEntry[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data()
        } as LogEntry);
      });
      
      console.log(`Fetched ${logs.length} logs`);
      return logs;
    } catch (error) {
      console.error('Error fetching patient logs:', error);
      throw error;
    }
  }
};
