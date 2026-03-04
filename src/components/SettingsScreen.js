import React, { useState, useRef, useEffect } from 'react';
import './SettingsScreen.css';
import { usersAPI, integrationsAPI } from '../utils/api';

const SettingsScreen = ({ onLogout }) => {
  const [backgroundImages, setBackgroundImages] = useState([]);
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(10);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedUserInfo = localStorage.getItem('aiSpeaker_userInfo');
    if (savedUserInfo) {
      try {
        setUserInfo(JSON.parse(savedUserInfo));
      } catch (e) {
        console.error('Fejl ved indlæsning af brugerinfo:', e);
      }
    }
    loadSettings();
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    const userId = localStorage.getItem('aiSpeaker_userId');
    if (!userId) return;
    try {
      const res = await integrationsAPI.getIntegrations(userId);
      const spotify = res.integrations?.find(i => i.service === 'spotify');
      setSpotifyConnected(Boolean(spotify?.connected));
    } catch (e) {
      console.error('Fejl ved hentning af integrationer:', e);
    }
  };

  const handleConnectSpotify = async () => {
    const userId = localStorage.getItem('aiSpeaker_userId');
    if (!userId) {
      setError('Log ind for at forbinde Spotify');
      return;
    }
    setSpotifyConnecting(true);
    setError(null);
    try {
      const res = await integrationsAPI.initiateSpotify(userId);
      if (res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setError('Kunne ikke starte Spotify-forbindelse');
      }
    } catch (e) {
      console.error('Spotify connect fejl:', e);
      setError('Kunne ikke forbinde til Spotify');
    } finally {
      setSpotifyConnecting(false);
    }
  };

  const loadSettings = async () => {
    const userId = localStorage.getItem('aiSpeaker_userId');
    if (!userId) return;
    
    try {
      const response = await usersAPI.getSettings(userId);
      if (response && response.settings) {
        let hasChanges = false;
        
        if (response.settings.backgroundImages && Array.isArray(response.settings.backgroundImages) && response.settings.backgroundImages.length > 0) {
          setBackgroundImages(response.settings.backgroundImages);
          localStorage.setItem('aiSpeaker_backgroundImages', JSON.stringify(response.settings.backgroundImages));
          hasChanges = true;
        } else if (response.settings.backgroundImages === null || (Array.isArray(response.settings.backgroundImages) && response.settings.backgroundImages.length === 0)) {
          const existingImages = localStorage.getItem('aiSpeaker_backgroundImages');
          if (!existingImages) {
            setBackgroundImages([]);
          }
        }
        
        if (response.settings.slideshowEnabled !== undefined) {
          setSlideshowEnabled(response.settings.slideshowEnabled);
          localStorage.setItem('aiSpeaker_slideshowEnabled', response.settings.slideshowEnabled.toString());
          hasChanges = true;
        }
        if (response.settings.slideshowInterval !== undefined) {
          setSlideshowInterval(response.settings.slideshowInterval);
          localStorage.setItem('aiSpeaker_slideshowInterval', response.settings.slideshowInterval.toString());
          hasChanges = true;
        }
        
        if (hasChanges) {
          window.dispatchEvent(new Event('backgroundImagesUpdated'));
        }
      }
    } catch (error) {
      console.error('Fejl ved hentning af settings:', error);
      const savedImagesStr = localStorage.getItem('aiSpeaker_backgroundImages');
      if (savedImagesStr) {
        try {
          const savedImages = JSON.parse(savedImagesStr);
          if (Array.isArray(savedImages) && savedImages.length > 0) {
            setBackgroundImages(savedImages);
          }
        } catch (e) {
          const savedImage = localStorage.getItem('aiSpeaker_backgroundImage');
          if (savedImage) {
            setBackgroundImages([savedImage]);
          }
        }
      }
      const savedEnabled = localStorage.getItem('aiSpeaker_slideshowEnabled');
      if (savedEnabled !== null) {
        setSlideshowEnabled(savedEnabled === 'true');
      }
      const savedInterval = localStorage.getItem('aiSpeaker_slideshowInterval');
      if (savedInterval) {
        setSlideshowInterval(parseInt(savedInterval, 10));
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('aiSpeaker_loggedIn');
    localStorage.removeItem('aiSpeaker_setupComplete');
    localStorage.removeItem('aiSpeaker_userInfo');
    localStorage.removeItem('aiSpeaker_userId');
    localStorage.removeItem('aiSpeaker_googleToken');
    localStorage.removeItem('aiSpeaker_userName');
    localStorage.removeItem('aiSpeaker_location');
    localStorage.removeItem('aiSpeaker_preferences');
    localStorage.removeItem('aiSpeaker_backgroundImage');
    localStorage.removeItem('aiSpeaker_backgroundImages');
    localStorage.removeItem('aiSpeaker_slideshowEnabled');
    localStorage.removeItem('aiSpeaker_slideshowInterval');
    localStorage.removeItem('aiSpeaker_calendarEvents');
    if (onLogout) {
      onLogout();
    }
  };

  const saveSettingsToBackend = async () => {
    const userId = localStorage.getItem('aiSpeaker_userId');
    if (!userId) return;
    
    try {
      const userName = localStorage.getItem('aiSpeaker_userName');
      const location = localStorage.getItem('aiSpeaker_location') || 'Copenhagen';
      const preferencesStr = localStorage.getItem('aiSpeaker_preferences');
      const preferences = preferencesStr ? JSON.parse(preferencesStr) : {};
      
      await usersAPI.updateSettings(userId, {
        userName,
        location,
        backgroundImages: backgroundImages,
        slideshowEnabled,
        slideshowInterval,
        preferences
      });
    } catch (error) {
      console.error('Fejl ved gemning af settings:', error);
      setError('Kunne ikke gemme indstillinger');
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Vælg venligst billedfiler');
      return;
    }
    
    setLoading(true);
    try {
      const newImages = await Promise.all(
        imageFiles.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      const updatedImages = [...backgroundImages, ...newImages];
      setBackgroundImages(updatedImages);
      localStorage.setItem('aiSpeaker_backgroundImages', JSON.stringify(updatedImages));
      
      window.dispatchEvent(new Event('backgroundImagesUpdated'));
      
      await saveSettingsToBackend();
    } catch (error) {
      console.error('Fejl ved upload af billeder:', error);
      setError('Kunne ikke uploade billeder');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (index) => {
    const updatedImages = backgroundImages.filter((_, i) => i !== index);
    setBackgroundImages(updatedImages);
    localStorage.setItem('aiSpeaker_backgroundImages', JSON.stringify(updatedImages));
    
    window.dispatchEvent(new Event('backgroundImagesUpdated'));
    
    await saveSettingsToBackend();
  };

  const handleSlideshowToggle = async () => {
    const newValue = !slideshowEnabled;
    setSlideshowEnabled(newValue);
    localStorage.setItem('aiSpeaker_slideshowEnabled', newValue.toString());
    
    window.dispatchEvent(new Event('backgroundImagesUpdated'));
    
    await saveSettingsToBackend();
  };

  const handleIntervalChange = async (newInterval) => {
    setSlideshowInterval(newInterval);
    localStorage.setItem('aiSpeaker_slideshowInterval', newInterval.toString());
    
    window.dispatchEvent(new Event('backgroundImagesUpdated'));
    
    await saveSettingsToBackend();
  };

  React.useEffect(() => {
    const savedImagesStr = localStorage.getItem('aiSpeaker_backgroundImages');
    if (savedImagesStr) {
      try {
        const savedImages = JSON.parse(savedImagesStr);
        if (Array.isArray(savedImages) && savedImages.length > 0) {
          setBackgroundImages(savedImages);
        }
      } catch (e) {
        const savedImage = localStorage.getItem('aiSpeaker_backgroundImage');
        if (savedImage) {
          setBackgroundImages([savedImage]);
        }
      }
    } else {
      const savedImage = localStorage.getItem('aiSpeaker_backgroundImage');
      if (savedImage) {
        setBackgroundImages([savedImage]);
      }
    }
    const savedEnabled = localStorage.getItem('aiSpeaker_slideshowEnabled');
    if (savedEnabled !== null) {
      setSlideshowEnabled(savedEnabled === 'true');
    }
    const savedInterval = localStorage.getItem('aiSpeaker_slideshowInterval');
    if (savedInterval) {
      setSlideshowInterval(parseInt(savedInterval, 10));
    }
  }, []);

  return (
    <div className="settings-screen">
      <div className="settings-content">
        <div className="widgets-grid">
          {/* Konto Widget */}
          {userInfo && (
            <div className="widget-card account-widget">
              <div className="widget-title">Konto</div>
              <div className="account-content">
                {userInfo.picture && (
                  <img 
                    src={userInfo.picture} 
                    alt={userInfo.name || 'Bruger'} 
                    className="account-avatar"
                  />
                )}
                <div className="account-info">
                  <div className="account-name">{userInfo.name || 'Bruger'}</div>
                  <div className="account-email">{userInfo.email}</div>
                </div>
              </div>
              <button className="widget-button logout-button" onClick={handleLogout} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Log ud
              </button>
            </div>
          )}

          {/* Baggrundsbilleder Widget */}
          <div className="widget-card background-widget">
            <div className="widget-title">Baggrundsbilleder</div>
            <div className="background-preview-grid">
              {backgroundImages.length > 0 ? (
                backgroundImages.slice(0, 4).map((image, index) => (
                  <div key={index} className="background-preview-item">
                    <img 
                      src={image} 
                      alt={`Baggrund ${index + 1}`} 
                      className="background-preview-img"
                    />
                    <button 
                      className="background-remove-btn"
                      onClick={() => handleRemoveImage(index)}
                      disabled={loading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="background-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Ingen billeder</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="file-input"
              id="background-upload"
              disabled={loading}
            />
            <label htmlFor="background-upload" className="widget-button upload-button" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Uploader...' : (backgroundImages.length > 0 ? 'Tilføj flere' : 'Vælg billeder')}
            </label>
          </div>

          {/* Slideshow Widget */}
          <div className="widget-card slideshow-widget">
            <div className="widget-title">Slideshow</div>
            <div className="slideshow-controls">
              <div className="slideshow-toggle-row">
                <span className="slideshow-label">Aktiver slideshow</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={slideshowEnabled}
                    onChange={handleSlideshowToggle}
                    disabled={loading || backgroundImages.length <= 1}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {backgroundImages.length <= 1 && (
                <div className="slideshow-hint">Upload mindst 2 billeder</div>
              )}
              {slideshowEnabled && backgroundImages.length > 1 && (
                <>
                  <div className="slideshow-interval-row">
                    <span className="slideshow-label">Interval</span>
                    <span className="slideshow-value">{slideshowInterval}s</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={slideshowInterval}
                    onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                    disabled={loading}
                    className="slideshow-slider"
                  />
                  <div className="slideshow-labels">
                    <span>5s</span>
                    <span>120s</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Spotify Widget */}
          <div className="widget-card integrations-widget">
            <div className="widget-title">Musik</div>
            <div className="integration-item">
              <span className="integration-name">Spotify</span>
              <span className={`integration-status ${spotifyConnected ? 'connected' : ''}`}>
                {spotifyConnected ? 'Forbundet' : 'Ikke forbundet'}
              </span>
              <button
                className="widget-button connect-button"
                onClick={handleConnectSpotify}
                disabled={spotifyConnecting || loading}
              >
                {spotifyConnecting ? 'Venter...' : (spotifyConnected ? 'Genforbind' : 'Forbind')}
              </button>
            </div>
          </div>

          {/* Generelt Widget */}
          <div className="widget-card general-widget">
            <div className="widget-title">Generelt</div>
            <div className="general-list">
              <div className="general-item">
                <span className="general-label">Sprog</span>
                <span className="general-value">Dansk</span>
              </div>
              <div className="general-item">
                <span className="general-label">Enheder</span>
                <span className="general-value">Metrisk</span>
              </div>
              <div className="general-item">
                <span className="general-label">Notifikationer</span>
                <span className="general-value">Aktiveret</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="settings-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;
