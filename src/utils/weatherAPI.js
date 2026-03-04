const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '4acb7fb4255b23961d9cef3c97e88148';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Konverter vejrkode til emoji
const getWeatherIcon = (weatherCode, isDay = true) => {
  // Weather codes fra OpenWeatherMap
  const code = weatherCode;
  
  if (code >= 200 && code < 300) {
    return '⛈️'; // Torden
  } else if (code >= 300 && code < 400) {
    return '🌧️'; // Drizzle
  } else if (code >= 500 && code < 600) {
    return '🌧️'; // Regn
  } else if (code >= 600 && code < 700) {
    return '❄️'; // Sne
  } else if (code >= 700 && code < 800) {
    return '🌫️'; // Atmosfæriske forhold
  } else if (code === 800) {
    return isDay ? '☀️' : '🌙'; // Klar himmel
  } else if (code === 801) {
    return '🌤️'; // Få skyer
  } else if (code === 802) {
    return '⛅'; // Spredte skyer
  } else if (code >= 803) {
    return '☁️'; // Overskyet
  }
  return '☀️';
};

// Konverter vejrbeskrivelse til dansk
const getWeatherDescription = (description) => {
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
};

// Hent nuværende vejr
export const getCurrentWeather = async (city = 'Copenhagen', countryCode = 'DK') => {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?q=${city},${countryCode}&appid=${API_KEY}&units=metric&lang=da`
    );
    
    if (!response.ok) {
      throw new Error('Kunne ikke hente vejrdata');
    }
    
    const data = await response.json();
    
    const currentHour = new Date().getHours();
    const isDay = currentHour >= 6 && currentHour < 20;
    
    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      condition: getWeatherDescription(data.weather[0].description),
      icon: getWeatherIcon(data.weather[0].id, isDay),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Konverter m/s til km/t
      pressure: data.main.pressure,
      visibility: data.visibility ? (data.visibility / 1000).toFixed(1) : null,
      uvIndex: null, // Kræver separate API call
      city: data.name,
      country: data.sys.country
    };
  } catch (error) {
    console.error('Fejl ved hentning af vejrdata:', error);
    throw error;
  }
};

// Hent vejrudsigt
export const getWeatherForecast = async (city = 'Copenhagen', countryCode = 'DK') => {
  try {
    const response = await fetch(
      `${BASE_URL}/forecast?q=${city},${countryCode}&appid=${API_KEY}&units=metric&lang=da`
    );
    
    if (!response.ok) {
      throw new Error('Kunne ikke hente vejrudsigt');
    }
    
    const data = await response.json();
    
    // Gruppér efter dag
    const dailyForecasts = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyForecasts[dateKey]) {
        dailyForecasts[dateKey] = {
          date: dateKey,
          temps: [],
          weather: item.weather[0],
          dt: item.dt
        };
      }
      
      dailyForecasts[dateKey].temps.push(item.main.temp);
    });
    
    // Konverter til array og beregn gennemsnit
    const forecasts = Object.values(dailyForecasts)
      .slice(0, 5) // Første 5 dage
      .map(day => {
        const avgTemp = Math.round(
          day.temps.reduce((a, b) => a + b, 0) / day.temps.length
        );
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
          icon: getWeatherIcon(day.weather.id, isDay),
          condition: getWeatherDescription(day.weather.description)
        };
      });
    
    return forecasts;
  } catch (error) {
    console.error('Fejl ved hentning af vejrudsigt:', error);
    throw error;
  }
};

// Hent vejrdata baseret på geolocation
export const getWeatherByLocation = async (lat, lon) => {
  try {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=da`
    );
    
    if (!response.ok) {
      throw new Error('Kunne ikke hente vejrdata');
    }
    
    const data = await response.json();
    
    const currentHour = new Date().getHours();
    const isDay = currentHour >= 6 && currentHour < 20;
    
    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      condition: getWeatherDescription(data.weather[0].description),
      icon: getWeatherIcon(data.weather[0].id, isDay),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6),
      pressure: data.main.pressure,
      visibility: data.visibility ? (data.visibility / 1000).toFixed(1) : null,
      city: data.name,
      country: data.sys.country
    };
  } catch (error) {
    console.error('Fejl ved hentning af vejrdata:', error);
    throw error;
  }
};
