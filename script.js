/* =====================================================================
   AetherSense — script.js
   API integration · UI updates · recommendation engine · navigation
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. Configuration
   --------------------------------------------------------------------- */
const CONFIG = {
  defaultCity: 'Jakarta',
  unit: 'c',                 // 'c' or 'f'
  hourlyWindowHours: 12,     // look-ahead for "best outdoor window"
  forecastDays: 7
};

/* ---------------------------------------------------------------------
   2. State
   --------------------------------------------------------------------- */
const state = {
  unit: CONFIG.unit,
  location: null,
  weather: null,
  air: null,
  nowIndex: 0,
  isFetching: false
};

/* ---------------------------------------------------------------------
   3. Tiny DOM helpers
   --------------------------------------------------------------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------------------------------------------------------------
   4. WMO weather code map
   --------------------------------------------------------------------- */
const WMO = {
  0:  { label: 'Clear sky',              icon: 'fa-sun',               theme: 'clear'  },
  1:  { label: 'Mainly clear',           icon: 'fa-sun',               theme: 'clear'  },
  2:  { label: 'Partly cloudy',          icon: 'fa-cloud-sun',         theme: 'cloudy' },
  3:  { label: 'Overcast',               icon: 'fa-cloud',             theme: 'cloudy' },
  45: { label: 'Fog',                    icon: 'fa-smog',              theme: 'fog'    },
  48: { label: 'Rime fog',               icon: 'fa-smog',              theme: 'fog'    },
  51: { label: 'Light drizzle',          icon: 'fa-cloud-rain',        theme: 'rain'   },
  53: { label: 'Drizzle',                icon: 'fa-cloud-rain',        theme: 'rain'   },
  55: { label: 'Dense drizzle',          icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  56: { label: 'Freezing drizzle',       icon: 'fa-cloud-rain',        theme: 'rain'   },
  57: { label: 'Freezing drizzle',       icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  61: { label: 'Light rain',             icon: 'fa-cloud-rain',        theme: 'rain'   },
  63: { label: 'Rain',                   icon: 'fa-cloud-rain',        theme: 'rain'   },
  65: { label: 'Heavy rain',             icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  66: { label: 'Freezing rain',          icon: 'fa-cloud-rain',        theme: 'rain'   },
  67: { label: 'Freezing rain',          icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  71: { label: 'Light snow',             icon: 'fa-snowflake',         theme: 'snow'   },
  73: { label: 'Snow',                   icon: 'fa-snowflake',         theme: 'snow'   },
  75: { label: 'Heavy snow',             icon: 'fa-snowflake',         theme: 'snow'   },
  77: { label: 'Snow grains',            icon: 'fa-snowflake',         theme: 'snow'   },
  80: { label: 'Light showers',          icon: 'fa-cloud-sun-rain',    theme: 'rain'   },
  81: { label: 'Showers',                icon: 'fa-cloud-rain',        theme: 'rain'   },
  82: { label: 'Violent showers',        icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  85: { label: 'Snow showers',           icon: 'fa-snowflake',         theme: 'snow'   },
  86: { label: 'Heavy snow showers',     icon: 'fa-snowflake',         theme: 'snow'   },
  95: { label: 'Thunderstorm',           icon: 'fa-cloud-bolt',        theme: 'storm'  },
  96: { label: 'Thunderstorm + hail',    icon: 'fa-cloud-bolt',        theme: 'storm'  },
  99: { label: 'Severe thunderstorm',    icon: 'fa-cloud-bolt',        theme: 'storm'  }
};

function weatherInfo(code, isDay = 1) {
  const base = WMO[code] || { label: 'Unknown', icon: 'fa-cloud', theme: 'cloudy' };
  let theme = base.theme;
  if (theme === 'clear') theme = isDay ? 'clear-day' : 'clear-night';
  return { ...base, theme };
}

/* ---------------------------------------------------------------------
   5. Unit helpers
   --------------------------------------------------------------------- */
function tempValue(celsius) {
  if (celsius == null || Number.isNaN(celsius)) return '—';
  const v = state.unit === 'f' ? celsius * 9 / 5 + 32 : celsius;
  return Math.round(v);
}
function tempUnit() { return state.unit === 'f' ? '°F' : '°C'; }

function windDirection(deg) {
  if (deg == null) return '';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/* ---------------------------------------------------------------------
   6. API layer
   --------------------------------------------------------------------- */
async function apiJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const data = await apiJSON(url);
  if (!data.results || data.results.length === 0) throw new Error('City not found');
  const r = data.results[0];
  return {
    name: r.name,
    admin1: r.admin1 || '',
    country: r.country || '',
    latitude: r.latitude,
    longitude: r.longitude
  };
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation',
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,visibility,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
    timezone: 'auto',
    forecast_days: CONFIG.forecastDays
  });
  return apiJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
}

async function fetchAir(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
    timezone: 'auto'
  });
  return apiJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
}

/* ---------------------------------------------------------------------
   7. Status / toast / theme helpers
   --------------------------------------------------------------------- */
const statusPill = $('#status-pill');
const statusText = $('#status-text');

function setStatus(kind, text) {
  statusPill.classList.remove('is-live', 'is-error', 'is-loading');
  if (kind) statusPill.classList.add(`is-${kind}`);
  statusText.textContent = text;
}

let toastTimer = null;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function applyTheme(theme) {
  if (document.body.dataset.theme !== theme) {
    document.body.dataset.theme = theme;
  }
}

/* ---------------------------------------------------------------------
   8. Index helpers
   --------------------------------------------------------------------- */
function findNowIndex(hourly, currentTime) {
  if (!hourly || !hourly.time || !currentTime) return 0;
  const target = currentTime.slice(0, 13);           // "YYYY-MM-DDTHH"
  for (let i = 0; i < hourly.time.length; i++) {
    if (hourly.time[i].slice(0, 13) >= target) return i;
  }
  return 0;
}

function formatHour(iso) { return iso ? iso.slice(11, 16) : '—'; }
function formatTime(iso) { return iso ? iso.slice(11, 16) : ''; }

function formatWeekday(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/* ---------------------------------------------------------------------
   9. Comfort score + best window
   --------------------------------------------------------------------- */
function comfortScore({ t, rain, wind, aqi }) {
  let score = 100;

  // Temperature: ideal range 18–26 °C
  if (t < 18)      score -= (18 - t) * 3.5;
  else if (t > 26) score -= (t - 26) * 3.5;

  // Rain probability
  score -= (rain || 0) * 0.55;

  // Wind above 10 km/h
  if (wind > 10) score -= (wind - 10) * 0.9;

  // AQI above 20
  if (aqi != null && aqi > 20) score -= (aqi - 20) * 0.6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function findBestWindow(hourly, nowIndex, air) {
  if (!hourly || !hourly.time) return { index: nowIndex, score: 0 };
  const end = Math.min(nowIndex + CONFIG.hourlyWindowHours, hourly.time.length);
  let best = { index: nowIndex, score: -1 };
  const aqi = air?.current?.european_aqi ?? null;

  for (let i = nowIndex; i < end; i++) {
    const score = comfortScore({
      t: hourly.apparent_temperature[i],
      rain: hourly.precipitation_probability[i] ?? 0,
      wind: hourly.wind_speed_10m[i],
      aqi
    });
    if (score > best.score) best = { index: i, score };
  }
  return best;
}

/* ---------------------------------------------------------------------
   10. Recommendation engine
   --------------------------------------------------------------------- */
function buildRecommendations({ current, hourly, daily, air, nowIndex }) {
  const health = [];
  const agri = [];
  const outdoor = [];

  const t = current.temperature_2m;
  const feels = current.apparent_temperature;
  const h = current.relative_humidity_2m;
  const wind = current.wind_speed_10m;
  const gusts = current.wind_gusts_10m ?? wind;
  const rain = hourly.precipitation_probability?.[nowIndex] ?? 0;
  const uv = hourly.uv_index?.[nowIndex] ?? 0;
  const aqi = air?.current?.european_aqi ?? null;
  const pm25 = air?.current?.pm2_5 ?? null;

  /* ---------- HEALTH ---------- */
  if (aqi != null) {
    if (aqi > 60) {
      health.push({ level: 'warn', text: `Air quality is poor (AQI ${aqi}). Limit prolonged outdoor exertion — especially for children, the elderly and people with respiratory conditions.` });
    } else if (aqi > 40) {
      health.push({ level: 'caution', text: `Air quality is moderate (AQI ${aqi}). Sensitive groups should reduce intense outdoor exercise.` });
    } else {
      health.push({ level: 'good', text: `Air quality is good (AQI ${aqi}). Outdoor activity is fine for most people.` });
    }
  }
  if (pm25 != null && pm25 > 15) {
    health.push({ level: 'warn', text: `PM2.5 is ${pm25.toFixed(1)} µg/m³ — above the WHO 24-hour guideline of 15. Consider a mask for extended outdoor time.` });
  }
  if (uv >= 8) {
    health.push({ level: 'warn', text: `UV index ${uv.toFixed(1)} is very high. Use SPF 50+, a hat and sunglasses; avoid the midday sun.` });
  } else if (uv >= 6) {
    health.push({ level: 'caution', text: `UV index ${uv.toFixed(1)} is high. Apply sunscreen and reapply every two hours outdoors.` });
  }
  if (feels >= 35) {
    health.push({ level: 'warn', text: `Heat stress: feels like ${Math.round(feels)}°C. Drink water frequently, avoid strenuous activity between 11:00 and 16:00.` });
  } else if (feels <= 5) {
    health.push({ level: 'caution', text: `Cold stress: feels like ${Math.round(feels)}°C. Layer up and cover extremities.` });
  }
  if (h >= 85 && t >= 26) {
    health.push({ level: 'caution', text: `High humidity (${h}%) combined with warmth reduces sweat evaporation — take breaks in shade or air-conditioned spaces.` });
  }
  if (gusts >= 55) {
    health.push({ level: 'caution', text: `Strong wind gusts (${Math.round(gusts)} km/h). Secure loose items and avoid exposed areas.` });
  }
  if (health.length === 0) {
    health.push({ level: 'good', text: 'No specific health advisories — conditions look comfortable.' });
  }

  /* ---------- AGRICULTURE ---------- */
  if (h >= 80 && wind < 12) {
    agri.push({ level: 'warn', text: `High humidity (${h}%) with low wind (<12 km/h) → elevated fungal disease risk. Monitor leaf wetness and consider preventive fungicide.` });
  }
  if (rain >= 70) {
    agri.push({ level: 'good', text: `Rain probability ${rain}% — skip irrigation and avoid pesticide spraying (wash-off risk).` });
  } else if (rain <= 20 && t >= 30 && h <= 50) {
    agri.push({ level: 'warn', text: `Hot, dry conditions (${Math.round(t)}°C, ${h}% RH, ${rain}% rain) → drought stress risk. Increase watering and mulch to retain moisture.` });
  }
  if (wind >= 30) {
    agri.push({ level: 'warn', text: `Strong wind (${Math.round(wind)} km/h) → secure young plants and trellises; delay spraying to avoid drift.` });
  }
  if (t <= 4) {
    agri.push({ level: 'warn', text: `Frost risk: temperature ${Math.round(t)}°C. Cover sensitive crops or apply frost protection overnight.` });
  }
  if (rain < 40 && h >= 50 && h <= 75 && wind < 20 && t >= 12 && t <= 30) {
    agri.push({ level: 'good', text: 'Favourable field conditions — suitable for planting, transplanting, harvesting or field maintenance.' });
  }
  if (uv >= 8 && t >= 30) {
    agri.push({ level: 'caution', text: 'High UV and heat → risk of sunscald on fruit and leaf burn. Consider shade netting during peak hours.' });
  }
  if (agri.length === 0) {
    agri.push({ level: 'good', text: 'No significant agricultural alerts — routine field work is fine.' });
  }

  /* ---------- OUTDOOR ACTIVITY ---------- */
  const score = comfortScore({ t: feels, rain, wind, aqi });
  if (score >= 75) {
    outdoor.push({ level: 'good', text: `Excellent conditions for outdoor activity (comfort ${score}/100).` });
  } else if (score >= 50) {
    outdoor.push({ level: 'caution', text: `Reasonable outdoor conditions (comfort ${score}/100) — plan around the best window.` });
  } else {
    outdoor.push({ level: 'warn', text: `Uncomfortable outdoor conditions (comfort ${score}/100) — prefer indoor activities.` });
  }
  if (rain >= 60) {
    outdoor.push({ level: 'caution', text: `Rain likely (${rain}%) — carry rain protection or choose an indoor alternative.` });
  }
  if (aqi != null && aqi > 60) {
    outdoor.push({ level: 'warn', text: `Elevated AQI (${aqi}) — avoid vigorous outdoor exercise, especially near busy roads.` });
  }
  if (wind >= 40) {
    outdoor.push({ level: 'warn', text: `High wind speeds (${Math.round(wind)} km/h) — not ideal for cycling, exposed hikes or water sports.` });
  }

  return { health, agri, outdoor, score };
}

/* ---------------------------------------------------------------------
   11. Rendering — hero & metrics
   --------------------------------------------------------------------- */
function renderHero() {
  const { current, hourly, nowIndex } = state.weather;
  const info = weatherInfo(current.weather_code, current.is_day);
  const loc = state.location;

  $('#hero-city').textContent = [loc.name, loc.country].filter(Boolean).join(', ');
  $('#hero-time').textContent = formatTime(current.time);
  $('#hero-icon').innerHTML = `<i class="fa-solid ${info.icon}"></i>`;
  $('#hero-value').textContent = tempValue(current.temperature_2m);
  $('#hero-unit').textContent = tempUnit();
  $('#hero-cond').textContent = info.label;

  const dailyMax = state.weather.daily.temperature_2m_max[0];
  const dailyMin = state.weather.daily.temperature_2m_min[0];
  $('#hero-feels').textContent =
    `Feels like ${tempValue(current.apparent_temperature)}${tempUnit()} · ` +
    `H:${tempValue(dailyMax)}${tempUnit()} L:${tempValue(dailyMin)}${tempUnit()}`;

  applyTheme(info.theme);
}

function renderMetrics() {
  const { current, hourly, daily, nowIndex } = state.weather;

  $('#m-feels').textContent = `${tempValue(current.apparent_temperature)}${tempUnit()}`;
  $('#m-humidity').textContent = `${Math.round(current.relative_humidity_2m)}%`;
  $('#m-wind').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  $('#m-wind-dir').textContent = windDirection(current.wind_direction_10m);
  $('#m-pressure').textContent = `${Math.round(current.pressure_msl)} hPa`;

  const vis = hourly.visibility?.[nowIndex];
  $('#m-visibility').textContent = vis != null ? `${(vis / 1000).toFixed(1)} km` : '—';

  const uv = hourly.uv_index?.[nowIndex] ?? daily.uv_index_max?.[0];
  $('#m-uv').textContent = uv != null ? uv.toFixed(1) : '—';
  $('#m-uv-sub').textContent = uv != null ? uvBand(uv) : '';

  $('#m-cloud').textContent = `${Math.round(current.cloud_cover)}%`;

  const rain = hourly.precipitation_probability?.[nowIndex];
  $('#m-rain').textContent = rain != null ? `${rain}%` : '—';
  $('#m-rain-sub').textContent = 'this hour';
}

function uvBand(uv) {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
}

/* ---------------------------------------------------------------------
   12. Rendering — best outdoor window
   --------------------------------------------------------------------- */
function renderBestWindow() {
  const { hourly, air, nowIndex } = state;
  const best = findBestWindow(hourly, nowIndex, air);
  const time = hourly.time[best.index];
  const nextTime = hourly.time[best.index + 1];

  let label;
  if (best.index === nowIndex) {
    label = `Now – ${formatHour(nextTime)}`;
  } else {
    label = `${formatHour(time)} – ${formatHour(nextTime || time)}`;
  }

  $('#window-range').textContent = label;
  $('#window-score').textContent = `${best.score}`;
  $('#window-score-fill').style.width = `${best.score}%`;
}

/* ---------------------------------------------------------------------
   13. Rendering — 7-day forecast
   --------------------------------------------------------------------- */
function renderForecast() {
  const { daily } = state.weather;
  const grid = $('#forecast-grid');
  grid.innerHTML = '';

  daily.time.forEach((iso, i) => {
    const info = weatherInfo(daily.weather_code[i], 1);
    const cell = document.createElement('div');
    cell.className = 'fc-cell';
    cell.innerHTML = `
      <span class="fc-day">${formatWeekday(iso)}</span>
      <span class="fc-icon"><i class="fa-solid ${info.icon}"></i></span>
      <div class="fc-temps">
        <strong>${tempValue(daily.temperature_2m_max[i])}${tempUnit()}</strong>
        <span>${tempValue(daily.temperature_2m_min[i])}${tempUnit()}</span>
      </div>
      <span class="fc-rain"><i class="fa-solid fa-umbrella"></i> ${daily.precipitation_probability_max[i] ?? 0}%</span>
    `;
    grid.appendChild(cell);
  });
}

/* ---------------------------------------------------------------------
   14. Rendering — air quality
   --------------------------------------------------------------------- */
function aqiBand(aqi) {
  if (aqi == null) return { label: 'Unknown', advice: 'No air-quality data available for this location.' };
  if (aqi <= 20) return { label: 'Good',           advice: 'Air quality is good. Enjoy normal outdoor activities.' };
  if (aqi <= 40) return { label: 'Fair',           advice: 'Air quality is fair. Most people can continue normal outdoor activity.' };
  if (aqi <= 60) return { label: 'Moderate',       advice: 'Moderate air quality. Sensitive groups should consider limiting prolonged outdoor exertion.' };
  if (aqi <= 80) return { label: 'Poor',           advice: 'Poor air quality. Reduce outdoor exercise and consider a mask for extended time outside.' };
  if (aqi <= 100) return { label: 'Very poor',     advice: 'Very poor air quality. Avoid outdoor exertion; keep windows closed and use filtration if available.' };
  return { label: 'Extremely poor', advice: 'Extremely poor air quality. Stay indoors and use air filtration if possible.' };
}

function pmTag(value, guideline) {
  if (value == null) return null;
  if (value <= guideline) return { cls: 'good', label: 'Within guideline' };
  if (value <= guideline * 2.5) return { cls: 'moderate', label: 'Elevated' };
  return { cls: 'poor', label: 'High' };
}

function renderAir() {
  const air = state.air;
  if (!air || !air.current) {
    $('#aqi-value').textContent = '—';
    $('#aqi-band').textContent = 'No data';
    $('#aqi-advice').textContent = 'Air-quality data is not available for this location.';
    $('#aqi-marker').style.left = '0%';
    ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'].forEach(k => {
      const el = $(`#pol-${k}`);
      if (el) el.textContent = '—';
    });
    return;
  }

  const c = air.current;
  const aqi = c.european_aqi;
  const band = aqiBand(aqi);

  $('#aqi-value').textContent = aqi != null ? Math.round(aqi) : '—';
  $('#aqi-band').textContent = band.label;
  $('#aqi-advice').textContent = band.advice;
  $('#aqi-marker').style.left = `${Math.min(100, Math.max(0, aqi || 0))}%`;

  // Pollutants
  $('#pol-pm25').textContent = c.pm2_5 != null ? c.pm2_5.toFixed(1) : '—';
  $('#pol-pm10').textContent = c.pm10 != null ? c.pm10.toFixed(1) : '—';
  $('#pol-o3').textContent   = c.ozone != null ? c.ozone.toFixed(1) : '—';
  $('#pol-no2').textContent  = c.nitrogen_dioxide != null ? c.nitrogen_dioxide.toFixed(1) : '—';
  $('#pol-so2').textContent  = c.sulphur_dioxide != null ? c.sulphur_dioxide.toFixed(1) : '—';
  $('#pol-co').textContent   = c.carbon_monoxide != null ? c.carbon_monoxide.toFixed(1) : '—';

  applyPolTag('#pol-pm25-tag', pmTag(c.pm2_5, 15));
  applyPolTag('#pol-pm10-tag', pmTag(c.pm10, 45));
}

function applyPolTag(selector, tag) {
  const el = $(selector);
  if (!el) return;
  el.className = 'pol-tag';
  el.textContent = '';
  if (tag) {
    el.classList.add(tag.cls);
    el.textContent = tag.label;
  }
}

/* ---------------------------------------------------------------------
   15. Rendering — insights
   --------------------------------------------------------------------- */
function renderInsights() {
  const { current, hourly, daily, air, nowIndex } = state.weather;
  const rec = buildRecommendations({ current, hourly, daily, air, nowIndex });

  fillList('#health-list', rec.health);
  fillList('#agri-list', rec.agri);
  fillList('#outdoor-list', rec.outdoor);

  // Summary sentence
  const info = weatherInfo(current.weather_code, current.is_day);
  const loc = state.location;
  const aqi = air?.current?.european_aqi;
  const airText = aqi != null ? `AQI ${Math.round(aqi)} (${aqiBand(aqi).label.toLowerCase()})` : 'air quality unavailable';
  const best = findBestWindow(hourly, nowIndex, air);
  const bestTime = formatHour(hourly.time[best.index]);
  const nextTime = formatHour(hourly.time[best.index + 1]);

  $('#insight-summary').textContent =
    `In ${loc.name}, it is currently ${tempValue(current.temperature_2m)}${tempUnit()} ` +
    `with ${info.label.toLowerCase()}. ${airText}. ` +
    `Best outdoor window: ${best.index === nowIndex ? 'now' : bestTime}–${nextTime} ` +
    `(comfort ${rec.score}/100).`;
}

function fillList(selector, items) {
  const ul = $(selector);
  ul.innerHTML = '';
  if (!items || items.length === 0) {
    ul.innerHTML = '<li class="rec-empty">No specific notes.</li>';
    return;
  }
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = `level-${item.level}`;
    li.textContent = item.text;
    ul.appendChild(li);
  });
}

/* ---------------------------------------------------------------------
   16. Orchestrator — load a city
   --------------------------------------------------------------------- */
async function loadByCoords(location) {
  if (state.isFetching) return;
  state.isFetching = true;
  setStatus('loading', 'Loading live data…');
  $('#search-form .btn-search').disabled = true;

  try {
    const [weather, air] = await Promise.all([
      fetchWeather(location.latitude, location.longitude),
      fetchAir(location.latitude, location.longitude).catch(() => null)
    ]);

    state.location = location;
    state.weather = weather;
    state.air = air;
    state.nowIndex = findNowIndex(weather.hourly, weather.current.time);

    renderHero();
    renderMetrics();
    renderBestWindow();
    renderForecast();
    renderAir();
    renderInsights();

    setStatus('live', 'Live data');
  } catch (err) {
    console.error(err);
    setStatus('error', 'Failed to load data');
    showToast(err.message || 'Could not load weather data. Please try again.');
  } finally {
    state.isFetching = false;
    $('#search-form .btn-search').disabled = false;
  }
}

async function searchCity(name) {
  if (!name || !name.trim()) {
    showToast('Please enter a city name.');
    return;
  }
  if (state.isFetching) return;

  try {
    setStatus('loading', `Searching for “${name}”…`);
    const location = await geocode(name.trim());
    await loadByCoords(location);
    $('#city-input').value = location.name;
  } catch (err) {
    setStatus('error', 'City not found');
    showToast(err.message || 'City not found.');
  }
}

async function locateUser() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.');
    return;
  }
  setStatus('loading', 'Detecting location…');
  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        // Reverse lookup is not available in Open-Meteo geocoding, so we approximate
        // the label from the coordinates and use the closest known match if possible.
        const { latitude, longitude } = pos.coords;
        const location = {
          name: 'Your location',
          country: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          latitude,
          longitude
        };
        await loadByCoords(location);
      } catch (err) {
        setStatus('error', 'Location lookup failed');
        showToast('Could not load data for your location.');
      }
    },
    () => {
      setStatus('error', 'Location permission denied');
      showToast('Location access was denied.');
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

/* ---------------------------------------------------------------------
   17. Navigation
   --------------------------------------------------------------------- */
function setupNavigation() {
  const links = $$('.nav-link');
  const panels = $$('.panel');

  links.forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.panel;
      links.forEach(l => l.classList.toggle('is-active', l === link));
      panels.forEach(p => p.classList.toggle('is-active', p.id === `panel-${target}`));
      closeMobileNav();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function openMobileNav() {
  document.body.classList.add('nav-open');
  $('#scrim').hidden = false;
  requestAnimationFrame(() => $('#scrim').classList.add('show'));
  $('#nav-toggle').setAttribute('aria-expanded', 'true');
}

function closeMobileNav() {
  document.body.classList.remove('nav-open');
  $('#scrim').classList.remove('show');
  setTimeout(() => { $('#scrim').hidden = true; }, 250);
  $('#nav-toggle').setAttribute('aria-expanded', 'false');
}

/* ---------------------------------------------------------------------
   18. Unit toggle
   --------------------------------------------------------------------- */
function toggleUnit() {
  state.unit = state.unit === 'c' ? 'f' : 'c';
  $('#unit-label').textContent = state.unit === 'f' ? '°F' : '°C';
  if (state.weather) {
    renderHero();
    renderMetrics();
    renderForecast();
    renderInsights();
  }
}

/* ---------------------------------------------------------------------
   19. Boot
   --------------------------------------------------------------------- */
function bindEvents() {
  $('#search-form').addEventListener('submit', e => {
    e.preventDefault();
    searchCity($('#city-input').value);
  });

  $('#geo-btn').addEventListener('click', locateUser);
  $('#unit-btn').addEventListener('click', toggleUnit);

  $$('#quick-picks .chip').forEach(chip => {
    chip.addEventListener('click', () => searchCity(chip.dataset.city));
  });

  $('#nav-toggle').addEventListener('click', () => {
    document.body.classList.contains('nav-open') ? closeMobileNav() : openMobileNav();
  });
  $('#scrim').addEventListener('click', closeMobileNav);

  // Close mobile nav when resizing to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMobileNav();
  });
}

function init() {
  setupNavigation();
  bindEvents();
  $('#unit-label').textContent = tempUnit();
  $('#city-input').value = CONFIG.defaultCity;
  // Initial load
  searchCity(CONFIG.defaultCity);
}

document.addEventListener('DOMContentLoaded', init);
