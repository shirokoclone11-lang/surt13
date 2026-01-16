import Checkbox from '@/ui/components/interaction/Checkbox.jsx';
import Slider from '@/ui/components/interaction/Slider.jsx';
import Input from '@/ui/components/interaction/Input.jsx';
import SectionTitle from '@/ui/components/layout/SectionTitle.jsx';
import { Icons } from '@/ui/components/icons.jsx';
import { spawnHaxReichBot, injectHaxReichSelf } from '@/features/HaxReich.js';

const Misc = ({ settings, onSettingChange }) => {
  return (
    <div className="section">
      <SectionTitle
        icon={Icons.Map_}
        label="Map Highlights"
        enabled={settings.mapHighlights_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.mapHighlights_.enabled_ = v))}
      />
      <div className={`group ${!settings.mapHighlights_.enabled_ ? 'hidden' : ''}`}>
        <Checkbox
          id="smaller-trees"
          label="Smaller Trees"
          checked={settings.mapHighlights_.smallerTrees_}
          onChange={(v) => onSettingChange((s) => (s.mapHighlights_.smallerTrees_ = v))}
        />
      </div>

      <SectionTitle
        icon={Icons.AutoLoot_}
        label="Auto Loot"
        enabled={settings.autoLoot_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.autoLoot_.enabled_ = v))}
      />

      <SectionTitle
        icon={Icons.Refresh_}
        label="Auto Respawn"
        enabled={settings.autoRespawn_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.autoRespawn_.enabled_ = v))}
      />

      <SectionTitle
        icon={Icons.MobileMovement_}
        label="Mobile Movement"
        enabled={settings.mobileMovement_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.mobileMovement_.enabled_ = v))}
      />
      <div className={`group ${!settings.mobileMovement_.enabled_ ? 'hidden' : ''}`}>
        <Slider
          id="mobile-movement-smooth"
          label="Smooth"
          value={settings.mobileMovement_.smooth_}
          onChange={(v) => onSettingChange((s) => (s.mobileMovement_.smooth_ = v))}
        />
      </div>

      {/* Follow Bot */}
      <SectionTitle
        icon={Icons.FollowBot_}
        label="Follow Bot"
        enabled={settings.followBot_.enabled_}
        onEnabledChange={(v) => onSettingChange((s) => (s.followBot_.enabled_ = v))}
      />
      <div className={`group ${!settings.followBot_.enabled_ ? 'hidden' : ''}`}>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input
              id="team-code"
              placeholder="Code (ex: euro-1)"
              value={settings.followBot_.teamCode_ || ''}
              onChange={(v) => onSettingChange((s) => (s.followBot_.teamCode_ = v))}
            />
          </div>
          <button
            onClick={() => {
              // 1. Set this window as Master
              import('@/features/FollowBot.js').then(m => m.setMasterMode(true));

              // 2. Resolve Code
              let code = settings.followBot_.teamCode_ || '';
              // If empty, try URL hash
              if (!code && window.location.hash) {
                code = window.location.hash.replace('#', '');
              }

              // If user pasted full URL
              if (code.includes('survev.io')) {
                const split = code.split('#');
                if (split.length > 1) code = split[1];
              }

              if (!code) {
                alert("Entrez un code d'équipe ou créez une équipe !");
                return;
              }

              // 3. Open Popup with Hardcoded URL
              const target = `https://survev.io/#${code}?bot=slave&t=${Date.now()}`;
              window.open(target, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
            }}
            style={{
              padding: '0.4rem',
              fontSize: '0.7rem',
              fontWeight: '600',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: '#00d4ff',
              color: '#000',
              marginLeft: '5px',
              width: '50px'
            }}
          >
            ADD
          </button>
        </div>

        {/* Slave Options */}
        {settings.followBot_.mode_ === 'slave' && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.7rem',
            cursor: 'pointer',
            marginTop: '0.4rem',
          }}>
            <Checkbox
              id="follow-master"
              label="Follow Master"
              checked={settings.followBot_.followMaster_}
              onChange={(v) => onSettingChange((s) => (s.followBot_.followMaster_ = v))}
            />
          </label>
        )}

        <p style={{
          fontSize: '0.6rem',
          color: '#666',
          marginTop: '0.3rem',
          textAlign: 'center',
        }}>
          {settings.followBot_.mode_ === 'master' && '👑 Mode Master Actif'}
          {settings.followBot_.mode_ === 'slave' && '🤖 Mode Slave Actif'}
          {!settings.followBot_.mode_ && 'Créez une équipe et ajoutez un bot'}
        </p>
      </div>

    </div>
  );
};

export default Misc;