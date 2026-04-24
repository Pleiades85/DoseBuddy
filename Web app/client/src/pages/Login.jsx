import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--background) 50%, var(--primary-100) 100%)',
      padding: 'var(--space-4)'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ 
          width: '100%', maxWidth: '420px', 
          background: 'var(--surface)', borderRadius: 'var(--radius-xl)', 
          padding: 'var(--space-8)', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-7)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7V12C4 16.42 7.4 20.74 12 22C16.6 20.74 20 16.42 20 12V7L12 2Z" fill="currentColor" opacity="0.3"/>
              <path d="M12 2L4 7V12C4 16.42 7.4 20.74 12 22C16.6 20.74 20 16.42 20 12V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
              <path d="M9 12H15M12 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ 
            fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text)',
            marginBottom: 'var(--space-2)'
          }}>
            DoseBuddy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>Sign in to your pharmacy dashboard</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ 
              background: 'var(--danger-light)', color: 'var(--danger-dark)', 
              padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius)', 
              marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)', fontWeight: 500 
            }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="form-group">
            <label className="label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" className="input" placeholder="you@pharmacy.com"
                style={{ paddingLeft: 'calc(var(--space-3) + 24px + var(--space-2))' }}
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" className="input" placeholder="••••••••"
                style={{ paddingLeft: 'calc(var(--space-3) + 24px + var(--space-2))' }}
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
            </div>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>
        
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
            Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign Up</Link>
          </p>
        </div>

        <div style={{ 
          marginTop: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          gap: 'var(--space-2)', color: 'var(--success-dark)', fontSize: 'var(--text-xs)', fontWeight: 600
        }}>
          <Shield size={12} />
          <span>256-bit encrypted • HIPAA compliant</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
