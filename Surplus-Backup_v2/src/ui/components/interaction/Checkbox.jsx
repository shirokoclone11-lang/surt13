import React from 'react';

const Checkbox = ({ id, label, checked, onChange, style = {}, warning = false }) => {
  const handleClick = (e) => {
    if (e.target.type !== 'checkbox') {
      onChange(!checked);
    }
  };

  return (
    <div
      className={`checkbox-item ${warning && checked ? 'warning' : ''}`}
      style={style}
      onClick={handleClick}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.checked);
        }}
        className={`checkbox ${checked ? 'checkbox-checked' : ''}`}
      />
      {label && (
        <label htmlFor={id} className="checkbox-item-label" onClick={(e) => e.stopPropagation()}>
          {label}
        </label>
      )}
      {warning && (
        <span className="risky-label">RISKY</span>
      )}
    </div>
  );
};

export const WarningCheckbox = (props) => {
  const isChecked = props.checked;
  return <Checkbox {...props} warning={props.shouldWarning?.(isChecked) ?? false} />;
};

export default Checkbox;
