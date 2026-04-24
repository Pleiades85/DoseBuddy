// services/patientManagement.ts
// Helper functions for pharmacy/admin to manage patients

import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  query,
  where,
  getDocs,
  Timestamp 
} from 'firebase/firestore';

export interface PatientData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string; // DD/MM/YYYY
    gender: 'Male' | 'Female' | 'Other';
    address: string;
    city: string;
    state: string;
    zipCode: string;
    profileImage?: string;
  };
  medicalInfo: {
    bloodType: string;
    height?: string;
    weight?: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications?: string[];
    notes?: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  assignedPharmacy: {
    pharmacyId: string;
    pharmacyName: string;
  };
}

export const patientManagement = {
  /**
   * Generate unique access code for patient
   */
  generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  /**
   * Generate QR code data for patient
   */
  generateQRCode(patientId: string): string {
    return `patient:${patientId}`;
  },

  /**
   * Create a new patient in the system
   */
  async createPatient(
    patientData: PatientData,
    createdBy: string // pharmacyId or adminId
  ): Promise<{ patientId: string; accessCode: string }> {
    try {
      // Generate patient ID
      const patientRef = doc(collection(db, 'patients'));
      const patientId = patientRef.id;

      // Generate access credentials
      const accessCode = this.generateAccessCode();
      const qrCode = this.generateQRCode(patientId);

      // Create patient document
      const patientDoc = {
        ...patientData,
        accessCodes: {
          qrCode,
          accessCode,
          expiresAt: Timestamp.fromDate(
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          ),
          lastUsed: null
        },
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy,
        lastLoginAt: null
      };

      await setDoc(patientRef, patientDoc);

      return { patientId, accessCode };
    } catch (error) {
      console.error('Error creating patient:', error);
      throw new Error('Failed to create patient');
    }
  },

  /**
   * Update patient information
   */
  async updatePatient(
    patientId: string,
    updates: Partial<PatientData>
  ): Promise<void> {
    try {
      const patientRef = doc(db, 'patients', patientId);
      await updateDoc(patientRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating patient:', error);
      throw new Error('Failed to update patient');
    }
  },

  /**
   * Get patient by ID
   */
  async getPatient(patientId: string): Promise<any> {
    try {
      const patientRef = doc(db, 'patients', patientId);
      const patientDoc = await getDoc(patientRef);
      
      if (!patientDoc.exists()) {
        throw new Error('Patient not found');
      }
      
      return { id: patientDoc.id, ...patientDoc.data() };
    } catch (error) {
      console.error('Error getting patient:', error);
      throw error;
    }
  },

  /**
   * Search patients by name, email, or phone
   */
  async searchPatients(
    searchTerm: string,
    pharmacyId?: string
  ): Promise<any[]> {
    try {
      const patientsRef = collection(db, 'patients');
      let q;

      if (pharmacyId) {
        // Search within specific pharmacy
        q = query(
          patientsRef,
          where('assignedPharmacy.pharmacyId', '==', pharmacyId)
        );
      } else {
        q = query(patientsRef);
      }

      const snapshot = await getDocs(q);
      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side filtering by search term
      const searchLower = searchTerm.toLowerCase();
      return patients.filter(patient => {
        const fullName = `${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`.toLowerCase();
        const email = patient.personalInfo.email?.toLowerCase() || '';
        const phone = patient.personalInfo.phone || '';
        
        return fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               phone.includes(searchLower);
      });
    } catch (error) {
      console.error('Error searching patients:', error);
      throw new Error('Failed to search patients');
    }
  },

  /**
   * Get all patients for a pharmacy
   */
  async getPharmacyPatients(pharmacyId: string): Promise<any[]> {
    try {
      const patientsRef = collection(db, 'patients');
      const q = query(
        patientsRef,
        where('assignedPharmacy.pharmacyId', '==', pharmacyId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting pharmacy patients:', error);
      throw new Error('Failed to get pharmacy patients');
    }
  },

  /**
   * Activate/Deactivate patient
   */
  async updatePatientStatus(
    patientId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<void> {
    try {
      const patientRef = doc(db, 'patients', patientId);
      await updateDoc(patientRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating patient status:', error);
      throw new Error('Failed to update patient status');
    }
  },

  /**
   * Regenerate access code for patient
   */
  async regenerateAccessCode(patientId: string): Promise<string> {
    try {
      const newAccessCode = this.generateAccessCode();
      const patientRef = doc(db, 'patients', patientId);
      
      await updateDoc(patientRef, {
        'accessCodes.accessCode': newAccessCode,
        'accessCodes.expiresAt': Timestamp.fromDate(
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        ),
        updatedAt: Timestamp.now()
      });

      return newAccessCode;
    } catch (error) {
      console.error('Error regenerating access code:', error);
      throw new Error('Failed to regenerate access code');
    }
  },

  /**
   * Add medication to patient's list (by pharmacy)
   */
  async addMedicationToPatient(
    patientId: string,
    userId: string,
    medication: {
      name: string;
      genericName?: string;
      dosage: string;
      type: string;
      frequency: string;
      instructions: string;
      prescribedBy: string;
      startDate: Date;
      endDate?: Date;
      refillsRemaining?: number;
      price?: number;
      pharmacyId: string;
    }
  ): Promise<void> {
    try {
      const medicationRef = doc(collection(db, 'patients', patientId, 'medications'));
      
      await setDoc(medicationRef, {
        ...medication,
        isActive: true,
        startDate: Timestamp.fromDate(medication.startDate),
        endDate: medication.endDate ? Timestamp.fromDate(medication.endDate) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding medication:', error);
      throw new Error('Failed to add medication');
    }
  },

  /**
   * Update patient's medical info (allergies, conditions, etc.)
   */
  async updateMedicalInfo(
    patientId: string,
    medicalInfo: Partial<PatientData['medicalInfo']>
  ): Promise<void> {
    try {
      const patientRef = doc(db, 'patients', patientId);
      await updateDoc(patientRef, {
        medicalInfo,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating medical info:', error);
      throw new Error('Failed to update medical info');
    }
  },

  /**
   * Get patient statistics for pharmacy dashboard
   */
  async getPharmacyStats(pharmacyId: string): Promise<{
    totalPatients: number;
    activePatients: number;
    pendingOrders: number;
    todayOrders: number;
  }> {
    try {
      // Get total patients
      const patientsRef = collection(db, 'patients');
      const patientsQuery = query(
        patientsRef,
        where('assignedPharmacy.pharmacyId', '==', pharmacyId)
      );
      const patientsSnapshot = await getDocs(patientsQuery);
      
      const totalPatients = patientsSnapshot.size;
      const activePatients = patientsSnapshot.docs.filter(
        doc => doc.data().status === 'active'
      ).length;

      // Get pending orders (this would need to iterate through users)
      // For now, returning mock data - implement full logic in pharmacy web app
      
      return {
        totalPatients,
        activePatients,
        pendingOrders: 0, // Implement in pharmacy app
        todayOrders: 0     // Implement in pharmacy app
      };
    } catch (error) {
      console.error('Error getting pharmacy stats:', error);
      throw new Error('Failed to get pharmacy stats');
    }
  }
};

// Export types
export type { PatientData };