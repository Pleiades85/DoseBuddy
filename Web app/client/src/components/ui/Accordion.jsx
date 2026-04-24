import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import './Accordion.css';

const Accordion = ({ title, icon, isOpen, onToggle, children, badge }) => (
  <div className={`db-accordion ${isOpen ? 'db-accordion--open' : ''}`}>
    <button className="db-accordion__trigger" onClick={onToggle}>
      <div className="db-accordion__trigger-left">
        {icon && <span className="db-accordion__icon">{icon}</span>}
        <h3 className="db-accordion__title">{title}</h3>
        {badge && <span className="db-accordion__badge">{badge}</span>}
      </div>
      <ChevronDown
        size={20}
        className="db-accordion__chevron"
        style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}
      />
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div className="db-accordion__content">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default Accordion;
