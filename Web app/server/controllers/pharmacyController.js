const { db } = require('../config/firebaseConfig');

/**
 * Get the authenticated pharmacy's profile
 */
exports.getProfile = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;

    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const doc = await db.collection('pharmacies').doc(pharmacyId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Pharmacy profile not found' });

    const data = doc.data();
    // Strip sensitive fields before sending
    const { role, ...profileData } = data;

    return res.status(200).json({ id: doc.id, ...profileData });
  } catch (error) {
    console.error('[Pharmacy] Get profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch pharmacy profile' });
  }
};

/**
 * Update the authenticated pharmacy's profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    const updates = req.body;

    if (!db) return res.status(500).json({ error: 'Database not connected' });

    // Whitelist of updatable fields — prevent role escalation
    const allowedFields = ['name', 'phone', 'managerName', 'licenseNumber', 'address'];
    const sanitizedUpdates = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    sanitizedUpdates.updatedAt = new Date();

    await db.collection('pharmacies').doc(pharmacyId).update(sanitizedUpdates);

    return res.status(200).json({ message: 'Profile updated successfully', ...sanitizedUpdates });
  } catch (error) {
    console.error('[Pharmacy] Update profile error:', error.message);
    res.status(500).json({ error: 'Failed to update pharmacy profile' });
  }
};
