const { db } = require('../config/firebaseConfig');

exports.getAllInventory = async (req, res) => {
  try {
    const { limit = 10, startAfter } = req.query;
    const pharmacyId = req.user.uid;
    
    if (db) {
      const inventoryRef = db.collection('pharmacies').doc(pharmacyId).collection('inventory');
      let query = inventoryRef.orderBy('name').limit(parseInt(limit));
      
      if (startAfter) {
        const doc = await inventoryRef.doc(startAfter).get();
        if (doc.exists) {
          query = query.startAfter(doc);
        }
      }

      const snapshot = await query.get();
      const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json(inventory);
    }
    res.status(500).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('[Inventory] Get all error:', error.message);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

exports.addItem = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(500).json({ error: 'Internal Server Error: User not authenticated' });
    }
    const newItem = req.body;
    const pharmacyId = req.user.uid;

    if (db) {
      const docRef = await db.collection('pharmacies').doc(pharmacyId).collection('inventory').add({
        ...newItem,
        createdAt: new Date()
      });
      
      // Trigger Notification
      await db.collection('pharmacies').doc(pharmacyId).collection('notifications').add({
        message: `New item added: ${newItem.name}`,
        type: 'inventory',
        createdAt: new Date(),
        read: false
      });
      
      return res.status(201).json({ id: docRef.id, ...newItem });
    }
    res.status(500).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('[Inventory] Add item error:', error.message);
    res.status(500).json({ error: 'Failed to add item' });
  }
};
