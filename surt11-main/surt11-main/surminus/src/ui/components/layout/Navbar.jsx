import React from 'react';
import { Icons } from '@/ui/components/icons.jsx';

const Navbar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'main', label: 'Main', icon: Icons.Main_ },
    { id: 'visuals', label: 'Visuals', icon: Icons.Visuals_ },
    { id: 'misc', label: 'Misc', icon: Icons.Misc_ },
    { id: 'style', label: 'Style', icon: Icons.Style_ },
    { id: 'help', label: 'Help', icon: Icons.Help_ },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        {tabs.map((tab) => {
          const isActiveTab = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`sidebar-tab ${isActiveTab ? 'active' : ''}`}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
            >
              <tab.icon className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navbar;
