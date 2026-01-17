import React from 'react';
import Checkbox from '@/ui/components/interaction/Checkbox.jsx';
import SectionTitle from '@/ui/components/layout/SectionTitle.jsx';
import { Icons } from '@/ui/components/icons.jsx';

const Weapons = ({ settings, onSettingChange }) => {
  const weaponCategories = {
    shotguns: {
      label: 'Shotguns',
      weapons: [
        { key: 'mp220_', name: 'MP220' },
        { key: 'spas12_', name: 'SPAS-12' },
        { key: 'm870_', name: 'M870' },
        { key: 'saiga_', name: 'Saiga' },
        { key: 'super90_', name: 'Super 90' },
        { key: 'usas_', name: 'USAS' },
        { key: 'm1100_', name: 'M1100' },
      ],
    },
    snipers: {
      label: 'Snipers',
      weapons: [
        { key: 'mosin_', name: 'Mosin' },
        { key: 'sv98_', name: 'SV-98' },
        { key: 'awc_', name: 'AWC' },
        { key: 'scout_', name: 'Scout' },
        { key: 'model94_', name: 'Model 94' },
        { key: 'blr_', name: 'BLR' },
      ],
    },
    dmrs: {
      label: 'DMRs',
      weapons: [
        { key: 'mk12_', name: 'MK12' },
        { key: 'mk20_', name: 'MK20 SSR' },
        { key: 'm39_', name: 'M39' },
        { key: 'svd_', name: 'SVD' },
        { key: 'garand_', name: 'Garand' },
      ],
    },
    pistols: {
      label: 'Pistols',
      weapons: [
        { key: 'ot38_', name: 'OT-38' },
        { key: 'ots38_', name: 'OTS-38' },
        { key: 'deagle_', name: 'Deagle' },
        { key: 'm9_', name: 'M9' },
        { key: 'm93r_', name: 'M93R' },
        { key: 'm1911_', name: 'M1911' },
        { key: 'p30l_', name: 'P30L' },
        { key: 'flare_gun_', name: 'Flare Gun' },
        { key: 'peacemaker_', name: 'Peacemaker' },
      ],
    },
    others: {
      label: 'Others',
      weapons: [
        { key: 'groza_', name: 'Groza' },
        { key: 'grozas_', name: 'Groza-S' },
        { key: 'an94_', name: 'AN-94' },
        { key: 'm1a1_', name: 'M1A1' },
      ],
    },
  };

  return (
    <div className="section">
      <SectionTitle
        icon={Icons.Weaponsswm_}
        label="Weapon Switch"
        enabled={settings.weaponSwitch_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.weaponSwitch_.enabled_ = v))}
      />
      <div className={`group ${!settings.weaponSwitch_.enabled_ ? 'hidden' : ''}`}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
          Select weapons to auto-switch between when ammo runs out
        </div>

        <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '6px' }}>
          {Object.entries(weaponCategories).map(([categoryKey, category]) => (
            <div key={categoryKey} style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  opacity: 0.9,
                }}
              >
                {category.label}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {category.weapons.map((weapon) => (
                  <Checkbox
                    key={weapon.key}
                    id={`weapon-${weapon.key}`}
                    label={weapon.name}
                    checked={settings.weaponSwitch_[weapon.key] === true}
                    onChange={(v) =>
                      onSettingChange((s) => (s.weaponSwitch_[weapon.key] = v))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Weapons;
