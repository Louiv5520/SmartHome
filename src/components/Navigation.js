import React from 'react';
import './Navigation.css';

const Navigation = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Hjem' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'weather', icon: '🌡️', label: 'Vejr' },
    { id: 'music', icon: '🎵', label: 'Musik' },
    { id: 'settings', icon: '⚙️', label: 'Indstillinger' },
  ];

  return (
    <div className="navigation">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${currentScreen === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
          title={item.label}
        >
          <span className="nav-icon">{item.icon}</span>
        </button>
      ))}
    </div>
  );
};

export default Navigation;

