import React, { useState, useEffect } from 'react';
import { outerDocument } from '@/core/outer.js';
import { Check, X } from 'lucide-preact';

const FeatureNotification = () => {
  const [notifications, setNotifications] = useState([]);

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
      }, 4000);
    };

    outerDocument.addEventListener('featureToggled', handleNotification);

    return () => {
      outerDocument.removeEventListener('featureToggled', handleNotification);
    };
  }, []);

  return (
    <div className="feature-notifications">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`feature-notification ${notification.enabled ? 'enabled' : 'disabled'}`}
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
