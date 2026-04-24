import React, { useState, useEffect } from 'react';
import { fetchPharmacyProfile, updatePharmacyProfile } from '../services/api';
import { Building2, Save, Edit2, MapPin, Phone, Mail, BadgeCheck, User } from 'lucide-react';
import { Card, Button, H2, Badge, Accordion } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatDate } from '../utils/dateUtils';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';

const PharmacyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();

  const [openSections, setOpenSections] = useState({
    details: true,
    address: true,
  });

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPharmacyProfile();
      setProfile(data);
      setFormData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...(prev.address || {}), [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePharmacyProfile({
        name: formData.name,
        phone: formData.phone,
        managerName: formData.managerName,
        licenseNumber: formData.licenseNumber,
        address: formData.address,
      });
      setProfile({ ...formData });
      setIsEditing(false);
      toast.success('Profile Updated', 'Pharmacy profile saved successfully.');
    } catch (err) {
      toast.error('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...profile });
    setIsEditing(false);
  };

  if (loading) return <LoadingSpinner message="Loading pharmacy profile..." />;

  if (error) return (
    <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>Error: {error}</p>
      <Button variant="secondary" onClick={loadProfile}>Try Again</Button>
    </div>
  );

  if (!formData) return <LoadingSpinner message="Initializing..." />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <H2>Pharmacy Profile</H2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Member since: {formatDate(profile.createdAt)}
            </span>
            <Badge variant="success" size="sm"><BadgeCheck size={10} /> Verified</Badge>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} loading={saving} icon={<Save size={16} />}>Save Changes</Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setIsEditing(true)} icon={<Edit2 size={16} />}>Edit Profile</Button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Pharmacy Details */}
        <Accordion title="Pharmacy Details" icon={<Building2 size={18} />} isOpen={openSections.details} onToggle={() => toggleSection('details')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="label">Pharmacy Name</label>
              <input className="input" disabled={!isEditing}
                value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">License Number</label>
              <input className="input" disabled={!isEditing}
                value={formData.licenseNumber || ''} onChange={(e) => handleChange('licenseNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Manager Name</label>
              <input className="input" disabled={!isEditing}
                value={formData.managerName || ''} onChange={(e) => handleChange('managerName', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" disabled={!isEditing}
                value={formData.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Email</label>
              <input className="input" disabled value={formData.email || ''} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>Email cannot be changed</span>
            </div>
          </div>
        </Accordion>

        {/* Address */}
        <Accordion title="Address" icon={<MapPin size={18} />} isOpen={openSections.address} onToggle={() => toggleSection('address')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Street Address</label>
              <input className="input" disabled={!isEditing}
                value={formData.address?.street || ''} onChange={(e) => handleAddressChange('street', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">City</label>
              <input className="input" disabled={!isEditing}
                value={formData.address?.city || ''} onChange={(e) => handleAddressChange('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">State / Province</label>
              <input className="input" disabled={!isEditing}
                value={formData.address?.state || ''} onChange={(e) => handleAddressChange('state', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Zip / Postal Code</label>
              <input className="input" disabled={!isEditing}
                value={formData.address?.zipCode || ''} onChange={(e) => handleAddressChange('zipCode', e.target.value)} />
            </div>
          </div>
        </Accordion>
      </div>
    </motion.div>
  );
};

export default PharmacyProfile;
