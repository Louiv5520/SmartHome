import React from 'react';
import './SmartHomeScreen.css';

const SmartHomeScreen = () => {
  const devices = [
    { id: 1, name: 'Stue', icon: '💡', status: 'on', temp: '22°' },
    { id: 2, name: 'Køkken', icon: '🔌', status: 'on', temp: '21°' },
    { id: 3, name: 'Soveværelse', icon: '🌡️', status: 'off', temp: '20°' },
    { id: 4, name: 'Bad', icon: '🚿', status: 'on', temp: '24°' },
    { id: 5, name: 'Entré', icon: '🔒', status: 'on', temp: null },
    { id: 6, name: 'Have', icon: '🌳', status: 'off', temp: null },
  ];

  return (
    <div className="smarthome-screen">
      <div className="smarthome-content">
        <div className="smarthome-header">
          <h1>Smart Home</h1>
        </div>

        <div className="smarthome-grid">
          {devices.map(device => (
            <div 
              key={device.id} 
              className={`device-card ${device.status === 'on' ? 'active' : ''}`}
            >
              <div className="device-icon">{device.icon}</div>
              <div className="device-name">{device.name}</div>
              {device.temp && (
                <div className="device-temp">{device.temp}</div>
              )}
              <div className={`device-status ${device.status}`}>
                {device.status === 'on' ? 'Tændt' : 'Slukket'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartHomeScreen;
