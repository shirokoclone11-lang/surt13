import React from 'react';
import Checkbox from '@/ui/components/interaction/Checkbox.jsx';
import SectionTitle from '@/ui/components/layout/SectionTitle.jsx';
import { Icons } from '@/ui/components/icons.jsx';

const Weapons = ({ settings, onSettingChange }) => {
  if (!settings?.weaponSwitch_) {
    return <div className="section"><p style={{ color: '#888', padding: '1rem', textAlign: 'center' }}>Loading...</p></div>;
  }

  const ws = settings.weaponSwitch_;

  const WeaponGroup = ({ title, children }) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <div className="subsection-title" style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', paddingLeft: '0.25rem' }}>{title}</div>
      <div className="subgroup">
        {children}
      </div>
    </div>
  );

  return (
    <div className="section">
      <SectionTitle
        icon={Icons.AutoSwitch_}
        label="Weapon Switch"
        enabled={ws.enabled_ ?? false}
        onEnabledChange={(v) => onSettingChange((s) => (s.weaponSwitch_.enabled_ = v))}
      />

      <div style={{ marginBottom: '1rem' }}></div>

      <SectionTitle
        icon={Icons.Reload_ || Icons.AutoSwitch_}
        label="Auto Reload"
        enabled={settings.autoReload_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.autoReload_.enabled_ = v))}
      />
      <div className={`group ${!settings.autoReload_.enabled_ ? 'hidden' : ''}`}>
        <div className="subsection-title" style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', paddingLeft: '0.25rem' }}>Reload Threshold (%)</div>
        <div style={{ padding: '0 0.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.5rem' }}>Reload when ammo % is below:</p>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={settings.autoReload_.threshold_}
            onChange={(e) => onSettingChange((s) => s.autoReload_.threshold_ = parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ textAlign: 'right', color: '#fff', fontSize: '0.8rem' }}>{settings.autoReload_.threshold_}%</div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}></div>

      <div className={`group ${!ws.enabled_ ? 'hidden' : ''}`} style={ws.enabled_ ? { maxHeight: '80rem' } : undefined}>

        <WeaponGroup title="Shotguns">
          <Checkbox id="ws-mp220" label="MP220" checked={ws.mp220_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.mp220_ = v))} />
          <Checkbox id="ws-spas12" label="SPAS" checked={ws.spas12_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.spas12_ = v))} />
          <Checkbox id="ws-m870" label="M870" checked={ws.m870_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.m870_ = v))} />
          <Checkbox id="ws-saiga" label="Saiga" checked={ws.saiga_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.saiga_ = v))} />
          <Checkbox id="ws-super90" label="Super90" checked={ws.super90_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.super90_ = v))} />
          <Checkbox id="ws-usas" label="USAS" checked={ws.usas_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.usas_ = v))} />
        </WeaponGroup>

        <WeaponGroup title="Snipers">
          <Checkbox id="ws-mosin" label="Mosin" checked={ws.mosin_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.mosin_ = v))} />
          <Checkbox id="ws-sv98" label="SV-98" checked={ws.sv98_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.sv98_ = v))} />
          <Checkbox id="ws-awc" label="AWM-S" checked={ws.awc_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.awc_ = v))} />
          <Checkbox id="ws-scout" label="Scout" checked={ws.scout_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.scout_ = v))} />
          <Checkbox id="ws-model94" label="M94" checked={ws.model94_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.model94_ = v))} />
          <Checkbox id="ws-blr" label="BLR" checked={ws.blr_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.blr_ = v))} />
        </WeaponGroup>

        <WeaponGroup title="DMRs">
          <Checkbox id="ws-mk12" label="Mk12" checked={ws.mk12_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.mk12_ = v))} />
          <Checkbox id="ws-mk20" label="Mk20" checked={ws.mk20_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.mk20_ = v))} />
          <Checkbox id="ws-m39" label="M39" checked={ws.m39_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.m39_ = v))} />
          <Checkbox id="ws-svd" label="SVD" checked={ws.svd_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.svd_ = v))} />
          <Checkbox id="ws-garand" label="Garand" checked={ws.garand_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.garand_ = v))} />
        </WeaponGroup>

        <WeaponGroup title="Pistols">
          <Checkbox id="ws-ot38" label="OT-38" checked={ws.ot38_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.ot38_ = v))} />
          <Checkbox id="ws-ots38" label="OTs-38" checked={ws.ots38_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.ots38_ = v))} />
          <Checkbox id="ws-deagle" label="DEagle" checked={ws.deagle_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.deagle_ = v))} />
          <Checkbox id="ws-m9" label="M9" checked={ws.m9_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.m9_ = v))} />
          <Checkbox id="ws-m93r" label="M93R" checked={ws.m93r_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.m93r_ = v))} />
          <Checkbox id="ws-m1911" label="M1911" checked={ws.m1911_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.m1911_ = v))} />
          <Checkbox id="ws-p30l" label="P30L" checked={ws.p30l_} onChange={(v) => onSettingChange((s) => (s.weaponSwitch_.p30l_ = v))} />
        </WeaponGroup>

      </div>
    </div>
  );
};

export default Weapons;