import React from 'react';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon,
  title = 'No data found',
  description = 'There\'s nothing here yet.',
  actionLabel,
  onAction,
  className = ''
}) => {
  const IconComponent = icon || Inbox;

  return (
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
        background: 'var(--primary-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 'var(--space-5)',
        color: 'var(--primary)'
      }}>
        <IconComponent size={28} />
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
        marginBottom: actionLabel ? 'var(--space-5)' : 0
      }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
