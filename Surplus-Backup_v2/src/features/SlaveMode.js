// SlaveMode.js - Logic for the Bot Window (Slave)

export function initSlaveMode(win = window) {
  console.log('[Slave] Initializing Bot Mode in target window...', win.name);

  // 1. Visual Confirmation (Green Overlay)
  win.document.title = "Bot Active (Slave)";

  const overlay = win.document.createElement('div');
  overlay.id = "bot-overlay";
  overlay.style.cssText = `
      position: fixed; bottom: 20px; left: 20px; width: 250px; height: auto;
      background: rgba(0, 50, 0, 0.95); 
      color: #00FF00;
      border: 3px solid #00FF00;
      z-index: 2147483647;
      font-family: monospace;
      padding: 15px;
      pointer-events: auto;
      border-radius: 8px;
      font-weight: bold;
      box-shadow: 0 0 10px rgba(0,255,0,0.5);
  `;

  overlay.innerHTML = `
      <h1 style="font-size: 3em; margin:0;">🤖 BOT ACTIVE</h1>
      <p style="font-size: 1.5em;">Status: <span id="status">Waiting...</span></p>
      <p>Ping: <span id="ping">0</span>ms</p>
      <div style="margin-top: 20px; border: 1px solid lime; padding: 10px;">
          Anti-Freeze: <span id="af-status" style="color:red">STARTING</span>
      </div>
      <button id="term-btn" style="margin-top:50px; padding:10px 20px; background:red; color:white; border:none; cursor:pointer;">TERMINATE BOT</button>
  `;

  // Use win.document everywhere
  const appendOverlay = () => {
    if (!win.document.getElementById('bot-overlay')) {
      if (win.document.body) win.document.body.appendChild(overlay);
      else win.document.documentElement.appendChild(overlay);
    }
  };

  // Attach event listener to button (using win reference)
  // We can't use onclick="window.close()" in HTML string easily if context differs, 
  // so we attach via JS.
  // Wait for append to attach listener.
  setTimeout(() => {
    const btn = win.document.getElementById('term-btn');
    if (btn) btn.onclick = () => win.close();
  }, 100);


  win.setInterval(appendOverlay, 500);
  appendOverlay();

  // 2. Communication Channel (Runs in TARGET window context?)
  // BroadcastChannel matches Origin. So it's fine.
  const comms = new win.BroadcastChannel('survevhack_comms');

  // We need to poll for elements because they might be re-created
  const updateUI = (ping, status) => {
    try {
      const s = win.document.getElementById('status');
      const p = win.document.getElementById('ping');
      if (s) s.innerText = status;
      if (p) p.innerText = ping;
    } catch (e) { }
  };

  comms.onmessage = (e) => {
    const { type, data, timestamp } = e.data;

    if (type === 'PING') {
      const lat = Date.now() - timestamp;
      updateUI(lat, "Connected");

      // Reply
      comms.postMessage({
        type: 'PONG',
        timestamp: Date.now(),
        sender: 'Bot-' + win.name
      });
    }

    if (type === 'INPUT') {
      handleInput(data);
    }
  };

  // 3. INPUT SIMULATION (The "Hand")
  const keyState = { w: false, a: false, s: false, d: false };

  const triggerKey = (key, pressed) => {
    // Map Packet Props to Key Codes
    const map = {
      'moveUp': { code: 'KeyW', key: 'w', keyCode: 87 },
      'moveDown': { code: 'KeyS', key: 's', keyCode: 83 },
      'moveLeft': { code: 'KeyA', key: 'a', keyCode: 65 },
      'moveRight': { code: 'KeyD', key: 'd', keyCode: 68 }
    };
    const def = map[key];
    if (!def) return;

    const eventType = pressed ? 'keydown' : 'keyup';

    // VISUAL DEBUG
    const s = win.document.getElementById('status');
    if (s && pressed) s.innerText = `Input: ${def.key.toUpperCase()}`;
    if (s && !pressed) s.innerText = `Connected`;

    // Dispatch to Window AND Canvas (if exists)
    const targets = [win, win.document, win.document.body];
    const canvas = win.document.querySelector('canvas');
    if (canvas) targets.push(canvas);

    targets.forEach(t => {
      try {
        const evt = new win.KeyboardEvent(eventType, {
          code: def.code,
          key: def.key,
          keyCode: def.keyCode,
          which: def.keyCode,
          bubbles: true,
          cancelable: true,
          view: win
        });
        // Force legacy properties
        Object.defineProperty(evt, 'keyCode', { get: () => def.keyCode });
        Object.defineProperty(evt, 'which', { get: () => def.keyCode });

        t.dispatchEvent(evt);
      } catch (e) { }
    });
  };

  const handleInput = (data) => {
    // Data = { moveUp: bool, ... }
    if (data.moveUp !== keyState.w) { keyState.w = data.moveUp; triggerKey('moveUp', data.moveUp); }
    if (data.moveDown !== keyState.s) { keyState.s = data.moveDown; triggerKey('moveDown', data.moveDown); }
    if (data.moveLeft !== keyState.a) { keyState.a = data.moveLeft; triggerKey('moveLeft', data.moveLeft); }
    if (data.moveRight !== keyState.d) { keyState.d = data.moveRight; triggerKey('moveRight', data.moveRight); }
  };

  // 3. ANTI-FREEZE WORKER (Heartbeat)
  // We utilize the Blob from the TARGET window to ensure correct context?
  // Actually, Blob and URL should be from target window.
  const workerCode = `
        self.onmessage = function(e) {
            if (e.data === 'START') {
                setInterval(() => {
                    self.postMessage('BEAT');
                }, 100); 
            }
        };
  `;
  const workerBlob = new win.Blob([workerCode], { type: 'text/javascript' });
  const worker = new win.Worker(win.URL.createObjectURL(workerBlob));

  worker.onmessage = (e) => {
    if (e.data === 'BEAT') {
      const afStatus = win.document.getElementById('af-status');
      if (afStatus && afStatus.innerText !== 'RUNNING') {
        afStatus.innerText = 'RUNNING';
        afStatus.style.color = 'lime';
      }
    }
  };

  worker.postMessage('START');
  console.log('[Slave] Anti-Freeze Worker Launched in target window.');
}
