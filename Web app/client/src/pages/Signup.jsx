import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'framer-motion';
import PhoneInput from '../components/PhoneInput';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '../components/ui';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    pharmacyName: '', licenseNumber: '', phone: '',
    managerName: '', address: '', city: '', state: '', zipCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'pharmacies', user.uid), {
        name: formData.pharmacyName,
        email: formData.email,
        licenseNumber: formData.licenseNumber,
        phone: formData.phone,
        managerName: formData.managerName,
        address: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        },
        role: 'pharmacy',
        createdAt: new Date()
      });

      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const PasswordStrength = ({ password }) => {
    if (!password) return null;
    const hasLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    
    const strength = [hasLength, hasNumber, hasSpecial].filter(Boolean).length;
    const color = strength === 3 ? 'var(--success)' : strength === 2 ? 'var(--warning)' : 'var(--danger)';
    const label = strength === 3 ? 'Strong' : strength === 2 ? 'Medium' : 'Weak';

    return (
      <div style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <div style={{ height: 3, flex: 1, background: 'var(--slate-200)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${(strength / 3) * 100}%`, background: color, height: '100%', transition: 'width 0.3s' }} />
        </div>
        <span style={{ color, fontWeight: 600 }}>{label}</span>
      </div>
    );
  };

  const stepLabels = ['Pharmacy Details', 'Location', 'Account'];

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--background) 50%, var(--primary-100) 100%)',
      padding: 'var(--space-6)'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ 
          width: '100%', maxWidth: '720px', 
          background: 'var(--surface)', borderRadius: 'var(--radius-xl)', 
          padding: 'var(--space-8)', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>
            Join DoseBuddy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)', margin: 0 }}>Register your pharmacy to get started</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', alignItems: 'center' }}>
          {stepLabels.map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  height: 4, borderRadius: 2,
                  background: step > i ? 'var(--primary)' : step === i + 1 ? 'var(--primary-200)' : 'var(--slate-200)',
                  transition: 'background 0.3s'
                }} />
                <span style={{ fontSize: 'var(--text-xs)', color: step >= i + 1 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 500, marginTop: 'var(--space-1)', display: 'block' }}>
                  {label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ background: 'var(--danger-light)', color: 'var(--danger-dark)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSignup}>
          {/* Step 1: Pharmacy Details */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Pharmacy Name</label>
                <input type="text" name="pharmacyName" className="input" required value={formData.pharmacyName} onChange={handleChange} placeholder="e.g. City Care Pharmacy" />
              </div>
              <div className="form-group">
                <label className="label">License Number</label>
                <input type="text" name="licenseNumber" className="input" required value={formData.licenseNumber} onChange={handleChange} placeholder="License #" />
              </div>
              <div className="form-group">
                <label className="label">Phone Number</label>
                <PhoneInput name="phone" className="input" required value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Manager Name</label>
                <input type="text" name="managerName" className="input" required value={formData.managerName} onChange={handleChange} placeholder="Full Name" />
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Street Address</label>
                <input type="text" name="address" className="input" required value={formData.address} onChange={handleChange} placeholder="123 Main St" />
              </div>
              <div className="form-group">
                <label className="label">City</label>
                <input type="text" name="city" className="input" required value={formData.city} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="label">State</label>
                <input type="text" name="state" className="input" required value={formData.state} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="label">Zip Code</label>
                <input type="text" name="zipCode" className="input" required value={formData.zipCode} onChange={handleChange} />
              </div>
            </div>
          )}

          {/* Step 3: Account */}
          {step === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="label">Email Address</label>
                <input type="email" name="email" className="input" required value={formData.email} onChange={handleChange} placeholder="pharmacy@example.com" />
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} name="password" className="input" required
                    value={formData.password} onChange={handleChange} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrength password={formData.password} />
              </div>
              <div className="form-group">
                <label className="label">Confirm Password</label>
                <input type="password" name="confirmPassword" className="input" required value={formData.confirmPassword} onChange={handleChange} />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-6)', gap: 'var(--space-3)' }}>
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={() => setStep(s => s - 1)}>Back</Button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)' }}>
              {step < 3 ? (
                <Button type="button" variant="primary" onClick={() => setStep(s => s + 1)}>Next</Button>
              ) : (
                <Button type="submit" variant="primary" size="lg" loading={loading}>Create Account</Button>
              )}
            </div>
          </div>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>

        <div style={{ 
          marginTop: 'var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          gap: 'var(--space-2)', color: 'var(--success-dark)', fontSize: 'var(--text-xs)', fontWeight: 600
        }}>
          <Shield size={12} />
          <span>Your data is encrypted & secure</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
