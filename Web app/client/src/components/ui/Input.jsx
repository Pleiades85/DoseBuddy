import React from 'react';
import './Input.css';

const Input = React.forwardRef(({
  label,
  error,
  helper,
  icon,
  iconRight,
  className = '',
  id,
  required,
  fullWidth = true,
  size = 'md',
  ...props
}, ref) => {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`db-input-group ${fullWidth ? 'db-input-group--full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="db-input__label">
          {label}
          {required && <span className="db-input__required">*</span>}
        </label>
      )}
      <div className={`db-input__wrapper ${error ? 'db-input__wrapper--error' : ''} db-input__wrapper--${size}`}>
        {icon && <span className="db-input__icon db-input__icon--left">{icon}</span>}
        {props.type === 'textarea' ? (
          <textarea
            ref={ref}
            id={inputId}
            className={`db-input ${icon ? 'db-input--has-icon-left' : ''} ${iconRight ? 'db-input--has-icon-right' : ''}`}
            {...props}
            type={undefined}
          />
        ) : (
          <input
            ref={ref}
            id={inputId}
            className={`db-input ${icon ? 'db-input--has-icon-left' : ''} ${iconRight ? 'db-input--has-icon-right' : ''}`}
            {...props}
          />
        )}
        {iconRight && <span className="db-input__icon db-input__icon--right">{iconRight}</span>}
      </div>
      {error && <span className="db-input__error">{error}</span>}
      {helper && !error && <span className="db-input__helper">{helper}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
