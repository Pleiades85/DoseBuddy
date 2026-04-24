import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  type = 'button',
  className = '',
  id,
  ...props
}) => {
  const classes = [
    'db-btn',
    `db-btn--${variant}`,
    `db-btn--${size}`,
    fullWidth && 'db-btn--full',
    loading && 'db-btn--loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className={classes}
      disabled={disabled || loading}
      type={type}
      id={id}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 18} className="db-btn__spinner" />
      ) : icon ? (
        <span className="db-btn__icon">{icon}</span>
      ) : null}
      {children && <span className="db-btn__label">{children}</span>}
      {iconRight && <span className="db-btn__icon db-btn__icon--right">{iconRight}</span>}
    </motion.button>
  );
};

export default Button;
