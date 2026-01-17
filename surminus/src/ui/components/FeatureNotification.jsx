import React, { useState, useEffect, useRef } from 'react';
import { outerDocument, outer } from '@/core/outer.js';
import { Check, X } from 'lucide-preact';

const FeatureNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const positionRef = useRef({ x: 20, y: 20 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Load saved position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('featureNotificationPosition');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
        positionRef.current = pos;
      } catch (e) {
        console.error('Failed to load notification position:', e);
      }
    }
  }, []);

  // Save position to localStorage
  const savePosition = (pos) => {
    try {
      localStorage.setItem('featureNotificationPosition', JSON.stringify(pos));
    } catch (e) {
      console.error('Failed to save notification position:', e);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;

      positionRef.current = { x: newX, y: newY };
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        savePosition(positionRef.current);
      }
    };

    if (isDragging) {
      outer.document.addEventListener('mousemove', handleMouseMove);
      outer.document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      outer.document.removeEventListener('mousemove', handleMouseMove);
      outer.document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleNotification = (event) => {
      const { featureName, enabled } = event.detail;
      const newNotification = {
        id: Date.now(),
        featureName,
        enabled,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto remove notification after 4 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
      }, 3000);
    };

    outerDocument.addEventListener('featureToggled', handleNotification);

    return () => {
      outerDocument.removeEventListener('featureToggled', handleNotification);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="feature-notifications"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 99998,
      }}
      onMouseDown={handleMouseDown}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`feature-notification ${notification.enabled ? 'enabled' : 'disabled'}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="notification-content">
            <div className={`feature-icon ${notification.enabled ? 'enabled' : 'disabled'}`}>
              {notification.enabled ? <Check size={16} /> : <X size={16} />}
            </div>
            <div className="feature-text">
              <span className="feature-name">{notification.featureName}</span>
              <span className="feature-status">
                {notification.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeatureNotification;
