import React, { useState, useRef, useCallback } from 'react';

const Slider = ({ id, label, value, min = 0, max = 100, warning = false, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const percentage = ((value - min) / (max - min)) * 100;

  // Enhanced gradient with RGB accent
  const sliderStyle = {
    background: `linear-gradient(90deg, #00d4ff 0%, #a855f7 ${percentage}%, #0a0a0f ${percentage}%, #0a0a0f 100%)`,
  };

  const handleChange = (e) => {
    e.stopPropagation();
    onChange(parseInt(e.target.value));
  };

  const handleClick = (e) => {
    e.stopPropagation();
  };

  const startDragging = useCallback(() => setIsDragging(true), []);
  const stopDragging = useCallback(() => setIsDragging(false), []);

  const handleMouseDown = useCallback(
    (e) => {
      e.stopPropagation();
      startDragging();
    },
    [startDragging]
  );

  const handleTouchStart = useCallback(
    (e) => {
      e.stopPropagation();
      startDragging();
    },
    [startDragging]
  );

  const handleMouseUp = useCallback(
    (e) => {
      if (e) {
        e.stopPropagation();
      }
      stopDragging();
    },
    [stopDragging]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (e) {
        e.stopPropagation();
      }
      stopDragging();
    },
    [stopDragging]
  );

  return (
    <div className="slider-container" onClick={handleClick}>
      <label htmlFor={id} className="slider-label">
        {label}
      </label>
      <input
        ref={sliderRef}
        type="range"
        className={`slider ${isDragging ? 'slider-dragging' : ''}`}
        id={id}
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        onInput={handleChange}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={sliderStyle}
      />
      <span className="slider-value">{value}</span>
      {warning && <span className="risky-label">RISKY</span>}
    </div>
  );
};

export const WarningSlider = (props) => {
  const currentValue = props.value;
  return (
    <Slider
      {...props}
      value={currentValue}
      warning={props.shouldWarning?.(currentValue) ?? false}
    />
  );
};

export default Slider;
