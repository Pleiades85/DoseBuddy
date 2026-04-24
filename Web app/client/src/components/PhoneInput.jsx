import React from 'react';

const PhoneInput = ({ value, onChange, className, required = false, name = "phone" }) => {
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange({ target: { name, value: formatted } });
  };

  return (
    <input
      type="tel"
      name={name}
      className={className}
      required={required}
      value={value}
      onChange={handleChange}
      placeholder="(555) 555-5555"
      maxLength={14}
    />
  );
};

export default PhoneInput;
