const { db, admin, bucket } = require('../config/firebaseConfig');
const crypto = require('crypto'); // Import crypto for hashing

// Helper to validate patient data structure
const validatePatientData = (data) => {
  const requiredFields = ['personalInfo', 'medicalInfo', 'emergencyContact', 'insurance'];
  for (const field of requiredFields) {
    // Allow insurance and emergencyContact to be null/empty if user skipped them
    if (field === 'insurance' || field === 'emergencyContact') continue;
    if (!data[field]) return `Missing required field: ${field}`;
  }
  if (!data.personalInfo.firstName || !data.personalInfo.lastName) return 'Missing Name in Personal Info';
  return null;
};

exports.getAllPatients = async (req, res) => {
  try {
    const pharmacyId = req.user.uid;
    if (db) {
      // Query patients where this pharmacy is authorized using Collection Group Query
      // This avoids needing an array in the main document.
      // We query the 'authorizedPharmacies' subcollection across all patients.
      
      const snapshot = await db.collectionGroup('authorizedPharmacies')
        .where('pharmacyId', '==', pharmacyId)
        .get();
        
      // For each match, get the parent patient document AND the relation
      const patientRefs = [];
      const relationsMap = {};

      snapshot.docs.forEach(doc => {
        const patientRef = doc.ref.parent.parent;
        patientRefs.push(patientRef);
        relationsMap[patientRef.id] = doc.data().relation || 'Patient';
      });
      
      if (patientRefs.length === 0) {
        return res.status(200).json([]);
      }

      // Fetch all patient documents in parallel
      // Note: Firestore 'getAll' via refs is not directly available in client SDKs but in Admin SDK we can use getAll or Promise.all
      const patientDocs = await db.getAll(...patientRefs);
      
      const patients = patientDocs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          medicalInfo: data.medicalSummary, // Map for frontend compatibility
          relation: relationsMap[doc.id] // Include the relation
        };
      });
      return res.status(200).json(patients);
    }
    res.status(500).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('[Patient] Get all error:', error.message);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

exports.addPatient = async (req, res) => {
  try {
    const newPatient = req.body;
    
    // Validation
    const error = validatePatientData(newPatient);
    if (error) return res.status(400).json({ error });

    if (db) {
      const batch = db.batch();
      const patientRef = db.collection('patients').doc();
      const pharmacyId = req.user.uid;
      const pharmacyName = req.user.name || 'Unknown Pharmacy';
      const now = new Date();

      // 1. Main Document (Summary ONLY)
      // NO accessCodes, NO authorizedPharmacies arrays here.
      const patientData = {
        personalInfo: {
          ...newPatient.personalInfo,
          updatedAt: now,
          status: newPatient.personalInfo.status || 'active'
        },
        medicalSummary: { 
          bloodType: newPatient.medicalInfo?.bloodType || '',
          allergies: newPatient.medicalInfo?.allergies || [], 
          chronicConditions: newPatient.medicalInfo?.chronicConditions || [], 
          height: newPatient.medicalInfo?.height || '',
          weight: newPatient.medicalInfo?.weight || '',
          notes: newPatient.medicalInfo?.notes || ''
        },
        insurance: newPatient.insurance || {},
        emergencyContact: newPatient.emergencyContact || {},
        assignedPharmacy: {
          pharmacyId,
          pharmacyName,
          createdAt: now,
          createdBy: pharmacyId
        },
        timestamps: {
          createdAt: now,
          updatedAt: now,
          lastLoginAt: null
        }
      };
      batch.set(patientRef, patientData);

      // 2. Access Codes Subcollection (HASHED)
      const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
      // Create SHA-256 hash of the access code
      const accessCodeHash = crypto.createHash('sha256').update(accessCode).digest('hex');
      
      const accessCodeRef = patientRef.collection('accessCodes').doc();
      batch.set(accessCodeRef, {
        accessCodeHash, // Store HASH, not plain text
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lastUsed: null,
        qrCode: `patient:${patientRef.id}`,
        relation: 'Patient',
        sharedWith: newPatient.personalInfo.firstName
      });

      // 3. Authorized Pharmacies Subcollection
      const authPharmacyRef = patientRef.collection('authorizedPharmacies').doc(pharmacyId);
      batch.set(authPharmacyRef, { pharmacyId, authorizedAt: now });

      // 4. Linked History Subcollection
      const linkedHistoryRef = patientRef.collection('linkedHistory').doc(pharmacyId);
      batch.set(linkedHistoryRef, { linkedAt: now, pharmacyName });

      // 5. Initial Log Entry (Patient Created)
      const logRef = patientRef.collection('logs').doc();
      batch.set(logRef, {
        action: 'Patient Registered',
        details: `Patient profile created by ${pharmacyName}`,
        pharmacyId,
        pharmacyName,
        timestamp: now
      });

      // Commit Batch
      await batch.commit();

      // Return constructed object with PLAIN access code for UI display (one-time)
      return res.status(201).json({ 
        id: patientRef.id, 
        ...patientData,
        accessCodes: { accessCode, qrCode: `patient:${patientRef.id}`, relation: 'Patient' } 
      });
    }
    
    res.status(500).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('[Patient] Add error:', error.message);
    res.status(500).json({ error: 'Failed to add patient' });
  }
};

exports.getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (db) {
      const patientRef = db.collection('patients').doc(id);
      const doc = await patientRef.get();
      
      if (!doc.exists) return res.status(404).json({ message: 'Patient not found' });

      const patientData = { id: doc.id, ...doc.data() };

      // Fetch Subcollections (Parallel)
      const [medsSnap, remindersSnap, prescriptionsSnap, logsSnap] = await Promise.all([
        patientRef.collection('medications').get(),
        patientRef.collection('reminders').get(),
        patientRef.collection('prescriptions').orderBy('uploadedAt', 'desc').get(),
        patientRef.collection('logs').orderBy('timestamp', 'desc').limit(20).get()
      ]);

      // Aggregate Data
      patientData.medications = medsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      patientData.reminders = remindersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      patientData.prescriptions = prescriptionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Logs are usually fetched separately via pagination, but we can include recent ones
      
      // Map 'medicalSummary' back to 'medicalInfo' for frontend compatibility if needed
      // Or frontend should be updated. Let's map it to keep frontend happy for now.
      patientData.medicalInfo = {
        ...patientData.medicalSummary,
        lastPrescriptionUpload: patientData.medicalSummary?.lastPrescriptionUpload
      };

      return res.status(200).json(patientData);
    }
    res.status(500).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('[Patient] Get by ID error:', error.message);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (db) {
      const docRef = db.collection('patients').doc(id);
      const batch = db.batch();
      
      // Handle timestamp — update both locations
      const now = new Date();
      if (updates.personalInfo) {
        updates.personalInfo.updatedAt = now;
      }
      // Always update the canonical timestamp
      if (!updates.timestamps) updates.timestamps = {};
      updates.timestamps.updatedAt = now;
      
      // If updating medical info, map back to medicalSummary
      if (updates.medicalInfo) {
        updates.medicalSummary = { ...updates.medicalInfo };
        delete updates.medicalInfo;
      }

      // Handle Subcollections (Medications & Reminders)
      // We extract them from updates to prevent them being saved as fields on main doc
      const { medications, reminders, ...mainUpdates } = updates;

      // Update Main Document
      batch.update(docRef, mainUpdates);

      // Helper to sync subcollection
      const syncSubcollection = async (collectionName, items) => {
        if (!items) return;
        
        // 1. Get existing docs
        const snapshot = await docRef.collection(collectionName).get();
        const existingIds = new Set(snapshot.docs.map(d => d.id));
        const keptIds = new Set();

        // 2. Update or Add items
        items.forEach(item => {
          if (item.id && existingIds.has(item.id)) {
            // Update existing
            const itemRef = docRef.collection(collectionName).doc(item.id);
            batch.set(itemRef, item, { merge: true });
            keptIds.add(item.id);
          } else {
            // Add new
            const itemRef = docRef.collection(collectionName).doc(); // Auto-ID
            batch.set(itemRef, { ...item, createdAt: new Date() });
          }
        });

        // 3. Delete removed items
        snapshot.docs.forEach(doc => {
          if (!keptIds.has(doc.id)) {
            batch.delete(doc.ref);
          }
        });
      };

      await syncSubcollection('medications', medications);
      await syncSubcollection('reminders', reminders);

      // Log the update
      const logRef = docRef.collection('logs').doc();
      batch.set(logRef, {
        action: 'Profile Updated',
        details: `Updated by ${req.user.name || 'Pharmacy'}`,
        pharmacyId: req.user.uid,
        pharmacyName: req.user.name || 'Unknown Pharmacy',
        timestamp: new Date()
      });

      await batch.commit();

      return res.status(200).json({ id, ...updates });
    }
    res.status(500).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('[Patient] Update error:', error.message);
    res.status(500).json({ error: 'Failed to update patient' });
  }
};

exports.linkPatient = async (req, res) => {
  try {
    const { accessCode, lastName, dateOfBirth, qrCode } = req.body;
    const pharmacyId = req.user.uid;
    const pharmacyName = req.user.name || 'Unknown Pharmacy';

    if (!db) return res.status(500).json({ error: 'Database not connected' });

    let relation = 'Patient'; // Default
    let sharedWith = 'Patient'; // Default

    // Search logic
    if (qrCode) {
      const patientId = qrCode.replace('patient:', '');
      const doc = await db.collection('patients').doc(patientId).get();
      if (doc.exists) patientDoc = doc;
    } else {
      // Manual Entry: Search via Collection Group Query on accessCodes
      // HASH the input access code to find match
      const accessCodeHash = crypto.createHash('sha256').update(accessCode).digest('hex');
      
      const accessCodeSnapshot = await db.collectionGroup('accessCodes')
        .where('accessCodeHash', '==', accessCodeHash)
        .get();

      if (!accessCodeSnapshot.empty) {
        const accessCodeDoc = accessCodeSnapshot.docs[0];
        const data = accessCodeDoc.data();
        relation = data.relation || 'Patient';
        sharedWith = data.sharedWith || relation;
        
        const parentDocRef = accessCodeDoc.ref.parent.parent; // accessCodes -> patient
        const parentDoc = await parentDocRef.get();
        
        if (parentDoc.exists) {
          const pData = parentDoc.data();
          if (pData.personalInfo.lastName.toLowerCase() === lastName.toLowerCase() && 
              pData.personalInfo.dateOfBirth === dateOfBirth) {
            patientDoc = parentDoc;
            // Ensure sharedWith is the real name if it's the patient
            if (relation === 'Patient') {
              sharedWith = pData.personalInfo.firstName;
            }
          }
        }
      }
    }

    if (!patientDoc) {
      return res.status(404).json({ message: 'Patient not found or details incorrect' });
    }

    // Link Logic
    const batch = db.batch();
    const patientRef = patientDoc.ref;
    
    // 1. Add to Authorized Subcollection (Check if already exists first?)
    // We can just set it with merge: true or just set it.
    const authRef = patientRef.collection('authorizedPharmacies').doc(pharmacyId);
    batch.set(authRef, { pharmacyId, authorizedAt: new Date(), relation, sharedWith });

    // 2. Add to Linked History
    const histRef = patientRef.collection('linkedHistory').doc(pharmacyId);
    batch.set(histRef, { linkedAt: new Date(), pharmacyName });
    
    await batch.commit();

    return res.status(200).json({ id: patientDoc.id, ...patientDoc.data(), relation, sharedWith });

  } catch (error) {
    console.error('[Patient] Link error:', error.message);
    res.status(500).json({ error: 'Failed to link patient' });
  }
};

exports.analyzePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    // 1. Store Image in 'prescription_images' (Global Collection)
    const imageBuffer = file.buffer.toString('base64');
    const imageDoc = await db.collection('prescription_images').add({
      patientId: id,
      mimeType: file.mimetype,
      data: imageBuffer,
      uploadedAt: new Date(),
      fileName: file.originalname
    });
    const fileUrl = `http://localhost:5000/api/patients/prescription-image/${imageDoc.id}`;

    // 2. Analyze with AI
    const aiService = require('../services/aiService');
    const analysis = await aiService.analyzePrescription(file.buffer, file.mimetype);

    // Return analysis + image metadata for review
    return res.status(200).json({
      message: 'Analysis complete. Please review.',
      medications: analysis.medications,
      reminders: analysis.reminders,
      fileUrl,
      imageId: imageDoc.id,
      fileName: file.originalname
    });

  } catch (error) {
    console.error('[Patient] Analyze prescription error:', error.message);
    res.status(500).json({ error: 'Failed to analyze prescription' });
  }
};

exports.confirmPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { medications, reminders, fileUrl, imageId, fileName } = req.body;
    const pharmacyId = req.user.uid;
    const pharmacyName = req.user.name || 'Unknown Pharmacy';

    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const batch = db.batch();
    const patientRef = db.collection('patients').doc(id);

    // A. Add Medications
    if (medications && medications.length > 0) {
      medications.forEach(med => {
        const medRef = patientRef.collection('medications').doc();
        batch.set(medRef, { ...med, prescribedAt: new Date() });
      });
    }

    // B. Add Reminders
    if (reminders && reminders.length > 0) {
      reminders.forEach(rem => {
        const remRef = patientRef.collection('reminders').doc();
        batch.set(remRef, { ...rem, createdAt: new Date() });
      });
    }

    // C. Add Prescription Metadata
    const presRef = patientRef.collection('prescriptions').doc();
    batch.set(presRef, {
      fileName: fileName || 'Unknown File',
      pharmacyName,
      url: fileUrl,
      uploadedAt: new Date(),
      imageId: imageId
    });

    // D. Update Main Doc Last Upload
    batch.update(patientRef, {
      'medicalSummary.lastPrescriptionUpload': new Date()
    });

    // E. Log Action
    const logRef = patientRef.collection('logs').doc();
    batch.set(logRef, {
      action: 'Prescription Added',
      details: `Confirmed by ${pharmacyName}. Added ${medications?.length || 0} meds.`,
      fileUrl: fileUrl,
      pharmacyId,
      pharmacyName,
      timestamp: new Date()
    });

    await batch.commit();

    return res.status(200).json({ message: 'Prescription saved successfully' });

  } catch (error) {
    console.error('[Patient] Confirm prescription error:', error.message);
    res.status(500).json({ error: 'Failed to save prescription' });
  }
};

exports.getPatientLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, startAfter } = req.query;
    
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    let query = db.collection('patients').doc(id).collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));

    if (startAfter) {
      const doc = await db.collection('patients').doc(id).collection('logs').doc(startAfter).get();
      if (doc.exists) query = query.startAfter(doc);
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrescriptionImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const doc = await db.collection('prescription_images').doc(id).get();
    if (!doc.exists) return res.status(404).send('Image not found');

    const data = doc.data();
    const img = Buffer.from(data.data, 'base64');

    res.writeHead(200, {
      'Content-Type': data.mimeType,
      'Content-Length': img.length
    });
    res.end(img);
  } catch (error) {
    console.error('[Patient] Serve image error:', error.message);
    res.status(500).send('Error serving image');
  }
};

exports.regenerateAccessCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { sharedWith, relation } = req.body; // relation: 'Patient', 'Family', 'Caregiver'
    const pharmacyId = req.user.uid;

    if (!db) return res.status(500).json({ error: 'Database not connected' });
    
    // Validate Relation
    const validRelations = ['Patient', 'Family', 'Caregiver'];
    const selectedRelation = validRelations.includes(relation) ? relation : 'Caregiver'; // Default to Caregiver if invalid

    const patientRef = db.collection('patients').doc(id);
    const accessCodesRef = patientRef.collection('accessCodes');
    
    // 1. Fetch Patient Name
    const patientDoc = await patientRef.get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });
    const pData = patientDoc.data();
    const patientName = `${pData.personalInfo.firstName} ${pData.personalInfo.lastName}`;

    // 2. Generate New Code
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
    const accessCodeHash = crypto.createHash('sha256').update(accessCode).digest('hex');
    const now = new Date();

    // 3. Check for existing code FOR THIS RELATION to update
    // This allows a patient to have a separate code from their caregiver
    const snapshot = await accessCodesRef.where('relation', '==', selectedRelation).limit(1).get();
    
    let docRef;
    let generationCount = 1;

    if (!snapshot.empty) {
      // Update existing for this relation
      const doc = snapshot.docs[0];
      docRef = doc.ref;
      generationCount = (doc.data().generationCount || 0) + 1;
    } else {
      // Create new if none exists for this relation
      docRef = accessCodesRef.doc();
    }

    let finalSharedWith = sharedWith;
    if (!finalSharedWith) {
      finalSharedWith = selectedRelation === 'Patient' ? pData.personalInfo.firstName : selectedRelation;
    }

    // 4. Save to Firestore
    await docRef.set({
      accessCodeHash,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      lastUsed: null,
      qrCode: `patient:${id}`,
      sharedWith: finalSharedWith,
      relation: selectedRelation,
      generationCount,
      updatedAt: now,
      generatedBy: pharmacyId
    }, { merge: true });

    // 5. Log Action
    let logDetails = `Code generated for ${selectedRelation}`;
    if (selectedRelation !== 'Patient') {
      logDetails += ` name ${finalSharedWith}`;
    }

    await patientRef.collection('logs').add({
      action: 'Access Code Regenerated',
      details: logDetails,
      pharmacyId,
      pharmacyName: req.user.name || 'Unknown Pharmacy',
      timestamp: now
    });

    // 6. Return Plain Code with Metadata
    return res.status(200).json({
      accessCode,
      qrCode: `patient:${id}`,
      relation: selectedRelation,
      patientName,
      sharedWith: finalSharedWith,
      generationCount
    });

  } catch (error) {
    console.error('[Patient] Regenerate code error:', error.message);
    res.status(500).json({ error: 'Failed to regenerate access code' });
  }
};
