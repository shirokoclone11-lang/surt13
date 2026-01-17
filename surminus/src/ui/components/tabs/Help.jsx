import React from 'react';
import KeybindSlot from '@/ui/components/interaction/KeybindSlot.jsx';
import { Icons } from '@/ui/components/icons.jsx';

const Help = ({ settings, onSettingChange }) => {
  return (
    <div className="section help-section">
      <div className="help-title">
        <Icons.Help_ size={16} />
        <span>Controls & Information</span>
      </div>

      <div className="help-panel" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.375rem' }}>
          <KeybindSlot keybind={settings?.keybinds_?.toggleMenu_ || 'ShiftRight'} />
          <span className="keybind-description">Show/Hide Menu</span>
        </div>
        <p className="keybind-help-text">
          Toggle the menu visibility at any time using this keybind.
        </p>
      </div>

      <div className="section-subtitle">Feature Keybinds</div>
      <div className="help-panel">
        <p className="keybind-help-text" style={{ marginBottom: '0.5rem' }}>
          Keybinds can be customized next to each feature in their respective tabs:
        </p>
        <div className="features-container">
          <div className="feature-item">
            <span className="feature-name">Aimbot</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleAimbot_ || 'KeyB'} />
          </div>
          <div className="feature-item">

            <span className="feature-name">Blatant Aimbot</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleAutomatic_ || 'KeyI'} />
          </div>
          <div className="feature-item">
            <span className="feature-name">Spinbot</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleSpinbot_ || 'KeyO'} />
          </div>
        </div>
      </div>
      <div className="help-title">
        <Icons.Credits_ size={16} />
        <span>Credits</span>
      </div>
      <div className="credits-panel">
        <div className="credits-container">
          <div className="credit-item">
            <div className="credit-name">shiroko</div>
            <div>Developer, Designer</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
