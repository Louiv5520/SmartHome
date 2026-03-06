import React, { useState, useEffect } from 'react';
import './App.css';
import { integrationsAPI } from './utils/api';
import { setSpotifyToken } from './utils/spotifyPlayer';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import HomeScreen from './components/HomeScreen';
import WeatherScreen from './components/WeatherScreen';
import MusicScreen from './components/MusicScreen';
import SmartHomeScreen from './components/SmartHomeScreen';
import SettingsScreen from './components/SettingsScreen';
import ChatScreen from './components/ChatScreen';
import Navigation from './components/Navigation';

const VALID_SCREENS = ['home', 'chat', 'weather', 'music', 'smart', 'settings'];

// Error Boundary komponent
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary fangede en fejl:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Noget gik galt</div>;
    }

    return this.props.children;
  }
}

function App() {
  // Initialiser currentScreen korrekt
  const getInitialScreen = () => {
    try {
      const savedScreen = localStorage.getItem('aiSpeaker_currentScreen');
      if (savedScreen && VALID_SCREENS.includes(savedScreen)) {
        return savedScreen;
      }
    } catch (e) {
      // localStorage kan være utilgængelig i nogle tilfælde
      console.warn('Kunne ikke tilgå localStorage:', e);
    }
    return 'home';
  };
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(getInitialScreen);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(10);

  // Håndter OAuth callback (Spotify, Google Calendar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callback = params.get('callback');
    const code = params.get('code');
    const state = params.get('state');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.js:OAuth',message:'OAuth callback check',data:{callback,hasCode:!!code,hasState:!!state,stateValue:state,fullUrl:window.location.href,pathname:window.location.pathname},timestamp:Date.now(),hypothesisId:'H1,H5'})}).catch(()=>{});
    // #endregion
    if (callback === 'spotify' && !(code && state)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.js:spotifyIncomplete',message:'Spotify callback params incomplete',data:{callback,hasCode:!!code,hasState:!!state},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
    }
    if (callback === 'spotify' && code && state) {
      integrationsAPI.spotifyCallback(state, code)
        .then((res) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.js:spotifySuccess',message:'Spotify callback success',data:{hasAccessToken:!!res?.accessToken},timestamp:Date.now(),hypothesisId:'H2,H4'})}).catch(()=>{});
          // #endregion
          if (res.accessToken) {
            setSpotifyToken(res.accessToken);
          }
          window.history.replaceState({}, document.title, window.location.pathname || '/');
          window.location.reload();
        })
        .catch((err) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.js:spotifyError',message:'Spotify callback failed',data:{errorMessage:err?.message,errorName:err?.name},timestamp:Date.now(),hypothesisId:'H2,H3'})}).catch(()=>{});
          // #endregion
          console.error('Spotify callback fejl:', err);
          window.history.replaceState({}, document.title, window.location.pathname || '/');
        });
    } else if (callback === 'google-calendar' && code && state) {
      integrationsAPI.googleCalendarCallback(state, code)
        .then(() => {
          window.history.replaceState({}, document.title, window.location.pathname || '/');
          window.location.reload();
        })
        .catch((err) => {
          console.error('Google Calendar callback fejl:', err);
          window.history.replaceState({}, document.title, window.location.pathname || '/');
        });
    }
  }, []);

  // Check localStorage for saved state
  useEffect(() => {
    const savedLogin = localStorage.getItem('aiSpeaker_loggedIn');
    const savedSetup = localStorage.getItem('aiSpeaker_setupComplete');
    
    if (savedLogin === 'true') {
      setIsLoggedIn(true);
    }
    if (savedSetup === 'true') {
      setIsSetupComplete(true);
    }
  }, []);

  // Load background images
  useEffect(() => {
    const loadBackgroundImages = () => {
      const savedImagesStr = localStorage.getItem('aiSpeaker_backgroundImages');
      if (savedImagesStr) {
        try {
          const savedImages = JSON.parse(savedImagesStr);
          if (Array.isArray(savedImages) && savedImages.length > 0) {
            if (currentImageIndex >= savedImages.length) {
              setCurrentImageIndex(0);
            }
            setBackgroundImage(savedImages[currentImageIndex]);
          }
        } catch (e) {
          const savedImage = localStorage.getItem('aiSpeaker_backgroundImage');
          if (savedImage) {
            setBackgroundImage(savedImage);
          }
        }
      } else {
        const savedImage = localStorage.getItem('aiSpeaker_backgroundImage');
        if (savedImage) {
          setBackgroundImage(savedImage);
        }
      }
    };
    
    loadBackgroundImages();
    
    const savedEnabled = localStorage.getItem('aiSpeaker_slideshowEnabled');
    if (savedEnabled !== null) {
      setSlideshowEnabled(savedEnabled === 'true');
    }
    const savedInterval = localStorage.getItem('aiSpeaker_slideshowInterval');
    if (savedInterval) {
      setSlideshowInterval(parseInt(savedInterval, 10));
    }
    
    const handleStorageChange = () => {
      loadBackgroundImages();
      const newEnabled = localStorage.getItem('aiSpeaker_slideshowEnabled');
      if (newEnabled !== null) {
        setSlideshowEnabled(newEnabled === 'true');
      }
      const newInterval = localStorage.getItem('aiSpeaker_slideshowInterval');
      if (newInterval) {
        setSlideshowInterval(parseInt(newInterval, 10));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('backgroundImagesUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('backgroundImagesUpdated', handleStorageChange);
    };
  }, [currentImageIndex]);

  // Slideshow effect
  useEffect(() => {
    if (!slideshowEnabled || !backgroundImage) return;
    
    const savedImagesStr = localStorage.getItem('aiSpeaker_backgroundImages');
    if (!savedImagesStr) return;
    
    try {
      const savedImages = JSON.parse(savedImagesStr);
      if (savedImages.length <= 1) return;
      
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % savedImages.length;
          setBackgroundImage(savedImages[nextIndex]);
          return nextIndex;
        });
      }, slideshowInterval * 1000);
      
      return () => clearInterval(interval);
    } catch (e) {
      // Ignore
    }
  }, [slideshowEnabled, slideshowInterval, backgroundImage]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('aiSpeaker_loggedIn', 'true');
    
    // Check om setup allerede er komplet (kan være sat af LoginScreen hvis settings blev fundet)
    const savedSetup = localStorage.getItem('aiSpeaker_setupComplete');
    if (savedSetup === 'true') {
      setIsSetupComplete(true);
    }
  };

  const handleSetupComplete = () => {
    setIsSetupComplete(true);
    localStorage.setItem('aiSpeaker_setupComplete', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsSetupComplete(false);
    // Remove all localStorage items
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
  };

  // Opdater currentScreen hvis den ikke er gyldig (f.eks. hvis den var 'opsætning')
  useEffect(() => {
    if (!VALID_SCREENS.includes(currentScreen)) {
      setCurrentScreen('home');
    }
  }, [currentScreen]);

  const activeScreen = VALID_SCREENS.includes(currentScreen) ? currentScreen : 'home';
  
  // Opret screens objekt direkte
  const screens = {
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    chat: <ChatScreen />,
    weather: <WeatherScreen />,
    music: <MusicScreen />,
    smart: <SmartHomeScreen />,
    settings: <SettingsScreen onLogout={handleLogout} />
  };
  
  // Sikre at vi altid har en gyldig skærm
  const currentScreenComponent = screens[activeScreen] || screens['home'];

  return (
    <div className="device-container">
      <div className="device-frame">
        <div className="device-front">
        <div 
          className="device-screen"
          style={backgroundImage ? {
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transition: 'background-image 1s ease-in-out'
          } : {
            background: 'linear-gradient(180deg, #1a1a1a 0%, #000000 100%)'
          }}
        >
            {!isLoggedIn ? (
              <LoginScreen onLogin={handleLogin} />
            ) : !isSetupComplete ? (
              <SetupScreen onComplete={handleSetupComplete} />
            ) : (
              <>
          <ErrorBoundary fallback={<HomeScreen onNavigate={setCurrentScreen} />}>
            {currentScreenComponent}
          </ErrorBoundary>
          <Navigation 
            currentScreen={activeScreen} 
            onNavigate={setCurrentScreen} 
          />
              </>
            )}
          </div>
        </div>
        <div className="device-base"></div>
      </div>
    </div>
  );
}

export default App;

