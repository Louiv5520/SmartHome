import React, { useState } from 'react';
import './SetupScreen.css';
import { usersAPI } from '../utils/api';

const SetupScreen = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [preferences, setPreferences] = useState({
    language: 'da',
    units: 'metric',
    notifications: true
  });
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: 'Velkommen til din AI Speaker',
      subtitle: 'Lad os komme i gang med opsætningen',
      icon: '👋'
    },
    {
      title: 'Hvad skal vi kalde dig?',
      subtitle: 'Vi bruger dit navn til at personalisere oplevelsen',
      icon: '👤'
    },
    {
      title: 'Hvor er du?',
      subtitle: 'Dette hjælper os med at give dig præcis vejrinformation',
      icon: '📍'
    },
    {
      title: 'Næsten færdig!',
      subtitle: 'Sidste trin - vælg dine præferencer',
      icon: '⚙️'
    }
  ];

  const handleNext = async () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Gem setup data i localStorage
      localStorage.setItem('aiSpeaker_userName', name);
      localStorage.setItem('aiSpeaker_location', location);
      localStorage.setItem('aiSpeaker_preferences', JSON.stringify(preferences));
      
      // Gem også i backend hvis bruger er logget ind
      const userId = localStorage.getItem('aiSpeaker_userId');
      if (userId) {
        try {
          setSaving(true);
          await usersAPI.updateSettings(userId, {
            userName: name,
            location,
            backgroundImage: localStorage.getItem('aiSpeaker_backgroundImage') || null,
            preferences
          });
        } catch (error) {
          console.error('Fejl ved gemning af settings:', error);
          // Fortsæt alligevel - data er gemt i localStorage
        } finally {
          setSaving(false);
        }
      }
      
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="step-content">
            <div className="welcome-animation">
              <div className="welcome-icon">{steps[0].icon}</div>
            </div>
            <p className="step-description">
              Din AI Speaker er klar til at hjælpe dig med vejr, musik og smart home kontrol.
            </p>
          </div>
        );
      
      case 2:
        return (
          <div className="step-content">
            <div className="form-group">
              <label htmlFor="name">Dit navn</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Patrick"
                autoFocus
              />
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="step-content">
            <div className="form-group">
              <label htmlFor="location">Din by</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="F.eks. København"
                autoFocus
              />
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="step-content">
            <div className="preferences-grid">
              <div className="preference-item">
                <label>Sprog</label>
                <select 
                  value={preferences.language}
                  onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                >
                  <option value="da">Dansk</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div className="preference-item">
                <label>Enheder</label>
                <select 
                  value={preferences.units}
                  onChange={(e) => setPreferences({...preferences, units: e.target.value})}
                >
                  <option value="metric">Metrisk (°C, km/t)</option>
                  <option value="imperial">Imperial (°F, mph)</option>
                </select>
              </div>
              
              <div className="preference-item">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => setPreferences({...preferences, notifications: e.target.checked})}
                  />
                  <span>Notifikationer</span>
                </label>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-container">
        <div className="setup-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
          <div className="progress-text">
            Trin {step} af {steps.length}
          </div>
        </div>

        <div className="setup-header">
          <div className="setup-icon">{steps[step - 1].icon}</div>
          <h1 className="setup-title">{steps[step - 1].title}</h1>
          <p className="setup-subtitle">{steps[step - 1].subtitle}</p>
        </div>

        <div className="setup-body">
          {renderStepContent()}
        </div>

        <div className="setup-actions">
          {step > 1 && (
            <button className="setup-button secondary" onClick={handleBack}>
              Tilbage
            </button>
          )}
          <button 
            className="setup-button primary" 
            onClick={handleNext}
            disabled={(step === 2 && !name) || (step === 3 && !location) || saving}
          >
            {saving ? 'Gemmer...' : (step === 4 ? 'Afslut opsætning' : 'Fortsæt')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;

