import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

const ErrorState = ({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
  className = ''
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-9) var(--space-6)',
      textAlign: 'center'
    }}
  >
    <div style={{
      width: 64,
      height: 64,
      borderRadius: '50%',
      background: 'var(--danger-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 'var(--space-5)',
      color: 'var(--danger)'
    }}>
      <AlertCircle size={28} />
    </div>
    <h3 style={{
      fontSize: 'var(--text-lg)',
      fontWeight: 600,
      color: 'var(--text)',
      marginBottom: 'var(--space-2)'
    }}>
      {title}
    </h3>
    <p style={{
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      maxWidth: 360,
      marginBottom: onRetry ? 'var(--space-5)' : 0
    }}>
      {description}
    </p>
    {onRetry && (
      <Button variant="secondary" onClick={onRetry} icon={<RefreshCw size={16} />}>
        Try Again
      </Button>
    )}
  </motion.div>
);

export default ErrorState;
