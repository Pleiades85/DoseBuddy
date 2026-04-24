/**
 * Input validation middleware using lightweight validation.
 * Validates request body, params, or query against provided rules.
 */

// --- Sanitization Helpers ---
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item));
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// --- Validation Rules ---
const validationRules = {
  addPatient: (body) => {
    const errors = [];
    if (!body.personalInfo) errors.push('personalInfo is required');
    else {
      if (!body.personalInfo.firstName?.trim()) errors.push('First name is required');
      if (!body.personalInfo.lastName?.trim()) errors.push('Last name is required');
      if (!body.personalInfo.dateOfBirth) errors.push('Date of birth is required');
      if (!body.personalInfo.email?.trim()) errors.push('Email is required');
      if (body.personalInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.personalInfo.email)) {
        errors.push('Invalid email format');
      }
    }
    if (!body.medicalInfo) errors.push('medicalInfo is required');
    return errors;
  },

  updatePatient: (body) => {
    const errors = [];
    if (body.personalInfo?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.personalInfo.email)) {
      errors.push('Invalid email format');
    }
    return errors;
  },

  addInventoryItem: (body) => {
    const errors = [];
    if (!body.name?.trim()) errors.push('Item name is required');
    if (body.quantity == null || body.quantity < 0) errors.push('Quantity must be >= 0');
    return errors;
  },

  linkPatient: (body) => {
    const errors = [];
    if (!body.accessCode && !body.qrCode) errors.push('Access code or QR code is required');
    if (body.accessCode && !/^\d{6}$/.test(body.accessCode)) errors.push('Access code must be 6 digits');
    if (!body.lastName?.trim()) errors.push('Last name is required');
    if (!body.dateOfBirth) errors.push('Date of birth is required');
    return errors;
  },

  confirmPrescription: (body) => {
    const errors = [];
    if (!body.medications && !body.reminders) errors.push('At least medications or reminders required');
    if (body.medications && !Array.isArray(body.medications)) errors.push('Medications must be an array');
    if (body.reminders && !Array.isArray(body.reminders)) errors.push('Reminders must be an array');
    return errors;
  },

  regenerateAccessCode: (body) => {
    const errors = [];
    const validRelations = ['Patient', 'Family', 'Caregiver'];
    if (body.relation && !validRelations.includes(body.relation)) {
      errors.push(`Relation must be one of: ${validRelations.join(', ')}`);
    }
    return errors;
  }
};

// --- Middleware Factory ---
const validateRequest = (ruleName) => {
  return (req, res, next) => {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    const rule = validationRules[ruleName];
    if (!rule) return next();

    const errors = rule(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors 
      });
    }

    next();
  };
};

module.exports = { validateRequest, sanitizeObject, sanitizeString };
