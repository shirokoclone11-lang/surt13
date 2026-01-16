import React, { useState, useEffect, useRef } from 'react';
import { outer, outerDocument } from '@/core/outer.js';
import { ref_addEventListener, ref_removeEventListener } from '@/core/hook';
import { spawnHaxReichBot } from '@/features/HaxReich.js';

const BotManager = ({ version }) => {
  const [visible, setVisible] = useState(false);
  const [bots, setBots] = useState([]);
  const [position, setPosition] = useState({ x: 50, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Toggle Visibility with 'K'
  // Toggle Visibility with 'K'
  useEffect(() => {
    console.log('[BotManager] Mounted. Waiting for "K"...');

    // DEBUG INDICATOR
    const debugDiv = document.createElement('div');
    debugDiv.innerText = "HaxReich UI Loaded (Press K)";
    debugDiv.style.cssText = "position:fixed; top:0; left:50%; transform:translateX(-50%); background:red; color:white; z-index:9999999; padding:5px; pointer-events:none;";
    document.documentElement.appendChild(debugDiv);

    const handleKeyDown = (e) => {
      // console.log('[BotManager] Key Pressed:', e.code);
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyK') {
        console.log('[BotManager] Toggling Menu...');
        setVisible((v) => !v);
      }
    };

    // Direct Window Attachment to bypass 'outer' issues
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      debugDiv.remove();
    };
  }, []);

  // Drag Logic
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      Reflect.apply(ref_addEventListener, outerDocument, ['mousemove', handleMouseMove]);
      Reflect.apply(ref_addEventListener, outerDocument, ['mouseup', handleMouseUp]);
    }
    return () => {
      Reflect.apply(ref_removeEventListener, outerDocument, ['mousemove', handleMouseMove]);
      Reflect.apply(ref_removeEventListener, outerDocument, ['mouseup', handleMouseUp]);
    };
  }, [isDragging, dragStart]);

  // Bot Logic (Window/Popup Strategy)
  const handleAddBot = () => {
    const botWindow = spawnHaxReichBot();
    if (botWindow) {
      const newBot = {
        id: Date.now(),
        name: `Bot #${bots.length + 1}`,
        window: botWindow // Store Window Proxy
      };
      setBots(prev => [...prev, newBot]);
    }
  };

  const handleRemoveAll = () => {
    bots.forEach(bot => {
      if (bot.window) bot.window.close();
    });
    setBots([]);
  };

  const handleRemoveBot = (id) => {
    const botToRemove = bots.find(b => b.id === id);
    if (botToRemove && botToRemove.window) {
      botToRemove.window.close();
    }
    setBots(prev => prev.filter(b => b.id !== id));
  };


  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 100000,
        width: '250px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '8px',
        border: '1px solid #333',
        color: '#fff',
        fontFamily: "'GothamPro', sans-serif",
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      }}
    >
      {/* Title Bar drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '10px 15px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid #333',
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#00BFFF' }}>HaxReich Manager</span>
        <span style={{ fontSize: '10px', color: '#666' }}>v1.0</span>
      </div>

      <div style={{ padding: '15px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#aaa' }}>
          Hotkeys: K = Toggle Menu
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            onClick={handleAddBot}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: '#00BFFF',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            + Add Bot
          </button>
          <button
            onClick={handleRemoveAll}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: '#ff4444',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            - Remove All
          </button>
        </div>

        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <button
            onClick={() => {
              import('@/features/Communication.js').then(m => m.sendPing());
            }}
            style={{
              background: 'transparent',
              border: '1px solid #00BFFF',
              color: '#00BFFF',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            ⚡ Test Latency (Console)
          </button>
        </div>

        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {bots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '10px', color: '#555', fontSize: '12px', fontStyle: 'italic' }}>
              No bots active
            </div>
          ) : (
            bots.map(bot => (
              <div key={bot.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '4px',
                marginBottom: '5px'
              }}>
                <span style={{ fontSize: '13px' }}>{bot.name}</span>
                <button
                  onClick={() => handleRemoveBot(bot.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #444',
                    color: '#888',
                    borderRadius: '4px',
                    width: '30px', /* Increased from 20px */
                    height: '30px', /* Increased from 20px */
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px' /* Increased for better visibility */
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BotManager;
