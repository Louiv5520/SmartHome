// Spotify Web Playback SDK Integration

let player = null;
let deviceId = null;
let isInitialized = false;

export const setSpotifyToken = (token) => {
  if (typeof window !== 'undefined' && token) {
    localStorage.setItem('spotify_access_token', token);
  }
};

const getToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null;
};

export const initializeSpotifyPlayer = async (token) => {
  if (token) setSpotifyToken(token);
  const accessToken = getToken();
  if (!accessToken) {
    throw new Error('Ingen Spotify token. Forbind Spotify i indstillinger.');
  }

  if (isInitialized) {
    return { success: true, deviceId };
  }

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;

    const checkSpotify = () => {
      attempts++;
      if (typeof window !== 'undefined' && window.Spotify && window.Spotify.Player) {
        proceed();
      } else if (attempts < maxAttempts) {
        setTimeout(checkSpotify, 100);
      } else {
        reject(new Error('Spotify SDK ikke indlæst efter timeout'));
      }
    };

    const proceed = () => {
      try {
        if (typeof window === 'undefined' || !window.Spotify || !window.Spotify.Player) {
          reject(new Error('Spotify SDK ikke tilgængelig'));
          return;
        }

        const currentToken = getToken();
        player = new window.Spotify.Player({
          name: 'AI Speaker',
          getOAuthToken: cb => cb(currentToken),
          volume: 0.6
        });

        player.addListener('ready', ({ device_id }) => {
          deviceId = device_id;
          isInitialized = true;
          resolve({ success: true, deviceId });
        });

        player.addListener('not_ready', () => {
          reject(new Error('Spotify Player ikke klar'));
        });

        player.addListener('player_state_changed', () => {});

        player.connect().then(success => {
          if (!success) reject(new Error('Kunne ikke forbinde til Spotify'));
        }).catch(reject);
      } catch (error) {
        reject(error);
      }
    };

    checkSpotify();
  });
};

export const playSpotifyTrack = async (spotifyUri) => {
  if (!isInitialized || !deviceId) {
    await initializeSpotifyPlayer();
  }

  const token = getToken();
  if (!token) throw new Error('Ingen Spotify token');

  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: [spotifyUri] })
  });

  if (!response.ok) {
    throw new Error(`Spotify API fejl: ${response.status}`);
  }
  return { success: true };
};

export const pauseSpotify = async () => {
  if (!isInitialized || !deviceId) return;
  const token = getToken();
  if (!token) return;
  await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const resumeSpotify = async () => {
  if (!isInitialized || !deviceId) return;
  const token = getToken();
  if (!token) return;
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const setSpotifyVolume = async (volume) => {
  if (!isInitialized || !deviceId) return;
  const token = getToken();
  if (!token) return;
  const volumePercent = Math.round(volume * 100);
  await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}&device_id=${deviceId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getSpotifyPlayer = () => player;
export const getDeviceId = () => deviceId;
export const getIsInitialized = () => isInitialized;
