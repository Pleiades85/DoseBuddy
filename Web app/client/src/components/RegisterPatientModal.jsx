import React, { useState } from 'react';
import { addPatient, linkPatient } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { UserPlus, Link as LinkIcon, QrCode, CheckCircle } from 'lucide-react';
import { Modal, Button } from './ui';
import { useToast } from './ui/Toast';

const RegisterPatientModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const [linkData, setLinkData] = useState({ accessCode: '', lastName: '', dateOfBirth: '' });
  const [formData, setFormData] = useState({
    personalInfo: { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', address: '', city: '', state: '', zipCode: '' },
    medicalInfo: { bloodType: '', height: '', weight: '', allergies: '', chronicConditions: '', notes: '' },
    insurance: { provider: '', policyNumber: '', groupNumber: '' },
    emergencyContact: { name: '', phone: '', relationship: '', email: '' }
  });
  const [skipInsurance, setSkipInsurance] = useState(false);
  const [skipEmergency, setSkipEmergency] = useState(false);

  const handleChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await linkPatient(linkData);
      queryClient.invalidateQueries(['patients']);
      toast.success('Patient linked', 'Patient has been linked to your pharmacy successfully.');
      onClose();
    } catch (error) {
      toast.error('Link failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const finalData = {
        ...formData,
        medicalInfo: {
          ...formData.medicalInfo,
          allergies: formData.medicalInfo.allergies.split(',').map(s => s.trim()).filter(Boolean),
          chronicConditions: formData.medicalInfo.chronicConditions.split(',').map(s => s.trim()).filter(Boolean)
        },
        insurance: skipInsurance ? {} : formData.insurance,
        emergencyContact: skipEmergency ? {} : formData.emergencyContact
      };
      const response = await addPatient(finalData);
      queryClient.invalidateQueries(['patients']);
      setSuccessData(response);
      setStep(4);
    } catch (error) {
      toast.error('Registration failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const isOpen = true;
  const modalTitle = step === 0 ? 'Register Patient' : step === -1 ? 'Link Existing Patient' : step === 4 ? null : 'Register New Patient';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size={step === 4 ? 'sm' : step === 0 ? 'md' : 'lg'} showClose={step !== 4}>
      {/* Step Progress */}
      {step > 0 && step < 4 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          {['Personal', 'Medical', 'Additional'].map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 4, borderRadius: 2, background: step >= i + 1 ? 'var(--primary)' : 'var(--slate-200)', transition: 'background 0.3s', marginBottom: 'var(--space-1)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: step >= i + 1 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Choice */}
      {step === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', padding: 'var(--space-4) 0' }}>
          <button className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', border: '2px solid transparent', textAlign: 'center', transition: 'all 0.2s' }}
            onClick={() => setStep(1)} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <UserPlus size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-base)', fontWeight: 600 }}>New Patient</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Register a new patient into the system.</p>
            </div>
          </button>
          <button className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', border: '2px solid transparent', textAlign: 'center', transition: 'all 0.2s' }}
            onClick={() => setStep(-1)} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--success)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <LinkIcon size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-base)', fontWeight: 600 }}>Link Existing</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Link an existing patient using an Access Code.</p>
            </div>
          </button>
        </div>
      )}

      {/* Step -1: Link Existing */}
      {step === -1 && (
        <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            <QrCode size={36} color="var(--primary)" style={{ marginBottom: 'var(--space-2)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>Enter patient credentials to grant access.</p>
          </div>
          <div className="form-group">
            <label className="label">Access Code (6-Digit)</label>
            <input className="input" placeholder="123456" required maxLength={6} value={linkData.accessCode}
              onChange={e => setLinkData({...linkData, accessCode: e.target.value})}
              style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', textAlign: 'center' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="label">Last Name</label>
              <input className="input" placeholder="Doe" required value={linkData.lastName} onChange={e => setLinkData({...linkData, lastName: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Date of Birth</label>
              <input className="input" type="date" required value={linkData.dateOfBirth} onChange={e => setLinkData({...linkData, dateOfBirth: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <Button type="button" variant="secondary" onClick={() => setStep(0)} style={{ flex: 1 }}>Back</Button>
            <Button type="submit" variant="primary" loading={loading} style={{ flex: 1 }}>Link Patient</Button>
          </div>
        </form>
      )}

      {/* Steps 1-3: New Registration */}
      {step > 0 && step < 4 && (
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group"><label className="label">First Name</label><input className="input" placeholder="John" required value={formData.personalInfo.firstName} onChange={e => handleChange('personalInfo', 'firstName', e.target.value)} /></div>
              <div className="form-group"><label className="label">Last Name</label><input className="input" placeholder="Doe" required value={formData.personalInfo.lastName} onChange={e => handleChange('personalInfo', 'lastName', e.target.value)} /></div>
              <div className="form-group"><label className="label">Email</label><input className="input" type="email" placeholder="john@example.com" required value={formData.personalInfo.email} onChange={e => handleChange('personalInfo', 'email', e.target.value)} /></div>
              <div className="form-group"><label className="label">Phone</label><input className="input" placeholder="(555) 123-4567" required value={formData.personalInfo.phone} onChange={e => handleChange('personalInfo', 'phone', e.target.value)} /></div>
              <div className="form-group"><label className="label">Date of Birth</label><input className="input" type="date" required value={formData.personalInfo.dateOfBirth} onChange={e => handleChange('personalInfo', 'dateOfBirth', e.target.value)} /></div>
              <div className="form-group"><label className="label">Gender</label>
                <select className="input" required value={formData.personalInfo.gender} onChange={e => handleChange('personalInfo', 'gender', e.target.value)}>
                  <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="label">Address</label><input className="input" placeholder="123 Main St" required value={formData.personalInfo.address} onChange={e => handleChange('personalInfo', 'address', e.target.value)} /></div>
              <div className="form-group"><label className="label">City</label><input className="input" required value={formData.personalInfo.city} onChange={e => handleChange('personalInfo', 'city', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group"><label className="label">State</label><input className="input" required value={formData.personalInfo.state} onChange={e => handleChange('personalInfo', 'state', e.target.value)} /></div>
                <div className="form-group"><label className="label">Zip</label><input className="input" required value={formData.personalInfo.zipCode} onChange={e => handleChange('personalInfo', 'zipCode', e.target.value)} /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group"><label className="label">Blood Type</label><input className="input" placeholder="O+" value={formData.medicalInfo.bloodType} onChange={e => handleChange('medicalInfo', 'bloodType', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group"><label className="label">Height (cm)</label><input className="input" placeholder="175" value={formData.medicalInfo.height} onChange={e => handleChange('medicalInfo', 'height', e.target.value)} /></div>
                <div className="form-group"><label className="label">Weight (kg)</label><input className="input" placeholder="70" value={formData.medicalInfo.weight} onChange={e => handleChange('medicalInfo', 'weight', e.target.value)} /></div>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="label">Allergies</label><input className="input" placeholder="Peanuts, Penicillin..." value={formData.medicalInfo.allergies} onChange={e => handleChange('medicalInfo', 'allergies', e.target.value)} /></div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="label">Chronic Conditions</label><input className="input" placeholder="Asthma, Diabetes..." value={formData.medicalInfo.chronicConditions} onChange={e => handleChange('medicalInfo', 'chronicConditions', e.target.value)} /></div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="label">Notes</label><textarea className="input" placeholder="Additional notes..." rows="3" value={formData.medicalInfo.notes} onChange={e => handleChange('medicalInfo', 'notes', e.target.value)} /></div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>Insurance Information</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={skipInsurance} onChange={e => setSkipInsurance(e.target.checked)} /> Skip
                  </label>
                </div>
                {!skipInsurance && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                    <div className="form-group"><label className="label">Provider</label><input className="input" placeholder="Blue Cross" value={formData.insurance.provider} onChange={e => handleChange('insurance', 'provider', e.target.value)} /></div>
                    <div className="form-group"><label className="label">Policy #</label><input className="input" placeholder="XX-123456" value={formData.insurance.policyNumber} onChange={e => handleChange('insurance', 'policyNumber', e.target.value)} /></div>
                    <div className="form-group"><label className="label">Group #</label><input className="input" placeholder="GRP-999" value={formData.insurance.groupNumber} onChange={e => handleChange('insurance', 'groupNumber', e.target.value)} /></div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>Emergency Contact</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={skipEmergency} onChange={e => setSkipEmergency(e.target.checked)} /> Skip
                  </label>
                </div>
                {!skipEmergency && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div className="form-group"><label className="label">Name</label><input className="input" placeholder="Jane Doe" value={formData.emergencyContact.name} onChange={e => handleChange('emergencyContact', 'name', e.target.value)} /></div>
                    <div className="form-group"><label className="label">Relationship</label><input className="input" placeholder="Spouse" value={formData.emergencyContact.relationship} onChange={e => handleChange('emergencyContact', 'relationship', e.target.value)} /></div>
                    <div className="form-group"><label className="label">Phone</label><input className="input" placeholder="(555) 987-6543" value={formData.emergencyContact.phone} onChange={e => handleChange('emergencyContact', 'phone', e.target.value)} /></div>
                    <div className="form-group"><label className="label">Email</label><input className="input" type="email" placeholder="jane@example.com" value={formData.emergencyContact.email} onChange={e => handleChange('emergencyContact', 'email', e.target.value)} /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nav Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-6)', gap: 'var(--space-3)' }}>
            <Button type="button" variant="secondary" onClick={() => step === 1 ? setStep(0) : setStep(s => s - 1)}>Back</Button>
            {step < 3 ? (
              <Button type="button" variant="primary" onClick={(e) => { e.preventDefault(); setStep(s => s + 1); }}>Next</Button>
            ) : (
              <Button type="button" variant="primary" loading={loading} onClick={handleSubmit}>Register Patient</Button>
            )}
          </div>
        </form>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)' }}>
            <CheckCircle size={32} />
          </div>
          <h2 style={{ margin: '0 0 var(--space-2)', color: 'var(--text)', fontWeight: 700 }}>Registration Successful!</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 var(--space-6)', fontSize: 'var(--text-sm)' }}>Patient has been added to the system.</p>
          <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', maxWidth: 360, margin: '0 auto var(--space-5)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Access Code</span>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '0.2em', color: 'var(--primary)', fontFamily: 'var(--font-mono)', margin: 'var(--space-2) 0 var(--space-4)' }}>
              {successData?.accessCodes?.accessCode || '------'}
            </div>
            <div style={{ background: 'white', padding: 'var(--space-3)', borderRadius: 'var(--radius)', display: 'inline-block', boxShadow: 'var(--shadow-sm)' }}>
              <QRCode value={JSON.stringify({ id: successData?.id, code: successData?.accessCodes?.accessCode })} size={140} />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)', marginBottom: 0 }}>
              Scan with DoseBuddy app to access profile
            </p>
          </div>
          <Button variant="primary" onClick={onClose} style={{ minWidth: 200 }}>Done</Button>
        </div>
      )}
    </Modal>
  );
};

export default RegisterPatientModal;
