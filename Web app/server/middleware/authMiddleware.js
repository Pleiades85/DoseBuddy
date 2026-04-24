const { admin, auth, db } = require('../config/firebaseConfig');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  // Development mock mode — only when explicitly enabled
  if (!auth && process.env.NODE_ENV === 'development') {
    req.user = { uid: 'mock_user_id', email: 'mock@pharmacy.com', role: 'pharmacy', name: 'Mock Pharmacy' };
    return next();
  }

  if (!auth) {
    return res.status(503).json({ message: 'Authentication service unavailable' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is a pharmacy
    const pharmacyDoc = await db.collection('pharmacies').doc(decodedToken.uid).get();
    
    if (pharmacyDoc.exists) {
      const pharmacyData = pharmacyDoc.data();
      req.user = { 
        uid: decodedToken.uid, 
        email: decodedToken.email, 
        role: 'pharmacy', 
        name: pharmacyData.name,
        // Only include non-sensitive pharmacy fields
        licenseNumber: pharmacyData.licenseNumber
      };
    } else {
      req.user = { uid: decodedToken.uid, email: decodedToken.email, role: 'patient' };
    }

    next();
  } catch (error) {
    // Log failed authentication attempts (without the token itself)
    console.warn(`[AUTH] Failed authentication attempt from ${req.ip} - ${error.code || error.message}`);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token expired. Please sign in again.' });
    }
    
    res.status(403).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = verifyToken;
