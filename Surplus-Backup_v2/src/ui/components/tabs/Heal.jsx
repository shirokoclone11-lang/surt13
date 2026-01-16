import React from 'react';
import Checkbox from '@/ui/components/interaction/Checkbox.jsx';
import Slider from '@/ui/components/interaction/Slider.jsx';
import SectionTitle from '@/ui/components/layout/SectionTitle.jsx';
import { Icons } from '@/ui/components/icons.jsx';

const Heal = ({ settings, onSettingChange }) => {
  return (
    <div className="section">
      <SectionTitle
        icon={Icons.AutoHeal_}
        label="Auto Heal Setup"
        enabled={settings.autoHeal_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.autoHeal_.enabled_ = v))}
      />

      <div className={`group ${!settings.autoHeal_.enabled_ ? 'hidden' : ''}`}>
        <Slider
          label="Bandage Threshold"
          value={settings.autoHeal_.bandageThreshold_}
          min={0}
          max={100}
          onChange={(v) => onSettingChange((s) => (s.autoHeal_.bandageThreshold_ = v))}
          suffix="%"
        />

        <Slider
          label="Medkit Threshold"
          value={settings.autoHeal_.kitThreshold_}
          min={0}
          max={100}
          onChange={(v) => onSettingChange((s) => (s.autoHeal_.kitThreshold_ = v))}
          suffix="%"
        />

        <Checkbox
          label="Auto Boost (Keep Max)"
          checked={settings.autoHeal_.boostKeepMax_}
          onChange={(v) => onSettingChange((s) => (s.autoHeal_.boostKeepMax_ = v))}
        />

        <Checkbox
          label="Stop if Enemy Near"
          checked={settings.autoHeal_.enemyCheck_}
          onChange={(v) => onSettingChange((s) => (s.autoHeal_.enemyCheck_ = v))}
        />

        <Checkbox
          label="Only Heal When Still"
          checked={settings.autoHeal_.movementCheck_}
          onChange={(v) => onSettingChange((s) => (s.autoHeal_.movementCheck_ = v))}
        />
      </div>
    </div>
  );
};

export default Heal;
