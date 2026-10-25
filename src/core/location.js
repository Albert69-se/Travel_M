/** Device coordinates stay in memory and are never persisted. */
function locationPoint({ coords } = {}) {
  if (!coords || !Number.isFinite(coords.latitude) || Math.abs(coords.latitude) > 90 ||
      !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180 ||
      !Number.isFinite(coords.accuracy) || coords.accuracy < 0) {
    throw new Error('Your device returned an unusable location. Please try again.');
  }
  return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
}

function locationError(error) {
  const messages = {
    1: 'Location permission denied. Allow it in your browser settings, then try again.',
    2: 'Your location is unavailable. Check location services and try again.',
    3: 'Location took too long. Try again somewhere with a better signal.',
  };
  return new Error(messages[error?.code] || 'Could not find your location. Please try again.');
}
const unsupported = () => new Error('Location needs a supported browser and a secure HTTPS connection.');
const options = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 };

export function requestLocation(geolocation, secure = true) {
  if (!secure || typeof geolocation?.getCurrentPosition !== 'function') return Promise.reject(unsupported());
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(value => {
      try { resolve(locationPoint(value)); } catch (error) { reject(error); }
    }, error => reject(locationError(error)), options);
  });
}

/** Returns an idempotent stop function. Permission/invalid-data errors end the watch; transient signal failures can recover. */
export function watchLocation(geolocation, secure, onPosition, onError) {
  let active = true;
  let watchId;
  const stop = () => {
    active = false;
    if (watchId !== undefined) {
      geolocation.clearWatch(watchId);
      watchId = undefined;
    }
  };
  const fail = error => {
    if (!active) return;
    stop();
    onError(error);
  };
  if (!secure || typeof geolocation?.watchPosition !== 'function' || typeof geolocation?.clearWatch !== 'function') {
    fail(unsupported());
    return stop;
  }
  try {
    watchId = geolocation.watchPosition(value => {
      if (!active) return;
      let point;
      try { point = locationPoint(value); } catch (error) { fail(error); return; }
      onPosition(point);
    }, error => {
      if (!active) return;
      if (error?.code === 2 || error?.code === 3) onError(locationError(error), true);
      else fail(locationError(error));
    }, options);
    // Also support synchronously failing implementations/mocks.
    if (!active) stop();
  } catch (error) {
    fail(locationError(error));
  }
  return stop;
}
