import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { authAPI, usersAPI } from '../utils/api';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDevLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Opret eller find dev bruger i backend
      try {
        const backendResponse = await authAPI.googleLogin({
          googleId: 'dev-user-123',
          email: 'dev@example.com',
          name: 'Dev User',
          picture: null
        });

        // Gem brugerinfo i localStorage
        const userData = {
          id: backendResponse.user.id,
          email: 'dev@example.com',
          name: 'Dev User',
          picture: null,
          googleId: 'dev-user-123'
        };
        localStorage.setItem('aiSpeaker_userInfo', JSON.stringify(userData));
        localStorage.setItem('aiSpeaker_userId', backendResponse.user.id.toString());
        localStorage.setItem('aiSpeaker_googleToken', 'dev-token');

        // Hent brugerens eksisterende settings fra databasen
        try {
          const settingsResponse = await usersAPI.getSettings(backendResponse.user.id);
          
          if (settingsResponse.settings) {
            const settings = settingsResponse.settings;
            
            if (settings.user_name) {
              localStorage.setItem('aiSpeaker_userName', settings.user_name);
            }
            if (settings.location) {
              localStorage.setItem('aiSpeaker_location', settings.location);
            }
            if (settings.preferences) {
              localStorage.setItem('aiSpeaker_preferences', JSON.stringify(settings.preferences));
            }
            if (settings.backgroundImages && Array.isArray(settings.backgroundImages) && settings.backgroundImages.length > 0) {
              localStorage.setItem('aiSpeaker_backgroundImages', JSON.stringify(settings.backgroundImages));
              localStorage.setItem('aiSpeaker_backgroundImage', settings.backgroundImages[0]);
            } else if (settings.background_image) {
              localStorage.setItem('aiSpeaker_backgroundImage', settings.background_image);
              localStorage.setItem('aiSpeaker_backgroundImages', JSON.stringify([settings.background_image]));
            }
            if (settings.slideshowEnabled !== undefined) {
              localStorage.setItem('aiSpeaker_slideshowEnabled', settings.slideshowEnabled.toString());
            }
            if (settings.slideshowInterval !== undefined) {
              localStorage.setItem('aiSpeaker_slideshowInterval', settings.slideshowInterval.toString());
            }
            if (settings.widgetLayout) {
              localStorage.setItem('aiSpeaker_widgetLayout', JSON.stringify(settings.widgetLayout));
            }
            
            localStorage.setItem('aiSpeaker_setupComplete', 'true');
          } else {
            localStorage.removeItem('aiSpeaker_setupComplete');
          }
        } catch (settingsErr) {
          console.error('Fejl ved hentning af settings:', settingsErr);
          localStorage.removeItem('aiSpeaker_setupComplete');
        }
        
        setIsLoading(false);
        onLogin();
      } catch (backendErr) {
        console.error('Fejl ved backend login:', backendErr);
        // Fallback: Gem kun i localStorage hvis backend fejler
        localStorage.setItem('aiSpeaker_userInfo', JSON.stringify({
          email: 'dev@example.com',
          name: 'Dev User',
          picture: null,
          googleId: 'dev-user-123'
        }));
        localStorage.setItem('aiSpeaker_userId', '1');
        localStorage.setItem('aiSpeaker_googleToken', 'dev-token');
        setIsLoading(false);
        onLogin();
      }
    } catch (err) {
      console.error('Fejl ved dev login:', err);
      setError('Kunne ikke logge ind. Prøv igen.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Hent brugerinfo fra Google
        const userInfoResponse = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        const userInfo = userInfoResponse.data;
        
        // Send brugerdata til backend API
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginScreen.js:30',message:'Starting backend login',data:{googleId:userInfo.sub,email:userInfo.email,hasName:!!userInfo.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
        try {
          const backendResponse = await authAPI.googleLogin({
            googleId: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          });

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginScreen.js:37',message:'Backend login success',data:{hasUser:!!backendResponse.user,userKeys:backendResponse.user?Object.keys(backendResponse.user):[],userId:backendResponse.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

          // Gem brugerinfo i localStorage (inkluder backend user ID)
          const userData = {
            id: backendResponse.user.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            googleId: userInfo.sub
          };
          localStorage.setItem('aiSpeaker_userInfo', JSON.stringify(userData));
          localStorage.setItem('aiSpeaker_userId', backendResponse.user.id.toString());
          
          // Gem access token (kan bruges til fremtidige API calls)
          localStorage.setItem('aiSpeaker_googleToken', tokenResponse.access_token);
          
          // Hent brugerens eksisterende settings fra databasen
          try {
            const settingsResponse = await usersAPI.getSettings(backendResponse.user.id);
            
            if (settingsResponse.settings) {
              // Genindlæs alle data i localStorage
              const settings = settingsResponse.settings;
              
              if (settings.user_name) {
                localStorage.setItem('aiSpeaker_userName', settings.user_name);
              }
              if (settings.location) {
                localStorage.setItem('aiSpeaker_location', settings.location);
              }
              if (settings.preferences) {
                localStorage.setItem('aiSpeaker_preferences', JSON.stringify(settings.preferences));
              }
              // Handle background images (array)
              if (settings.backgroundImages && Array.isArray(settings.backgroundImages) && settings.backgroundImages.length > 0) {
                localStorage.setItem('aiSpeaker_backgroundImages', JSON.stringify(settings.backgroundImages));
                // Also set first image for backward compatibility
                localStorage.setItem('aiSpeaker_backgroundImage', settings.backgroundImages[0]);
              } else if (settings.background_image) {
                // Fallback til gammel format
                localStorage.setItem('aiSpeaker_backgroundImage', settings.background_image);
                localStorage.setItem('aiSpeaker_backgroundImages', JSON.stringify([settings.background_image]));
              }
              // Handle slideshow settings
              if (settings.slideshowEnabled !== undefined) {
                localStorage.setItem('aiSpeaker_slideshowEnabled', settings.slideshowEnabled.toString());
              }
              if (settings.slideshowInterval !== undefined) {
                localStorage.setItem('aiSpeaker_slideshowInterval', settings.slideshowInterval.toString());
              }
              // Handle widget layout
              if (settings.widgetLayout) {
                localStorage.setItem('aiSpeaker_widgetLayout', JSON.stringify(settings.widgetLayout));
              }
              
              // Marker setup som komplet
              localStorage.setItem('aiSpeaker_setupComplete', 'true');
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginScreen.js:70',message:'Settings loaded from database',data:{hasSettings:true,hasUserName:!!settings.user_name,hasLocation:!!settings.location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
              // #endregion
            } else {
              // Ingen settings fundet - bruger skal gennemgå setup
              localStorage.removeItem('aiSpeaker_setupComplete');
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginScreen.js:80',message:'No settings found, user needs setup',data:{hasSettings:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
              // #endregion
            }
          } catch (settingsErr) {
            console.error('Fejl ved hentning af settings:', settingsErr);
            // Fortsæt alligevel - bruger kan gennemgå setup
            localStorage.removeItem('aiSpeaker_setupComplete');
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginScreen.js:50',message:'Login complete, calling onLogin',data:{userId:backendResponse.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          setIsLoading(false);
          onLogin();
        } catch (backendErr) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LoginScreen.js:54',message:'Backend login error, using fallback',data:{errorMessage:backendErr.message,errorName:backendErr.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E'})}).catch(()=>{});
          // #endregion
          console.error('Fejl ved backend login:', backendErr);
          // Fallback: Gem kun i localStorage hvis backend fejler
          localStorage.setItem('aiSpeaker_userInfo', JSON.stringify({
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            googleId: userInfo.sub
          }));
          localStorage.setItem('aiSpeaker_googleToken', tokenResponse.access_token);
          setIsLoading(false);
          onLogin();
        }
      } catch (err) {
        console.error('Fejl ved hentning af brugerinfo:', err);
        setError('Kunne ikke hente brugerinformation. Prøv igen.');
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google login fejl:', error);
      setError('Login fejlede. Prøv igen.');
      setIsLoading(false);
    },
  });

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <h1 className="login-title">Velkommen</h1>
          <p className="login-subtitle">Log ind med din Google-konto</p>
        </div>

        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
        )}

        <div className="login-form">
          <button 
            type="button"
            onClick={handleGoogleLogin}
            className={`google-login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="button-loader"></span>
                <span>Logger ind...</span>
              </>
            ) : (
              <>
                <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Fortsæt med Google</span>
              </>
            )}
          </button>

          {/* Dev Login Button */}
          <button 
            type="button"
            onClick={handleDevLogin}
            className={`dev-login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="button-loader"></span>
                <span>Logger ind...</span>
              </>
            ) : (
              <>
                <span>🔧</span>
                <span>Dev Login</span>
              </>
            )}
          </button>
        </div>

        <div className="login-footer">
          <p className="login-info">
            Ved at logge ind accepterer du vores vilkår og privatlivspolitik
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

