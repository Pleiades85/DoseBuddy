import React from 'react';
import './Card.css';

const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  hoverable = false,
  onClick,
  ...props
}) => {
  const classes = [
    'db-card',
    `db-card--${variant}`,
    `db-card--pad-${padding}`,
    hoverable && 'db-card--hoverable',
    onClick && 'db-card--clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => (
  <div className={`db-card__header ${className}`}>{children}</div>
);

const CardBody = ({ children, className = '' }) => (
  <div className={`db-card__body ${className}`}>{children}</div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`db-card__footer ${className}`}>{children}</div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
