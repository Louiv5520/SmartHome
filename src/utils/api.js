const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:5',message:'API call start',data:{endpoint,baseUrl:API_BASE_URL,fullUrl:`${API_BASE_URL}${endpoint}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'})}).catch(()=>{});
  // #endregion
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:15',message:'API response received',data:{status:response.status,statusText:response.statusText,ok:response.ok,endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:18',message:'API error response',data:{status:response.status,error,endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:24',message:'API success response',data:{endpoint,responseKeys:Object.keys(jsonData),responseStructure:JSON.stringify(jsonData).substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return jsonData;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0aa36cd-fb3e-45b1-b2ca-e2c8d8d9e5cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:28',message:'API call exception',data:{endpoint,errorMessage:error.message,errorName:error.name,errorStack:error.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion
    console.error('API call error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  googleLogin: (userData) => apiCall('/auth/google', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  getUser: (userId) => apiCall(`/auth/user/${userId}`),
};

// Users API
export const usersAPI = {
  getSettings: (userId) => apiCall(`/users/${userId}/settings`),
  updateSettings: (userId, settings) => apiCall(`/users/${userId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};

// Integrations API
export const integrationsAPI = {
  getIntegrations: (userId) => apiCall(`/integrations/${userId}`),
  getSpotifyToken: (userId) => apiCall(`/integrations/${userId}/spotify/token`),
  initiateSpotify: (userId) => apiCall(`/integrations/${userId}/spotify`, {
    method: 'POST',
  }),
  spotifyCallback: (userId, code) => apiCall(`/integrations/${userId}/spotify/callback`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  }),
  initiateGoogleCalendar: (userId) => apiCall(`/integrations/${userId}/google-calendar`, {
    method: 'POST',
  }),
  googleCalendarCallback: (userId, code) => apiCall(`/integrations/${userId}/google-calendar/callback`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  }),
  initiateSmartHome: (userId, provider) => apiCall(`/integrations/${userId}/smart-home`, {
    method: 'POST',
    body: JSON.stringify({ provider }),
  }),
  disconnect: (userId, service) => apiCall(`/integrations/${userId}/${service}`, {
    method: 'DELETE',
  }),
};

// Calendar API
export const calendarAPI = {
  getEvents: (userId, date = null) => {
    const query = date ? `?date=${date}` : '';
    return apiCall(`/calendar/${userId}/events${query}`);
  },
  getTodayEvents: (userId) => apiCall(`/calendar/${userId}/events/today`),
  createEvent: (userId, event) => apiCall(`/calendar/${userId}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  }),
  updateEvent: (userId, eventId, event) => apiCall(`/calendar/${userId}/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(event),
  }),
  deleteEvent: (userId, eventId) => apiCall(`/calendar/${userId}/events/${eventId}`, {
    method: 'DELETE',
  }),
};

// Weather API
export const weatherAPI = {
  getCurrent: (location) => apiCall(`/weather/current?location=${encodeURIComponent(location)}`),
  getForecast: (location) => apiCall(`/weather/forecast?location=${encodeURIComponent(location)}`),
};

// Music API
export const musicAPI = {
  search: (query, type = null) => {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return apiCall(`/music/search?${params}`);
  },
  getTrack: (trackId) => apiCall(`/music/track/${trackId}`),
  getCharts: () => apiCall('/music/charts'),
  getArtist: (artistId) => apiCall(`/music/artist/${artistId}`),
  getAlbum: (albumId) => apiCall(`/music/album/${albumId}`),
};

export default {
  auth: authAPI,
  users: usersAPI,
  calendar: calendarAPI,
  weather: weatherAPI,
  music: musicAPI,
};
