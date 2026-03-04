import React, { useState, useEffect, useRef } from 'react';
import './MusicScreen.css';
import { musicAPI } from '../utils/api';
import { 
  initializeSpotifyPlayer, 
  playSpotifyTrack, 
  pauseSpotify, 
  resumeSpotify,
  getSpotifyPlayer
} from '../utils/spotifyPlayer';
import { integrationsAPI } from '../utils/api';

const MusicScreen = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [charts, setCharts] = useState([]);
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [queue, setQueue] = useState([]);
  
  const spotifyPlayerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const screenRef = useRef(null);
  const pollIntervalRef = useRef(null);

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

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    const handleScroll = (e) => {
      const currentScrollTop = e.target.scrollTop;
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTopRef.current);
      
      if (scrollDelta > 5) {
        setShowFloatingControls(true);
        
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
          setShowFloatingControls(false);
        }, 3000);
      }
      
      lastScrollTopRef.current = currentScrollTop;
    };

    screen.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      screen.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await musicAPI.search(searchQuery, 'track');
        if (response && response.results) {
          setSearchResults(response.results);
        }
      } catch (err) {
        console.error('Søgefejl:', err);
        setError('Kunne ikke søge efter musik');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const playTrack = async (track) => {
    try {
      setIsTransitioning(true);
      setLoading(true);
      setError(null);
      
      if (!track || (!track.uri && !track.id)) {
        setError('Ingen Spotify URI tilgængelig for denne track');
        setIsTransitioning(false);
        setLoading(false);
        return;
      }
      
      setCurrentTrack(track);
      setDuration(track.duration || 0);
      
      if (!track.uri || !track.uri.startsWith('spotify:')) {
        setError('Track har ikke gyldig Spotify URI');
        return;
      }
      await playSpotifyTrack(track.uri);
      setIsPlaying(true);
      setLoading(false);
      setIsTransitioning(false);
    } catch (err) {
      console.error('Fejl ved afspilning:', err);
      setError('Kunne ikke afspille track. Prøv igen.');
      setIsTransitioning(false);
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const playNextTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1]);
    }
  };

  const playPreviousTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1]);
    }
  };

  const handlePlayPause = async () => {
    if (!currentTrack) {
      if (charts.length > 0 && charts[0].uri) {
        playTrack(charts[0]);
      }
      return;
    }
    
    try {
      if (isPlaying) {
        await pauseSpotify();
        setIsPlaying(false);
      } else {
        await resumeSpotify();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Fejl ved play/pause:', error);
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressClick = async (e) => {
    if (!duration) return;

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

  useEffect(() => {
    const loadCharts = async () => {
      try {
        setLoading(true);
        const response = await musicAPI.getCharts();
        if (response && response.tracks) {
          setCharts(response.tracks);
          setQueue(response.tracks);
          if (response.tracks.length > 0 && response.tracks[0].uri) {
            playTrack(response.tracks[0]);
          }
        }
      } catch (err) {
        console.error('Fejl ved hentning af charts:', err);
        setError('Kunne ikke hente populære tracks');
      } finally {
        setLoading(false);
      }
    };
    
    loadCharts();
  }, []);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;

  return (
    <div className="music-screen" ref={screenRef}>
      <div className="music-content">
        <div className="music-header">
          <div className="music-header-title">Musik</div>
          <button 
            className="search-toggle-btn"
            onClick={() => setShowSearch(!showSearch)}
          >
            🔍
          </button>
        </div>

        {showSearch && (
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Søg efter musik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {loading && <div className="loading-spinner">⏳</div>}
            {error && <div className="error-message">{error}</div>}
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.slice(0, 10).map((track) => (
                  <div
                    key={track.id}
                    className="search-result-item"
                    onClick={() => {
                      playTrack(track);
                      setShowSearch(false);
                    }}
                  >
                    {track.album?.cover && (
                      <img 
                        src={track.album.cover} 
                        alt={track.album.title}
                        className="result-cover"
                      />
                    )}
                    <div className="result-info">
                      <div className="result-title">{track.title}</div>
                      <div className="result-artist">{track.artist?.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTrack && (
          <>
            <div className={`music-album-art ${isTransitioning ? 'transitioning' : ''} ${isPlaying ? 'playing' : ''}`}>
              <div className="album-cover">
                {currentTrack.album?.cover_big ? (
                  <img 
                    src={currentTrack.album.cover_big} 
                    alt={currentTrack.album.title}
                    className="album-image-img"
                  />
                ) : (
                  <div className="album-image">
                    <div className="album-pattern"></div>
                  </div>
                )}
              </div>
            </div>

            <div className={`music-info ${isTransitioning ? 'transitioning' : ''}`}>
              <div className="music-artist">
                {currentTrack.artist?.name || 'Ukendt kunstner'}
              </div>
              <div className="music-title">
                {currentTrack.title || 'Ukendt track'}
              </div>
            </div>

            <div className="music-progress">
              <div 
                className="progress-bar"
                onClick={handleProgressClick}
              >
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="progress-time">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className={`floating-controls ${showFloatingControls ? 'visible' : ''}`}>
              <button 
                className="floating-btn"
                onClick={playPreviousTrack}
                disabled={currentIndex <= 0}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button 
                className="floating-btn floating-play-btn"
                onClick={handlePlayPause}
              >
                {loading ? (
                  <div className="loading-spinner-small">⏳</div>
                ) : isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <button 
                className="floating-btn"
                onClick={playNextTrack}
                disabled={currentIndex >= queue.length - 1}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>

            {queue.length > 0 && (
              <div className="track-queue">
                <div className="queue-title">Queue</div>
                <div className="queue-scroll">
                  {queue.map((track) => (
                    <div
                      key={track.id}
                      className={`queue-item ${track.id === currentTrack.id ? 'active' : ''}`}
                      onClick={() => playTrack(track)}
                    >
                      {track.album?.cover && (
                        <img 
                          src={track.album.cover} 
                          alt={track.album.title}
                          className="queue-cover"
                        />
                      )}
                      <div className="queue-info">
                        <div className="queue-track-name">{track.title}</div>
                        <div className="queue-artist-name">{track.artist?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!currentTrack && !loading && (
          <div className="no-track-message">
            <p>Ingen track valgt</p>
            <p className="hint">Søg efter musik eller vælg fra populære tracks</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicScreen;
