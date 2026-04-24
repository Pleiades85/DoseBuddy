import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collectionGroup, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { formatPatientData, isValidDOB, sanitizeInput, sha256 } from '../utils/helpers';

const USER_ID_KEY = '@dosebuddy_userId';
const PATIENT_ID_KEY = '@dosebuddy_patientId';
const RELATION_KEY = '@dosebuddy_relation';
const ROLE_NAME_KEY = '@dosebuddy_roleName';

export const authService = {
  // Check authentication state
  checkAuthState: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Get stored user session
  async getStoredSession() {
    try {
      const userId = await AsyncStorage.getItem(USER_ID_KEY);
      const patientId = await AsyncStorage.getItem(PATIENT_ID_KEY);
      const relation = await AsyncStorage.getItem(RELATION_KEY) as 'Patient' | 'Family' | 'Caregiver' | null;
      const roleName = await AsyncStorage.getItem(ROLE_NAME_KEY);

      console.log('Checking stored session - userId:', userId, 'patientId:', patientId, 'relation:', relation);

      if (userId && patientId) {
        // Load patient data from Firestore
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        if (patientDoc.exists()) {
          const patientData = patientDoc.data();

          return {
            userId,
            patientId,
            patientData: formatPatientData(
              patientData, 
              userId, 
              patientId, 
              relation || undefined, 
              roleName || undefined
            )
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting stored session:', error);
      return null;
    }
  },

  // Store user session
  async storeSession(
    userId: string, 
    patientId: string, 
    relation?: 'Patient' | 'Family' | 'Caregiver',
    roleName?: string
  ) {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      await AsyncStorage.setItem(PATIENT_ID_KEY, patientId);
      
      if (relation) {
        await AsyncStorage.setItem(RELATION_KEY, relation);
      } else {
        await AsyncStorage.removeItem(RELATION_KEY);
      }

      if (roleName) {
        await AsyncStorage.setItem(ROLE_NAME_KEY, roleName);
      } else {
        await AsyncStorage.removeItem(ROLE_NAME_KEY);
      }

      console.log('Session stored - userId:', userId, 'patientId:', patientId, 'relation:', relation);
    } catch (error) {
      console.error('Error storing session:', error);
    }
  },

  // Clear user session
  async clearSession() {
    try {
      await AsyncStorage.removeItem(USER_ID_KEY);
      await AsyncStorage.removeItem(PATIENT_ID_KEY);
      await AsyncStorage.removeItem(RELATION_KEY);
      await AsyncStorage.removeItem(ROLE_NAME_KEY);
      console.log('Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  },

  // QR Code Login
  loginWithQR: async (qrData: string | { qrCode: string }) => {
    try {
      // Extract string if input is an object (passed from login.tsx)
      const rawData = (typeof qrData === 'object' && 'qrCode' in qrData) ? qrData.qrCode : qrData as string;

      // QR data format: JSON {"id":"...", "code":"...", "relation":"...", "name":"...", "recipient":"..."} OR "patient:{patientId}" OR just "{patientId}" OR URL
      let patientId = rawData.trim();
      let relation: 'Patient' | 'Family' | 'Caregiver' | undefined;
      let roleName: string | undefined;

      console.log('Raw QR Data:', patientId);

      // Try parsing as JSON first
      try {
        if (patientId.startsWith('{') && patientId.endsWith('}')) {
          const json = JSON.parse(patientId);
          if (json.id) {
            patientId = json.id;
            if (json.relation) {
              relation = json.relation;
            }
            // Use recipient field for the relative/caregiver's name
            if (json.recipient) {
              roleName = json.recipient;
            }
            console.log('Parsed JSON, found id:', patientId, 'relation:', relation, 'name:', roleName);
          }
        }
      } catch (e) {
        console.log('Not a valid JSON string, continuing with other formats');
      }

      // If it starts with "patient:", strip it
      if (patientId.startsWith('patient:')) {
        const parts = patientId.split(':');
        if (parts.length > 1) {
          patientId = parts[1];
        }
      }
      // Handle URLs (e.g. https://dosebuddy.com/patient/123)
      else if (patientId.includes('/')) {
        // Try to get the last segment
        const parts = patientId.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.length > 0) {
          patientId = lastPart;
        }
      }

      console.log('Extracted patientId:', patientId);

      const patientDoc = await getDoc(doc(db, 'patients', patientId));
      if (!patientDoc.exists()) throw new Error('Patient not found');

      const patientData = patientDoc.data();

      // Check if patient is active
      const status = patientData.personalInfo?.status || 'active';

      if (status !== 'active') {
        throw new Error('Patient account is not active. Please contact your pharmacy.');
      }

      // Use patientId as userId for consistency
      const userId = patientId;

      // Update last login in patient record
      await authService.updateUserLastLogin(patientId);

      // Store session locally
      await authService.storeSession(userId, patientId, relation, roleName);

      return {
        user: { uid: userId },
        patientData: formatPatientData(patientData, userId, patientId, relation, roleName)
      };
    } catch (error: any) {
      console.error('QR Login error:', error);
      throw new Error(error.message || 'Failed to login with QR code');
    }
  },

  // Code + Last Name + DOB Login
  loginWithCode: async (credentials: { code: string; lastName: string; dob: string }) => {
    try {
      const { code, lastName, dob } = credentials;

      // Validate and sanitize inputs
      if (!code || !lastName || !dob) {
        throw new Error('Please fill in all fields');
      }

      // Validate date of birth format
      if (!isValidDOB(dob.trim())) {
        throw new Error('Invalid date of birth format. Please use DD/MM/YYYY');
      }

      // Sanitize inputs to prevent injection attacks
      const sanitizedCode = sanitizeInput(code, 10);
      const sanitizedLastName = sanitizeInput(lastName, 50);

      console.log('Attempting login with:', { code: sanitizedCode, lastName: sanitizedLastName, dob });

      // Hash the access code
      const codeHash = await sha256(sanitizedCode.toUpperCase());
      console.log('Hashed access code:', codeHash);

      // Query accessCodes subcollection across all patients
      const accessCodesQuery = query(
        collectionGroup(db, 'accessCodes'),
        where('accessCodeHash', '==', codeHash)
      );

      const accessCodeDocs = await getDocs(accessCodesQuery);

      if (accessCodeDocs.empty) {
        throw new Error('Invalid access code');
      }

      // Assuming access code is unique, get the first match
      const accessCodeDoc = accessCodeDocs.docs[0];

      // Get the parent patient document ID
      // Structure: patients/{patientId}/accessCodes/{accessCodeId}
      const patientRef = accessCodeDoc.ref.parent.parent;

      if (!patientRef) {
        throw new Error('System error: Orphaned access code');
      }

      const patientId = patientRef.id;
      const patientDoc = await getDoc(patientRef);

      if (!patientDoc.exists()) {
        throw new Error('Patient record not found');
      }

      const patientData = patientDoc.data();
      const accessCodeData = accessCodeDoc.data();
      const relation = accessCodeData.relation as 'Patient' | 'Family' | 'Caregiver' | undefined;
      // Prioritize sharedWith (new), then recipient (legacy), then name (legacy)
      const roleName = (accessCodeData.sharedWith || accessCodeData.recipient || accessCodeData.name) as string | undefined;

      // Verify Last Name (case-insensitive)
      const storedLastName = patientData.personalInfo?.lastName || '';
      if (storedLastName.toLowerCase() !== sanitizedLastName.toLowerCase()) {
        throw new Error('Last name does not match our records');
      }

      // Verify DOB
      // Stored DOB might be "YYYY-MM-DD" or "DD/MM/YYYY" or Timestamp
      // The input dob is "DD/MM/YYYY" (validated above)
      const storedDOB = patientData.personalInfo?.dateOfBirth;

      let dobMatches = false;
      if (storedDOB) {
        if (storedDOB === dob) {
          dobMatches = true;
        } else {
          // Try converting stored YYYY-MM-DD to DD/MM/YYYY
          const parts = storedDOB.split('-');
          if (parts.length === 3) {
            const formattedStoredDOB = `${parts[2]}/${parts[1]}/${parts[0]}`;
            if (formattedStoredDOB === dob) {
              dobMatches = true;
            }
          }
        }
      }

      if (!dobMatches) {
        console.log('DOB Mismatch:', { input: dob, stored: storedDOB });
        throw new Error('Date of birth does not match our records');
      }

      // Check if patient is active
      const status = patientData.personalInfo?.status || 'active';
      if (status !== 'active') {
        throw new Error('Patient account is not active. Please contact your pharmacy.');
      }

      // Use patientId as userId
      const userId = patientId;

      // Update last login
      await authService.updateUserLastLogin(patientId);

      // Store session
      await authService.storeSession(userId, patientId, relation, roleName);

      return {
        user: { uid: userId },
        patientData: formatPatientData(patientData, userId, patientId, relation, roleName)
      };

    } catch (error: any) {
      console.error('Code Login error:', error);
      // If the error is about missing index, inform the user
      if (error.code === 'failed-precondition') {
        throw new Error('System configuration error: Missing index for access codes. Please contact support.');
      }
      throw new Error(error.message || 'Login failed. Please try again.');
    }
  },

  // Update user last login
  async updateUserLastLogin(patientId: string) {
    try {
      const patientRef = doc(db, 'patients', patientId);
      await updateDoc(patientRef, {
        'timestamps.lastLoginAt': Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating user last login:', error);
    }
  },

  // Logout
  logout: async () => {
    try {
      await authService.clearSession();
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
};