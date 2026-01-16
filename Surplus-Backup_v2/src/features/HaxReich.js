// HaxReich.js - Popup Window Spawner (Anti-Cheat Bypass)
import { initSlaveMode } from './SlaveMode.js';

export function spawnHaxReichBot() {
  console.log('[HaxReich] Spawning Bot Window...');

  try {
    // 1. Construct Bot URL
    const url = new URL('https://survev.io');
    url.searchParams.set('bot_mode', 'true');
    url.searchParams.set('bot_id', Math.floor(Math.random() * 10000));

    // 2. Open Popup
    const targetUrl = url.toString();
    const botWindow = window.open(
      '',
      'HaxBot-' + Math.floor(Math.random() * 1000),
      'width=800,height=600,menubar=no,toolbar=no,location=no,status=no'
    );

    if (botWindow) {
      try {
        botWindow.location.href = targetUrl;
        botWindow.sessionStorage.setItem('hax_bot_mode', 'true');
      } catch (e) { }

      // 3. Manual Injection Loop (Plan B)
      const loop = setInterval(() => {
        try {
          if (botWindow.closed) { clearInterval(loop); return; }

          if (botWindow.location.hostname.includes('survev.io') && botWindow.document.readyState === 'complete') {
            if (botWindow.injected) return;

            console.log('💉 HaxReich: Injecting SlaveMode...');
            initSlaveMode(botWindow);
            botWindow.injected = true;
            clearInterval(loop);
          }
        } catch (e) { }
      }, 200);
    }

    if (!botWindow) throw new Error("Popup Blocked!");
    return botWindow;

  } catch (err) {
    console.error("[HaxReich]", err);
    alert("Bot Spawn Failed: " + err.message);
    return null;
  }
}

export function injectHaxReichSelf() { }
