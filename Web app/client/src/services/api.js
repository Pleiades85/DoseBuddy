import { auth } from '../firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Centralized API client — handles token injection, error handling, and response parsing.
 * All API calls should go through this wrapper.
 */
const apiClient = async (endpoint, options = {}) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  const token = await currentUser.getIdToken();
  
  const config = {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  // Only set Content-Type for JSON bodies (not FormData)
  if (options.body && !(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || errorData.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json();
};

// ---- Inventory ----
export const fetchInventory = (limit = 10, startAfter = null) => {
  let url = `/inventory?limit=${limit}`;
  if (startAfter) url += `&startAfter=${startAfter}`;
  return apiClient(url);
};

export const addInventoryItem = (item) => {
  return apiClient('/inventory', {
    method: 'POST',
    body: JSON.stringify(item),
  });
};

// ---- Patients ----
export const fetchPatients = () => apiClient('/patients');

export const addPatient = (patientData) => {
  return apiClient('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
};

export const updatePatient = (id, updates) => {
  return apiClient(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const linkPatient = (data) => {
  return apiClient('/patients/link', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const fetchPatientById = (id) => apiClient(`/patients/${id}`);

export const regenerateAccessCode = (id, sharedWith, relation) => {
  return apiClient(`/patients/${id}/access-code`, {
    method: 'POST',
    body: JSON.stringify({ sharedWith, relation }),
  });
};

export const analyzePrescription = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient(`/patients/upload-prescription/${id}`, {
    method: 'POST',
    body: formData,
  });
};

export const confirmPrescription = (id, data) => {
  return apiClient(`/patients/confirm-prescription/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const fetchPatientLogs = (id, limit = 20) => {
  return apiClient(`/patients/${id}/logs?limit=${limit}`);
};

// ---- Stats ----
export const fetchStats = () => apiClient('/stats');

// ---- Pharmacy Profile ----
export const fetchPharmacyProfile = () => apiClient('/pharmacy/profile');

export const updatePharmacyProfile = (updates) => {
  return apiClient('/pharmacy/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

// ---- Share Requests ----
export const fetchShareRequests = (status = 'pending') => 
  apiClient(`/shares/incoming?status=${status}`);

export const respondToShareRequest = (id, action) => {
  return apiClient(`/shares/${id}/respond`, {
    method: 'PUT',
    body: JSON.stringify({ action }),
  });
};

// ---- Orders ----
export const fetchPharmacyOrders = (status = 'all') => 
  apiClient(`/orders?status=${status}`);

export const validateOrder = (patientId, orderId) => 
  apiClient(`/orders/${patientId}/${orderId}/validate`);

export const respondToOrder = (patientId, orderId, action, notes = '') => {
  return apiClient(`/orders/${patientId}/${orderId}/respond`, {
    method: 'PUT',
    body: JSON.stringify({ action, notes }),
  });
};

// ---- Notifications ----
export const fetchNotifications = () => apiClient('/notifications');

export const markNotificationRead = (id) => {
  return apiClient(`/notifications/${id}/read`, {
    method: 'PUT',
  });
};
