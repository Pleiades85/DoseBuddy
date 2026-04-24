import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className = ''
}) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Separate children into footer and non-footer
  const childArray = React.Children.toArray(children);
  const footer = childArray.find(child => child?.type === ModalFooter);
  const body = childArray.filter(child => child?.type !== ModalFooter);

  // Use React Portal to render at document body level
  // This ensures the backdrop covers the ENTIRE page (including sidebar)
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="db-modal__overlay-wrapper">
          <motion.div
            className="db-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className={`db-modal db-modal--${size} ${className}`}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
          >
            {(title || showClose) && (
              <div className="db-modal__header">
                {title && <h2 className="db-modal__title">{title}</h2>}
                {showClose && (
                  <button className="db-modal__close" onClick={onClose} type="button">
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            <div className="db-modal__body">
              {body}
            </div>
            {footer}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

const ModalFooter = ({ children, className = '' }) => (
  <div className={`db-modal__footer ${className}`}>{children}</div>
);

Modal.Footer = ModalFooter;

export default Modal;
