export const CHANNEL_NAME = 'survevhack_comms';

let channel = null;
let isMaster = false;

// Initialize the High-Performance Channel
export function initCommunication(role) {
  if (channel) return; // Already initialized

  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    isMaster = role === 'master';

    channel.onmessage = (event) => {
      handleMessage(event.data);
    };

    console.log(`⚡ [FastComm] Initialized as ${role.toUpperCase()}`);

    // START HEARTBEAT IF MASTER
    if (isMaster) {
      setInterval(sendPing, 1000);
    }

  } catch (e) {
    console.error('⚡ [FastComm] Failed to create BroadcastChannel:', e);
  }
}

// Handle incoming messages
function handleMessage(data) {
  if (!data || !data.type) return;

  // --- SLAVE LOGIC ---
  if (!isMaster) {
    if (data.type === 'PING') {
      const now = performance.now();
      const latency = (now - data.time).toFixed(2);

      // VISUAL FEEDBACK (Because console logs are unreliable)
      // 1. Title Change
      document.title = `⚡ PING! (${latency}ms)`;

      // 2. Flash Red Background
      const oldBg = document.body.style.backgroundColor;
      document.body.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
      setTimeout(() => {
        document.body.style.backgroundColor = oldBg;
      }, 100);

      // 3. Floating Text Overlay
      let feedback = document.getElementById('ping-feedback');
      if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'ping-feedback';
        feedback.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:red;color:white;font-weight:bold;padding:10px;z-index:999999;font-size:20px;pointer-events:none;';
        document.body.appendChild(feedback);
      }
      feedback.innerText = `PING RECEIVED! ${latency}ms`;
      feedback.style.display = 'block';

      // Hide after 1s
      if (window.pingTimeout) clearTimeout(window.pingTimeout);
      window.pingTimeout = setTimeout(() => {
        feedback.style.display = 'none';
      }, 1000);
    }
    return;
  }

  // --- MASTER LOGIC ---
  // (If we implement two-way communication later)
}

// Send a PING (Master only)
export function sendPing() {
  if (!channel || !isMaster) return;

  channel.postMessage({
    type: 'PING',
    timestamp: Date.now()
  });
  console.log('⚡ [Master] PING Sent >');
}

// Send Input Packet (Master only)
export function sendInput(packet) {
  if (!channel || !isMaster) return;

  // Optimize: Only send relevant data
  channel.postMessage({
    type: 'INPUT',
    data: {
      moveUp: packet.moveUp,
      moveDown: packet.moveDown,
      moveLeft: packet.moveLeft,
      moveRight: packet.moveRight,
      inputs: packet.inputs // Array of commands like Fire, Reload
    }
  });
}
