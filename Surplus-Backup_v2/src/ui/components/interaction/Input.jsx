import React from 'react';

const Input = ({ id, label, value, onChange, placeholder = '' }) => {
  return (
    <div className="slider-container" style={{ marginTop: '0.5rem' }}>
      <div className="slider-label">
        <span>{label}</span>
      </div>
      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          padding: '4px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          marginTop: '4px'
        }}
      />
    </div>
  );
};

export default Input;
