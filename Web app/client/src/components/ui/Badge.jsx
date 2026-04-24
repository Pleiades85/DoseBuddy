import React from 'react';
import './Badge.css';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = ''
}) => {
  const classes = [
    'db-badge',
    `db-badge--${variant}`,
    `db-badge--${size}`,
    dot && 'db-badge--dot',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && <span className="db-badge__dot" />}
      {children}
    </span>
  );
};

export default Badge;
