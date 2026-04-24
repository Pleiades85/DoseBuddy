export interface User {
  id: string;
  patientRecordId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    email: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    status: 'active' | 'inactive';
    updatedAt?: string | null;
  };
  medicalSummary: {
    bloodType: string;
    allergies: string[];
    chronicConditions: string[];
    height: string;
    weight: string;
    notes: string;
    lastPrescriptionUpload?: string | null;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  assignedPharmacy: {
    pharmacyId: string;
    pharmacyName: string;
    createdAt: string | null;
    createdBy: string;
  };
  timestamps: {
    createdAt: string | null;
    updatedAt: string | null;
    lastLoginAt: string | null;
  };
  relation?: 'Patient' | 'Family' | 'Caregiver';
  roleName?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedAt?: string | null;
  // Optional fields for UI compatibility or future expansion
  type?: string;
  instructions?: string;
  sideEffects?: string[];
  price?: number;
  scannedImage?: string;
  prescribedBy?: string;
  pharmacyId?: string;
  pharmacyName?: string;
  startDate?: string | null;
  manufacturer?: string;
  activeIngredient?: string;
  refillsRemaining?: number;
  isActive?: boolean;
  isPharmacy?: boolean;
  timestamp?: string | null;
}

export interface Reminder {
  id: string;
  medication: string;
  time: string;
  days: string[];
  enabled: boolean;
  isPharmacy?: boolean;
  note?: string;
  createdAt?: string | null;
}

export interface Log {
  id: string;
  action: string;
  details: string;
  pharmacyId: string;
  pharmacyName: string;
  timestamp: string | null;
}

export interface CartItem {
  medication: Medication;
  quantity: number;
  pharmacyId: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  pharmacyId: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  distance: string;
  deliveryTime: string;
}

export interface PrescriptionImage {
  id?: string;
  url: string;
  imageId?: string;
  uploadedAt: string | null;
}