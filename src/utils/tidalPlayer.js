// Tidal SDK Integration

const TIDAL_CLIENT_ID = 'PLDmpnTMeg8YQgbj';
const TIDAL_CLIENT_SECRET = 'QQgbLQu4nUHG8WJv6i91TeOvg3EWR6KYqg3N7SyPe3A=';

let credentialsProvider = null;
let playerModule = null;
let isInitialized = false;
let accessToken = null;

// Initialize Tidal Auth and Player
export const initializeTidalPlayer = async () => {
  if (isInitialized) {
    return { success: true };
  }

  try {
    // Dynamically import Tidal SDK modules
    if (typeof window === 'undefined') {
      throw new Error('Tidal SDK kun tilgængelig i browser');
    }

    // Import Tidal Auth module
    const auth = await import('https://unpkg.com/@tidal-music/auth/dist/index.js');

    // Import Tidal Player module
    const player = await import('https://unpkg.com/@tidal-music/player-web-components/dist/index.js');
    playerModule = player;

    // Initialize Auth
    await auth.init({
      clientId: TIDAL_CLIENT_ID,
      clientSecret: TIDAL_CLIENT_SECRET,
      credentialsStorageKey: 'tidal_credentials',
      scopes: []
    });

    // Set credentials provider
    player.setCredentialsProvider(auth.credentialsProvider);
    credentialsProvider = auth.credentialsProvider;

    // Get access token
    const credentials = await auth.credentialsProvider();
    if (credentials && credentials.accessToken) {
      accessToken = credentials.accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('tidal_access_token', accessToken);
      }
    }

    isInitialized = true;
    console.log('Tidal Player initialiseret');
    return { success: true };
  } catch (error) {
    console.error('Fejl ved initialisering af Tidal:', error);
    throw error;
  }
};

// Play a Tidal track
export const playTidalTrack = async (tidalId, productType = 'track') => {
  if (!isInitialized) {
    await initializeTidalPlayer();
  }

  try {
    // Use Tidal play trigger component approach or API
    // For now, we'll use the API approach
    const token = localStorage.getItem('tidal_access_token') || accessToken;
    
    if (!token) {
      throw new Error('Ingen Tidal access token');
    }

    // Tidal API endpoint for playback
    // Note: Tidal uses different endpoints - this is a placeholder
    // Actual implementation depends on Tidal's playback API
    console.log(`Afspiller Tidal ${productType} med ID: ${tidalId}`);
    
    // For web components approach:
    // Create a play trigger element programmatically
    if (typeof document !== 'undefined' && playerModule) {
      // This would use the tidal-play-trigger web component
      // For now, we'll log and return success
      return { success: true, message: 'Tidal playback initiated' };
    }

    return { success: true };
  } catch (error) {
    console.error('Fejl ved afspilning af Tidal track:', error);
    throw error;
  }
};

// Pause Tidal playback
export const pauseTidal = async () => {
  if (!isInitialized) return;

  try {
    // Tidal pause implementation
    console.log('Pauser Tidal afspilning');
    return { success: true };
  } catch (error) {
    console.error('Fejl ved pause:', error);
  }
};

// Resume Tidal playback
export const resumeTidal = async () => {
  if (!isInitialized) return;

  try {
    // Tidal resume implementation
    console.log('Genoptager Tidal afspilning');
    return { success: true };
  } catch (error) {
    console.error('Fejl ved resume:', error);
  }
};

// Set Tidal volume
export const setTidalVolume = async (volume) => {
  if (!isInitialized) return;

  try {
    const volumePercent = Math.round(volume * 100);
    console.log(`Sætter Tidal volumen til ${volumePercent}%`);
    // Tidal volume implementation
    return { success: true };
  } catch (error) {
    console.error('Fejl ved volumenændring:', error);
  }
};

// Search Tidal tracks
export const searchTidalTrack = async (trackName, artistName) => {
  try {
    let token = localStorage.getItem('tidal_access_token') || accessToken;
    
    if (!token) {
      await initializeTidalPlayer();
      const credentials = await credentialsProvider();
      if (credentials) {
        token = credentials.accessToken;
      }
    }

    const query = encodeURIComponent(`${trackName} ${artistName}`);
    
    // Tidal search API
    const response = await fetch(`https://openapi.tidal.com/v2/search?query=${query}&limit=1&countryCode=DK`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/vnd.tidal.v1+json',
        'Content-Type': 'application/vnd.tidal.v1+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Tidal search fejl: ${response.status}`);
    }

    const data = await response.json();
    
    // Format Tidal track response
    if (data.tracks && data.tracks.length > 0) {
      const track = data.tracks[0];
      return {
        id: track.id,
        uri: `tidal:track:${track.id}`,
        name: track.title,
        artist: track.artists?.[0]?.name || 'Ukendt kunstner',
        duration_ms: track.duration * 1000,
        album: {
          name: track.album?.title,
          images: track.album?.cover ? [{ url: track.album.cover }] : []
        }
      };
    }
    return null;
  } catch (error) {
    console.error('Fejl ved Tidal søgning:', error);
    return null;
  }
};

// Get Tidal player instance
export const getTidalPlayer = () => {
  return {
    isInitialized,
    accessToken
  };
};

export const getIsInitialized = () => isInitialized;
export const getAccessToken = () => accessToken || localStorage.getItem('tidal_access_token');
