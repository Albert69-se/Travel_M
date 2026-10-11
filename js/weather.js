/**
 * Optional weather integration.
 *
 * The provider sits behind a small adapter so it can be replaced without
 * touching the rest of the application, and so a missing provider degrades to
 * an explicit "unavailable" state instead of inventing conditions.
 */

import { isFiniteNumber, isNonNegativeNumber } from './utils.js';

export const WEATHER_MODES = {
  NONE: 'none',
  OPEN_METEO: 'open-meteo',
};

/**
 * Weather is on by default. Open-Meteo needs no API key, and a provider failure
 * degrades to an explicit unavailable state rather than invented conditions.
 * Set to WEATHER_MODES.NONE to demo the offline "provider not connected" state.
 */
export const ACTIVE_WEATHER_MODE = WEATHER_MODES.OPEN_METEO;

const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 16;

const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export function describeWeatherCode(code) {
  return WEATHER_CODES[code] || 'Conditions not reported';
}

function unavailable(message) {
  return { status: 'unavailable', provider: null, message };
}

/** Keeps only the forecast days that fall inside the trip range. */
function selectDays(daily, startDate, endDate) {
  if (!daily || !Array.isArray(daily.time)) return [];
  return daily.time
    .map((date, index) => ({
      date,
      maxTemperature: daily.temperature_2m_max?.[index],
      minTemperature: daily.temperature_2m_min?.[index],
      precipitation: daily.precipitation_sum?.[index],
      condition: describeWeatherCode(daily.weather_code?.[index]),
    }))
    .filter((day) => (!startDate || day.date >= startDate) && (!endDate || day.date <= endDate));
}

async function fetchOpenMeteo(latitude, longitude, startDate, endDate) {
  const url = new URL(OPEN_METEO_ENDPOINT);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,precipitation,weather_code');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', String(FORECAST_DAYS));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`provider returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  const current = payload.current || {};
  const days = selectDays(payload.daily, startDate, endDate);

  return {
    status: 'ok',
    provider: 'Open-Meteo',
    retrievedAt: new Date().toISOString(),
    validFor: days.length > 0 ? `${days[0].date} to ${days[days.length - 1].date}` : 'no requested date inside the forecast range',
    current: {
      temperature: current.temperature_2m,
      precipitation: current.precipitation,
      condition: describeWeatherCode(current.weather_code),
    },
    days,
    note:
      days.length === 0
        ? `No forecast is available for the selected dates. This provider forecasts about ${FORECAST_DAYS} days ahead.`
        : '',
  };
}

/**
 * Returns one of three shapes:
 *   { status: 'ok', provider, retrievedAt, validFor, current, days, note }
 *   { status: 'unavailable', provider, message }
 *   { status: 'error', provider, message }
 */
export async function getWeatherForPlace(place, startDate, endDate, mode = ACTIVE_WEATHER_MODE) {
  if (mode === WEATHER_MODES.NONE) {
    return unavailable('Weather provider is not connected. No conditions or temperature are shown.');
  }

  if (!place || !isFiniteNumber(place.latitude) || !isFiniteNumber(place.longitude)) {
    return unavailable('This place has no usable coordinates, so no forecast can be requested.');
  }

  try {
    return await fetchOpenMeteo(place.latitude, place.longitude, startDate, endDate);
  } catch (error) {
    // A provider failure must never break the rest of the application.
    return { status: 'error', provider: 'Open-Meteo', message: `Weather request failed: ${error.message}` };
  }
}

/** True when the value looks like a temperature we can display. */
export function hasTemperature(value) {
  return isFiniteNumber(value) && isNonNegativeNumber(Math.abs(value));
}
