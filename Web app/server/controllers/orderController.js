const { db, admin } = require('../config/firebaseConfig');

/**
 * Get all orders directed to this pharmacy (across all patients)
 * GET /api/orders?status=pending
 */
exports.getPharmacyOrders = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    const statusFilter = req.query.status;

    // Step 1: Get all patients authorized for this pharmacy
    const authSnapshot = await db.collectionGroup('authorizedPharmacies')
      .where('pharmacyId', '==', pharmacyId)
      .get();

    const patientIds = authSnapshot.docs.map(doc => doc.ref.parent.parent.id);

    if (patientIds.length === 0) {
      return res.status(200).json([]);
    }

    // Step 2: Fetch orders from each patient
    const allOrders = [];
    for (const patientId of patientIds) {
      const ordersRef = db.collection('patients').doc(patientId).collection('orders');
      const snapshot = await ordersRef.orderBy('createdAt', 'desc').get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        // Only include orders directed to this pharmacy
        if (data.pharmacyId !== pharmacyId) continue;
        if (statusFilter && statusFilter !== 'all' && data.status !== statusFilter) continue;

        // Get patient info for smart suggestions
        const patientDoc = await db.collection('patients').doc(patientId).get();
        const patientData = patientDoc.exists ? patientDoc.data() : {};

        // Get medication details for course length
        const medsSnapshot = await db.collection('patients').doc(patientId).collection('medications').get();
        const patientMeds = {};
        medsSnapshot.docs.forEach(medDoc => {
          const medData = medDoc.data();
          patientMeds[(medData.name || '').toLowerCase()] = medData;
        });

        // Enrich items with course info
        const enrichedItems = (data.items || []).map(item => {
          const prescription = patientMeds[(item.medicationName || '').toLowerCase()];
          return {
            ...item,
            courseLength: prescription?.duration || null,
            startDate: prescription?.startDate?.toDate?.() || prescription?.startDate || null,
            prescribedBy: prescription?.prescribedBy || null,
            frequency: prescription?.frequency || null,
          };
        });

        // Build smart suggestion
        const allergies = patientData.medicalSummary?.allergies || [];
        const conditions = patientData.medicalSummary?.chronicConditions || [];
        let smartNote = '';
        if (allergies.length > 0) {
          smartNote += `⚠️ Patient allergies: ${allergies.join(', ')}. `;
        }
        if (conditions.length > 0) {
          smartNote += `📋 Conditions: ${conditions.join(', ')}. `;
        }

        allOrders.push({
          id: doc.id,
          patientId,
          ...data,
          items: enrichedItems,
          patientName: data.patientName || `${patientData.personalInfo?.firstName || ''} ${patientData.personalInfo?.lastName || ''}`.trim(),
          patientAllergies: allergies,
          patientConditions: conditions,
          smartNote: smartNote || null,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        });
      }
    }

    // Sort by createdAt descending
    allOrders.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.status(200).json(allOrders);
  } catch (error) {
    console.error('[Orders] Get pharmacy orders error:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Validate an order — smart checks
 * GET /api/orders/:patientId/:orderId/validate
 */
exports.validateOrder = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    const { patientId, orderId } = req.params;

    // Get order
    const orderDoc = await db.collection('patients').doc(patientId)
      .collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();
    if (order.pharmacyId !== pharmacyId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const warnings = [];
    const errors = [];

    // --- CHECK 1: Inventory availability ---
    const inventoryRef = db.collection('pharmacies').doc(pharmacyId).collection('inventory');
    const inventorySnapshot = await inventoryRef.get();
    const inventoryMap = {};
    inventorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      inventoryMap[data.name?.toLowerCase()] = { id: doc.id, ...data };
    });

    for (const item of (order.items || [])) {
      const medName = (item.medicationName || '').toLowerCase();
      const match = inventoryMap[medName];
      if (!match) {
        errors.push({
          type: 'out_of_stock',
          severity: 'red',
          message: `"${item.medicationName}" not found in pharmacy inventory.`
        });
      } else if (match.quantity < item.quantity) {
        warnings.push({
          type: 'low_stock',
          severity: 'yellow',
          message: `"${item.medicationName}" — only ${match.quantity} in stock, ${item.quantity} requested.`
        });
      }
    }

    // --- CHECK 2: Prescription validity (duration check) ---
    const medsRef = db.collection('patients').doc(patientId).collection('medications');
    const medsSnapshot = await medsRef.get();
    const patientMeds = {};
    medsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      patientMeds[(data.name || '').toLowerCase()] = data;
    });

    for (const item of (order.items || [])) {
      const medName = (item.medicationName || '').toLowerCase();
      const prescription = patientMeds[medName];

      if (prescription && prescription.startDate && prescription.duration) {
        const startDate = prescription.startDate?.toDate?.() 
          ? prescription.startDate.toDate() 
          : new Date(prescription.startDate);
        
        // Parse duration like "14 days", "2 weeks", "1 month"
        const durationDays = parseDurationToDays(prescription.duration);
        
        if (durationDays > 0) {
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + durationDays);
          
          if (new Date() > endDate) {
            warnings.push({
              type: 'course_completed',
              severity: 'yellow',
              message: `"${item.medicationName}" — prescription course completed on ${endDate.toLocaleDateString()}. Verify before approving.`
            });
          }
        }
      }
    }

    const overallStatus = errors.length > 0 ? 'red' : warnings.length > 0 ? 'yellow' : 'green';

    res.status(200).json({
      overallStatus,
      statusMessage: overallStatus === 'green' 
        ? 'All checks passed — ready for approval.'
        : overallStatus === 'yellow'
          ? 'Warnings detected — review before approving.'
          : 'Issues detected — action required.',
      errors,
      warnings,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Orders] Validate error:', error.message);
    res.status(500).json({ error: 'Failed to validate order' });
  }
};

/**
 * Respond to an order (approve/reject)
 * PUT /api/orders/:patientId/:orderId/respond
 * Body: { action: 'approve' | 'reject', notes?: string }
 */
exports.respondToOrder = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    const pharmacyName = req.user.name || 'Unknown Pharmacy';
    const { patientId, orderId } = req.params;
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const orderRef = db.collection('patients').doc(patientId)
      .collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderDoc.data();
    if (order.pharmacyId !== pharmacyId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order already ${order.status}` });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await orderRef.update({
      status: newStatus,
      pharmacyNotes: notes || '',
      respondedBy: pharmacyId,
      respondedByName: pharmacyName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // --- Update inventory on approval ---
    if (action === 'approve') {
      const inventoryRef = db.collection('pharmacies').doc(pharmacyId).collection('inventory');
      const inventorySnapshot = await inventoryRef.get();
      const inventoryMap = {};
      inventorySnapshot.docs.forEach(doc => {
        inventoryMap[doc.data().name?.toLowerCase()] = { ref: doc.ref, ...doc.data() };
      });

      for (const item of (order.items || [])) {
        const match = inventoryMap[(item.medicationName || '').toLowerCase()];
        if (match && match.quantity >= item.quantity) {
          await match.ref.update({
            quantity: admin.firestore.FieldValue.increment(-item.quantity)
          });
        }
      }
    }

    // --- Log the action ---
    await db.collection('patients').doc(patientId).collection('logs').add({
      action: action === 'approve' ? 'Order Approved' : 'Order Rejected',
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} by ${pharmacyName}${notes ? '. Notes: ' + notes : ''}`,
      orderId,
      performedBy: pharmacyId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      message: `Order ${newStatus}`,
      status: newStatus 
    });
  } catch (error) {
    console.error('[Orders] Respond error:', error.message);
    res.status(500).json({ error: 'Failed to respond to order' });
  }
};

// --- Helper: parse duration string to days ---
function parseDurationToDays(duration) {
  if (!duration || typeof duration !== 'string') return 0;
  const lower = duration.toLowerCase().trim();
  
  const match = lower.match(/^(\d+)\s*(day|days|week|weeks|month|months)$/);
  if (!match) return 0;
  
  const num = parseInt(match[1]);
  const unit = match[2];
  
  if (unit.startsWith('day')) return num;
  if (unit.startsWith('week')) return num * 7;
  if (unit.startsWith('month')) return num * 30;
  return 0;
}
