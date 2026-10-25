/** Browser location stays in memory; callers decide whether to show it on a map. */
export function requestLocation(geolocation, secure = true) {
  if (!secure || !geolocation) return Promise.reject(new Error('Location needs a supported browser and a secure HTTPS connection.'));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(({ coords }) => {
      if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude) || !Number.isFinite(coords.accuracy) || coords.accuracy < 0) {
        reject(new Error('Your device returned an unusable location. Please try again.'));
        return;
      }
      resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
    }, error => {
      const messages = {
        1: 'Location permission denied. Allow it in your browser settings, then try again.',
        2: 'Your location is unavailable. Check location services and try again.',
        3: 'Location took too long. Try again somewhere with a better signal.',
      };
      reject(new Error(messages[error.code] || 'Could not find your location. Please try again.'));
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}
