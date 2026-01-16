import React from 'react';
import SectionTitle from '@/ui/components/layout/SectionTitle.jsx';
import KeybindSlot from '@/ui/components/interaction/KeybindSlot.jsx';
import { Icons } from '@/ui/components/icons.jsx';

const Help = ({ settings, onSettingChange }) => {
  return (
    <div className="section">
      <SectionTitle
        icon={Icons.Help_}
        label="Controls"
        enabled={true}
        onEnabledChange={() => { }}
        hideCheckbox={true}
      />

      <div className="group">
        <div className="help-panel">
          <div className="help-title">
            <Icons.Discord_ width={18} height={18} />
            Toggle Menu
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="keybind-help-text">Show/Hide the cheat interface</span>
            <KeybindSlot
              keybind={settings?.keybinds_?.toggleMenu_ || 'ShiftRight'}
              editable={true}
              onClick={(key) => onSettingChange((s) => (s.keybinds_.toggleMenu_ = key))}
            />
          </div>
        </div>

        <div className="section-subtitle">Quick Toggles</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div className="keybind-slot-container" style={{ justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>Aimbot</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleAimbot_ || 'KeyB'} editable={true} onClick={(k) => onSettingChange(s => s.keybinds_.toggleAimbot_ = k)} />
          </div>
          <div className="keybind-slot-container" style={{ justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>Sticky</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleStickyTarget_ || 'KeyN'} editable={true} onClick={(k) => onSettingChange(s => s.keybinds_.toggleStickyTarget_ = k)} />
          </div>
          <div className="keybind-slot-container" style={{ justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>Layer</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleLayerSpoof_ || 'KeyT'} editable={true} onClick={(k) => onSettingChange(s => s.keybinds_.toggleLayerSpoof_ = k)} />
          </div>
          <div className="keybind-slot-container" style={{ justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>X-Ray</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleXray_ || 'KeyX'} editable={true} onClick={(k) => onSettingChange(s => s.keybinds_.toggleXray_ = k)} />
          </div>
          <div className="keybind-slot-container" style={{ justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>ESP</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleESP_ || 'KeyE'} editable={true} onClick={(k) => onSettingChange(s => s.keybinds_.toggleESP_ = k)} />
          </div>
          <div className="keybind-slot-container" style={{ justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>Grenade</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleGrenadeTimer_ || 'KeyG'} editable={true} onClick={(k) => onSettingChange(s => s.keybinds_.toggleGrenadeTimer_ = k)} />
          </div>
          <div className="keybind-slot-container" style={{ justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ccc' }}>Spinbot</span>
            <KeybindSlot keybind={settings?.keybinds_?.toggleSpinbot_ || 'KeyY'} editable={true} onClick={(k) => onSettingChange(s => s.keybinds_.toggleSpinbot_ = k)} />
          </div>
        </div>
      </div>

      <div className="community-container">
        <div className="credits-panel" style={{ flex: 1, textAlign: 'center' }}>
          <div className="section-subtitle">Developer</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>pirated.exe</div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>Lead Developer</div>
        </div>
        <div className="credits-panel" style={{ flex: 1, textAlign: 'center' }}>
          <div className="section-subtitle">Team</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>SurvevHack</div>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>Core Team</div>
        </div>
      </div>

    </div>
  );
};

export default Help;