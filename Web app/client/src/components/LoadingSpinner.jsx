import React from 'react';

const LoadingSpinner = ({ message }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
      backgroundColor: 'var(--background)',
      gap: 'var(--space-4)'
    }}>
      <div style={{
        width: 44,
        height: 44,
        border: '3px solid var(--primary-light)',
        borderTop: '3px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      {message && (
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500
        }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
