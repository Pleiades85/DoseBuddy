import * as Crypto from 'expo-crypto';
import { User } from '../store/types';

/**
 * Helper utilities for patient data formatting and manipulation
 */

/**
 * Formats raw Firestore patient data into a consistent structure matching the User interface
 * @param patientData - Raw patient data from Firestore
 * @param userId - User ID (auth UID)
 * @param patientId - Patient record ID (Firestore document ID)
 * @returns Formatted User object
 */
const formatTimestamp = (timestamp: any): string | null => {
    if (!timestamp) return null;
    // Handle Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    // Handle Date object
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    // Handle string (assume already formatted or ISO)
    if (typeof timestamp === 'string') {
        return timestamp;
    }
    return null;
};

export const formatPatientData = (
    patientData: any,
    userId: string,
    patientId: string,
    relation?: 'Patient' | 'Family' | 'Caregiver',
    roleName?: string
): User => {
    const {
        personalInfo = {},
        medicalSummary = {},
        insurance = {},
        emergencyContact = {},
        assignedPharmacy = {},
        timestamps = {}
    } = patientData;

    return {
        id: userId,
        patientRecordId: patientId,
        personalInfo: {
            firstName: personalInfo.firstName || '',
            lastName: personalInfo.lastName || '',
            dateOfBirth: personalInfo.dateOfBirth || '',
            gender: personalInfo.gender || '',
            phone: personalInfo.phone || '',
            email: personalInfo.email || '',
            address: personalInfo.address || '',
            city: personalInfo.city || '',
            state: personalInfo.state || '',
            zipCode: personalInfo.zipCode || '',
            status: personalInfo.status || 'active',
            updatedAt: formatTimestamp(personalInfo.updatedAt)
        },
        medicalSummary: {
            bloodType: medicalSummary.bloodType || '',
            allergies: medicalSummary.allergies || [],
            chronicConditions: medicalSummary.chronicConditions || [],
            height: medicalSummary.height || '',
            weight: medicalSummary.weight || '',
            notes: medicalSummary.notes || '',
            lastPrescriptionUpload: formatTimestamp(medicalSummary.lastPrescriptionUpload)
        },
        insurance: {
            provider: insurance.provider || '',
            policyNumber: insurance.policyNumber || '',
            groupNumber: insurance.groupNumber || ''
        },
        emergencyContact: {
            name: emergencyContact.name || '',
            phone: emergencyContact.phone || '',
            relationship: emergencyContact.relationship || '',
            email: emergencyContact.email || ''
        },
        assignedPharmacy: {
            pharmacyId: assignedPharmacy.pharmacyId || '',
            pharmacyName: assignedPharmacy.pharmacyName || '',
            createdAt: formatTimestamp(assignedPharmacy.createdAt),
            createdBy: assignedPharmacy.createdBy || ''
        },
        timestamps: {
            createdAt: formatTimestamp(timestamps.createdAt),
            updatedAt: formatTimestamp(timestamps.updatedAt),
            lastLoginAt: formatTimestamp(timestamps.lastLoginAt)
        },
        relation: relation,
        roleName: roleName
    };
};

/**
 * Validates patient data before processing
 * @param patientData - Patient data to validate
 * @returns true if valid, throws error if invalid
 */
export const validatePatientData = (patientData: any): boolean => {
    if (!patientData) {
        throw new Error('Patient data is required');
    }

    if (!patientData.personalInfo) {
        throw new Error('Personal information is required');
    }

    const { firstName, lastName, dateOfBirth } = patientData.personalInfo;

    if (!firstName || !lastName) {
        throw new Error('First name and last name are required');
    }

    if (!dateOfBirth) {
        throw new Error('Date of birth is required');
    }

    return true;
};

/**
 * Sanitizes user input to prevent injection attacks
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string, maxLength: number = 200): string => {
    if (!input) return '';

    return input
        .trim()
        .replace(/[<>]/g, '') // Remove HTML/XML tags
        .replace(/[{}]/g, '') // Remove curly braces
        .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces
        .slice(0, maxLength);
};

/**
 * Validates email format
 * @param email - Email to validate
 * @returns true if valid email format
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates phone number format
 * @param phone - Phone number to validate
 * @returns true if valid phone format
 */
export const isValidPhone = (phone: string): boolean => {
    // Accepts formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Formats date to DD/MM/YYYY
 * @param date - Date object or string
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Validates date of birth format (DD/MM/YYYY)
 * @param dob - Date of birth string
 * @returns true if valid format
 */
export const isValidDOB = (dob: string): boolean => {
    const dobRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    return dobRegex.test(dob);
};

/**
 * Simple SHA-256 hash function for access codes
 * @param message - String to hash
 * @returns Hex string of the hash
 */
export const sha256 = async (message: string): Promise<string> => {
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        message
    );
    return digest;
};
