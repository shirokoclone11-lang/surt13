import React, { useState, useEffect } from 'react';
import Checkbox from '@/ui/components/interaction/Checkbox.jsx';
import Slider from '@/ui/components/interaction/Slider.jsx';
import SectionTitle from '@/ui/components/layout/SectionTitle.jsx';
import { Icons } from '@/ui/components/icons.jsx';

const Main = ({ settings, onSettingChange }) => {
  return (
    <div className="section">
      <SectionTitle
        icon={Icons.Aimbot_}
        label="Aimbot"
        enabled={settings.aimbot_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.aimbot_.enabled_ = v))}
      />
      <div className={`group ${!settings.aimbot_.enabled_ ? 'hidden' : ''}`}>
        <Slider
          id="aimbot-smoothness"
          label="Smoothness"
          value={settings.aimbot_.smooth_}
          onChange={(v) => onSettingChange((s) => (s.aimbot_.smooth_ = v))}
          suffix="%"
        />
        <Slider
          id="aimbot-fov"
          label="FOV"
          value={settings.aimbot_.fov_}
          min={10}
          max={1000}
          onChange={(v) => onSettingChange((s) => (s.aimbot_.fov_ = v))}
          suffix="px"
        />
        <div className="subgroup">
          <Checkbox
            id="target-knocked"
            label="Target Knocked"
            checked={settings.aimbot_.targetKnocked_}
            onChange={(v) => onSettingChange((s) => (s.aimbot_.targetKnocked_ = v))}
          />
          <Checkbox
            id="sticky-target"
            label="Sticky Target"
            checked={settings.aimbot_.stickyTarget_}
            onChange={(v) => onSettingChange((s) => (s.aimbot_.stickyTarget_ = v))}
          />
          <Checkbox
            id="show-dot"
            label="Show Dot"
            checked={settings.aimbot_.showDot_}
            onChange={(v) => onSettingChange((s) => (s.aimbot_.showDot_ = v))}
          />
          <Checkbox
            id="wall-check"
            label="Wall Check"
            checked={settings.aimbot_.wallcheck_}
            onChange={(v) => onSettingChange((s) => (s.aimbot_.wallcheck_ = v))}
          />
          <Checkbox
            id="fov-limit"
            label="FOV Limit"
            checked={settings.aimbot_.fovEnabled_}
            onChange={(v) => onSettingChange((s) => (s.aimbot_.fovEnabled_ = v))}
          />
          <Checkbox
            id="show-fov"
            label="Show FOV"
            checked={settings.aimbot_.showFov_}
            onChange={(v) => onSettingChange((s) => (s.aimbot_.showFov_ = v))}
          />
        </div>
      </div>

      <SectionTitle
        icon={Icons.TriggerBot_}
        label="Trigger Bot"
        enabled={settings.triggerBot_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.triggerBot_.enabled_ = v))}
      />
      <div className={`group ${!settings.triggerBot_.enabled_ ? 'hidden' : ''}`}>
        <Slider
          id="triggerbot-delay"
          label="Delay"
          value={settings.triggerBot_.delay_}
          min={0}
          max={500}
          onChange={(v) => onSettingChange((s) => (s.triggerBot_.delay_ = v))}
          suffix="ms"
        />
        <Slider
          id="triggerbot-fov"
          label="FOV"
          value={settings.triggerBot_.fov_}
          min={10}
          max={1000}
          onChange={(v) => onSettingChange((s) => (s.triggerBot_.fov_ = v))}
          suffix="px"
        />
        <Checkbox
          id="triggerbot-show-fov"
          label="Show FOV"
          checked={settings.triggerBot_.showFov_}
          onChange={(v) => onSettingChange((s) => (s.triggerBot_.showFov_ = v))}
        />
      </div>

      <SectionTitle
        icon={Icons.MeleeLock_}
        label="Melee Lock"
        enabled={settings.meleeLock_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.meleeLock_.enabled_ = v))}
      />
      <div className={`group ${!settings.meleeLock_.enabled_ ? 'hidden' : ''}`}>
        <Checkbox
          id="auto-melee"
          label="Auto Melee"
          checked={settings.meleeLock_.autoMelee_}
          onChange={(v) => onSettingChange((s) => (s.meleeLock_.autoMelee_ = v))}
        />
      </div>

      <SectionTitle
        icon={Icons.AutoFire_} // Using AutoFire icon directly
        label="Auto Fire"
        enabled={settings.autoFire_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.autoFire_.enabled_ = v))}
      />



      <SectionTitle
        icon={Icons.TargetInfo_} // Using Target or best approximate
        label="Desync"
        enabled={settings.desync_?.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.desync_.enabled_ = v))}
      />

      <SectionTitle
        icon={Icons.FollowBot_}
        label="Spinbot"
        enabled={settings.spinbot_?.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.spinbot_.enabled_ = v))}
      />
      <div className={`group ${!settings.spinbot_?.enabled_ ? 'hidden' : ''}`}>
        <Slider label="Speed" value={settings.spinbot_?.speed_ ?? 50}
          onChange={(v) => onSettingChange((s) => (s.spinbot_.speed_ = v))} min={1} max={360} suffix="°" />
        <Slider label="Delay" value={settings.spinbot_?.delay_ ?? 16}
          onChange={(v) => onSettingChange((s) => (s.spinbot_.delay_ = v))} min={1} max={100} suffix="ms" />
        <div className="subgroup">
          <Checkbox label="Realistic" checked={settings.spinbot_?.realistic_}
            onChange={(v) => onSettingChange((s) => (s.spinbot_.realistic_ = v))} />
          <Checkbox label="3 Directions" checked={settings.spinbot_?.spin3_}
            onChange={(v) => onSettingChange((s) => { s.spinbot_.spin3_ = v; if (v) s.spinbot_.spin4_ = false; })} />
          <Checkbox label="4 Directions" checked={settings.spinbot_?.spin4_}
            onChange={(v) => onSettingChange((s) => { s.spinbot_.spin4_ = v; if (v) s.spinbot_.spin3_ = false; })} />
        </div>
      </div>

    </div>
  );
};

export default Main;