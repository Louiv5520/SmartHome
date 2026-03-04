const express = require('express');
const router = express.Router();
const db = require('../database/db');
const axios = require('axios');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '4acb7fb4255b23961d9cef3c97e88148';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Get current weather (with caching)
router.get('/current', async (req, res) => {
  // #region agent log
  require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:10',message:'Current weather endpoint called',data:{location:req.query.location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
  // #endregion
  try {
    const { location = 'Copenhagen' } = req.query;
    // #region agent log
    require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:13',message:'Location parameter',data:{location,hasSpaces:location.includes(' '),needsEncoding:location!==encodeURIComponent(location)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
    // #endregion
    const database = db.getDb();

    // Check cache first
    database.get(
      'SELECT * FROM weather_cache WHERE location = ? AND expires_at > datetime("now")',
      [location],
      async (err, cached) => {
        // #region agent log
        require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:19',message:'Cache check result',data:{hasError:!!err,hasCached:!!cached,errorMessage:err?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'}));
        // #endregion
        if (err) {
          console.error('Cache error:', err);
        }

        if (cached) {
          return res.json(JSON.parse(cached.data));
        }

        // Fetch from API
        try {
          const encodedLocation = encodeURIComponent(location);
          // #region agent log
          require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:30',message:'Before API call',data:{location,encodedLocation,url:`${BASE_URL}/weather?q=${encodedLocation}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=da`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
          // #endregion
          const response = await axios.get(
            `${BASE_URL}/weather?q=${encodedLocation}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=da`
          );

          const data = response.data;
          // #region agent log
          require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:35',message:'API response received',data:{hasData:!!data,hasWeather:!!data.weather,weatherLength:data.weather?.length,hasMain:!!data.main,hasWind:!!data.wind,windSpeed:data.wind?.speed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,E'}));
          // #endregion
          
          if (!data.weather || !Array.isArray(data.weather) || data.weather.length === 0) {
            throw new Error('Invalid weather data: weather array is missing or empty');
          }
          
          const currentHour = new Date().getHours();
          const isDay = currentHour >= 6 && currentHour < 20;

          // #region agent log
          require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:43',message:'Before accessing weather[0]',data:{weatherExists:!!data.weather,weatherLength:data.weather?.length,weather0Exists:!!data.weather?.[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}));
          // #endregion
          const weatherData = {
            temp: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            high: Math.round(data.main.temp_max),
            low: Math.round(data.main.temp_min),
            condition: getWeatherDescription(data.weather[0].description),
            icon: getWeatherIcon(data.weather[0].id, isDay),
            humidity: data.main.humidity,
            windSpeed: Math.round((data.wind?.speed || 0) * 3.6),
            pressure: data.main.pressure,
            visibility: data.visibility ? (data.visibility / 1000).toFixed(1) : null,
            city: data.name,
            country: data.sys.country
          };

          // Cache for 10 minutes
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 10);

          database.run(
            'INSERT OR REPLACE INTO weather_cache (location, data, expires_at) VALUES (?, ?, ?)',
            [location, JSON.stringify(weatherData), expiresAt.toISOString()],
            (err) => {
              if (err) console.error('Cache save error:', err);
            }
          );

          res.json(weatherData);
        } catch (apiError) {
          console.error('Weather API error:', apiError);
          res.status(500).json({ error: 'Failed to fetch weather data' });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get weather forecast
router.get('/forecast', async (req, res) => {
  // #region agent log
  require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:78',message:'Forecast endpoint called',data:{location:req.query.location},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
  // #endregion
  try {
    const { location = 'Copenhagen' } = req.query;
    // #region agent log
    require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:80',message:'Forecast location parameter',data:{location,hasSpaces:location.includes(' '),needsEncoding:location!==encodeURIComponent(location)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
    // #endregion

    const encodedLocation = encodeURIComponent(location);
    // #region agent log
    require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:83',message:'Before forecast API call',data:{location,encodedLocation,url:`${BASE_URL}/forecast?q=${encodedLocation}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=da`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}));
    // #endregion
    const response = await axios.get(
      `${BASE_URL}/forecast?q=${encodedLocation}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=da`
    );

    const data = response.data;
    // #region agent log
    require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:87',message:'Forecast API response received',data:{hasData:!!data,hasList:!!data.list,listIsArray:Array.isArray(data.list),listLength:data.list?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}));
    // #endregion
    const dailyForecasts = {};

    if (!data.list || !Array.isArray(data.list)) {
      throw new Error('Invalid forecast data: list is missing or not an array');
    }

    data.list.forEach(item => {
      // #region agent log
      require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:95',message:'Processing forecast item',data:{hasWeather:!!item.weather,weatherLength:item.weather?.length,weather0Exists:!!item.weather?.[0],hasMain:!!item.main},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}));
      // #endregion
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];

      if (!dailyForecasts[dateKey]) {
        dailyForecasts[dateKey] = {
          date: dateKey,
          temps: [],
          weather: item.weather?.[0] || { id: 800, description: 'clear sky' },
          dt: item.dt
        };
      }

      dailyForecasts[dateKey].temps.push(item.main.temp);
    });

    const forecasts = Object.values(dailyForecasts)
      .slice(0, 5)
      .map(day => {
        // #region agent log
        require('http').request({hostname:'127.0.0.1',port:7242,path:'/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',method:'POST',headers:{'Content-Type':'application/json'}},()=>{}).on('error',()=>{}).end(JSON.stringify({location:'weather.js:108',message:'Processing forecast day',data:{tempsLength:day.temps.length,hasTemps:day.temps.length>0,hasWeather:!!day.weather},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'}));
        // #endregion
        if (day.temps.length === 0) {
          return null;
        }
        const avgTemp = Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length);
        const maxTemp = Math.round(Math.max(...day.temps));
        const minTemp = Math.round(Math.min(...day.temps));
        const forecastDate = new Date(day.dt * 1000);
        const isDay = forecastDate.getHours() >= 6 && forecastDate.getHours() < 20;

        return {
          date: day.date,
          dayName: forecastDate.toLocaleDateString('da-DK', { weekday: 'long' }),
          temp: avgTemp,
          high: maxTemp,
          low: minTemp,
          icon: getWeatherIcon(day.weather?.id || 800, isDay),
          condition: getWeatherDescription(day.weather?.description || 'clear sky')
        };
      })
      .filter(day => day !== null);

    res.json({ forecasts });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

function getWeatherIcon(code, isDay = true) {
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌧️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800) return isDay ? '☀️' : '🌙';
  if (code === 801) return '🌤️';
  if (code === 802) return '⛅';
  if (code >= 803) return '☁️';
  return '☀️';
}

function getWeatherDescription(description) {
  const descriptions = {
    'clear sky': 'Klar himmel',
    'few clouds': 'Få skyer',
    'scattered clouds': 'Spredte skyer',
    'broken clouds': 'Delvist skyet',
    'shower rain': 'Byger',
    'rain': 'Regn',
    'thunderstorm': 'Tordenvejr',
    'snow': 'Sne',
    'mist': 'Tåge',
    'fog': 'Tåge',
    'haze': 'Dis',
    'dust': 'Støv',
    'sand': 'Sand',
    'ash': 'Aske',
    'squall': 'Squall',
    'tornado': 'Tornado',
    'overcast clouds': 'Overskyet'
  };
  
  return descriptions[description.toLowerCase()] || description;
}

module.exports = router;
