import React from 'react';
import SectionTitle from '@/ui/components/layout/SectionTitle.jsx';
import { Icons } from '@/ui/components/icons.jsx';

const Style = ({ settings, onSettingChange }) => {
  const styleOptions = [
    { value: 'surplus', label: 'Surplus', description: 'Original Surplus style, optimized performance' },
    { value: 'spring', label: '🌸 Spring', description: 'Fresh pastel theme with light glass effects' },
    { value: 'summer', label: '☀️ Summer', description: 'Bright & warm theme with ocean & sunshine colors' },
    { value: 'medium', label: 'Medium', description: 'Balanced effects & performance' },
    { value: 'heavy', label: 'Heavy', description: 'Full effects, best visual quality' },
  ];

  return (
    <div className="section">
      <SectionTitle
        icon={Icons.Settings_}
        label="Menu Style"
        enabled={true}
      />
      <div className="group">
        <div style={{ padding: '10px' }}>
          <label style={{ display: 'block', marginBottom: '15px', fontSize: '12px', color: '#aaa', fontWeight: '600', textTransform: 'uppercase' }}>
            Select Style
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {styleOptions.map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: settings.ui_.menuStyle_ === option.value ? 'rgba(110, 219, 114, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${settings.ui_.menuStyle_ === option.value ? 'rgba(110, 219, 114, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (settings.ui_.menuStyle_ !== option.value) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (settings.ui_.menuStyle_ !== option.value) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                <input
                  type="radio"
                  name="menuStyle"
                  value={option.value}
                  checked={settings.ui_.menuStyle_ === option.value}
                  onChange={() => onSettingChange((s) => (s.ui_.menuStyle_ = option.value))}
                  style={{ marginRight: '10px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>
                    {option.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Style;

