import { outer, outerDocument } from '@/core/outer.js';
import { settings } from '@/core/state.js';

const STYLE_ID = 'surt-blur-start-overlay';
const VIDEO_ID = 'surt-start-overlay-video';
const VIDEO_URL = 'https://raw.githubusercontent.com/shirokochan12w/bac/main/shiroko-train-stop-blue-archive-moewalls-com%20(1).mp4'; // Thay link video tại đây
const MUSIC_TARGET = 'menu_music_01.mp3';
const CUSTOM_MUSIC_URL = 'https://raw.githubusercontent.com/shirokochan12w/bac/main/musicm.mp3'; // Custom music URL

// Google Ads Blocker Configuration
const AD_BLOCK_KEYWORDS = [
  'doubleclick.net',
  '2mdn.net',
  'googlesyndication',
  'googleads',
  'adservice',
  'google-analytics',
  'pagead2.googlesyndication'
];

// Ping test variables (from pingfps.js)
let sendTime = null;
let receiveTime = null;
let timeout = null;
let region = 'asia'; // Default region
let ws = null;
let currentPing = 9999;

function wsUrl() {
  let wsUrl, wsRegion;
  if (region === 'na') {
    wsRegion = 'usr';
  } else if (region === 'eu') {
    wsRegion = 'eur';
  } else if (region === 'asia') {
    wsRegion = 'asr';
  } else if (region === 'sa') {
    wsRegion = 'sa';
  } else if (region === 'ru') {
    wsRegion = 'russia';
  }
  wsUrl = `wss://${wsRegion}.mathsiscoolfun.com:8001/ptc`;
  return wsUrl;
}

// Ads Blocker functions
let adObserver = null;

const isAdUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return AD_BLOCK_KEYWORDS.some(keyword => url.toLowerCase().includes(keyword));
};

const removeAds = () => {
  if (!outerDocument) return;
  try {
    outerDocument.querySelectorAll(
      '.GoogleCreativeContainerClass,' +
      '[id^="gcc_"],' +
      'iframe[src*="doubleclick"],' +
      'iframe[src*="2mdn"],' +
      'iframe[src*="googleads"],' +
      'iframe[src*="googlesyndication"],' +
      'iframe[src*="adservice"],' +
      '.adsbygoogle,' +
      '.ad-container,' +
      '[class*="ad-container"],' +
      '[id*="ad-container"]'
    ).forEach(el => {
      try {
        el.remove();
      } catch { }
    });
  } catch { }
};

const setupAdObserver = () => {
  if (adObserver) return; // Đã setup rồi
  
  try {
    if (!outerDocument || !outerDocument.body) return;
    
    // Remove ads lần đầu
    removeAds();
    
    // Setup observer chống inject lại
    adObserver = new MutationObserver(() => {
      removeAds();
    });
    
    adObserver.observe(outerDocument.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href', 'id', 'class']
    });
  } catch { }
};

const cleanupAdObserver = () => {
  if (adObserver) {
    try {
      adObserver.disconnect();
      adObserver = null;
    } catch { }
  }
};

function delayConnect() {
  timeout = setTimeout(getPing, 2500);
}

function doSend(message) {
  if (ws && ws.readyState === 1) {
    sendTime = Date.now();
    ws.send(message);
  }
}

function getPing() {
  const url = wsUrl();
  ws = new outer.WebSocket(url);

  ws.onopen = () => {
    clearTimeout(timeout);
    doSend(new ArrayBuffer(1));
  };

  ws.onclose = (evt) => {
    if (evt.code === 1005) {
      currentPing = 9999;
    } else if (evt.code === 1006) {
      ws = null;
      delayConnect();
    }
  };

  ws.onmessage = () => {
    receiveTime = Date.now();
    currentPing = receiveTime - sendTime;
    setTimeout(() => {
      doSend(new ArrayBuffer(1));
    }, 1000);
  };

  ws.onerror = () => {
    currentPing = 9999;
  };
}

const CSS_CONTENT = `
#surt-start-overlay-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: left center;
  z-index: 1;
  opacity: 0.95;
}
#btn-game-quit {
  background-image: url("../img/gui/quit.svg") !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
}
#news-block {
  opacity: 0 !important;
  pointer-events: none !important;
}
#start-bottom-right {
  opacity: 0 !important;
  transition: 0.3s !important;
}
#start-bottom-right:hover {
  opacity: 1 !important;
}
#start-menu {
  opacity: 0 !important;
  transition: 0.3s !important;
  }
#start-menu:hover {
  opacity: 1 !important;
}
#btn-help, .account-details-top-buttons .account-leaderboard-link span, .account-details-top-buttons .account-details-button .account-link, .account-block .account-details-top .account-details-top-buttons, #ad-block-left, #social-share-block, #start-bottom-middle .footer-after, #start-bottom-middle, .publift-widget-sticky_footer-container .publift-widget-sticky_footer-container-background, .publift-widget-sticky_footer-container .publift-widget-sticky_footer, .ad-block-header div iframe, .ad-block-header .fuse-slot div {
  pointer-events: none !important;
  opacity: 0 !important;
}
#start-row-header{
  background-image:url("https://i.postimg.cc/3JYQFmX0/image.png");
  top: -100px;
  opacity: 0.3 !important;
  transition: 0.3s !important;
}
#start-row-header:hover {
  opacity: 1 !important;
}
.GoogleCreativeContainerClass {
  display: none !important;
}

/* Google Ads Blocker CSS */
[id^="gcc_"] {
  display: none !important;
  visibility: hidden !important;
}

iframe[src*="doubleclick"],
iframe[src*="2mdn"],
iframe[src*="googleads"],
iframe[src*="googlesyndication"],
iframe[src*="adservice"] {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
}

.adsbygoogle,
.ad-container,
[class*="ad-"],
[id*="ad-"],
.ads,
#ads {
  display: none !important;
  visibility: hidden !important;
}


.surt-stat {
  display: block;
  margin-bottom: 6px;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1;
  border-radius: 12px;
  color: #ffffff;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 
    0 8px 24px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.15);
  backdrop-filter: blur(12px) saturate(180%) brightness(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(180%) brightness(1.1);
  text-shadow: 0 2px 4px rgba(0,0,0,0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0);
  overflow: hidden;
  position: relative;
}

/* Glass edge highlight */
.surt-stat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent, 
    rgba(255,255,255,0.3), 
    transparent);
  z-index: 1;
}

.surt-stat:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 12px 28px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.2);
}

.surt-stat.surt-fps, .surt-stat.surt-ping {
  position: relative;
  left: 5px;
  top: -5px;
  font-size: 16px;
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 14px;
}

.surt-stat.surt-health, .surt-stat.surt-adr {
  position: fixed;
  top: 12px;
  z-index: 9999;
  font-size: 16px;
  font-weight: 700;
  padding: 10px 16px;
  border-radius: 16px;
  min-width: 100px;
  text-align: center;
  letter-spacing: 0.5px;
}

.surt-stat.surt-health { 
  right: 15px; 
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.1) 0%, 
    rgba(255,107,107,0.08) 100%);
}

.surt-stat.surt-adr { 
  left: 15px; 
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.1) 0%, 
    rgba(124,252,0,0.08) 100%);
}

/* Enhanced Glow & pulse effects */
.surt-low {
  color: #FFB8B8 !important;
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.1) 0%, 
    rgba(255,107,107,0.15) 100%) !important;
  border-color: rgba(255,107,107,0.35) !important;
  text-shadow: 0 1px 3px rgba(255,107,107,0.3);
}

.surt-warn {
  color: #FFE8A3 !important;
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.1) 0%, 
    rgba(255,209,102,0.15) 100%) !important;
  border-color: rgba(255,209,102,0.35) !important;
  text-shadow: 0 1px 3px rgba(255,209,102,0.3);
}

.surt-good {
  color: #58fc00 !important;
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.1) 0%, 
    rgba(124,252,0,0.15) 100%) !important;
  border-color: rgba(124,252,0,0.35) !important;
  text-shadow: 0 1px 3px rgba(124,252,0,0.3);
}

/* Minimal animations */






/* Add subtle background noise for more glass texture */
.surt-stat::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(
      circle at 30% 30%,
      rgba(255,255,255,0.05) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 70% 70%,
      rgba(255,255,255,0.03) 0%,
      transparent 50%
    );
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
}

/* Optional: Add a subtle shine effect on hover */
.surt-stat:hover::after {
  animation: surt-shine 0.8s ease-out;
}

@keyframes surt-shine {
  0% {
    background-position: -100px;
  }
  100% {
    background-position: 200px;
  }
}

/* Responsive adjustments */
@media (max-width: 850px) {
  .surt-stat.surt-health, .surt-stat.surt-adr {
    padding: 8px 12px;
    font-size: 14px;
    min-width: 80px;
  }
}

@media (min-width: 851px) {
  #start-row-header {
    height: 140px;
    margin-bottom: 0px;
  }
}
`;

export default function () {
  // Keep the style in sync with the user's setting.
  let applied = false;
  let videoInjected = false;
  let musicHooked = false;

  const setupMusicHooks = () => {
    if (musicHooked) return;
    
    try {
      // Hook fetch
      const _fetch = outer.fetch;
      outer.fetch = function (url, options) {
        // Block ads requests
        if (isAdUrl(url)) {
          console.log('[SurMinus] Blocked ad request:', url);
          return Promise.reject(new Error('Ad blocked'));
        }
        // Replace menu music with custom
        if (typeof url === 'string' && url.includes(MUSIC_TARGET)) {
          console.log('[SurMinus] fetch → custom music');
          url = CUSTOM_MUSIC_URL;
        }
        return _fetch.call(this, url, options);
      };

      // Hook XHR
      const _open = outer.XMLHttpRequest.prototype.open;
      outer.XMLHttpRequest.prototype.open = function (method, url) {
        // Block ads requests
        if (isAdUrl(url)) {
          console.log('[SurMinus] Blocked XHR ad request:', url);
          // Không gọi _open, hàm này sẽ bị bỏ qua
          return;
        }
        // Replace menu music with custom
        if (url && url.includes(MUSIC_TARGET)) {
          console.log('[SurMinus] xhr → custom music');
          arguments[1] = CUSTOM_MUSIC_URL;
        }
        return _open.apply(this, arguments);
      };

      // Hook Audio()
      const _Audio = outer.Audio;
      outer.Audio = function (src) {
        // Block ads audio
        if (isAdUrl(src)) {
          console.log('[SurMinus] Blocked audio ad:', src);
          // Return muted audio
          const audio = new _Audio();
          audio.muted = true;
          return audio;
        }
        // Replace menu music with custom
        if (src && src.includes(MUSIC_TARGET)) {
          console.log('[SurMinus] Audio() → custom music');
          src = CUSTOM_MUSIC_URL;
        }
        const audio = new _Audio(src);
        // Enable loop only for custom menu music
        if (src && src.includes(CUSTOM_MUSIC_URL)) {
          audio.loop = true;
          console.log('[SurMinus] Custom music loop enabled');
        }
        return audio;
      };

      musicHooked = true;
      console.log('[SurMinus] Music hooks + Ad blocking installed');
    } catch (e) {
      console.error('[SurMinus] Failed to setup hooks:', e);
    }
  };

  const injectVideo = () => {
    try {
      if (videoInjected) return;
      if (!outerDocument) return;
      
      let existing = outerDocument.getElementById(VIDEO_ID);
      if (existing) return; // Video đã được inject
      
      const overlay = outerDocument.getElementById('start-overlay');
      if (!overlay) return;
      
      const video = outerDocument.createElement('video');
      video.id = VIDEO_ID;
      video.src = VIDEO_URL;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      
      // Đảm bảo video loop khi kết thúc
      video.addEventListener('ended', () => {
        video.currentTime = 0;
        video.play().catch(() => {});
      });
      
      // Thêm vào trước tất cả children của overlay
      overlay.insertBefore(video, overlay.firstChild);
      videoInjected = true;
    } catch (e) {
      console.error('[SurMinus] Failed to inject video:', e);
    }
  };

  const removeVideo = () => {
    try {
      if (!outerDocument) return;
      const video = outerDocument.getElementById(VIDEO_ID);
      if (video) {
        video.pause();
        video.src = '';
        video.remove();
      }
      videoInjected = false;
    } catch { }
  };

  const applyStyle = () => {
    try {
      if (!outerDocument) return;
      const existing = outerDocument.getElementById(STYLE_ID);

      if (settings.blurBackground_ && settings.blurBackground_.enabled_) {
        if (!existing) {
          const s = outerDocument.createElement('style');
          s.id = STYLE_ID;
          s.type = 'text/css';
          s.innerHTML = CSS_CONTENT;
          outerDocument.head.appendChild(s);
        }
        injectVideo(); // Inject video khi enable
        setupMusicHooks(); // Setup music hooks + ad blocking
        setupAdObserver(); // Setup DOM ad observer
        applied = true;
      } else {
        if (existing) existing.remove();
        removeVideo(); // Xóa video khi disable
        cleanupAdObserver(); // Cleanup ad observer
        applied = false;
      }
    } catch { }
  };

  // Apply immediately and then poll occasionally so toggling in UI works.
  applyStyle();
  const interval = setInterval(applyStyle, 500);

  // Extras: FPS, Ping, Health, Armor highlights and optional FPS cap.
  let extrasInitialized = false;
  let origRequestAnimationFrame = null;
  let fpsEl = null;
  let pingEl = null;
  let healthEl = null;
  let adrEl = null;
  let healthInterval = null;
  let armorObservers = [];
  let weaponObservers = [];

  const setupWeaponBorderHandler = () => {
    try {
      if (!outerDocument) return;
      const weaponContainers = Array.from(outerDocument.getElementsByClassName("ui-weapon-switch"));
      weaponContainers.forEach((container) => {
        container.style.border = container.id === "ui-weapon-id-4" ? "3px solid #2f4032" : "3px solid #FFFFFF";
      });
      const weaponNames = Array.from(outerDocument.getElementsByClassName("ui-weapon-name"));
      weaponNames.forEach((weaponNameElement) => {
        const weaponContainer = weaponNameElement.closest(".ui-weapon-switch");
        if (!weaponContainer)
          return;
        const observer = new MutationObserver(() => {
          try {
            const weaponName = (weaponNameElement.textContent || "").trim();
            let border = "#FFFFFF";
            switch (weaponName.toUpperCase()) {
              case "CZ-3A1":
              case "G18C":
              case "M9":
              case "M93R":
              case "MAC-10":
              case "MP5":
              case "P30L":
              case "DUAL P30L":
              case "UMP9":
              case "VECTOR":
              case "VSS":
              case "FLAMETHROWER":
                border = "#FFAE00";
                break;
              case "AK-47":
              case "OT-38":
              case "OTS-38":
              case "M39 EMR":
              case "DP-28":
              case "MOSIN-NAGANT":
              case "SCAR-H":
              case "SV-98":
              case "M1 GARAND":
              case "PKP PECHENEG":
              case "AN-94":
              case "BAR M1918":
              case "BLR 81":
              case "SVD-63":
              case "M134":
              case "GROZA":
              case "GROZA-S":
                border = "#007FFF";
                break;
              case "FAMAS":
              case "M416":
              case "M249":
              case "QBB-97":
              case "MK 12 SPR":
              case "M4A1-S":
              case "SCOUT ELITE":
              case "L86A2":
                border = "#0f690d";
                break;
              case "M870":
              case "MP220":
              case "SAIGA-12":
              case "SPAS-12":
              case "USAS-12":
              case "SUPER 90":
              case "LASR GUN":
              case "M1100":
                border = "#FF0000";
                break;
              case "MODEL 94":
              case "PEACEMAKER":
              case "MK45G":
              case "M1911":
              case "M1A1":
                border = "#800080";
                break;
              case "DEAGLE 50":
              case "RAINBOW BLASTER":
                border = "#000000";
                break;
              case "AWM-S":
              case "MK 20 SSR":
                border = "#808000";
                break;
              case "POTATO CANNON":
              case "SPUD GUN":
                border = "#A52A2A";
                break;
              case "FLARE GUN":
                border = "#FF4500";
                break;
              case "M79":
                border = "#008080";
                break;
              case "HEART CANNON":
                border = "#FFC0CB";
                break;
              default:
                break;
            }
            if (weaponContainer.id !== "ui-weapon-id-4") {
              weaponContainer.style.border = `3px solid ${border}`;
            }
          } catch { }
        });
        observer.observe(weaponNameElement, { childList: true, characterData: true, subtree: true });
        weaponObservers.push(observer);
      });
    } catch { }
  };

  const startPingTest = () => {
    try {
      if (!ws) {
        region = 'na'; // Default to NA
        getPing();
      }
    } catch { }
  };

  const initExtras = () => {
    if (extrasInitialized) return;
    try {
      // FPS display - use times array like pingfps.js
      try {
        let fpsTimes = [];
        fpsEl = outerDocument.createElement('div');
        fpsEl.id = 'surt-fps-display';
        fpsEl.style.cssText = 'position:absolute;left:10px;transform:translateY(-50%);color:white;font-size:14px;font-family:"roboto condensed", sans-serif;font-weight:bold;background-color:rgba(0,0,0,0.3);padding:3px 5px;border-radius:5px;z-index:10000;top:60%;';
        fpsEl.innerHTML = '0 FPS';
        
        const getFPS = () => {
          outer.requestAnimationFrame(() => {
            const now = outer.performance.now();
            while (fpsTimes.length > 0 && fpsTimes[0] <= now - 1000) fpsTimes.shift();
            fpsTimes.push(now);
            fpsEl.innerHTML = `${fpsTimes.length} FPS`;
            if (fpsTimes.length <= 50) {
              fpsEl.style.color = 'red';
            } else {
              fpsEl.style.color = 'white';
            }
            getFPS();
          });
        };
        
        if (outerDocument.body) {
          outerDocument.body.appendChild(fpsEl);
          getFPS();
        }
      } catch { }

      // Ping display - use pingfps.js style
      try {
        pingEl = outerDocument.createElement('div');
        pingEl.id = 'surt-ping-display';
        pingEl.style.cssText = 'position:absolute;left:10px;transform:translateY(-50%);color:white;font-size:14px;font-family:"roboto condensed", sans-serif;font-weight:bold;background-color:rgba(0,0,0,0.3);padding:3px 5px;border-radius:5px;z-index:10000;top:calc(60% + 25px);';
        pingEl.innerHTML = 'Waiting for a game start...';
        
        if (outerDocument.body) {
          outerDocument.body.appendChild(pingEl);
          
          const updatePingDisplay = () => {
            if (currentPing !== 9999 && currentPing !== null) {
              pingEl.innerHTML = `${currentPing} ms`;
              if (currentPing >= 120) {
                pingEl.style.color = 'red';
              } else if (currentPing >= 90 && currentPing < 120) {
                pingEl.style.color = 'orange';
              } else if (currentPing >= 60 && currentPing < 90) {
                pingEl.style.color = 'yellow';
              } else {
                pingEl.style.color = 'white';
              }
            } else {
              pingEl.innerHTML = 'Waiting for a game start...';
              pingEl.style.color = 'white';
            }
            outer.requestAnimationFrame(updatePingDisplay);
          };
          
          startPingTest();
          updatePingDisplay();
        }
      } catch { }

      // Health & ADR display (from pingfps.js style)
      try {
        const healthContainer = outerDocument.querySelector('#ui-health-container');
        if (healthContainer) {
          let lastHP = 0;
          
          healthEl = outerDocument.createElement('span');
          healthEl.style.cssText = 'display:block;position:fixed;z-index: 2;margin:6px 0 0 0;right: 15px;mix-blend-mode: difference;font-weight: bold;font-size:large;';
          healthContainer.appendChild(healthEl);

          adrEl = outerDocument.createElement('span');
          adrEl.style.cssText = 'display:block;position:fixed;z-index: 2;margin:6px 0 0 0;left: 15px;mix-blend-mode: difference;font-weight: bold;font-size: large;';
          healthContainer.appendChild(adrEl);

          healthInterval = setInterval(() => {
            try {
              const hpPercent = outerDocument.getElementById('ui-health-actual').style.width.slice(0, -1);
              if (hpPercent !== lastHP) {
                lastHP = hpPercent;
                healthEl.innerHTML = Number.parseFloat(hpPercent).toFixed(1);
              }
              
              const boost0Width = parseFloat(outerDocument.getElementById('ui-boost-counter-0').querySelector('.ui-bar-inner').style.width.slice(0, -1)) / 100;
              const boost1Width = parseFloat(outerDocument.getElementById('ui-boost-counter-1').querySelector('.ui-bar-inner').style.width.slice(0, -1)) / 100;
              const boost2Width = parseFloat(outerDocument.getElementById('ui-boost-counter-2').querySelector('.ui-bar-inner').style.width.slice(0, -1)) / 100;
              const boost3Width = parseFloat(outerDocument.getElementById('ui-boost-counter-3').querySelector('.ui-bar-inner').style.width.slice(0, -1)) / 100;
              
              const adrTotal = 25 * boost0Width + 25 * boost1Width + 37.5 * boost2Width + 12.5 * boost3Width;
              adrEl.innerHTML = Math.round(adrTotal);
            } catch { }
          }, 1000);
        }
      } catch { }

      // Armor color border
      try {
        const boxes = Array.from(outerDocument.getElementsByClassName('ui-armor-level'));
        boxes.forEach((box) => {
          const callback = () => {
            try {
              const armorlv = box.textContent?.trim();
              let color = '#000000';
              switch (armorlv) {
                case 'Lvl. 0':
                case 'Lvl. 1':
                  color = '#FFFFFF';
                  break;
                case 'Lvl. 2':
                  color = '#808080';
                  break;
                case 'Lvl. 3':
                  color = '#0C0C0C';
                  break;
                case 'Lvl. 4':
                  color = '#FFF00F';
                  break;
                default:
                  color = '#000000';
              }
              box.parentNode.style.border = `solid ${color}`;
            } catch { }
          };

          const mo = new MutationObserver(callback);
          mo.observe(box, { characterData: true, subtree: true, childList: true });
          armorObservers.push(mo);
        });
      } catch { }

      // Weapon border handler
      try {
        setupWeaponBorderHandler();
      } catch { }

      extrasInitialized = true; 
    } catch { }
  };

  const cleanupExtras = () => {
    try {
      if (ws) {
        try { ws.close(); } catch {}
        ws = null;
      }
      if (timeout) clearTimeout(timeout);
      if (fpsEl && fpsEl.parentNode) fpsEl.remove();
      if (pingEl && pingEl.parentNode) pingEl.remove();
      if (healthEl && healthEl.parentNode) healthEl.remove();
      if (adrEl && adrEl.parentNode) adrEl.remove();
      if (healthInterval) clearInterval(healthInterval);
      // cleanup weapon observers and borders
      weaponObservers.forEach((mo) => mo.disconnect());
      weaponObservers.length = 0;
      try {
        const weaponContainers = Array.from(outerDocument.getElementsByClassName('ui-weapon-switch'));
        weaponContainers.forEach((container) => {
          if (container && container.style) container.style.border = '';
        });
      } catch { }

      armorObservers.forEach((mo) => mo.disconnect());
      armorObservers.length = 0;
      cleanupAdObserver(); // Cleanup ad observer
      extrasInitialized = false;
    } catch { }
  };

  // Keep extras in sync with setting
  const applyExtras = () => {
    if (settings.blurBackground_ && settings.blurBackground_.enabled_) {
      initExtras();
      startUpdateLoop();
      startPingTest();
    } else {
      cleanupExtras();
    }
  };

  const startUpdateLoop = () => {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 0;

    const loop = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      frameCount++;

      if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta) * 2;
        frameCount = 0;
        lastFrameTime = now;

        if (fpsEl) {
          fpsEl.innerHTML = `${fps} fps`;
          fpsEl.classList.remove('surt-low', 'surt-warn', 'surt-good');
          if (fps <= 60) fpsEl.classList.add('surt-low');
          else if (fps <= 120) fpsEl.classList.add('surt-warn');
          else fpsEl.classList.add('surt-good');
        }
      }

      outer.requestAnimationFrame(loop);
    };

    if (outer && outer.requestAnimationFrame) {
      loop();
    }
  };

  applyExtras();
  const extrasInterval = setInterval(() => {
    applyExtras();
    startPingTest();
  }, 1000);

  // We intentionally do not clear the intervals; they're lightweight and ensure toggles are applied.
}

