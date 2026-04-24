import React, { useState, useEffect } from 'react';
import { formatDate, formatDateTime, parseFirestoreDate } from '../utils/dateUtils';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatientById, updatePatient, regenerateAccessCode, fetchPatientLogs, analyzePrescription, confirmPrescription } from '../services/api';
import { ArrowLeft, Save, Edit2, User, Activity, Shield, Clock, History, Eye, Share2, X, Plus, Trash2, Upload, FileText, Loader2, Heart, CreditCard, AlertCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Card, Modal, Accordion, Badge, H2 } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { motion } from 'framer-motion';

/* =========================================
   Share Modal — extracted sub-component
   ========================================= */
const ShareModal = ({ isOpen, onClose, onGenerate, loading, shareData }) => {
  const [sharedWith, setSharedWith] = useState('');
  const [relation, setRelation] = useState('Patient');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Profile" size="sm">
      {!shareData ? (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', marginBottom: 'var(--space-5)' }}>
            Generate a new access code to share this patient profile.
          </p>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="label">Who is this for?</label>
            <select className="input" value={relation} onChange={(e) => setRelation(e.target.value)}>
              <option value="Patient">Patient</option>
              <option value="Family">Family Member</option>
              <option value="Caregiver">Caregiver</option>
            </select>
          </div>
          {relation !== 'Patient' && (
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="label">Name / Note (Optional)</label>
              <input className="input" placeholder="e.g. John Doe" value={sharedWith} onChange={(e) => setSharedWith(e.target.value)} />
            </div>
          )}
          <Button variant="primary" fullWidth loading={loading} onClick={() => onGenerate(sharedWith, relation)}>
            Generate New Code
          </Button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'white', padding: 'var(--space-4)', borderRadius: 'var(--radius)', display: 'inline-block', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-5)' }}>
            <QRCode 
              value={JSON.stringify({ id: shareData.qrCode?.replace('patient:', ''), code: shareData.accessCode, relation: shareData.relation, name: shareData.patientName, recipient: shareData.sharedWith })} 
              size={160} 
            />
          </div>
          <div style={{ background: 'var(--slate-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', fontWeight: 600 }}>
              Access Code ({shareData.relation})
            </div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', color: 'var(--primary)' }}>
              {shareData.accessCode}
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
            Share this code with the <strong>{shareData.relation}</strong>.
          </p>
          <Button variant="primary" fullWidth onClick={onClose}>Done</Button>
        </div>
      )}
    </Modal>
  );
};

/* =========================================
   Prescription Review Modal
   ========================================= */
const PrescriptionReviewModal = ({ isOpen, onClose, onConfirm, initialData, loading }) => {
  const [medications, setMedications] = useState([]);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (initialData) {
      setMedications(initialData.medications || []);
      setReminders(initialData.reminders || []);
    }
  }, [initialData]);

  const handleMedChange = (idx, field, value) => {
    const newMeds = [...medications];
    newMeds[idx] = { ...newMeds[idx], [field]: value };
    setMedications(newMeds);
  };
  const handleReminderChange = (idx, field, value) => {
    const newRems = [...reminders];
    newRems[idx] = { ...newRems[idx], [field]: value };
    setReminders(newRems);
  };
  const removeMed = (idx) => setMedications(medications.filter((_, i) => i !== idx));
  const removeReminder = (idx) => setReminders(reminders.filter((_, i) => i !== idx));
  const addMed = () => setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', prescribedBy: '' }]);
  const addReminder = () => setReminders([...reminders, { message: '', time: '' }]);

  return (
    <Modal isOpen={isOpen && !!initialData} onClose={onClose} title="Review Prescription" size="lg">
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
        Review and edit the AI-extracted details before saving.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Medications */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Medications</h3>
            <Button variant="ghost" size="sm" onClick={addMed} icon={<Plus size={14} />}>Add</Button>
          </div>
          {medications.map((med, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
              <input className="input" placeholder="Name" value={med.name} onChange={(e) => handleMedChange(idx, 'name', e.target.value)} />
              <input className="input" placeholder="Dosage" value={med.dosage} onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)} />
              <input className="input" placeholder="Frequency" value={med.frequency} onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)} />
              <input className="input" placeholder="Duration" value={med.duration || ''} onChange={(e) => handleMedChange(idx, 'duration', e.target.value)} />
              <button onClick={() => removeMed(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 'var(--space-2)' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {/* Reminders */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Reminders</h3>
            <Button variant="ghost" size="sm" onClick={addReminder} icon={<Plus size={14} />}>Add</Button>
          </div>
          {reminders.map((rem, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
              <input className="input" placeholder="Message" value={rem.message} onChange={(e) => handleReminderChange(idx, 'message', e.target.value)} />
              <input type="time" className="input" value={rem.time} onChange={(e) => handleReminderChange(idx, 'time', e.target.value)} />
              <button onClick={() => removeReminder(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 'var(--space-2)' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={loading} onClick={() => onConfirm({ medications, reminders })}>
          Confirm & Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/* =========================================
   Main PatientProfile Component
   ========================================= */
const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  
  const [openSections, setOpenSections] = useState({
    personal: true, medical: false, medicalInfo: false,
    medications: false, reminders: false, logs: false,
    insurance: false, emergency: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatientById(id),
  });

  const { data: logs } = useQuery({
    queryKey: ['patientLogs', id],
    queryFn: () => fetchPatientLogs(id),
    enabled: openSections.logs
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => updatePatient(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['patient', id]);
      setIsEditing(false);
      toast.success('Profile updated', 'Patient profile has been saved successfully.');
    },
    onError: (err) => toast.error('Update failed', err.message)
  });

  const analyzeMutation = useMutation({
    mutationFn: (file) => analyzePrescription(id, file),
    onSuccess: (data) => {
      setReviewData(data);
      setShowReviewModal(true);
    },
    onError: (err) => toast.error('Analysis failed', err.message)
  });

  const confirmMutation = useMutation({
    mutationFn: (data) => confirmPrescription(id, { ...data, fileUrl: reviewData.fileUrl, imageId: reviewData.imageId, fileName: reviewData.fileName }),
    onSuccess: () => {
      queryClient.invalidateQueries(['patient', id]);
      queryClient.invalidateQueries(['patientLogs', id]);
      setShowReviewModal(false);
      setReviewData(null);
      toast.success('Prescription saved', 'Medications and reminders have been added.');
      setOpenSections(prev => ({ ...prev, medications: true, reminders: true }));
    },
    onError: (err) => toast.error('Save failed', err.message)
  });

  const handleShare = async (sharedWith, relation) => {
    setShareLoading(true);
    try {
      const data = await regenerateAccessCode(id, sharedWith, relation);
      setShareData(data);
      queryClient.invalidateQueries(['patientLogs', id]);
    } catch (err) {
      toast.error('Failed to generate code', err.message);
    } finally {
      setShareLoading(false);
    }
  };

  useEffect(() => {
    if (patient) {
      setFormData({
        ...patient,
        personalInfo: patient.personalInfo || {},
        medicalInfo: patient.medicalInfo || {},
        insurance: patient.insurance || {},
        emergencyContact: patient.emergencyContact || {},
        medications: patient.medications || [],
        reminders: patient.reminders || [],
        prescriptions: patient.prescriptions || []
      });
    }
  }, [patient]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };
  const handleArrayChange = (section, idx, field, value) => {
    setFormData(prev => {
      const newArray = [...prev[section]];
      newArray[idx] = { ...newArray[idx], [field]: value };
      return { ...prev, [section]: newArray };
    });
  };
  const removeArrayItem = (section, idx) => {
    setFormData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== idx) }));
  };
  const addArrayItem = (section, template) => {
    setFormData(prev => ({ ...prev, [section]: [...prev[section], template] }));
  };
  const handleSave = () => updateMutation.mutate(formData);
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) analyzeMutation.mutate(file);
  };

  if (isLoading) return <LoadingSpinner message="Loading patient profile..." />;
  if (error) return (
    <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>Error loading profile: {error.message}</p>
      <Button variant="secondary" onClick={() => navigate('/patients')}>Back to Patients</Button>
    </div>
  );
  if (!formData) return <LoadingSpinner message="Initializing..." />;

  const patientName = `${formData.personalInfo?.firstName || ''} ${formData.personalInfo?.lastName || ''}`.trim();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => navigate('/patients')} icon={<ArrowLeft size={18} />}>Back</Button>
          <div>
            <H2>{patientName || 'Patient Profile'}</H2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Last updated: {formatDate(formData.timestamps?.updatedAt || formData.personalInfo?.updatedAt || formData.timestamps?.createdAt || formData.personalInfo?.createdAt)}
              </span>
              <Badge variant="success" size="sm">
                <Shield size={10} /> Secured
              </Badge>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={() => { setShareData(null); setShowShareModal(true); }} icon={<Share2 size={16} />}>Share</Button>
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} loading={updateMutation.isPending} icon={<Save size={16} />}>Save</Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)} icon={<Edit2 size={16} />}>Edit</Button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Personal Info */}
        <Accordion title="Personal Information" icon={<User size={18} />} isOpen={openSections.personal} onToggle={() => toggleSection('personal')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {[
              ['First Name', 'personalInfo', 'firstName'],
              ['Last Name', 'personalInfo', 'lastName'],
              ['Date of Birth', 'personalInfo', 'dateOfBirth', 'date'],
              ['Phone', 'personalInfo', 'phone'],
              ['Email', 'personalInfo', 'email'],
            ].map(([label, section, field, type]) => (
              <div className="form-group" key={field}>
                <label className="label">{label}</label>
                <input type={type || 'text'} className="input" disabled={!isEditing}
                  value={formData[section]?.[field] || ''} onChange={(e) => handleInputChange(section, field, e.target.value)} />
              </div>
            ))}
            <div className="form-group">
              <label className="label">Gender</label>
              <select className="input" disabled={!isEditing} value={formData.personalInfo?.gender || ''} onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Address</label>
              <input className="input" disabled={!isEditing} value={formData.personalInfo?.address || ''} onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)} />
            </div>
          </div>
        </Accordion>

        {/* Medical Info */}
        <Accordion title="Medical Information" icon={<Shield size={18} />} isOpen={openSections.medicalInfo} onToggle={() => toggleSection('medicalInfo')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="label">Blood Type</label>
              <input className="input" disabled={!isEditing} value={formData.medicalInfo?.bloodType || ''} onChange={(e) => handleInputChange('medicalInfo', 'bloodType', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Height (cm)</label>
              <input className="input" disabled={!isEditing} value={formData.medicalInfo?.height || ''} onChange={(e) => handleInputChange('medicalInfo', 'height', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Weight (kg)</label>
              <input className="input" disabled={!isEditing} value={formData.medicalInfo?.weight || ''} onChange={(e) => handleInputChange('medicalInfo', 'weight', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <label className="label" style={{ margin: 0 }}>Allergies</label>
                {isEditing && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    const current = Array.isArray(formData.medicalInfo?.allergies) ? formData.medicalInfo.allergies : [];
                    handleInputChange('medicalInfo', 'allergies', [...current, { name: '', reaction: '' }]);
                  }} icon={<Plus size={14} />}>Add</Button>
                )}
              </div>
              {(() => {
                // Normalize: handle both string[] (legacy) and object[] (new) formats
                const allergies = Array.isArray(formData.medicalInfo?.allergies)
                  ? formData.medicalInfo.allergies.map(a => typeof a === 'string' ? { name: a, reaction: '' } : a)
                  : [];
                if (allergies.length === 0 && !isEditing) return <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>No allergies recorded.</p>;
                return allergies.map((allergy, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: isEditing ? '1fr 1fr auto' : '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                    <input className="input" placeholder="Allergy name" disabled={!isEditing} value={allergy.name || ''}
                      onChange={(e) => {
                        const updated = [...allergies];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        handleInputChange('medicalInfo', 'allergies', updated);
                      }} />
                    <input className="input" placeholder="Reaction (e.g. hives, swelling)" disabled={!isEditing} value={allergy.reaction || ''}
                      onChange={(e) => {
                        const updated = [...allergies];
                        updated[idx] = { ...updated[idx], reaction: e.target.value };
                        handleInputChange('medicalInfo', 'allergies', updated);
                      }} />
                    {isEditing && (
                      <button onClick={() => {
                        const updated = allergies.filter((_, i) => i !== idx);
                        handleInputChange('medicalInfo', 'allergies', updated);
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    )}
                  </div>
                ));
              })()}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Chronic Conditions (comma separated)</label>
              <input className="input" disabled={!isEditing}
                value={Array.isArray(formData.medicalInfo?.chronicConditions) ? formData.medicalInfo.chronicConditions.join(', ') : formData.medicalInfo?.chronicConditions || ''}
                onChange={(e) => handleInputChange('medicalInfo', 'chronicConditions', e.target.value.split(',').map(s => s.trim()))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Notes</label>
              <textarea className="input" disabled={!isEditing} rows="3" value={formData.medicalInfo?.notes || ''} onChange={(e) => handleInputChange('medicalInfo', 'notes', e.target.value)} />
            </div>
          </div>
        </Accordion>

        {/* Prescription Upload */}
        <Accordion title="Prescriptions" icon={<FileText size={18} />} isOpen={openSections.medical} onToggle={() => toggleSection('medical')}
          badge={formData.prescriptions?.length > 0 ? formData.prescriptions.length : undefined}>
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--slate-50)' }}>
            <Upload size={36} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }} />
            <h4 style={{ margin: '0 0 var(--space-2)', fontWeight: 600 }}>Upload Prescription</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4)' }}>Upload an image or PDF — AI will extract medications and reminders.</p>
            {analyzeMutation.isPending ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', color: 'var(--primary)', fontWeight: 600 }}>
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                Analyzing with AI...
              </div>
            ) : (
              <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ fontSize: 'var(--text-sm)' }} />
            )}
          </div>

          {formData.prescriptions?.length > 0 && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>History</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                {formData.prescriptions.sort((a, b) => {
                  const dateA = parseFirestoreDate(a.uploadedAt) || new Date(0);
                  const dateB = parseFirestoreDate(b.uploadedAt) || new Date(0);
                  return dateB - dateA;
                }).map((script, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: 'var(--slate-50)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ background: 'var(--primary-light)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                          {formatDate(script.uploadedAt) || 'Just now'}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Uploaded by {script.pharmacyName}</div>
                      </div>
                    </div>
                    <a href={script.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                      <Eye size={14} /> View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Accordion>

        {/* Medications */}
        <Accordion title="Medications" icon={<Activity size={18} />} isOpen={openSections.medications} onToggle={() => toggleSection('medications')}
          badge={formData.medications?.length > 0 ? formData.medications.length : undefined}>
          {isEditing && (
            <div style={{ marginBottom: 'var(--space-3)', textAlign: 'right' }}>
              <Button variant="ghost" size="sm" onClick={() => addArrayItem('medications', { name: '', dosage: '', frequency: '', duration: '', prescribedBy: '', startDate: '' })} icon={<Plus size={14} />}>Add Medication</Button>
            </div>
          )}
          {formData.medications?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {formData.medications.map((med, idx) => (
                <div key={idx} style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--slate-50)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <input className="input" placeholder="Name" value={med.name} onChange={(e) => handleArrayChange('medications', idx, 'name', e.target.value)} />
                        <input className="input" placeholder="Dosage" value={med.dosage} onChange={(e) => handleArrayChange('medications', idx, 'dosage', e.target.value)} />
                        <input className="input" placeholder="Frequency" value={med.frequency} onChange={(e) => handleArrayChange('medications', idx, 'frequency', e.target.value)} />
                        <button onClick={() => removeArrayItem('medications', idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                        <input className="input" placeholder="Duration (e.g. 30 days)" value={med.duration || ''} onChange={(e) => handleArrayChange('medications', idx, 'duration', e.target.value)} />
                        <input className="input" placeholder="Prescribed by" value={med.prescribedBy || ''} onChange={(e) => handleArrayChange('medications', idx, 'prescribedBy', e.target.value)} />
                        <input type="date" className="input" value={med.startDate || ''} onChange={(e) => handleArrayChange('medications', idx, 'startDate', e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{med.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{med.dosage} • {med.frequency}{med.duration ? ` • ${med.duration}` : ''}</div>
                      {(med.prescribedBy || med.startDate) && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                          {med.prescribedBy ? `Prescribed by ${med.prescribedBy}` : ''}{med.startDate ? ` • Started ${med.startDate}` : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>No medications recorded. Upload a prescription to add them automatically.</p>
          )}
        </Accordion>

        {/* Reminders */}
        <Accordion title="Reminders" icon={<Clock size={18} />} isOpen={openSections.reminders} onToggle={() => toggleSection('reminders')}
          badge={formData.reminders?.length > 0 ? formData.reminders.length : undefined}>
          {isEditing && (
            <div style={{ marginBottom: 'var(--space-3)', textAlign: 'right' }}>
              <Button variant="ghost" size="sm" onClick={() => addArrayItem('reminders', { message: '', time: '' })} icon={<Plus size={14} />}>Add Reminder</Button>
            </div>
          )}
          {formData.reminders?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {formData.reminders.map((rem, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'var(--slate-50)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  {isEditing ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: 'var(--space-2)', width: '100%', alignItems: 'center' }}>
                      <input className="input" placeholder="Message" value={rem.message} onChange={(e) => handleArrayChange('reminders', idx, 'message', e.target.value)} />
                      <input type="time" className="input" value={rem.time} onChange={(e) => handleArrayChange('reminders', idx, 'time', e.target.value)} />
                      <button onClick={() => removeArrayItem('reminders', idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <div style={{ background: 'var(--primary-light)', padding: 'var(--space-2)', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{rem.time}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{rem.message}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>No reminders set.</p>
          )}
        </Accordion>

        {/* Insurance */}
        <Accordion title="Insurance Details" icon={<CreditCard size={18} />} isOpen={openSections.insurance} onToggle={() => toggleSection('insurance')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="label">Insurance Provider</label>
              <input className="input" disabled={!isEditing}
                value={formData.insurance?.provider || ''} onChange={(e) => handleInputChange('insurance', 'provider', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Policy Number</label>
              <input className="input" disabled={!isEditing}
                value={formData.insurance?.policyNumber || ''} onChange={(e) => handleInputChange('insurance', 'policyNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Group Number</label>
              <input className="input" disabled={!isEditing}
                value={formData.insurance?.groupNumber || ''} onChange={(e) => handleInputChange('insurance', 'groupNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Coverage Type</label>
              <input className="input" disabled={!isEditing}
                value={formData.insurance?.coverageType || ''} onChange={(e) => handleInputChange('insurance', 'coverageType', e.target.value)} />
            </div>
          </div>
          {!formData.insurance?.provider && !isEditing && (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 'var(--space-2) 0 0' }}>No insurance information on file.</p>
          )}
        </Accordion>

        {/* Emergency Contact */}
        <Accordion title="Emergency Contact" icon={<Heart size={18} />} isOpen={openSections.emergency} onToggle={() => toggleSection('emergency')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="label">Contact Name</label>
              <input className="input" disabled={!isEditing}
                value={formData.emergencyContact?.name || ''} onChange={(e) => handleInputChange('emergencyContact', 'name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Relationship</label>
              <input className="input" disabled={!isEditing}
                value={formData.emergencyContact?.relationship || ''} onChange={(e) => handleInputChange('emergencyContact', 'relationship', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" disabled={!isEditing}
                value={formData.emergencyContact?.phone || ''} onChange={(e) => handleInputChange('emergencyContact', 'phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" className="input" disabled={!isEditing}
                value={formData.emergencyContact?.email || ''} onChange={(e) => handleInputChange('emergencyContact', 'email', e.target.value)} />
            </div>
          </div>
          {!formData.emergencyContact?.name && !isEditing && (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 'var(--space-2) 0 0' }}>No emergency contact on file.</p>
          )}
        </Accordion>

        {/* Logs */}
        <Accordion title="Activity Logs" icon={<History size={18} />} isOpen={openSections.logs} onToggle={() => toggleSection('logs')}>
          {logs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontWeight: 600 }}>{log.action}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{formatDateTime(log.timestamp)}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>{log.details}</div>
                  {log.fileUrl && (
                    <a href={log.fileUrl} target="_blank" rel="noopener noreferrer"
                      style={{ marginTop: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-1) var(--space-3)', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      <FileText size={12} /> View Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>No activity logs found.</p>
          )}
        </Accordion>
      </div>
      
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} onGenerate={handleShare} loading={shareLoading} shareData={shareData} />
      <PrescriptionReviewModal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} onConfirm={confirmMutation.mutate} initialData={reviewData} loading={confirmMutation.isPending} />
    </motion.div>
  );
};

export default PatientProfile;
