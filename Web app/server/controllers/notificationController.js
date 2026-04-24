const { db } = require('../config/firebaseConfig');

/**
 * Get real notifications for the authenticated pharmacy
 * GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;

    const snapshot = await db.collection('pharmacies').doc(pharmacyId)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('[Notifications] Get error:', error.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    const { id } = req.params;

    await db.collection('pharmacies').doc(pharmacyId)
      .collection('notifications').doc(id)
      .update({ read: true });

    res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('[Notifications] Mark read error:', error.message);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};
