import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  orderBy,
  addDoc,
  Timestamp,
  collectionGroup
} from 'firebase/firestore';
import { Medication, Reminder, Order, Log } from '../store/types';
import { formatPatientData } from '../utils/helpers';

export const firebaseService = {
  // --- Medications (Subcollection) ---
  async getUserMedications(patientId: string): Promise<Medication[]> {
    const medsRef = collection(db, 'patients', patientId, 'medications');
    const q = query(medsRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
  },

  subscribeToMedications(patientId: string, callback: (meds: any[]) => void) {
    const medsRef = collection(db, 'patients', patientId, 'medications');
    const q = query(medsRef);
    
    return onSnapshot(q, (snapshot) => {
      const medications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      callback(medications);
    });
  },

  async addMedication(patientId: string, medication: any) {
    const medsRef = collection(db, 'patients', patientId, 'medications');
    return await addDoc(medsRef, {
      ...medication,
      prescribedAt: Timestamp.now()
    });
  },

  async updateMedication(patientId: string, medId: string, updates: any) {
    const medRef = doc(db, 'patients', patientId, 'medications', medId);
    return await updateDoc(medRef, updates);
  },

  async deleteMedication(patientId: string, medId: string) {
    const medRef = doc(db, 'patients', patientId, 'medications', medId);
    return await deleteDoc(medRef);
  },

  // --- Scanned Medications (New Subcollection) ---
  async getScannedMedications(patientId: string): Promise<Medication[]> {
    const medsRef = collection(db, 'patients', patientId, 'scanned_medications');
    const q = query(medsRef);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
  },

  subscribeToScannedMedications(patientId: string, callback: (meds: any[]) => void) {
    const medsRef = collection(db, 'patients', patientId, 'scanned_medications');
    const q = query(medsRef);
    
    return onSnapshot(q, (snapshot) => {
      const medications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      callback(medications);
    });
  },

  async addScannedMedication(patientId: string, medication: any) {
    const medsRef = collection(db, 'patients', patientId, 'scanned_medications');
    return await addDoc(medsRef, {
      ...medication,
      scannedAt: Timestamp.now(),
      isPharmacy: false
    });
  },

  async deleteScannedMedication(patientId: string, medId: string) {
    const medRef = doc(db, 'patients', patientId, 'scanned_medications', medId);
    return await deleteDoc(medRef);
  },

  // --- Prescription Images (New Collection) ---
  async uploadPrescriptionImage(base64Data: string) {
    try {
      const imagesRef = collection(db, 'prescription_images');
      const docRef = await addDoc(imagesRef, {
        image: base64Data,
        uploadedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error uploading prescription image:', error);
      throw error;
    }
  },

  // --- Reminders (Subcollection) ---
  async getUserReminders(patientId: string) {
    const remindersRef = collection(db, 'patients', patientId, 'reminders');
    const q = query(remindersRef, orderBy('time', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  subscribeToReminders(patientId: string, callback: (reminders: any[]) => void) {
    const remindersRef = collection(db, 'patients', patientId, 'reminders');
    const q = query(remindersRef, orderBy('time', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const reminders = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      callback(reminders);
    });
  },

  async addReminder(patientId: string, reminder: any) {
    const remindersRef = collection(db, 'patients', patientId, 'reminders');
    return await addDoc(remindersRef, {
      ...reminder,
      createdAt: Timestamp.now()
    });
  },

  async updateReminder(patientId: string, reminderId: string, updates: any) {
    const reminderRef = doc(db, 'patients', patientId, 'reminders', reminderId);
    return await updateDoc(reminderRef, updates);
  },

  async deleteReminder(patientId: string, reminderId: string) {
    const reminderRef = doc(db, 'patients', patientId, 'reminders', reminderId);
    return await deleteDoc(reminderRef);
  },

  async toggleReminder(patientId: string, reminderId: string, enabled: boolean) {
    const reminderRef = doc(db, 'patients', patientId, 'reminders', reminderId);
    return await updateDoc(reminderRef, { enabled });
  },

  // --- Orders (Subcollection) ---
  async getUserOrders(patientId: string) {
    const ordersRef = collection(db, 'patients', patientId, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  subscribeToOrders(patientId: string, callback: (orders: any[]) => void) {
    const ordersRef = collection(db, 'patients', patientId, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      callback(orders);
    });
  },

  async createOrder(patientId: string, order: any) {
    const ordersRef = collection(db, 'patients', patientId, 'orders');
    return await addDoc(ordersRef, {
      ...order,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  },

  async updateOrderStatus(patientId: string, orderId: string, status: string) {
    const orderRef = doc(db, 'patients', patientId, 'orders', orderId);
    return await updateDoc(orderRef, {
      status,
      updatedAt: Timestamp.now()
    });
  },

  // --- Profile (Main Document) ---
  async getUserProfile(patientId: string) {
    const patientRef = doc(db, 'patients', patientId);
    const patientDoc = await getDoc(patientRef);
    if (patientDoc.exists()) {
      return formatPatientData(patientDoc.data(), patientId, patientId);
    }
    return null;
  },

  async updateUserProfile(patientId: string, updates: any) {
    const patientRef = doc(db, 'patients', patientId);
    return await updateDoc(patientRef, {
      ...updates,
      'timestamps.updatedAt': Timestamp.now()
    });
  },

  // --- Logs (Subcollection) ---
  async getChatHistory(patientId: string, limit = 50) {
    const chatRef = collection(db, 'patients', patientId, 'chatHistory');
    const q = query(chatRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addChatMessage(patientId: string, message: any) {
    const chatRef = collection(db, 'patients', patientId, 'chatHistory');
    return await addDoc(chatRef, {
      ...message,
      timestamp: Timestamp.now()
    });
  },

  async clearChatHistory(patientId: string) {
    const chatRef = collection(db, 'patients', patientId, 'chatHistory');
    const snapshot = await getDocs(chatRef);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    return await Promise.all(deletePromises);
  },

  // --- Activity Logs (New Subcollection) ---
  async getPatientLogs(patientId: string) {
    const logsRef = collection(db, 'patients', patientId, 'logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // --- Linked Pharmacies ---
  async getLinkedPharmacies(patientId: string) {
    const authRef = collection(db, 'patients', patientId, 'authorizedPharmacies');
    const snapshot = await getDocs(authRef);
    const pharmacyIds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fetch pharmacy details
    const pharmacies = await Promise.all(
      pharmacyIds.map(async (entry) => {
        try {
          const pharmDoc = await getDoc(doc(db, 'pharmacies', entry.id));
          if (pharmDoc.exists()) {
            const data = pharmDoc.data();
            return {
              id: entry.id,
              name: data.name || 'Unknown',
              address: data.address || {},
              phone: data.phone || '',
              relation: entry.relation || 'Patient',
            };
          }
          return { id: entry.id, name: entry.pharmacyName || 'Unknown', address: {}, phone: '', relation: entry.relation || 'Patient' };
        } catch { return { id: entry.id, name: entry.pharmacyName || 'Unknown', address: {}, phone: '', relation: entry.relation || 'Patient' }; }
      })
    );
    return pharmacies;
  },

  // --- Share Requests ---
  async getPatientShares(patientId: string) {
    const sharesRef = collection(db, 'shareRequests');
    const q = query(sharesRef, where('patientId', '==', patientId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((s: any) => ['pending', 'approved', 'rejected'].includes(s.status));
  },

  async getAllPharmacies() {
    const snapshot = await getDocs(collection(db, 'pharmacies'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};