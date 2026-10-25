/* ============================================================
   AetherSense — script.js
   Vanilla JS. No build step, no dependencies.
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   1. Constants
   ------------------------------------------------------------ */

const DEFAULT_LOCATION = {
  name: 'Malang',
  admin1: 'East Java',
  country: 'Indonesia',
  latitude: -7.9666,
  longitude: 112.6333
};

const QUICK_CITIES = [
  { name: 'Malang',  admin1: 'East Java',  country: 'Indonesia', latitude: -7.9666,  longitude: 112.6333 },
  { name: 'Jakarta', admin1: 'Jakarta',    country: 'Indonesia', latitude: -6.2088,  longitude: 106.8456 },
  { name: 'Singapore', country: 'Singapore', latitude: 1.3521,  longitude: 103.8198 },
  { name: 'Tokyo',   country: 'Japan',     latitude: 35.6762, longitude: 139.6503 },
  { name: 'London',  country: 'United Kingdom', latitude: 51.5072, longitude: -0.1276 }
];

const TEAM = [
  'Karuniadara Ellysabeth Rabay',
  'Keyshawa Pramesthi Purbolaras',
  'Khaula Rohmania Faisal',
  'Kirani Octavia',
  'Muhammad Altavino',
  'Muhammad Fathan Nur Alauddin'
];

const WMO = {
  0:  { label: 'Clear sky',            icon: 'fa-sun',                  night: 'fa-moon',          theme: 'clear' },
  1:  { label: 'Mainly clear',         icon: 'fa-sun',                  night: 'fa-moon',          theme: 'clear' },
  2:  { label: 'Partly cloudy',        icon: 'fa-cloud-sun',            night: 'fa-cloud-moon',    theme: 'cloudy' },
  3:  { label: 'Overcast',             icon: 'fa-cloud',                theme: 'cloudy' },
  45: { label: 'Fog',                  icon: 'fa-smog',                 theme: 'fog' },
  48: { label: 'Rime fog',             icon: 'fa-smog',                 theme: 'fog' },
  51: { label: 'Light drizzle',        icon: 'fa-cloud-rain',           theme: 'rain' },
  53: { label: 'Drizzle',              icon: 'fa-cloud-rain',           theme: 'rain' },
  55: { label: 'Dense drizzle',        icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  56: { label: 'Freezing drizzle',     icon: 'fa-cloud-rain',           theme: 'rain' },
  57: { label: 'Dense freezing drizzle', icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  61: { label: 'Light rain',           icon: 'fa-cloud-rain',           theme: 'rain' },
  63: { label: 'Moderate rain',        icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  65: { label: 'Heavy rain',           icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  66: { label: 'Freezing rain',        icon: 'fa-cloud-rain',           theme: 'rain' },
  67: { label: 'Heavy freezing rain',  icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  71: { label: 'Light snow',           icon: 'fa-snowflake',            theme: 'snow' },
  73: { label: 'Moderate snow',        icon: 'fa-snowflake',            theme: 'snow' },
  75: { label: 'Heavy snow',           icon: 'fa-snowflake',            theme: 'snow' },
  77: { label: 'Snow grains',          icon: 'fa-snowflake',            theme: 'snow' },
  80: { label: 'Rain showers',         icon: 'fa-cloud-sun-rain',       theme: 'rain' },
  81: { label: 'Moderate showers',     icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  82: { label: 'Violent showers',      icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  85: { label: 'Snow showers',         icon: 'fa-snowflake',            theme: 'snow' },
  86: { label: 'Heavy snow showers',   icon: 'fa-snowflake',            theme: 'snow' },
  95: { label: 'Thunderstorm',         icon: 'fa-cloud-bolt',           theme: 'storm' },
  96: { label: 'Thunderstorm, hail',   icon: 'fa-cloud-bolt',           theme: 'storm' },
  99: { label: 'Severe thunderstorm',  icon: 'fa-cloud-bolt',           theme: 'storm' }
};

const AQI_BANDS = [
  { max: 20,  label: 'Good',           color: '#4ade80' },
  { max: 40,  label: 'Fair',           color: '#a3e635' },
  { max: 60,  label: 'Moderate',       color: '#fbbf24' },
  { max: 80,  label: 'Poor',           color: '#fb923c' },
  { max: 100, label: 'Very poor',      color: '#f87171' },
  { max: Infinity, label: 'Extremely poor', color: '#b91c1c' }
];

const CROPS = [
  {
    name: 'Rice (Padi)', icon: 'fa-wheat-awn',
    temp: [22, 32], humidity: [70, 90],
    note: 'Lowland staple; needs warm nights and steady moisture.'
  },
  {
    name: 'Highland Vegetables', icon: 'fa-carrot',
    temp: [15, 22], humidity: [60, 80],
    note: 'Cabbage, carrot, potato — Batu / Ngantang highlands.'
  },
  {
    name: 'Apples (Apel)', icon: 'fa-apple-whole',
    temp: [16, 24], humidity: [60, 80],
    note: 'Requires cool nights and adequate chilling hours.'
  },
  {
    name: 'Coffee (Kopi)', icon: 'fa-mug-hot',
    temp: [18, 24], humidity: [60, 80],
    note: 'Arabica on East Java slopes; shade and stable moisture.'
  }
];

const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

/* ------------------------------------------------------------
   2. Utilities
   ------------------------------------------------------------ */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const fmt = (n, d = 0) =>
  Number.isFinite(Number(n)) ? Number(n).toFixed(d) : '—';

const compass = deg => COMPASS[Math.round(deg / 22.5) % 16] || '—';

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
  return res.json();
}

/* ------------------------------------------------------------
   3. State
   ------------------------------------------------------------ */

const state = {
  location: null,
  weather: null,
  air: null,
  timezone: 'auto',
  loading: false,
  lastUpdated: null
};

/* ------------------------------------------------------------
   4. API layer
   ------------------------------------------------------------ */

function geocode(query, count = 6) {
  const p = new URLSearchParams({
    name: query,
    count: String(count),
    language: 'en',
    format: 'json'
  });
  return fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?${p}`)
    .then(d => d.results || []);
}

function fetchWeather(loc) {
  const p = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
      'is_day', 'precipitation', 'weather_code', 'cloud_cover',
      'pressure_msl', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
    ].join(','),
    hourly: ['visibility', 'precipitation_probability', 'temperature_2m', 'weather_code'].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'precipitation_probability_max', 'sunrise', 'sunset'
    ].join(','),
    timezone: 'auto',
    forecast_days: '4'
  });
  return fetchJSON(`https://api.open-meteo.com/v1/forecast?${p}`);
}

function fetchAir(loc) {
  const p = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: [
      'european_aqi', 'pm10', 'pm2_5',
      'carbon_monoxide', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone'
    ].join(','),
    timezone: 'auto'
  });
  return fetchJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?${p}`);
}

/* ------------------------------------------------------------
   5. Derived context
   ------------------------------------------------------------ */

function hourlyIndexNow(w) {
  const key = w.current.time.slice(0, 13); // "YYYY-MM-DDTHH"
  const idx = w.hourly.time.findIndex(t => t.slice(0, 13) === key);
  return idx >= 0 ? idx : 0;
}

function themeForCode(code) {
  return (WMO[code] || WMO[0]).theme || 'default';
}

function buildContext() {
  const w = state.weather;
  const a = state.air;
  const c = w.current;
  const i = hourlyIndexNow(w);

  const visibilityM = w.hourly.visibility?.[i];

  return {
    temp: c.temperature_2m,
    feels: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    wind: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    gusts: c.wind_gusts_10m,
    precip: c.precipitation,
    code: c.weather_code,
    cloud: c.cloud_cover,
    pressure: c.pressure_msl,
    isDay: c.is_day === 1,
    visibility: Number.isFinite(visibilityM) ? visibilityM / 1000 : 24,
    precipProb: w.hourly.precipitation_probability?.[i] ?? 0,
    aqi: a?.current?.european_aqi ?? 0,
    pm25: a?.current?.pm2_5 ?? 0,
    pm10: a?.current?.pm10 ?? 0,
    no2: a?.current?.nitrogen_dioxide ?? 0,
    o3: a?.current?.ozone ?? 0,
    so2: a?.current?.sulphur_dioxide ?? 0,
    co: a?.current?.carbon_monoxide ?? 0,
    theme: themeForCode(c.weather_code)
  };
}

function aqiBand(aqi) {
  return AQI_BANDS.find(b => aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
}

/* ------------------------------------------------------------
   6. Recommendation engine
   ------------------------------------------------------------ */

function generateRecommendations(ctx) {
  const out = { health: [], agriculture: [], outdoor: [] };
  const push = (cat, sev, icon, title, text) =>
    out[cat].push({ sev, icon, title, text });

  const { aqi, pm25, temp, feels, humidity, visibility, wind, gusts, precip, precipProb } = ctx;

  /* ---------- HEALTH ---------- */
  if (aqi <= 20) {
    push('health', 'good', 'fa-lungs', 'Excellent air quality',
      'Air is clean — outdoor breathing is safe for everyone, including sensitive groups.');
  } else if (aqi <= 40) {
    push('health', 'info', 'fa-lungs', 'Fair air quality',
      'Acceptable for most people. Highly sensitive individuals may notice mild irritation.');
  } else if (aqi <= 60) {
    push('health', 'warn', 'fa-mask-face', 'Moderate air quality',
      'Sensitive groups (children, elderly, asthma) should limit prolonged outdoor exertion.');
  } else if (aqi <= 80) {
    push('health', 'warn', 'fa-mask-face', 'Poor air quality',
      'Reduce outdoor activity. Keep windows closed and avoid heavy exertion outside.');
  } else {
    push('health', 'danger', 'fa-triangle-exclamation', 'Very poor air quality',
      'Stay indoors where possible. Use a purifier or an N95 mask if you must go outside.');
  }

  if (pm25 > 35) {
    push('health', 'danger', 'fa-smog', 'PM2.5 above safe levels',
      `Fine particulate matter is ${fmt(pm25, 1)} µg/m³ — well above the WHO 24-hour guideline of 15 µg/m³. Avoid morning outdoor exercise.`);
  } else if (pm25 > 15) {
    push('health', 'warn', 'fa-smog', 'PM2.5 slightly elevated',
      `At ${fmt(pm25, 1)} µg/m³, PM2.5 exceeds the WHO 24-hour guideline (15 µg/m³). Sensitive people should take it easy.`);
  }

  if (feels >= 35) {
    push('health', 'danger', 'fa-temperature-high', 'Heat stress risk',
      `Feels like ${fmt(feels)}°C. Drink water frequently, avoid the midday sun, and watch for dizziness or cramps.`);
  } else if (feels >= 32) {
    push('health', 'warn', 'fa-temperature-high', 'Hot conditions',
      `Feels like ${fmt(feels)}°C — stay hydrated and take shade breaks.`);
  } else if (feels <= 8) {
    push('health', 'warn', 'fa-temperature-low', 'Cold stress',
      `Feels like ${fmt(feels)}°C. Layer clothing and protect extremities.`);
  }

  if (humidity >= 85 && temp >= 24) {
    push('health', 'warn', 'fa-droplet', 'High humidity discomfort',
      `${fmt(humidity)}% humidity slows sweat evaporation, raising heat stress and indoor mould risk. Ventilate when possible.`);
  }

  if (visibility < 1) {
    push('health', 'warn', 'fa-eye-low-vision', 'Low visibility',
      `Visibility is only ${fmt(visibility, 1)} km — drive carefully and use fog lights.`);
  }

  /* ---------- OUTDOOR ---------- */
  const storm = [95, 96, 99].includes(ctx.code);

  if (storm) {
    push('outdoor', 'danger', 'fa-cloud-bolt', 'Avoid open outdoor areas',
      'Thunderstorms detected. Stay clear of tall trees, open fields, and water.');
  }
  if (gusts >= 60 || wind >= 40) {
    push('outdoor', 'warn', 'fa-wind', 'Strong wind',
      `Gusts up to ${fmt(gusts)} km/h. Avoid cycling and secure loose outdoor equipment.`);
  }
  if (precipProb >= 70) {
    push('outdoor', 'warn', 'fa-umbrella', 'Rain highly likely',
      `${fmt(precipProb)}% chance of precipitation this hour — carry rain protection and plan indoor alternatives.`);
  }
  if (temp >= 32 && !storm) {
    push('outdoor', 'warn', 'fa-person-running', 'Shift exercise to cooler hours',
      'Exercise before 9 AM or after 5 PM to avoid peak heat and UV.');
  }
  if (!storm && aqi <= 40 && temp >= 16 && temp <= 28 && wind < 20 && precipProb < 30) {
    push('outdoor', 'good', 'fa-person-hiking', 'Excellent outdoor window',
      `Comfortable ${fmt(temp)}°C with clean air — ideal for running, cycling, or a picnic.`);
  }
  if (!ctx.isDay && temp >= 18 && temp <= 27 && aqi <= 40) {
    push('outdoor', 'good', 'fa-moon', 'Pleasant evening',
      `Mild ${fmt(temp)}°C with fair air — a good time for an evening walk.`);
  }

  /* ---------- AGRICULTURE ---------- */
  const fungal = humidity >= 85 && wind < 12;

  if (fungal) {
    push('agriculture', 'danger', 'fa-bacteria', 'High fungal disease risk',
      `${fmt(humidity)}% humidity with low wind (${fmt(wind)} km/h) favours rice blast and coffee leaf rust. Scout fields and consider preventive fungicide.`);
  } else if (humidity >= 80 && temp >= 22 && temp <= 30) {
    push('agriculture', 'warn', 'fa-bacteria', 'Elevated fungal pressure',
      `Humidity at ${fmt(humidity)}% — monitor leaf wetness and avoid overhead irrigation.`);
  }

  if (precipProb >= 70) {
    push('agriculture', 'warn', 'fa-spray-can', 'Delay spraying',
      `${fmt(precipProb)}% rain probability — pesticide and foliar fertiliser will wash off. Postpone application.`);
  }
  if (wind >= 25) {
    push('agriculture', 'warn', 'fa-wind', 'Spray drift risk',
      `Wind at ${fmt(wind)} km/h exceeds the safe threshold for spraying.`);
  }
  if (precip < 1 && humidity < 60 && temp >= 28) {
    push('agriculture', 'warn', 'fa-droplet', 'Irrigation recommended',
      'Dry air and high temperature are raising evapotranspiration — irrigate early morning or late afternoon.');
  }
  if (precip >= 20) {
    push('agriculture', 'danger', 'fa-water', 'Waterlogging risk',
      'Heavy rainfall may waterlog fields. Check drainage channels and delay harvest.');
  }
  if (!fungal && precipProb < 50 && temp >= 20 && temp <= 30 && humidity >= 60 && humidity <= 85) {
    push('agriculture', 'good', 'fa-seedling', 'Favourable field conditions',
      'Balanced temperature and humidity — a good window for planting, transplanting, and field work.');
  }

  /* Fallbacks so no column is ever empty */
  const fallback = {
    health:      { sev: 'info', icon: 'fa-circle-check', title: 'No health alerts', text: 'Current conditions pose no specific health risk.' },
    agriculture: { sev: 'info', icon: 'fa-circle-check', title: 'No agricultural alerts', text: 'Conditions are within normal operating ranges.' },
    outdoor:     { sev: 'info', icon: 'fa-circle-check', title: 'No outdoor alerts', text: 'No weather hazards detected for outdoor activity.' }
  };
  for (const key of Object.keys(out)) {
    if (!out[key].length) out[key].push(fallback[key]);
  }

  return out;
}

/* ------------------------------------------------------------
   7. Crop suitability
   ------------------------------------------------------------ */

function bandScore(value, [min, max], tolerance) {
  if (value >= min && value <= max) return 1;
  const d = value < min ? min - value : value - max;
  return Math.max(0, 1 - d / tolerance);
}

function scoreCrop(crop, ctx) {
  const t = bandScore(ctx.temp, crop.temp, 8);
  const h = bandScore(ctx.humidity, crop.humidity, 22);
  let score = (t * 0.6 + h * 0.4) * 100;

  if (ctx.precipProb >= 80) score -= 8;
  if (ctx.precip >= 20) score -= 10;
  if (ctx.humidity < 50) score -= 5;

  score = clamp(Math.round(score), 0, 100);

  let verdict, color;
  if (score >= 80)      { verdict = 'Highly suitable'; color = 'var(--good)'; }
  else if (score >= 60) { verdict = 'Suitable';        color = 'var(--info)'; }
  else if (score >= 40) { verdict = 'Marginal';        color = 'var(--warn)'; }
  else                  { verdict = 'Not recommended'; color = 'var(--danger)'; }

  return { score, verdict, color };
}

/* ------------------------------------------------------------
   8. Rendering
   ------------------------------------------------------------ */

function applyTheme(theme) {
  document.body.dataset.theme = theme || 'default';
}

function renderHeader() {
  const loc = state.location;
  if (!loc) return;

  $('#locationName').textContent = loc.name || 'Unknown';

  const parts = [loc.admin1, loc.country].filter(p => p && p !== loc.name);
  $('#locationMeta').textContent = parts.length ? parts.join(' · ') : 'Location';

  updateClock();
  $('#dataStatus').textContent = state.lastUpdated
    ? `Updated ${state.lastUpdated}`
    : 'Live data';
}

function updateClock() {
  if (!state.weather) return;
  const tz = state.weather.timezone || 'auto';
  try {
    const text = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
    $('#localTime').textContent = text;
  } catch {
    $('#localTime').textContent = new Date().toLocaleString();
  }
}

function renderHero(ctx) {
  const wmo = WMO[ctx.code] || WMO[0];
  const icon = (!ctx.isDay && wmo.night) ? wmo.night : wmo.icon;

  const iconEl = $('#heroIcon');
  iconEl.className = `fa-solid ${icon}`;

  $('#heroTemp').textContent = fmt(ctx.temp);
  $('#heroCond').textContent = wmo.label;
  $('#heroFeels').textContent = `${fmt(ctx.feels)}°C`;

  const d = state.weather.daily;
  $('#heroHi').textContent = `${fmt(d.temperature_2m_max[0])}°`;
  $('#heroLo').textContent = `${fmt(d.temperature_2m_min[0])}°`;
  $('#heroRain').textContent = `${fmt(ctx.precipProb)}%`;

  state.lastUpdated = state.weather.current.time.slice(11, 16);
}

function renderStats(ctx) {
  $('#statHumidity').textContent = `${fmt(ctx.humidity)}%`;
  $('#statWind').textContent = `${fmt(ctx.wind)} km/h`;
  $('#statWindDir').textContent = `From ${compass(ctx.windDir)} (${fmt(ctx.windDir)}°)`;
  $('#statPressure').textContent = `${fmt(ctx.pressure)} hPa`;
  $('#statVisibility').textContent = `${fmt(ctx.visibility, 1)} km`;

  $('#statCloud').textContent = `${fmt(ctx.cloud)}%`;
  $('#statGusts').textContent = `${fmt(ctx.gusts)} km/h`;
  $('#statPrecip').textContent = `${fmt(ctx.precip, 1)} mm`;
  $('#statCondition').textContent = (WMO[ctx.code] || WMO[0]).label;
}

function renderAqi(ctx) {
  const band = aqiBand(ctx.aqi);
  const pct = clamp((ctx.aqi / 120) * 100, 0, 100);

  [['#aqiGauge', '#aqiValue', '#aqiBand'],
   ['#aqiGauge2', '#aqiValue2', '#aqiBand2']].forEach(([g, v, b]) => {
    const gauge = $(g);
    if (!gauge) return;
    gauge.style.setProperty('--p', String(pct));
    gauge.style.setProperty('--g', band.color);
    $(v).textContent = fmt(ctx.aqi);
    const bandEl = $(b);
    bandEl.textContent = band.label;
    bandEl.style.color = band.color;
  });

  const note = $('#aqiNote2');
  if (note) {
    note.textContent = ctx.aqi <= 40
      ? 'Safe for general outdoor activity.'
      : ctx.aqi <= 60
        ? 'Sensitive groups should take care.'
        : 'Reduce prolonged outdoor exertion.';
  }

  $('#pm25').textContent = fmt(ctx.pm25, 1);
  $('#pm10').textContent = fmt(ctx.pm10, 1);
  $('#no2').textContent = fmt(ctx.no2, 1);
  $('#o3').textContent = fmt(ctx.o3, 1);
  $('#so2').textContent = fmt(ctx.so2, 1);
  $('#co').textContent = fmt(ctx.co, 0);

  const pm25Bar = $('#pm25Bar');
  const pm10Bar = $('#pm10Bar');
  if (pm25Bar) pm25Bar.style.width = `${clamp((ctx.pm25 / 75) * 100, 2, 100)}%`;
  if (pm10Bar) pm10Bar.style.width = `${clamp((ctx.pm10 / 150) * 100, 2, 100)}%`;

  /* Advice list */
  const advice = $('#aqiAdvice');
  advice.innerHTML = '';
  const items = [];

  if (ctx.aqi <= 20) items.push(['good', 'fa-lungs', 'Ideal conditions', 'Air quality is excellent — no precautions needed.']);
  else if (ctx.aqi <= 40) items.push(['good', 'fa-lungs', 'Generally safe', 'Fine for most activities; extremely sensitive people may notice minor effects.']);
  else if (ctx.aqi <= 60) items.push(['warn', 'fa-mask-face', 'Sensitive groups affected', 'Children, the elderly, and people with asthma should shorten outdoor exposure.']);
  else if (ctx.aqi <= 80) items.push(['warn', 'fa-mask-face', 'Unhealthy for sensitive groups', 'Limit outdoor exertion; keep windows closed during peak traffic hours.']);
  else items.push(['danger', 'fa-triangle-exclamation', 'Health alert', 'Avoid outdoor exertion. Use filtration indoors and wear an N95 outdoors if necessary.']);

  if (ctx.pm25 > 15) items.push(['warn', 'fa-smog', 'PM2.5 above WHO guideline', `Current PM2.5 is ${fmt(ctx.pm25, 1)} µg/m³ versus the WHO 24-hour guideline of 15 µg/m³.`]);
  if (ctx.pm10 > 45) items.push(['warn', 'fa-smog', 'Coarse dust elevated', `PM10 at ${fmt(ctx.pm10, 1)} µg/m³ — dust suppression and indoor filtration help.`]);

  items.forEach(([sev, icon, title, text]) => {
    advice.insertAdjacentHTML('beforeend', `
      <div class="rec rec--${sev}">
        <div class="rec-icon"><i class="fa-solid ${icon}"></i></div>
        <div><h4>${title}</h4><p>${text}</p></div>
      </div>`);
  });
}

function renderHourly() {
  const w = state.weather;
  const start = hourlyIndexNow(w);
  const strip = $('#hourlyStrip');
  strip.innerHTML = '';

  const end = Math.min(start + 12, w.hourly.time.length);
  for (let i = start; i < end; i++) {
    const time = w.hourly.time[i];
    const hour = time.slice(11, 16);
    const code = w.hourly.weather_code[i];
    const wmo = WMO[code] || WMO[0];
    const rain = w.hourly.precipitation_probability?.[i] ?? 0;

    const cell = document.createElement('div');
    cell.className = 'hour-cell' + (i === start ? ' hour-cell--now' : '');
    cell.innerHTML = `
      <span class="hour-time">${i === start ? 'Now' : hour}</span>
      <i class="fa-solid ${wmo.icon} hour-icon"></i>
      <span class="hour-temp">${fmt(w.hourly.temperature_2m[i])}°</span>
      <span class="hour-rain">${rain >= 20 ? `${fmt(rain)}%` : '&nbsp;'}</span>`;
    strip.appendChild(cell);
  }
}

function renderDaily() {
  const d = state.weather.daily;
  const list = $('#dailyList');
  list.innerHTML = '';

  for (let i = 0; i < d.time.length; i++) {
    const date = new Date(`${d.time[i]}T12:00:00`);
    const label = i === 0
      ? 'Today'
      : date.toLocaleDateString('en-GB', { weekday: 'short' });

    const wmo = WMO[d.weather_code[i]] || WMO[0];

    const row = document.createElement('div');
    row.className = 'day-row';
    row.innerHTML = `
      <span class="day-name">${label}</span>
      <i class="fa-solid ${wmo.icon} day-icon"></i>
      <span class="day-cond">${wmo.label}</span>
      <span class="day-temps">${fmt(d.temperature_2m_max[i])}° <span>/ ${fmt(d.temperature_2m_min[i])}°</span></span>`;
    list.appendChild(row);
  }
}

function recMarkup(rec) {
  return `
    <div class="rec rec--${rec.sev}">
      <div class="rec-icon"><i class="fa-solid ${rec.icon}"></i></div>
      <div><h4>${rec.title}</h4><p>${rec.text}</p></div>
    </div>`;
}

function renderRecommendations(ctx) {
  const recs = generateRecommendations(ctx);

  const paint = (el, arr) => {
    el.innerHTML = arr.slice(0, 6).map(recMarkup).join('');
  };

  paint($('#recHealth'), recs.health);
  paint($('#recAgriculture'), recs.agriculture);
  paint($('#recOutdoor'), recs.outdoor);
  paint($('#agriActions'), recs.agriculture);

  /* Dashboard priorities: strongest one from each category */
  const rank = { danger: 3, warn: 2, info: 1, good: 0 };
  const pickTop = arr =>
    [...arr].sort((a, b) => rank[b.sev] - rank[a.sev])[0];

  const tops = [pickTop(recs.health), pickTop(recs.agriculture), pickTop(recs.outdoor)];
  $('#priorityList').innerHTML = tops.map(rec => `
    <div class="priority-item">
      <i class="fa-solid ${rec.icon}" style="color: var(--${rec.sev === 'danger' ? 'danger' : rec.sev === 'warn' ? 'warn' : rec.sev === 'good' ? 'good' : 'info'})"></i>
      <p><strong>${rec.title}.</strong> ${rec.text}</p>
    </div>`).join('');
}

function renderCrops(ctx) {
  const grid = $('#cropGrid');
  grid.innerHTML = '';

  CROPS.forEach(crop => {
    const { score, verdict, color } = scoreCrop(crop, ctx);

    const el = document.createElement('article');
    el.className = 'card crop';
    el.innerHTML = `
      <div class="crop-top">
        <div class="crop-icon"><i class="fa-solid ${crop.icon}"></i></div>
        <div>
          <p class="crop-name">${crop.name}</p>
          <p class="crop-note">${crop.note}</p>
        </div>
      </div>
      <div class="crop-score-row">
        <span class="crop-score">${score}<span style="font-size:.8rem;color:var(--text-faint)">/100</span></span>
        <span class="crop-verdict" style="color:${color}">${verdict}</span>
      </div>
      <div class="crop-bar"><span style="background:${color}"></span></div>`;
    grid.appendChild(el);

    requestAnimationFrame(() => {
      const bar = el.querySelector('.crop-bar span');
      if (bar) bar.style.width = `${score}%`;
    });
  });
}

function renderTeam() {
  const initials = name =>
    name.split(/\s+/).map(p => p[0]).join('').slice(0, 3).toUpperCase();

  $('#teamGrid').innerHTML = TEAM.map(name => `
    <article class="card member">
      <div class="member-avatar">${initials(name)}</div>
      <div>
        <p class="member-name">${name}</p>
        <p class="member-role">Project contributor</p>
      </div>
    </article>`).join('');
}

function renderQuickCities() {
  $('#quickCities').innerHTML = QUICK_CITIES.map((c, i) =>
    `<button class="chip" data-city="${i}">${c.name}</button>`
  ).join('');
}

function renderAll() {
  const ctx = buildContext();
  applyTheme(ctx.theme);
  renderHeader();
  renderHero(ctx);
  renderStats(ctx);
  renderAqi(ctx);
  renderHourly();
  renderDaily();
  renderRecommendations(ctx);
  renderCrops(ctx);
}

/* ------------------------------------------------------------
   9. Loading / errors
   ------------------------------------------------------------ */

function setLoading(on) {
  state.loading = on;
  const bar = $('#progress');
  if (on) {
    bar.classList.add('active');
    bar.style.width = '30%';
    setTimeout(() => { if (state.loading) bar.style.width = '72%'; }, 400);
  } else {
    bar.style.width = '100%';
    setTimeout(() => {
      bar.classList.remove('active');
      bar.style.width = '0';
    }, 320);
  }
}

let toastTimer = null;
function showToast(message) {
  const el = $('#toast');
  el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i>${message}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 6000);
}

/* ------------------------------------------------------------
   10. Loader
   ------------------------------------------------------------ */

async function loadLocation(loc) {
  setLoading(true);
  try {
    const [weather, air] = await Promise.all([
      fetchWeather(loc),
      fetchAir(loc).catch(() => null)   // air quality failing shouldn't block weather
    ]);

    state.location = loc;
    state.weather = weather;
    state.air = air;
    state.timezone = weather.timezone || 'auto';

    renderAll();
  } catch (err) {
    showToast(err.message || 'Unable to load environmental data. Please try again.');
  } finally {
    setLoading(false);
  }
}

/* ------------------------------------------------------------
   11. Search
   ------------------------------------------------------------ */

let searchTimer = null;
let searchSeq = 0;

function hideSuggestions() {
  const box = $('#suggestions');
  box.hidden = true;
  box.innerHTML = '';
}

function renderSuggestions(results) {
  const box = $('#suggestions');

  if (!results.length) {
    box.innerHTML = `<li><span class="sug-name">No matches</span><span class="sug-meta">Try another spelling</span></li>`;
    box.hidden = false;
    return;
  }

  box.innerHTML = results.map((r, i) => {
    const meta = [r.admin1, r.country].filter(Boolean).join(', ');
    return `<li role="option" data-idx="${i}">
      <span class="sug-name">${r.name}</span>
      <span class="sug-meta">${meta}</span>
    </li>`;
  }).join('');

  box.hidden = false;

  $$('#suggestions li[data-idx]').forEach(li => {
    li.addEventListener('click', () => {
      const r = results[Number(li.dataset.idx)];
      hideSuggestions();
      $('#searchInput').value = '';
      loadLocation(r);
    });
  });

  box._results = results;
}

async function runSuggest(q) {
  const seq = ++searchSeq;
  try {
    const results = await geocode(q, 6);
    if (seq !== searchSeq) return;
    renderSuggestions(results);
  } catch {
    if (seq === searchSeq) hideSuggestions();
  }
}

async function submitSearch() {
  const q = $('#searchInput').value.trim();
  if (q.length < 2) return;

  const box = $('#suggestions');
  if (!box.hidden && box._results?.length) {
    const first = box._results[0];
    hideSuggestions();
    $('#searchInput').value = '';
    loadLocation(first);
    return;
  }

  setLoading(true);
  try {
    const results = await geocode(q, 1);
    if (!results.length) throw new Error(`No location found for “${q}”.`);
    $('#searchInput').value = '';
    hideSuggestions();
    await loadLocation(results[0]);
  } catch (err) {
    showToast(err.message);
  } finally {
    setLoading(false);
  }
}

/* ------------------------------------------------------------
   12. Navigation
   ------------------------------------------------------------ */

function showSection(id) {
  const target = document.getElementById(id);
  if (!target) return;

  $$('.section').forEach(s => s.classList.toggle('active', s === target));
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.target === id));

  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', `#${id}`);
  closeSidebar();
}

function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#scrim').hidden = false;
  $('#menuToggle').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#scrim').hidden = true;
  $('#menuToggle').setAttribute('aria-expanded', 'false');
}

/* ------------------------------------------------------------
   13. Wiring
   ------------------------------------------------------------ */

function wireEvents() {
  /* Nav */
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      showSection(item.dataset.target);
    });
  });

  /* Jump links */
  document.addEventListener('click', e => {
    const jump = e.target.closest('[data-jump]');
    if (jump) showSection(jump.dataset.jump);
  });

  /* Mobile menu */
  $('#menuToggle').addEventListener('click', () => {
    $('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  });
  $('#scrim').addEventListener('click', closeSidebar);

  /* Search */
  const input = $('#searchInput');
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 2) { hideSuggestions(); return; }
    searchTimer = setTimeout(() => runSuggest(q), 350);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitSearch(); }
    if (e.key === 'Escape') hideSuggestions();
  });

  $('#searchBtn').addEventListener('click', submitSearch);

  document.addEventListener('click', e => {
    if (!e.target.closest('.search')) hideSuggestions();
  });

  /* Quick cities */
  $('#quickCities').addEventListener('click', e => {
    const chip = e.target.closest('[data-city]');
    if (!chip) return;
    loadLocation(QUICK_CITIES[Number(chip.dataset.city)]);
  });
}

/* ------------------------------------------------------------
   14. Init
   ------------------------------------------------------------ */

function init() {
  renderQuickCities();
  renderTeam();
  wireEvents();

  const hash = location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) {
    showSection(hash);
  }

  setInterval(updateClock, 30_000);

  loadLocation(DEFAULT_LOCATION);
}

document.addEventListener('DOMContentLoaded', init);
