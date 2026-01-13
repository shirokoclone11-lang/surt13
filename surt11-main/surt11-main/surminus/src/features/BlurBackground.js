import { outer, outerDocument } from '@/core/outer.js';
import { settings } from '@/core/state.js';

const STYLE_ID = 'surt-blur-start-overlay';
const VIDEO_ID = 'surt-start-overlay-video';
const VIDEO_URL = 'https://raw.githubusercontent.com/shirokochan12w/music-background/main/background2.mp4'; // Thay link video tại đây

const MUSIC_TARGET = 'menu_music_01.mp3';
const CUSTOM_MUSIC_URL = 'https://raw.githubusercontent.com/shirokochan12w/music-background/main/backgroundmusic.mp3'; // Custom music URL

// Game servers for ping test
const GAME_SERVERS = [
  { region: 'NA', url: 'usr.mathsiscoolfun.com:8001' },
  { region: 'EU', url: 'eur.mathsiscoolfun.com:8001' },
  { region: 'Asia', url: 'asr.mathsiscoolfun.com:8001' },
  { region: 'SA', url: 'sa.mathsiscoolfun.com:8001' },
];

// PingTest class for WebSocket-based ping measurement
class PingTest {
  constructor(selectedServer) {
    this.ptcDataBuf = new ArrayBuffer(1);
    this.test = {
      region: selectedServer.region,
      url: `wss://${selectedServer.url}/ptc`,
      ping: 9999,
      ws: null,
      sendTime: 0,
      retryCount: 0,
    };
  }

  startPingTest() {
    if (!this.test.ws) {
      const ws = new outer.WebSocket(this.test.url);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        this.sendPing();
        this.test.retryCount = 0;
      };

      ws.onmessage = () => {
        const elapsed = (Date.now() - this.test.sendTime) / 1e3;
        this.test.ping = Math.round(elapsed * 1000);
        this.test.retryCount = 0;
        setTimeout(() => this.sendPing(), 200);
      };

      ws.onerror = () => {
        this.test.ping = null;
        this.test.retryCount++;
        if (this.test.retryCount < 5) {
          setTimeout(() => this.startPingTest(), 2000);
        } else {
          try { ws.close(); } catch {}
          this.test.ws = null;
        }
      };

      ws.onclose = () => {
        this.test.ws = null;
      };

      this.test.ws = ws;
    }
  }

  sendPing() {
    if (this.test.ws && this.test.ws.readyState === outer.WebSocket.OPEN) {
      this.test.sendTime = Date.now();
      this.test.ws.send(this.ptcDataBuf);
    }
  }

  getPingResult() {
    return {
      region: this.test.region,
      ping: this.test.ping,
    };
  }

  close() {
    if (this.test.ws) {
      try { this.test.ws.close(); } catch {}
      this.test.ws = null;
    }
  }
}

const CSS_CONTENT = `
#surt-start-overlay-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
  opacity: 0.95;
}

#start-overlay {
  backdrop-filter: blur(10px) brightness(0.9);
  -webkit-backdrop-filter: blur(10px) brightness(0.9);
}
#btn-game-quit {
  /* Ensure URL is quoted and provide sensible sizing */
  background-image: url("../img/gui/quit.svg") !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
}
#news-block {
  opacity: 0 !important;
  transition: 0.3s !important;
}
#news-block:hover {
  opacity: 1 !important;
}
#ad-block-left, #social-share-block, #start-bottom-middle .footer-after, #start-bottom-middle, .publift-widget-sticky_footer-container .publift-widget-sticky_footer-container-background, .publift-widget-sticky_footer-container .publift-widget-sticky_footer, .ad-block-header div iframe, .ad-block-header .fuse-slot div {
  pointer-events: none !important;
  opacity: 0 !important;
}
#start-row-header{
  background-image:url("https://i.postimg.cc/3JYQFmX0/image.png");
}

/* Enhanced Glass-style stats */
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
        if (typeof url === 'string' && url.includes(MUSIC_TARGET)) {
          console.log('[SurMinus] fetch → custom music');
          url = CUSTOM_MUSIC_URL;
        }
        return _fetch.call(this, url, options);
      };

      // Hook XHR
      const _open = outer.XMLHttpRequest.prototype.open;
      outer.XMLHttpRequest.prototype.open = function (method, url) {
        if (url && url.includes(MUSIC_TARGET)) {
          console.log('[SurMinus] xhr → custom music');
          arguments[1] = CUSTOM_MUSIC_URL;
        }
        return _open.apply(this, arguments);
      };

      // Hook Audio()
      const _Audio = outer.Audio;
      outer.Audio = function (src) {
        if (src && src.includes(MUSIC_TARGET)) {
          console.log('[SurMinus] Audio() → custom music');
          src = CUSTOM_MUSIC_URL;
        }
        return new _Audio(src);
      };

      musicHooked = true;
      console.log('[SurMinus] Music hooks installed');
    } catch (e) {
      console.error('[SurMinus] Failed to setup music hooks:', e);
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
        setupMusicHooks(); // Setup music hooks
        applied = true;
      } else {
        if (existing) existing.remove();
        removeVideo(); // Xóa video khi disable
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
  let pingTest = null;
  let currentServer = null;

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
      if (!pingTest) {
        // Start ping test for default server (NA)
        const defaultServer = GAME_SERVERS[0]; // NA
        pingTest = new PingTest(defaultServer);
        pingTest.startPingTest();
        currentServer = defaultServer.region;
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

      // Ping display - use WebSocket like pingfps.js
      try {
        pingEl = outerDocument.createElement('div');
        pingEl.id = 'surt-ping-display';
        pingEl.style.cssText = 'position:absolute;left:10px;transform:translateY(-50%);color:white;font-size:14px;font-family:"roboto condensed", sans-serif;font-weight:bold;background-color:rgba(0,0,0,0.3);padding:3px 5px;border-radius:5px;z-index:10000;top:calc(60% + 25px);';
        pingEl.innerHTML = 'Waiting for a game start...';
        
        if (outerDocument.body) {
          outerDocument.body.appendChild(pingEl);
          
          const updatePingDisplay = () => {
            if (pingTest) {
              const result = pingTest.getPingResult();
              const ping = result.ping;
              
              if (ping !== 9999 && ping !== null) {
                pingEl.innerHTML = `${ping} ms`;
                if (ping >= 120) {
                  pingEl.style.color = 'red';
                } else if (ping >= 90 && ping < 120) {
                  pingEl.style.color = 'orange';
                } else if (ping >= 60 && ping < 90) {
                  pingEl.style.color = 'yellow';
                } else {
                  pingEl.style.color = 'white';
                }
              } else {
                pingEl.innerHTML = 'Waiting for a game start...';
                pingEl.style.color = 'white';
              }
            }
            outer.requestAnimationFrame(updatePingDisplay);
          };
          
          startPingTest();
          updatePingDisplay();
        }
      } catch { }

      // Health & ADR display
      try {
        const healthContainer = outerDocument.querySelector('#ui-health-container');
        if (healthContainer && !outerDocument.getElementById('surt-health-display')) {
          healthEl = outerDocument.createElement('span');
          healthEl.id = 'surt-health-display';
          healthEl.classList.add('surt-stat', 'surt-health');
          healthContainer.appendChild(healthEl);

          adrEl = outerDocument.createElement('span');
          adrEl.id = 'surt-adr-display';
          adrEl.classList.add('surt-stat', 'surt-adr');
          healthContainer.appendChild(adrEl);

          let lastHP = null;
          healthInterval = setInterval(() => {
            try {
              const hpEl = outerDocument.getElementById('ui-health-actual');
              const hp = hpEl ? hpEl.style.width.slice(0, -1) : null;
              if (hp !== null && hp !== lastHP) {
                lastHP = hp;
                const hpVal = Number.parseFloat(hp) || 0;
                healthEl.innerHTML = Math.round(hpVal);
                // Update health color state: <=30 red, 31-60 yellow, >60 green
                healthEl.classList.remove('surt-low', 'surt-warn', 'surt-good');
                if (hpVal <= 30) healthEl.classList.add('surt-low');
                else if (hpVal <= 60) healthEl.classList.add('surt-warn');
                else healthEl.classList.add('surt-good');
              }
              const boost0El = outerDocument.getElementById('ui-boost-counter-0')?.querySelector('.ui-bar-inner');
              const boost1El = outerDocument.getElementById('ui-boost-counter-1')?.querySelector('.ui-bar-inner');
              const boost2El = outerDocument.getElementById('ui-boost-counter-2')?.querySelector('.ui-bar-inner');
              const boost3El = outerDocument.getElementById('ui-boost-counter-3')?.querySelector('.ui-bar-inner');
              const boost0 = boost0El ? parseFloat(boost0El.style.width) : 0;
              const boost1 = boost1El ? parseFloat(boost1El.style.width) : 0;
              const boost2 = boost2El ? parseFloat(boost2El.style.width) : 0;
              const boost3 = boost3El ? parseFloat(boost3El.style.width) : 0;
              const adr0 = (boost0 * 25) / 100 + (boost1 * 25) / 100 + (boost2 * 37.5) / 100 + (boost3 * 12.5) / 100;
              adrEl.innerHTML = Math.round(adr0);
            } catch { }
          }, 250);
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
      if (pingTest) pingTest.close();
      if (fpsEl && fpsEl.parentNode) fpsEl.remove();
      if (pingEl && pingEl.parentNode) pingEl.remove();
      if (healthEl && healthEl.parentNode) healthEl.remove();
      if (adrEl && adrEl.parentNode) adrEl.remove();
      if (healthInterval) clearInterval(healthInterval);
      if (pingTest) pingTest.close();
      pingTest = null;
      currentServer = null;
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

