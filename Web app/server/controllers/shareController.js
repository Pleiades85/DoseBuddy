const { db, admin } = require('../config/firebaseConfig');

const MAX_PHARMACY_SHARES = 5;
const MAX_FAMILY_SHARES = 5;

/**
 * Create a share request (from patient mobile app OR pharmacy dashboard)
 * POST /api/shares
 * Body: { patientId, pharmacyId?, type: 'pharmacy' | 'family', pharmacyName?, sharedWith?, relation? }
 */
exports.createShareRequest = async (req, res) => {
  try {
    const { patientId, pharmacyId, type, pharmacyName, sharedWith, relation } = req.body;
    const requesterId = req.user.uid;

    if (!patientId || !type) {
      return res.status(400).json({ error: 'patientId and type are required' });
    }

    if (type === 'pharmacy' && !pharmacyId) {
      return res.status(400).json({ error: 'pharmacyId is required for pharmacy shares' });
    }

    // --- Enforce share limits ---
    const existingShares = await db.collection('shareRequests')
      .where('patientId', '==', patientId)
      .where('type', '==', type)
      .where('status', 'in', ['pending', 'approved'])
      .get();

    const limit = type === 'pharmacy' ? MAX_PHARMACY_SHARES : MAX_FAMILY_SHARES;
    if (existingShares.size >= limit) {
      return res.status(400).json({ 
        error: `Maximum ${limit} ${type} shares reached. Revoke an existing share first.` 
      });
    }

    // --- Prevent duplicate pending requests ---
    if (type === 'pharmacy') {
      const duplicate = await db.collection('shareRequests')
        .where('patientId', '==', patientId)
        .where('pharmacyId', '==', pharmacyId)
        .where('status', 'in', ['pending', 'approved'])
        .get();

      if (!duplicate.empty) {
        return res.status(400).json({ error: 'A share request already exists for this pharmacy.' });
      }
    }

    // --- Get patient name for denormalization ---
    const patientDoc = await db.collection('patients').doc(patientId).get();
    const patientData = patientDoc.exists ? patientDoc.data() : {};
    const patientName = patientData.personalInfo 
      ? `${patientData.personalInfo.firstName || ''} ${patientData.personalInfo.lastName || ''}`.trim()
      : 'Unknown Patient';

    const shareRequest = {
      patientId,
      patientName,
      type, // 'pharmacy' or 'family'
      status: type === 'family' ? 'approved' : 'pending', // Family shares auto-approve
      requestedBy: requesterId,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      respondedAt: null,
    };

    if (type === 'pharmacy') {
      shareRequest.pharmacyId = pharmacyId; // Target pharmacy
      shareRequest.pharmacyName = pharmacyName || 'Unknown Pharmacy';
      
      // Set the original pharmacy as approver
      const assignedPharmacy = patientData.assignedPharmacy || {};
      const approverPharmacyId = req.body.approverPharmacyId || assignedPharmacy.pharmacyId || pharmacyId;
      const approverPharmacyName = req.body.approverPharmacyName || assignedPharmacy.pharmacyName || 'Original Pharmacy';
      
      shareRequest.approverPharmacyId = approverPharmacyId;
      shareRequest.approverPharmacyName = approverPharmacyName;
    } else {
      shareRequest.sharedWith = sharedWith || 'Family Member';
      shareRequest.relation = relation || 'Family';
    }

    const docRef = await db.collection('shareRequests').add(shareRequest);

    // --- For family shares, auto-approve by creating notification ---
    // No authorizedPharmacies entry needed for family

    // --- Create notification for the APPROVER pharmacy (original pharmacy) ---
    if (type === 'pharmacy') {
      const approverPharmacyId = shareRequest.approverPharmacyId;
      await db.collection('pharmacies').doc(approverPharmacyId)
        .collection('notifications').add({
          type: 'share_request',
          title: 'Profile Share Approval Needed',
          message: `${patientName} wants to share their profile with ${pharmacyName}. Your approval is required.`,
          shareRequestId: docRef.id,
          patientId,
          targetPharmacyName: pharmacyName,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    res.status(201).json({ 
      id: docRef.id, 
      ...shareRequest,
      requestedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Share] Create error:', error.message);
    res.status(500).json({ error: 'Failed to create share request' });
  }
};

/**
 * Get incoming share requests for pharmacy
 * GET /api/shares/incoming?status=pending
 * 
 * The original pharmacy (approver) sees requests where they need to approve.
 * Falls back to pharmacyId for legacy requests without approverPharmacyId.
 */
exports.getIncomingRequests = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    const statusFilter = req.query.status || 'pending';

    // Fetch all shareRequests — we need to check both approverPharmacyId and pharmacyId
    const snapshot = await db.collection('shareRequests').get();

    let requests = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.() || data.requestedAt,
          respondedAt: data.respondedAt?.toDate?.() || data.respondedAt,
        };
      })
      .filter(r => r.type === 'pharmacy')
      // Show requests where this pharmacy is the APPROVER, or legacy requests directed to this pharmacy
      .filter(r => r.approverPharmacyId === pharmacyId || (!r.approverPharmacyId && r.pharmacyId === pharmacyId));

    if (statusFilter !== 'all') {
      requests = requests.filter(r => r.status === statusFilter);
    }

    // Sort by requestedAt descending
    requests.sort((a, b) => {
      const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
      const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
      return bTime - aTime;
    });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('[Share] Get incoming error:', error.message);
    res.status(500).json({ error: 'Failed to fetch share requests' });
  }
};

/**
 * Respond to share request (original/approver pharmacy approves/rejects)
 * PUT /api/shares/:id/respond
 * Body: { action: 'approve' | 'reject' }
 */
exports.respondToShareRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const respondingPharmacyId = req.user.uid;
    const respondingPharmacyName = req.user.name || 'Unknown Pharmacy';

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    const requestRef = db.collection('shareRequests').doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Share request not found' });
    }

    const requestData = requestDoc.data();

    // Verify this pharmacy is the APPROVER (or legacy: the target pharmacy)
    const isApprover = requestData.approverPharmacyId === respondingPharmacyId;
    const isLegacyTarget = !requestData.approverPharmacyId && requestData.pharmacyId === respondingPharmacyId;
    
    if (!isApprover && !isLegacyTarget) {
      return res.status(403).json({ error: 'Only the original pharmacy can approve this request' });
    }

    if (requestData.status !== 'pending') {
      return res.status(400).json({ error: `Request already ${requestData.status}` });
    }

    const batch = db.batch();

    // Update request status
    batch.update(requestRef, {
      status: action === 'approve' ? 'approved' : 'rejected',
      respondedBy: respondingPharmacyId,
      respondedByName: respondingPharmacyName,
      respondedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // On approve: add the TARGET pharmacy to patient's authorizedPharmacies
    if (action === 'approve') {
      const targetPharmacyId = requestData.pharmacyId;
      const targetPharmacyName = requestData.pharmacyName || 'Unknown Pharmacy';

      const authRef = db.collection('patients').doc(requestData.patientId)
        .collection('authorizedPharmacies').doc(targetPharmacyId);
      
      batch.set(authRef, {
        pharmacyId: targetPharmacyId,
        pharmacyName: targetPharmacyName,
        relation: 'SharedAccess',
        approvedBy: respondingPharmacyId,
        approvedByName: respondingPharmacyName,
        sharedAt: admin.firestore.FieldValue.serverTimestamp(),
        shareRequestId: id
      });
    }

    await batch.commit();

    res.status(200).json({ 
      message: `Share request ${action === 'approve' ? 'approved' : 'rejected'}`,
      status: action === 'approve' ? 'approved' : 'rejected'
    });
  } catch (error) {
    console.error('[Share] Respond error:', error.message);
    res.status(500).json({ error: 'Failed to respond to share request' });
  }
};

/**
 * Get patient's active shares
 * GET /api/shares/my-shares?patientId=xxx
 */
exports.getPatientShares = async (req, res) => {
  try {
    const patientId = req.query.patientId;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId query param required' });
    }

    const snapshot = await db.collection('shareRequests')
      .where('patientId', '==', patientId)
      .get();

    const shares = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.() || data.requestedAt,
          respondedAt: data.respondedAt?.toDate?.() || data.respondedAt,
        };
      })
      .filter(s => ['pending', 'approved', 'rejected'].includes(s.status))
      .sort((a, b) => {
        const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
        const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
        return bTime - aTime;
      });

    res.status(200).json(shares);
  } catch (error) {
    console.error('[Share] Get patient shares error:', error.message);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
};

/**
 * Revoke a share
 * DELETE /api/shares/:id
 */
exports.revokeShare = async (req, res) => {
  try {
    const { id } = req.params;
    const requestRef = db.collection('shareRequests').doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Share request not found' });
    }

    const requestData = requestDoc.data();
    const batch = db.batch();

    batch.update(requestRef, { 
      status: 'revoked',
      respondedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // If it was an approved pharmacy share, remove from authorizedPharmacies
    if (requestData.type === 'pharmacy' && requestData.status === 'approved' && requestData.pharmacyId) {
      const authRef = db.collection('patients').doc(requestData.patientId)
        .collection('authorizedPharmacies').doc(requestData.pharmacyId);
      batch.delete(authRef);
    }

    await batch.commit();
    res.status(200).json({ message: 'Share revoked successfully' });
  } catch (error) {
    console.error('[Share] Revoke error:', error.message);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
};

/**
 * List all pharmacies (for patient to select from)
 * GET /api/shares/pharmacies
 */
exports.listPharmacies = async (req, res) => {
  try {
    const snapshot = await db.collection('pharmacies').get();
    const pharmacies = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || 'Unknown',
      address: doc.data().address || {},
      phone: doc.data().phone || '',
    }));
    res.status(200).json(pharmacies);
  } catch (error) {
    console.error('[Share] List pharmacies error:', error.message);
    res.status(500).json({ error: 'Failed to list pharmacies' });
  }
};
