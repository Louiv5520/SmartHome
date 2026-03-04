import React, { useEffect, useState } from 'react';
import './WeatherScreen.css';
import { weatherAPI } from '../utils/api';

const WeatherScreen = () => {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(10);

  // Load background images for slideshow
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

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);
        const location = localStorage.getItem('aiSpeaker_location') || 'Copenhagen';
        
        const [currentData, forecastData] = await Promise.all([
          weatherAPI.getCurrent(location),
          weatherAPI.getForecast(location)
        ]);
        
        setCurrentWeather(currentData);
        setForecast(forecastData.forecasts || []);
        
        // Generate hourly forecast from current temp and forecast
        const hourly = [];
        const now = new Date();
        const currentHour = now.getHours();
        
        // Add "Now"
        hourly.push({
          time: currentHour,
          temp: currentData.temp,
          icon: currentData.icon,
          label: 'Nu'
        });
        
        // Generate next 23 hours
        for (let i = 1; i < 24; i++) {
          const hour = (currentHour + i) % 24;
          const dayIndex = Math.floor(i / 24);
          const forecastDay = forecastData.forecasts?.[dayIndex] || currentData;
          
          // Estimate temp based on time of day (warmer during day, cooler at night)
          let estimatedTemp = currentData.temp;
          if (hour >= 6 && hour < 20) {
            // Daytime - closer to high
            estimatedTemp = Math.round(currentData.temp + (forecastDay.high - currentData.temp) * 0.3);
          } else {
            // Nighttime - closer to low
            estimatedTemp = Math.round(currentData.temp - (currentData.temp - forecastDay.low) * 0.3);
          }
          
          hourly.push({
            time: hour,
            temp: estimatedTemp,
            icon: forecastDay.icon || currentData.icon,
            label: hour.toString()
          });
        }
        
        setHourlyForecast(hourly);
      } catch (err) {
        console.error('Fejl ved hentning af vejrdata:', err);
        setError('Kunne ikke hente vejrdata. Tjek din internetforbindelse.');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDayName = (dateStr, index) => {
    if (index === 0) return 'I dag';
    const date = new Date(dateStr);
    const days = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
    return days[date.getDay()];
  };

  if (loading) {
    return (
      <div className="weather-screen">
        <div className="weather-loading">
          <div className="loading-spinner">🌤️</div>
          <p>Henter vejrdata...</p>
        </div>
      </div>
    );
  }

  if (error || !currentWeather) {
    return (
      <div className="weather-screen">
        <div className="weather-error">
          <div className="error-icon">⚠️</div>
          <p>{error || 'Kunne ikke hente vejrdata'}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="weather-screen"
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
      <div className="weather-content">
        <div className="widgets-grid">
          {/* Main Weather Widget */}
          <div className="widget-card weather-main-widget">
            <div className="weather-city-name">{currentWeather.city}</div>
            <div className="weather-main-temp">{currentWeather.temp}°</div>
            <div className="weather-main-condition">{currentWeather.condition}</div>
            <div className="weather-main-range">
              H:{currentWeather.high}° L:{currentWeather.low}°
            </div>
          </div>

          {/* Weather Details Widget */}
          <div className="widget-card weather-details-widget">
            <div className="widget-title">Detaljer</div>
            <div className="weather-details-grid">
              <div className="weather-detail-item">
                <div className="weather-detail-label">Vind</div>
                <div className="weather-detail-value">{currentWeather.windSpeed} km/t</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">Fugtighed</div>
                <div className="weather-detail-value">{currentWeather.humidity}%</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">Føles som</div>
                <div className="weather-detail-value">{currentWeather.feelsLike}°</div>
              </div>
              {currentWeather.visibility && (
                <div className="weather-detail-item">
                  <div className="weather-detail-label">Sigtbarhed</div>
                  <div className="weather-detail-value">{currentWeather.visibility} km</div>
                </div>
              )}
            </div>
          </div>

          {/* Hourly Forecast Widget */}
          <div className="widget-card hourly-widget">
            <div className="widget-title">Timeforecast</div>
            <div className="hourly-scroll">
              {hourlyForecast.map((hour, index) => (
                <div key={index} className="hourly-item">
                  <div className="hourly-label">{hour.label}</div>
                  <div className="hourly-icon">{hour.icon}</div>
                  <div className="hourly-temp">{hour.temp}°</div>
                </div>
              ))}
            </div>
          </div>

          {/* 10-Day Forecast Widget */}
          <div className="widget-card forecast-widget">
            <div className="widget-title">10-dages forecast</div>
            <div className="forecast-list">
              {forecast.slice(0, 10).map((day, index) => {
                // Calculate position for temp bar (assuming temp range from -10 to 35)
                const minTemp = -10;
                const maxTemp = 35;
                const tempRange = maxTemp - minTemp;
                
                const lowPosition = ((day.low - minTemp) / tempRange) * 100;
                const highPosition = ((day.high - minTemp) / tempRange) * 100;
                const barWidth = highPosition - lowPosition;
                
                // Icon position at middle of range
                const iconPosition = lowPosition + (barWidth / 2);
                
                return (
                  <div key={day.date || index} className="forecast-row">
                    <div className="forecast-day-name">{formatDayName(day.date, index)}</div>
                    <div className="forecast-icon-small">{day.icon}</div>
                    <div className="forecast-temp-bar-container">
                      <div className="forecast-temp-bar">
                        <div 
                          className="forecast-temp-bar-fill"
                          style={{ 
                            left: `${lowPosition}%`,
                            width: `${barWidth}%`
                          }}
                        >
                          <div 
                            className="forecast-temp-indicator"
                            style={{ left: `${iconPosition - lowPosition}%` }}
                          >
                            <div className="forecast-temp-indicator-icon">{day.icon}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="forecast-temps">
                      <span className="forecast-low">{day.low}°</span>
                      <span className="forecast-high">{day.high}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="weather-error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-message-text">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherScreen;
