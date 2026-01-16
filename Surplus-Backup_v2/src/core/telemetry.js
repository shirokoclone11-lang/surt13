// ============================================
// TÉLÉMÉTRIE
// ============================================

import { outer } from '@/core/outer.js';

export const HACK_VERSION = VERSION;

function generateUsername() {
  const adjectives = [
    'Shadow', 'Dark', 'Swift', 'Silent', 'Deadly', 'Ghost', 'Phantom', 'Stealth',
    'Ninja', 'Cyber', 'Toxic', 'Savage', 'Wild', 'Crazy', 'Epic', 'Legendary',
    'Mystic', 'Frozen', 'Blazing', 'Thunder', 'Storm', 'Void', 'Neon', 'Cosmic'
  ];
  const nouns = [
    'Wolf', 'Dragon', 'Hawk', 'Viper', 'Tiger', 'Shark', 'Reaper', 'Hunter',
    'Slayer', 'Warrior', 'Knight', 'Sniper', 'Killer', 'Beast', 'Demon', 'Phoenix',
    'Cobra', 'Panther', 'Raven', 'Falcon', 'Scorpion', 'Spider', 'Lion', 'Bear'
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adj}${noun}${number}`;
}

function promptUsername() {
  return new Promise((resolve) => {
    const overlay = outer.document.createElement('div');
    overlay.id = 'survevhack-login';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: 'Segoe UI', Arial, sans-serif;
    `;

    const container = outer.document.createElement('div');
    container.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #00d4ff;
      border-radius: 15px;
      padding: 30px 40px;
      text-align: center;
      box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
      max-width: 400px;
    `;

    const title = outer.document.createElement('h1');
    title.textContent = 'SURVEVHACK';
    title.style.cssText = `
      color: #00d4ff;
      margin: 0 0 10px 0;
      font-size: 28px;
      text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    `;

    const version = outer.document.createElement('p');
    version.textContent = `v${HACK_VERSION}`;
    version.style.cssText = `
      color: #888;
      margin: 0 0 25px 0;
      font-size: 14px;
    `;

    const label = outer.document.createElement('label');
    label.textContent = 'Entre ton pseudo';
    label.style.cssText = `
      color: #fff;
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
    `;

    const input = outer.document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ton pseudo...';
    input.maxLength = 20;
    input.style.cssText = `
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #333;
      border-radius: 8px;
      background: #0a0a0a;
      color: #fff;
      font-size: 16px;
      outline: none;
      box-sizing: border-box;
      margin-bottom: 20px;
    `;

    const btn = outer.document.createElement('button');
    btn.textContent = 'CONNEXION';
    btn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
      border: none;
      border-radius: 8px;
      color: #000;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    `;

    const info = outer.document.createElement('p');
    info.textContent = 'Ton pseudo sera visible dans la télémétrie';
    info.style.cssText = `
      color: #666;
      margin: 15px 0 0 0;
      font-size: 11px;
    `;

    container.appendChild(title);
    container.appendChild(version);
    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(btn);
    container.appendChild(info);
    overlay.appendChild(container);
    outer.document.body.appendChild(overlay);

    const submit = () => {
      let username = input.value.trim();
      if (!username) {
        username = generateUsername();
      }
      overlay.style.cssText = 'display: none !important; visibility: hidden !important;';
      resolve(username);
    };

    btn.onclick = submit;
    input.onkeypress = (e) => {
      if (e.key === 'Enter') submit();
    };

    input.focus();
  });
}

function getOrCreateUserData() {
  const STORAGE_KEY = 'survevhack_user_v2';
  let userData = null;

  try {
    const stored = outer.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      userData = JSON.parse(stored);
      if (!userData.firstSeen || typeof userData.firstSeen !== 'number') {
        userData = null;
      }
    }
  } catch (e) { }

  const now = Date.now();

  if (!userData) {
    userData = {
      id: 'SH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      username: generateUsername(),
      firstSeen: now,
      sessions: 0,
      totalPlaytime: 0,
      lastSeen: now
    };
  }

  userData.sessions += 1;
  userData.lastSeen = now;

  try {
    outer.localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch (e) { }

  return userData;
}

function formatTimestamp(date) {
  const options = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  return date.toLocaleDateString('fr-FR', options);
}

function getSessionDuration(firstSeen) {
  const now = Date.now();
  const diff = now - firstSeen;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 5) return "🆕 Nouveau joueur";
  if (minutes < 60) return `${minutes} minutes`;
  if (hours < 24) return `${hours} heure(s)`;
  if (days === 1) return "1 jour";
  if (days < 7) return `${days} jours`;
  if (days < 30) return `${Math.floor(days / 7)} semaine(s)`;
  if (days < 365) return `${Math.floor(days / 30)} mois`;
  return `${Math.floor(days / 365)} an(s)`;
}

function getBrowserInfo() {
  const ua = outer.navigator.userAgent;
  if (ua.includes('Firefox')) return '🦊 Firefox';
  if (ua.includes('Edg')) return '🌐 Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return '🔴 Opera';
  if (ua.includes('Chrome')) return '🌐 Chrome';
  if (ua.includes('Safari')) return '🧭 Safari';
  return '🌐 Inconnu';
}

function getOSInfo() {
  const ua = outer.navigator.userAgent;
  if (ua.includes('Windows NT 10')) return '🪟 Windows 10/11';
  if (ua.includes('Windows')) return '🪟 Windows';
  if (ua.includes('Mac OS')) return '🍎 macOS';
  if (ua.includes('Linux')) return '🐧 Linux';
  if (ua.includes('Android')) return '🤖 Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return '📱 iOS';
  if (ua.includes('CrOS')) return '💻 ChromeOS';
  return '❓ Inconnu';
}

function getDeviceType() {
  const ua = outer.navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) return '📱 Tablette';
    return '📱 Mobile';
  }
  return '🖥️ Desktop';
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Inconnu';
  } catch (e) {
    return 'Inconnu';
  }
}

function getGPUInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer.includes('NVIDIA')) return '🎮 NVIDIA';
        if (renderer.includes('AMD') || renderer.includes('Radeon')) return '🎮 AMD';
        if (renderer.includes('Intel')) return '🎮 Intel';
        if (renderer.includes('Apple')) return '🎮 Apple GPU';
        return '🎮 ' + renderer.substring(0, 20);
      }
    }
  } catch (e) { }
  return '❓ Inconnu';
}

function getConnectionType() {
  try {
    const conn = outer.navigator.connection || outer.navigator.mozConnection || outer.navigator.webkitConnection;
    if (conn) {
      const type = conn.effectiveType || conn.type;
      if (type === '4g') return '📶 4G/5G';
      if (type === '3g') return '📶 3G';
      if (type === '2g') return '📶 2G';
      if (type === 'wifi') return '📶 WiFi';
      if (type === 'ethernet') return '🔌 Ethernet';
      return `📶 ${type}`;
    }
  } catch (e) { }
  return '📶 Inconnu';
}

function getRAMInfo() {
  try {
    if (outer.navigator.deviceMemory) {
      return `💾 ${outer.navigator.deviceMemory} GB`;
    }
  } catch (e) { }
  return '💾 Inconnu';
}

function getCPUCores() {
  try {
    if (outer.navigator.hardwareConcurrency) {
      return `⚡ ${outer.navigator.hardwareConcurrency} cœurs`;
    }
  } catch (e) { }
  return '⚡ Inconnu';
}

function getBatteryInfo() {
  return new Promise((resolve) => {
    try {
      if (outer.navigator.getBattery) {
        outer.navigator.getBattery().then((battery) => {
          const level = Math.round(battery.level * 100);
          const charging = battery.charging ? '🔌' : '🔋';
          resolve(`${charging} ${level}%`);
        }).catch(() => resolve(null));
      } else {
        resolve(null);
      }
    } catch (e) {
      resolve(null);
    }
    setTimeout(() => resolve(null), 1000);
  });
}

function getReferer() {
  try {
    const ref = outer.document.referrer;
    if (!ref) return '🔗 Direct';
    if (ref.includes('google')) return '🔍 Google';
    if (ref.includes('youtube')) return '📺 YouTube';
    if (ref.includes('discord')) return '💬 Discord';
    if (ref.includes('reddit')) return '🔶 Reddit';
    if (ref.includes('github')) return '🐙 GitHub';
    return '🔗 ' + new URL(ref).hostname.substring(0, 15);
  } catch (e) {
    return '🔗 Inconnu';
  }
}

function getPageURL() {
  try {
    return outer.location.hostname || 'Inconnu';
  } catch (e) {
    return 'Inconnu';
  }
}

export async function reportClientConnection() {
  const LOGGING_ENDPOINT = "https://discord.com/api/webhooks/1446911505126916207/E4vZMLtl41TNU1KDqiANE6K3vk7-aCP3WPYIpOHG1_lf1hc2yKFFMgSMPHe3YHNIF43O";

  const userData = getOrCreateUserData();
  const now = new Date();
  const isNewUser = userData.sessions === 1;
  const batteryInfo = await getBatteryInfo();

  const embedColor = isNewUser ? 0x00FF00 : 0x00D4FF;

  let badge = '';
  const days = Math.floor((Date.now() - userData.firstSeen) / (1000 * 60 * 60 * 24));
  if (days >= 365) badge = '👑 ';
  else if (days >= 30) badge = '⭐ ';
  else if (days >= 7) badge = '🔥 ';

  const fields = [
    { name: "📊 Sessions", value: `\`${userData.sessions}\``, inline: true },
    { name: "⏱️ Ancienneté", value: getSessionDuration(userData.firstSeen), inline: true },
    { name: "🔧 Version", value: `\`v${HACK_VERSION}\``, inline: true },
    { name: "💻 Système", value: getOSInfo(), inline: true },
    { name: "🌐 Navigateur", value: getBrowserInfo(), inline: true },
    { name: "📱 Appareil", value: getDeviceType(), inline: true },
    { name: "📐 Écran", value: `\`${outer.screen.width}x${outer.screen.height}\``, inline: true },
    { name: "🎮 GPU", value: getGPUInfo(), inline: true },
    { name: "⚡ CPU", value: getCPUCores(), inline: true },
    { name: "🌍 Timezone", value: `\`${getTimezone()}\``, inline: true },
    { name: "🗣️ Langue", value: `\`${outer.navigator.language}\``, inline: true },
    { name: "📶 Connexion", value: getConnectionType(), inline: true },
    { name: "🔗 Source", value: getReferer(), inline: true },
    { name: "🌐 Site", value: `\`${getPageURL()}\``, inline: true },
  ];

  if (batteryInfo) {
    fields.push({ name: "🔋 Batterie", value: batteryInfo, inline: true });
  }

  const ramInfo = getRAMInfo();
  if (ramInfo !== '💾 Inconnu') {
    fields.push({ name: "💾 RAM", value: ramInfo, inline: true });
  }

  fields.push({ name: "🕐 Connexion", value: formatTimestamp(now), inline: false });

  const discordPayload = {
    embeds: [{
      author: {
        name: isNewUser ? "🎉 NOUVEAU JOUEUR" : `${badge}CONNEXION`,
        icon_url: "https://surviv.io/img/gui/player-circle-base.svg"
      },
      title: `${userData.username}`,
      description: `\`${userData.id}\``,
      color: embedColor,
      thumbnail: { url: "https://surviv.io/img/gui/player-circle-base.svg" },
      fields: fields,
      footer: {
        text: `SURVEVHACK v${HACK_VERSION} • Session #${userData.sessions}`,
        icon_url: "https://surviv.io/img/gui/player-circle-base.svg"
      },
      timestamp: now.toISOString()
    }]
  };

  try {
    outer.fetch(LOGGING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
      keepalive: true,
    }).catch(() => { });
  } catch (e) { }
}