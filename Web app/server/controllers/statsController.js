const { db } = require('../config/firebaseConfig');

exports.getStats = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    if (db) {
      // Fetch real counts for this specific pharmacy
      
      // Inventory count (from sub-collection)
      const inventorySnapshot = await db.collection('pharmacies')
        .doc(pharmacyId)
        .collection('inventory')
        .count()
        .get();

      // Patients count (Authorized patients via subcollection)
      const patientsSnapshot = await db.collectionGroup('authorizedPharmacies')
        .where('pharmacyId', '==', pharmacyId)
        .count()
        .get();
      
      // Basic stats
      const stats = {
        totalSales: 0, // Placeholder
        totalPatients: patientsSnapshot.data().count,
        lowStockItems: 0, // Would need a more complex query or client-side calc
        recentActivity: [] 
      };
      
      return res.status(200).json(stats);
    }
    res.status(500).json({ error: 'Database not connected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
