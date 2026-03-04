import React, { useEffect, useState, useRef } from 'react';
import './HomeScreen.css';
import { weatherAPI, musicAPI, calendarAPI } from '../utils/api';
import { 
  initializeSpotifyPlayer, 
  playSpotifyTrack, 
  pauseSpotify, 
  setSpotifyVolume,
  getSpotifyPlayer
} from '../utils/spotifyPlayer';
import { integrationsAPI } from '../utils/api';

const HomeScreen = ({ onNavigate }) => {
  const [widgetLayout, setWidgetLayout] = useState({ widgets: [] });
  const [weather, setWeather] = useState({
    condition: 'Indlæser...',
    temp: '--',
    icon: '☀️',
    high: '--°',
    low: '--°',
    city: 'Copenhagen',
    windSpeed: '--',
    humidity: '--',
    feelsLike: '--'
  });
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [queue, setQueue] = useState([]);
  const spotifyPlayerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const [todayEvents, setTodayEvents] = useState([]);

  // Load widget layout
  useEffect(() => {
    const loadWidgetLayout = () => {
      const userId = localStorage.getItem('aiSpeaker_userId');
      
      // Prøv at hente fra localStorage først
      const savedLayoutStr = localStorage.getItem('aiSpeaker_widgetLayout');
      let savedLayout = null;
      if (savedLayoutStr) {
        try {
          savedLayout = JSON.parse(savedLayoutStr);
        } catch (e) {
          console.error('Fejl ved parsing af widget layout:', e);
        }
      }

      // Hvis ingen layout i localStorage, eller layout har forkert antal widgets/størrelser, brug default layout
      const hasValidLayout = savedLayout && savedLayout.widgets && Array.isArray(savedLayout.widgets) && 
        savedLayout.widgets.length === 2 &&
        savedLayout.widgets.every(w => w.size && w.size.width === 1 && w.size.height === 1) &&
        savedLayout.widgets.some(w => w.id === 'clock') &&
        savedLayout.widgets.some(w => w.id === 'weather') &&
        !savedLayout.widgets.some(w => w.id === 'music');

      if (!hasValidLayout) {
        const defaultLayout = {
          widgets: [
            { id: 'clock', type: 'clock', position: { row: 0, col: 0 }, size: { width: 1, height: 1 }, visible: true },
            { id: 'weather', type: 'weather', position: { row: 0, col: 1 }, size: { width: 1, height: 1 }, visible: true },
          ]
        };
        setWidgetLayout(defaultLayout);
        // Gem også i localStorage
        localStorage.setItem('aiSpeaker_widgetLayout', JSON.stringify(defaultLayout));
        return;
      }
      
      // Layout er valid, brug det
      setWidgetLayout(savedLayout);
    };

    loadWidgetLayout();

    // Lyt til layout updates
    const handleLayoutUpdate = () => {
      loadWidgetLayout();
    };

    window.addEventListener('widgetLayoutUpdated', handleLayoutUpdate);
    
    return () => {
      window.removeEventListener('widgetLayoutUpdated', handleLayoutUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const location = localStorage.getItem('aiSpeaker_location') || 'Copenhagen';
        const weatherData = await weatherAPI.getCurrent(location);
        
        setWeather({
          condition: weatherData.condition,
          temp: `${weatherData.temp}`,
          icon: weatherData.icon,
          high: `${weatherData.high}°`,
          low: `${weatherData.low}°`,
          city: weatherData.city || 'Copenhagen',
          windSpeed: weatherData.windSpeed || '--',
          humidity: weatherData.humidity || '--',
          feelsLike: weatherData.feelsLike || '--'
        });
      } catch (error) {
        console.error('Fejl ved hentning af vejrdata:', error);
        setWeather({
          condition: 'Kunne ikke hente vejrdata',
          temp: '--',
          icon: '⚠️',
          high: '--°',
          low: '--°',
          city: localStorage.getItem('aiSpeaker_location') || 'Copenhagen',
          windSpeed: '--',
          humidity: '--',
          feelsLike: '--'
        });
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load calendar events
  useEffect(() => {
    const loadCalendarEvents = async () => {
      const today = new Date().toISOString().split('T')[0];
      const userId = localStorage.getItem('aiSpeaker_userId');
      
      try {
        let events = [];
        
        if (userId) {
          try {
            const response = await calendarAPI.getTodayEvents(userId);
            if (response && response.events && response.events.length > 0) {
              events = response.events;
            }
          } catch (error) {
            console.error('Fejl ved hentning af kalender events fra backend:', error);
          }
        }
        
        if (events.length === 0) {
          const savedEvents = localStorage.getItem('aiSpeaker_calendarEvents');
          if (savedEvents) {
            try {
              const parsedEvents = JSON.parse(savedEvents);
              events = parsedEvents.filter(event => event.date === today);
            } catch (e) {
              console.error('Fejl ved parsing af gemte events:', e);
            }
          }
        }
        
        // Sort events and find next event
        if (events.length > 0) {
          events.sort((a, b) => {
            const timeA = parseInt(a.time.replace(':', ''));
            const timeB = parseInt(b.time.replace(':', ''));
            return timeA - timeB;
          });
          
          setTodayEvents(events);
          
          const now = new Date();
          const currentTime = now.getHours() * 100 + now.getMinutes();
          
        } else {
          setTodayEvents([]);
        }
      } catch (error) {
        console.error('Fejl ved indlæsning af kalender:', error);
      }
    };
    
    loadCalendarEvents();
    // Opdater hver time
    const interval = setInterval(loadCalendarEvents, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  // Initialize Spotify Player
  useEffect(() => {
    const initSpotify = async () => {
      const userId = localStorage.getItem('aiSpeaker_userId');
      if (!userId) return;
      try {
        const tokenRes = await integrationsAPI.getSpotifyToken(userId);
        if (tokenRes?.connected && tokenRes?.accessToken) {
          await initializeSpotifyPlayer(tokenRes.accessToken);
          spotifyPlayerRef.current = getSpotifyPlayer();
        }
      } catch (error) {
        console.error('Fejl ved initialisering af Spotify:', error);
      }
    };
    initSpotify();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Load current music track
  useEffect(() => {
    const loadCurrentTrack = async () => {
      try {
        const response = await musicAPI.getCharts();
        if (response && response.tracks && response.tracks.length > 0) {
          setQueue(response.tracks);
          // Find the first track that has URI
          const trackWithUri = response.tracks.find(t => t.uri);
          if (trackWithUri) {
            setCurrentTrack(trackWithUri);
            setDuration(trackWithUri.duration || 0);
          }
        }
      } catch (error) {
        console.error('Fejl ved hentning af musik:', error);
      }
    };
    
    loadCurrentTrack();
  }, []);

  // Play/pause handling
  useEffect(() => {
    if (!currentTrack || !currentTrack.uri) return;
    if (!currentTrack.uri.startsWith('spotify:')) return;
    if (isPlaying) {
      playSpotifyTrack(currentTrack.uri).catch(err => {
        console.error('Fejl ved Spotify afspilning:', err);
        setIsPlaying(false);
      });
    } else {
      pauseSpotify();
    }
  }, [isPlaying, currentTrack]);

  // Volume handling
  useEffect(() => {
    setSpotifyVolume(volume);
  }, [volume]);

  const handleWeatherClick = () => {
    if (onNavigate) {
      onNavigate('weather');
    }
  };

  const handleMusicClick = (e) => {
    // Don't navigate if clicking on controls or progress
    if (e.target.closest('.music-widget-controls') || 
        e.target.closest('.music-widget-progress-container') ||
        e.target.closest('.music-widget-play-btn')) {
      e.stopPropagation();
      return;
    }
    if (onNavigate) {
      onNavigate('music');
    }
  };

  const handlePlayPause = async (e) => {
    e.stopPropagation();
    if (!currentTrack || !currentTrack.uri) {
      if (queue.length > 0 && queue[0].uri) {
        setCurrentTrack(queue[0]);
        setDuration(queue[0].duration || 0);
        setIsPlaying(true);
      }
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const playNextTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex < queue.length - 1) {
      const nextTrack = queue[currentIndex + 1];
      if (nextTrack.uri) {
        setCurrentTrack(nextTrack);
        setDuration(nextTrack.duration || 0);
        setIsPlaying(true);
      }
    }
  };

  const playPreviousTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      const prevTrack = queue[currentIndex - 1];
      if (prevTrack.uri) {
        setCurrentTrack(prevTrack);
        setDuration(prevTrack.duration || 0);
        setIsPlaying(true);
      }
    }
  };

  const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;

  const getEventTypeLabel = (type) => {
    switch (type) {
      case 'meeting': return 'Møde';
      case 'appointment': return 'Aftale';
      case 'event': return 'Begivenhed';
      case 'deadline': return 'Deadline';
      default: return 'Begivenhed';
    }
  };

  const handleProgressClick = async (e) => {
    e.stopPropagation();
    if (!duration || !currentTrack?.uri) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    // Tidal seek functionality - would need to be implemented via Tidal SDK
    // For now, just update local state
    setCurrentTime(newTime);
  };


  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Render widget based on type
  const renderWidget = (widget) => {
    if (!widget.visible) return null;

    // Beregn grid position baseret på row og col
    // Grid er 1-indexed, så col 0 bliver til kolonne 1, col 1 bliver til kolonne 2
    const gridColumnStart = widget.position ? widget.position.col + 1 : 1;
    const gridRowStart = widget.position ? widget.position.row + 1 : 1;

    const { key, ...commonProps } = {
      key: widget.id,
      className: `widget-card ${widget.type}-widget`,
      style: {
        gridColumn: `${gridColumnStart} / span ${widget.size.width}`,
        gridRow: `${gridRowStart} / span ${widget.size.height}`
      }
    };

    switch (widget.type) {
      case 'clock':
        return (
          <div key={key} {...commonProps} className="widget-card clock-widget expanded">
            <div className="clock-time">{timeString}</div>
            <div className="clock-date">
              {new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            {todayEvents.length > 0 ? (
              <div className="clock-event">
                <div className="clock-events-list">
                  {todayEvents.map((event) => (
                    <div key={event.id} className="clock-event-item">
                      <div className="clock-event-item-time">{event.time}</div>
                      <div className="clock-event-item-content">
                        <div className="clock-event-item-title">{event.title}</div>
                        <div className={`clock-event-item-type ${event.type}`}>
                          {getEventTypeLabel(event.type)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="clock-event">
                <div className="clock-no-events">Ingen aftaler i dag</div>
              </div>
            )}
          </div>
        );

      case 'weather':
        return (
          <div key={key} {...commonProps} onClick={handleWeatherClick}>
            <div className="weather-city-name">{weather.city}</div>
            <div className="weather-icon-large">{weather.icon}</div>
            <div className="weather-temp-large">{weather.temp}°C</div>
            <div className="weather-condition-text">{weather.condition}</div>
            <div className="weather-details-grid">
              <div className="weather-detail-item">
                <div className="weather-detail-label">Wind</div>
                <div className="weather-detail-value">{weather.windSpeed}km/h</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">Humidity</div>
                <div className="weather-detail-value">{weather.humidity}%</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">Feels like</div>
                <div className="weather-detail-value">{weather.feelsLike}°C</div>
              </div>
            </div>
          </div>
        );

      case 'music':
        if (!currentTrack) return null;
        return (
          <div key={key} {...commonProps} onClick={handleMusicClick}>
            <div className="music-widget-content">
              {currentTrack.album?.cover && (
                <img 
                  src={currentTrack.album.cover} 
                  alt={currentTrack.album.title}
                  className="music-widget-cover"
                />
              )}
              <div className="music-widget-info">
                <div className="music-widget-title">{currentTrack.title}</div>
                <div className="music-widget-artist">{currentTrack.artist?.name || 'Ukendt kunstner'}</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="music-widget-progress-container" onClick={(e) => e.stopPropagation()}>
              <div className="music-widget-time">{formatTime(currentTime)}</div>
              <div 
                className="music-widget-progress-bar"
                onClick={handleProgressClick}
              >
                <div 
                  className="music-widget-progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="music-widget-progress-thumb"></div>
                </div>
              </div>
              <div className="music-widget-time">{formatTime(duration)}</div>
            </div>

            {/* Controls */}
            <div className="music-widget-controls" onClick={(e) => e.stopPropagation()}>
              <button 
                className="music-widget-control-btn"
                onClick={playPreviousTrack}
                disabled={currentIndex <= 0}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button 
                className="music-widget-play-btn"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <button 
                className="music-widget-control-btn"
                onClick={playNextTrack}
                disabled={currentIndex >= queue.length - 1}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Sort widgets by position for correct rendering order
  const sortedWidgets = [...(widgetLayout.widgets || [])].sort((a, b) => {
    if (a.position.row !== b.position.row) {
      return a.position.row - b.position.row;
    }
    return a.position.col - b.position.col;
  });

  return (
    <div className="home-screen">
      <div className="home-content">
        <div className="widgets-grid">
          {sortedWidgets.length > 0 ? (
            sortedWidgets.map(widget => renderWidget(widget))
          ) : (
            // Fallback til default layout hvis ingen widgets - hver widget fylder 1/2
            <>
              <div className="widget-card clock-widget expanded" style={{ gridColumn: 'span 1', gridRow: 'span 1' }}>
                <div className="clock-time">{timeString}</div>
                <div className="clock-date">
                  {new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {todayEvents.length > 0 ? (
                  <div className="clock-event">
                    <div className="clock-events-list">
                      {todayEvents.map((event) => (
                        <div key={event.id} className="clock-event-item">
                          <div className="clock-event-item-time">{event.time}</div>
                          <div className="clock-event-item-content">
                            <div className="clock-event-item-title">{event.title}</div>
                            <div className={`clock-event-item-type ${event.type}`}>
                              {getEventTypeLabel(event.type)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="clock-event">
                    <div className="clock-no-events">Ingen aftaler i dag</div>
                  </div>
                )}
              </div>
              <div className="widget-card weather-widget" style={{ gridColumn: 'span 1', gridRow: 'span 1' }} onClick={handleWeatherClick}>
                <div className="weather-city-name">{weather.city}</div>
                <div className="weather-icon-large">{weather.icon}</div>
                <div className="weather-temp-large">{weather.temp}°C</div>
                <div className="weather-condition-text">{weather.condition}</div>
                <div className="weather-details-grid">
                  <div className="weather-detail-item">
                    <div className="weather-detail-label">Wind</div>
                    <div className="weather-detail-value">{weather.windSpeed || '--'}km/h</div>
                  </div>
                  <div className="weather-detail-item">
                    <div className="weather-detail-label">Humidity</div>
                    <div className="weather-detail-value">{weather.humidity || '--'}%</div>
                  </div>
                  <div className="weather-detail-item">
                    <div className="weather-detail-label">Feels like</div>
                    <div className="weather-detail-value">{weather.feelsLike || '--'}°C</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
