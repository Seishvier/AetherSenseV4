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
  { name: 'Malang',    admin1: 'East Java', country: 'Indonesia',    latitude: -7.9666, longitude: 112.6333 },
  { name: 'Jakarta',   admin1: 'Jakarta',   country: 'Indonesia',    latitude: -6.2088, longitude: 106.8456 },
  { name: 'Singapore', country: 'Singapore',                        latitude: 1.3521,  longitude: 103.8198 },
  { name: 'Tokyo',     country: 'Japan',                            latitude: 35.6762, longitude: 139.6503 },
  { name: 'London',    country: 'United Kingdom',                   latitude: 51.5072, longitude: -0.1276 }
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
  0:  { label: 'Clear sky',              icon: 'fa-sun',                  night: 'fa-moon',         theme: 'clear' },
  1:  { label: 'Mainly clear',           icon: 'fa-sun',                  night: 'fa-moon',         theme: 'clear' },
  2:  { label: 'Partly cloudy',          icon: 'fa-cloud-sun',            night: 'fa-cloud-moon',   theme: 'cloudy' },
  3:  { label: 'Overcast',               icon: 'fa-cloud',                theme: 'cloudy' },
  45: { label: 'Fog',                    icon: 'fa-smog',                 theme: 'fog' },
  48: { label: 'Rime fog',               icon: 'fa-smog',                 theme: 'fog' },
  51: { label: 'Light drizzle',          icon: 'fa-cloud-rain',           theme: 'rain' },
  53: { label: 'Drizzle',                icon: 'fa-cloud-rain',           theme: 'rain' },
  55: { label: 'Dense drizzle',          icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  56: { label: 'Freezing drizzle',       icon: 'fa-cloud-rain',           theme: 'rain' },
  57: { label: 'Dense freezing drizzle', icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  61: { label: 'Light rain',             icon: 'fa-cloud-rain',           theme: 'rain' },
  63: { label: 'Moderate rain',          icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  65: { label: 'Heavy rain',             icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  66: { label: 'Freezing rain',          icon: 'fa-cloud-rain',           theme: 'rain' },
  67: { label: 'Heavy freezing rain',    icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  71: { label: 'Light snow',             icon: 'fa-snowflake',            theme: 'snow' },
  73: { label: 'Moderate snow',          icon: 'fa-snowflake',            theme: 'snow' },
  75: { label: 'Heavy snow',             icon: 'fa-snowflake',            theme: 'snow' },
  77: { label: 'Snow grains',            icon: 'fa-snowflake',            theme: 'snow' },
  80: { label: 'Rain showers',           icon: 'fa-cloud-sun-rain',       theme: 'rain' },
  81: { label: 'Moderate showers',       icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  82: { label: 'Violent showers',        icon: 'fa-cloud-showers-heavy',  theme: 'rain' },
  85: { label: 'Snow showers',           icon: 'fa-snowflake',            theme: 'snow' },
  86: { label: 'Heavy snow showers',     icon: 'fa-snowflake',            theme: 'snow' },
  95: { label: 'Thunderstorm',           icon: 'fa-cloud-bolt',           theme: 'storm' },
  96: { label: 'Thunderstorm, hail',     icon: 'fa-cloud-bolt',           theme: 'storm' },
  99: { label: 'Severe thunderstorm',    icon: 'fa-cloud-bolt',           theme: 'storm' }
};

const AQI_BANDS = [
  { max: 20,       label: 'Good',             color: '#4ade80' },
  { max: 40,       label: 'Fair',             color: '#a3e635' },
  { max: 60,       label: 'Moderate',         color: '#fbbf24' },
  { max: 80,       label: 'Poor',             color: '#fb923c' },
  { max: 100,      label: 'Very poor',        color: '#f87171' },
  { max: Infinity, label: 'Extremely poor',   color: '#b91c1c' }
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

const pct = v => clamp(Number(v) || 0, 0, 100);

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
    name: query, count: String(count), language: 'en', format: 'json'
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
      'dew_point_2m', 'is_day', 'precipitation', 'weather_code', 'cloud_cover',
      'pressure_msl', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
    ].join(','),
    hourly: [
      'visibility', 'precipitation_probability', 'temperature_2m',
      'weather_code', 'uv_index'
    ].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'precipitation_probability_max', 'uv_index_max', 'sunrise', 'sunset'
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
  const key = w.current.time.slice(0, 13);
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
    dewPoint: c.dew_point_2m,
    wind: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    gusts: c.wind_gusts_10m,
    precip: c.precipitation,
    code: c.weather_code,
    cloud: c.cloud_cover,
    pressure: c.pressure_msl,
    isDay: c.is_day === 1,
    hourLocal: Number(c.time.slice(11, 13)),
    visibility: Number.isFinite(visibilityM) ? visibilityM / 1000 : 24,
    precipProb: w.hourly.precipitation_probability?.[i] ?? 0,
    uv: w.hourly.uv_index?.[i] ?? w.daily.uv_index_max?.[0] ?? 0,
    dailyMin: w.daily.temperature_2m_min?.[0] ?? c.temperature_2m,
    dailyMax: w.daily.temperature_2m_max?.[0] ?? c.temperature_2m,
    dailyRainProb: w.daily.precipitation_probability_max?.[0] ?? 0,
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
   6. GLOBAL AGRICULTURAL ENGINE
   Weather-driven indicators that apply in any climate.
   ------------------------------------------------------------ */

/**
 * Each indicator: { id, name, note, icon, type, score, tag, color, action }
 *   type = 'risk'  → higher score is worse
 *   type = 'suit'  → higher score is better
 */
function computeAgriIndicators(ctx) {
  const {
    temp, humidity, wind, gusts, precip, precipProb, cloud,
    visibility, code, dailyMin, dailyMax, dailyRainProb
  } = ctx;

  const storm = [95, 96, 99].includes(code);
  const out = [];

  /* --- 1. Fungal disease pressure (risk) --- */
  const fH = clamp((humidity - 60) / 35, 0, 1);          // 60% → 0, 95% → 1
  const fW = clamp((18 - wind) / 18, 0, 1);              // low wind keeps leaves wet
  const fT = 1 - Math.min(Math.abs(temp - 22) / 13, 1);  // 15–28 °C optimal
  const fC = pct(cloud) / 100;
  const fP = pct(precipProb) / 100;
  const fungal = clamp((0.42 * fH + 0.22 * fW + 0.18 * fT + 0.1 * fC + 0.08 * fP) * 100, 0, 100);
  out.push({
    id: 'fungal',
    name: 'Fungal disease pressure',
    note: 'Humidity, low wind and moderate temperatures keep leaf surfaces wet — the prime driver of fungal outbreaks.',
    icon: 'fa-bacteria',
    type: 'risk',
    score: fungal,
    action: fungal >= 60
      ? `High fungal risk (${fmt(humidity)}% RH, ${fmt(wind)} km/h wind). Scout leaves now and consider preventive fungicide.`
      : fungal >= 40
        ? `Elevated fungal pressure. Monitor leaf wetness and avoid overhead irrigation.`
        : `Fungal pressure is low at current humidity and wind.`
  });

  /* --- 2. Irrigation demand (risk = need) --- */
  const iT = clamp((temp - 16) / 18, 0, 1);
  const iD = clamp((72 - humidity) / 48, 0, 1);
  const iW = clamp(wind / 30, 0, 1) * 0.5;
  const iRain = clamp(precipProb / 100, 0, 1);
  const iRecent = clamp(precip / 5, 0, 1);
  const irrigation = clamp((0.45 * iT + 0.35 * iD + 0.1 * iW - 0.55 * iRain - 0.2 * iRecent) * 100, 0, 100);
  out.push({
    id: 'irrigation',
    name: 'Irrigation demand',
    note: 'Combines temperature, humidity, wind-driven evapotranspiration and incoming rain.',
    icon: 'fa-droplet',
    type: 'risk',
    score: irrigation,
    action: irrigation >= 60
      ? `High water demand (${fmt(temp)}°C, ${fmt(humidity)}% RH). Irrigate early morning or late afternoon to limit evaporation.`
      : irrigation >= 40
        ? `Moderate demand — check soil moisture before adding water.`
        : precipProb >= 60
          ? `Reduce or skip irrigation — significant rain is expected (${fmt(precipProb)}%).`
          : `Current conditions do not indicate urgent irrigation.`
  });

  /* --- 3. Spray window (suitability) --- */
  let spray = 100;
  if (wind > 15)    spray -= Math.min((wind - 15) * 3.5, 60);
  if (wind > 25)    spray = 0;
  if (precipProb > 35) spray -= Math.min((precipProb - 35) * 1.6, 55);
  if (precip > 0.1) spray -= 35;
  if (temp < 8 || temp > 32) spray -= 30;
  if (storm) spray = 0;
  spray = clamp(spray, 0, 100);
  out.push({
    id: 'spray',
    name: 'Spray window',
    note: 'Wind drift, rain wash-off and temperature all determine whether spraying is safe and effective.',
    icon: 'fa-spray-can',
    type: 'suit',
    score: spray,
    action: spray >= 65
      ? `Good window for spraying — wind ${fmt(wind)} km/h and rain chance ${fmt(precipProb)}% are within limits.`
      : wind > 20
        ? `Postpone spraying — wind at ${fmt(wind)} km/h causes drift and waste.`
        : precipProb > 40
          ? `Delay spraying — ${fmt(precipProb)}% rain probability will wash off the product.`
          : `Borderline spray conditions — reassess before applying.`
  });

  /* --- 4. Field work / planting suitability (suitability) --- */
  let field = 100;
  if (precipProb > 40) field -= Math.min((precipProb - 40) * 1.4, 50);
  if (precip > 5)      field -= 30;
  if (wind > 25)       field -= 25;
  if (temp < 5 || temp > 35) field -= 30;
  if (visibility < 2)  field -= 25;
  if (storm)           field = 0;
  field = clamp(field, 0, 100);
  out.push({
    id: 'field',
    name: 'Field work & planting',
    note: 'Accessibility and comfort for planting, transplanting, weeding, and routine field work.',
    icon: 'fa-tractor',
    type: 'suit',
    score: field,
    action: field >= 70
      ? `Suitable conditions for planting, transplanting and field maintenance today.`
      : field >= 40
        ? `Workable but imperfect — plan around the rain and wind.`
        : `Field work is not advisable — rain, wind or extreme temperature are interfering.`
  });

  /* --- 5. Heat stress on crops (risk) --- */
  const heat = clamp(((ctx.feels - 28) / 12) * 100, 0, 100);
  out.push({
    id: 'heat',
    name: 'Heat stress on crops',
    note: 'Feels-like temperature above 28 °C accelerates transpiration and can scorch sensitive leaves.',
    icon: 'fa-temperature-high',
    type: 'risk',
    score: heat,
    action: heat >= 60
      ? `Heat stress risk (feels like ${fmt(ctx.feels)}°C). Increase watering at dawn/dusk and provide shade for seedlings.`
      : heat >= 35
        ? `Mild heat stress — monitor young plants during the hottest hours.`
        : `No significant heat stress for field crops.`
  });

  /* --- 6. Drought / dry-spell stress (risk) --- */
  const dT = clamp((temp - 24) / 14, 0, 1);
  const dH = clamp((55 - humidity) / 40, 0, 1);
  const dR = clamp((40 - precipProb) / 40, 0, 1);
  const drought = clamp((0.4 * dT + 0.35 * dH + 0.25 * dR) * 100, 0, 100);
  out.push({
    id: 'drought',
    name: 'Drought / dry-spell stress',
    note: 'High temperature + low humidity + low rain probability — soil dries out quickly.',
    icon: 'fa-sun',
    type: 'risk',
    score: drought,
    action: drought >= 60
      ? `Dry-spell risk. Adjust watering schedule and mulch to retain soil moisture.`
      : drought >= 35
        ? `Soil may be drying faster than usual — check moisture before the next cycle.`
        : `No dry-spell stress detected.`
  });

  /* --- 7. Wind exposure / damage (risk) --- */
  const windRisk = clamp(((gusts - 20) / 55) * 100, 0, 100);
  out.push({
    id: 'wind',
    name: 'Wind exposure',
    note: 'Gusts above 20 km/h can damage young plants, flowers and trellised crops.',
    icon: 'fa-wind',
    type: 'risk',
    score: windRisk,
    action: windRisk >= 55
      ? `Strong wind advisory — gusts to ${fmt(gusts)} km/h. Secure young plants, stakes, and delay spraying.`
      : windRisk >= 30
        ? `Breezy conditions — check supports and shade netting.`
        : `Wind is within a safe range for exposed crops.`
  });

  /* --- 8. Frost risk (risk) — uses today's daily minimum --- */
  let frost = 0;
  if (dailyMin <= 0)      frost = 100;
  else if (dailyMin <= 2) frost = 85;
  else if (dailyMin <= 4) frost = 65;
  else if (dailyMin <= 6) frost = 45;
  else if (dailyMin <= 8) frost = 25;
  out.push({
    id: 'frost',
    name: 'Frost risk',
    note: 'Based on today\'s forecast minimum temperature at the location.',
    icon: 'fa-snowflake',
    type: 'risk',
    score: frost,
    action: frost >= 45
      ? `Frost risk (min ${fmt(dailyMin, 1)}°C). Cover sensitive crops overnight and avoid watering late.`
      : frost > 0
        ? `Cold night possible (min ${fmt(dailyMin, 1)}°C) — monitor sensitive plants.`
        : `No frost risk expected (min ${fmt(dailyMin, 1)}°C).`
  });

  /* --- 9. Harvest window (suitability) --- */
  let harvest = 100;
  if (precipProb > 30) harvest -= (precipProb - 30) * 1.5;
  if (precip > 0)      harvest -= 30;
  if (wind > 20)       harvest -= (wind - 20) * 3;
  if (temp < 8 || temp > 34) harvest -= 25;
  if (storm) harvest = 0;
  harvest = clamp(harvest, 0, 100);
  out.push({
    id: 'harvest',
    name: 'Harvest window',
    note: 'Dry, calm air protects harvested grain, fruit and vegetables from spoilage and loss.',
    icon: 'fa-wheat-awn',
    type: 'suit',
    score: harvest,
    action: harvest >= 65
      ? `Good dry window for harvest and post-harvest drying.`
      : harvest >= 35
        ? `Harvest with caution — rain or wind may reduce quality.`
        : `Poor harvest conditions — delay if the crop can wait.`
  });

  /* ---- Tag + colour mapping ---- */
  for (const ind of out) {
    const riskLevels = [
      { max: 20,  tag: 'Low',      color: 'var(--good)' },
      { max: 40,  tag: 'Mild',     color: 'var(--info)' },
      { max: 60,  tag: 'Moderate', color: 'var(--warn)' },
      { max: 80,  tag: 'High',     color: '#fb923c' },
      { max: 100, tag: 'Severe',   color: 'var(--danger)' }
    ];
    const suitLevels = [
      { max: 20,  tag: 'Very poor', color: 'var(--danger)' },
      { max: 40,  tag: 'Poor',      color: '#fb923c' },
      { max: 60,  tag: 'Fair',      color: 'var(--warn)' },
      { max: 80,  tag: 'Good',      color: 'var(--info)' },
      { max: 100, tag: 'Excellent', color: 'var(--good)' }
    ];
    const levels = ind.type === 'risk' ? riskLevels : suitLevels;
    const level = levels.find(l => ind.score <= l.max);
    ind.tag = level.tag;
    ind.color = level.color;
    ind.score = Math.round(ind.score);
  }

  return out;
}

/* ------------------------------------------------------------
   7. Recommendation engine — Health / Agriculture / Outdoor
   ------------------------------------------------------------ */

function generateRecommendations(ctx, agri) {
  const out = { health: [], agriculture: [], outdoor: [] };
  const push = (cat, sev, icon, title, text) =>
    out[cat].push({ sev, icon, title, text });

  const {
    aqi, pm25, pm10, temp, feels, humidity, dewPoint,
    visibility, wind, gusts, precipProb, uv, hourLocal, code
  } = ctx;

  const storm = [95, 96, 99].includes(code);
  const isMorning = hourLocal >= 5 && hourLocal < 9;

  /* ================= HEALTH ================= */
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
      `Fine particulate matter is ${fmt(pm25, 1)} µg/m³ — well above the WHO 24-hour guideline of 15 µg/m³. Avoid outdoor exercise, especially morning runs.`);
  } else if (pm25 > 15) {
    push('health', 'warn', 'fa-smog', 'PM2.5 exceeds WHO guideline',
      `At ${fmt(pm25, 1)} µg/m³, PM2.5 is above the WHO 24-hour guideline (15 µg/m³). Sensitive people should take it easy.`);
  }
  if (pm10 > 45) {
    push('health', 'warn', 'fa-smog', 'Coarse dust elevated',
      `PM10 at ${fmt(pm10, 1)} µg/m³ — dust suppression and indoor filtration help reduce exposure.`);
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
  if (humidity <= 30 && temp >= 22) {
    push('health', 'info', 'fa-wind', 'Dry air',
      `${fmt(humidity)}% humidity can dry out airways and skin. Stay hydrated and use a humidifier indoors.`);
  }
  if (dewPoint >= 24) {
    push('health', 'warn', 'fa-water', 'Muggy conditions',
      `Dew point is ${fmt(dewPoint, 1)}°C — air feels oppressive and sweat evaporates slowly.`);
  }

  if (uv >= 8) {
    push('health', 'danger', 'fa-sun', 'Very high UV',
      `UV index ${fmt(uv, 1)} — use SPF 50+, sunglasses and a hat. Avoid sun between 11:00 and 15:00.`);
  } else if (uv >= 6) {
    push('health', 'warn', 'fa-sun', 'High UV',
      `UV index ${fmt(uv, 1)} — sunscreen and shade recommended during midday.`);
  }

  if (visibility < 1) {
    push('health', 'warn', 'fa-eye-low-vision', 'Low visibility',
      `Visibility is only ${fmt(visibility, 1)} km — drive carefully and use fog lights.`);
  }

  if (storm) {
    push('health', 'danger', 'fa-cloud-bolt', 'Thunderstorm safety',
      'Stay indoors, away from windows. Avoid using wired electronics and plumbing during the storm.');
  }

  /* ================= OUTDOOR ================= */
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
  if (aqi >= 60 && (isMorning || temp >= 28)) {
    push('outdoor', 'warn', 'fa-mask-face', isMorning
      ? 'Limit morning outdoor exercise'
      : 'Limit outdoor exertion',
      `Air quality index is ${fmt(aqi)} — running or cycling now increases pollutant intake. Choose indoor or lighter activity.`);
  }
  if (!storm && aqi <= 40 && temp >= 16 && temp <= 28 && wind < 20 && precipProb < 30 && uv < 8) {
    push('outdoor', 'good', 'fa-person-hiking', 'Excellent outdoor window',
      `Comfortable ${fmt(temp)}°C with clean air — ideal for running, cycling, or a picnic.`);
  }
  if (!ctx.isDay && temp >= 18 && temp <= 27 && aqi <= 40 && precipProb < 30) {
    push('outdoor', 'good', 'fa-moon', 'Pleasant evening',
      `Mild ${fmt(temp)}°C with fair air — a good time for an evening walk.`);
  }
  if (uv >= 8 && !storm) {
    push('outdoor', 'warn', 'fa-sun', 'Avoid midday sun',
      `UV index ${fmt(uv, 1)} — plan outdoor activity before 10 AM or after 4 PM.`);
  }

  /* ================= AGRICULTURE ================= */
  /* Summarise the strongest agri indicators into narrative recommendations. */
  const rank = { Low: 0, Mild: 1, Moderate: 2, High: 3, Severe: 4,
                 'Very poor': 4, Poor: 3, Fair: 2, Good: 1, Excellent: 0 };

  agri.forEach(ind => {
    const r = rank[ind.tag] ?? 1;
    if (r >= 2) {
      const sev = ind.type === 'risk'
        ? (r >= 4 ? 'danger' : r === 3 ? 'warn' : 'info')
        : (r >= 4 ? 'danger' : r === 3 ? 'warn' : 'info');
      push('agriculture', sev, ind.icon, `${ind.name} — ${ind.tag}`, ind.action);
    }
  });
  if (!out.agriculture.length) {
    agri.slice(0, 3).forEach(ind =>
      push('agriculture', 'good', ind.icon, `${ind.name} — ${ind.tag}`, ind.action));
  }

  /* Fallbacks so no column is ever empty */
  const fallback = {
    health:      { sev: 'good', icon: 'fa-circle-check', title: 'No health alerts', text: 'Current conditions pose no specific health risk.' },
    agriculture: { sev: 'good', icon: 'fa-circle-check', title: 'No agricultural alerts', text: 'Conditions are within normal operating ranges.' },
    outdoor:     { sev: 'good', icon: 'fa-circle-check', title: 'No outdoor alerts', text: 'No weather hazards detected for outdoor activity.' }
  };
  for (const key of Object.keys(out)) {
    if (!out[key].length) out[key].push(fallback[key]);
  }

  return out;
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
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date());
    $('#localTime').textContent = text;
  } catch {
    $('#localTime').textContent = new Date().toLocaleString();
  }
}

function renderHero(ctx) {
  const wmo = WMO[ctx.code] || WMO[0];
  const icon = (!ctx.isDay && wmo.night) ? wmo.night : wmo.icon;

  $('#heroIcon').className = `fa-solid ${icon}`;
  $('#heroTemp').textContent = fmt(ctx.temp);
  $('#heroCond').textContent = wmo.label;
  $('#heroFeels').textContent = `${fmt(ctx.feels)}°C`;

  const d = state.weather.daily;
  $('#heroHi').textContent = `${fmt(d.temperature_2m_max[0])}°`;
  $('#heroLo').textContent = `${fmt(d.temperature_2m_min[0])}°`;
  $('#heroRain').textContent = `${fmt(ctx.precipProb)}%`;

  state.lastUpdated = state.weather.current.time.slice(11, 16);
}

function uvLabel(uv) {
  if (uv >= 11) return 'Extreme';
  if (uv >= 8)  return 'Very high';
  if (uv >= 6)  return 'High';
  if (uv >= 3)  return 'Moderate';
  return 'Low';
}

function renderStats(ctx) {
  $('#statHumidity').textContent = `${fmt(ctx.humidity)}%`;
  $('#statWind').textContent = `${fmt(ctx.wind)} km/h`;
  $('#statWindDir').textContent = `From ${compass(ctx.windDir)} (${fmt(ctx.windDir)}°)`;
  $('#statPressure').textContent = `${fmt(ctx.pressure)} hPa`;
  $('#statUv').textContent = fmt(ctx.uv, 1);
  $('#statUvLabel').textContent = uvLabel(ctx.uv);

  $('#statCloud').textContent = `${fmt(ctx.cloud)}%`;
  $('#statGusts').textContent = `${fmt(ctx.gusts)} km/h`;
  $('#statPrecip').textContent = `${fmt(ctx.precip, 1)} mm`;
  $('#statVisibility').textContent = `${fmt(ctx.visibility, 1)} km`;
}

function renderAqi(ctx) {
  const band = aqiBand(ctx.aqi);
  const p = clamp((ctx.aqi / 120) * 100, 0, 100);

  [['#aqiGauge', '#aqiValue', '#aqiBand'],
   ['#aqiGauge2', '#aqiValue2', '#aqiBand2']].forEach(([g, v, b]) => {
    const gauge = $(g);
    if (!gauge) return;
    gauge.style.setProperty('--p', String(p));
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

  $('#pm25Bar').style.width = `${clamp((ctx.pm25 / 75) * 100, 2, 100)}%`;
  $('#pm10Bar').style.width = `${clamp((ctx.pm10 / 150) * 100, 2, 100)}%`;

  const advice = $('#aqiAdvice');
  advice.innerHTML = '';
  const items = [];

  if (ctx.aqi <= 20) items.push(['good', 'fa-lungs', 'Ideal conditions', 'Air quality is excellent — no precautions needed.']);
  else if (ctx.aqi <= 40) items.push(['good', 'fa-lungs', 'Generally safe', 'Fine for most activities; extremely sensitive people may notice minor effects.']);
  else if (ctx.aqi <= 60) items.push(['warn', 'fa-mask-face', 'Sensitive groups affected', 'Children, the elderly, and people with asthma should shorten outdoor exposure.']);
  else if (ctx.aqi <= 80) items.push(['warn', 'fa-mask-face', 'Unhealthy for sensitive groups', 'Limit outdoor exertion; keep windows closed during peak traffic hours.']);
  else items.push(['danger', 'fa-triangle-exclamation', 'Health alert', 'Avoid outdoor exertion. Use filtration indoors and wear an N95 outdoors if necessary.']);

  if (ctx.pm25 > 15) items.push(['warn', 'fa-smog', 'PM2.5 above WHO guideline',
    `Current PM2.5 is ${fmt(ctx.pm25, 1)} µg/m³ versus the WHO 24-hour guideline of 15 µg/m³.`]);
  if (ctx.pm10 > 45) items.push(['warn', 'fa-smog', 'Coarse dust elevated',
    `PM10 at ${fmt(ctx.pm10, 1)} µg/m³ — dust suppression and indoor filtration help.`]);

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
    const hour = w.hourly.time[i].slice(11, 16);
    const wmo = WMO[w.hourly.weather_code[i]] || WMO[0];
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
    const label = i === 0 ? 'Today'
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

function renderRecommendations(ctx, agri) {
  const recs = generateRecommendations(ctx, agri);
  const paint = (el, arr) => { el.innerHTML = arr.slice(0, 6).map(recMarkup).join(''); };

  paint($('#recHealth'), recs.health);
  paint($('#recAgriculture'), recs.agriculture);
  paint($('#recOutdoor'), recs.outdoor);
  paint($('#agriActions'), recs.agriculture);

  const rank = { danger: 3, warn: 2, info: 1, good: 0 };
  const pickTop = arr => [...arr].sort((a, b) => rank[b.sev] - rank[a.sev])[0];

  const tops = [pickTop(recs.health), pickTop(recs.agriculture), pickTop(recs.outdoor)];
  const colorFor = sev => ({ danger: 'var(--danger)', warn: 'var(--warn)', good: 'var(--good)' }[sev] || 'var(--info)');

  $('#priorityList').innerHTML = tops.map(rec => `
    <div class="priority-item">
      <i class="fa-solid ${rec.icon}" style="color:${colorFor(rec.sev)}"></i>
      <p><strong>${rec.title}.</strong> ${rec.text}</p>
    </div>`).join('');
}

function renderAgriculture(agri) {
  /* --- Overall field verdict (uses field-work indicator) --- */
  const field = agri.find(i => i.id === 'field');
  const verdictEl = $('#agriVerdict');
  verdictEl.style.setProperty('--vc', field.color);
  verdictEl.innerHTML = `
    <div class="agri-verdict-icon"><i class="fa-solid ${field.icon}"></i></div>
    <div class="agri-verdict-text">
      <h3>${field.tag} field-work conditions</h3>
      <p>${field.action}</p>
    </div>
    <div class="agri-verdict-score">${field.score}<span> / 100</span></div>`;

  /* --- Indicator grid --- */
  const grid = $('#agriGrid');
  grid.innerHTML = '';
  agri.forEach(ind => {
    const card = document.createElement('article');
    card.className = 'card agri-card';
    card.innerHTML = `
      <div class="agri-top">
        <div class="agri-icon"><i class="fa-solid ${ind.icon}"></i></div>
        <div>
          <p class="agri-name">${ind.name}</p>
          <p class="agri-note">${ind.note}</p>
        </div>
      </div>
      <div class="agri-meter">
        <div class="agri-score-row">
          <span class="agri-score">${ind.score}</span>
          <span class="agri-tag" style="color:${ind.color}">${ind.tag}</span>
        </div>
        <div class="meter"><span style="background:${ind.color}"></span></div>
      </div>`;
    grid.appendChild(card);

    requestAnimationFrame(() => {
      const bar = card.querySelector('.meter span');
      if (bar) bar.style.width = `${ind.score}%`;
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
  const agri = computeAgriIndicators(ctx);

  applyTheme(ctx.theme);
  renderHeader();
  renderHero(ctx);
  renderStats(ctx);
  renderAqi(ctx);
  renderHourly();
  renderDaily();
  renderRecommendations(ctx, agri);
  renderAgriculture(agri);
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
      fetchAir(loc).catch(() => null)   // air failure must not block weather
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
  box._results = null;
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
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      showSection(item.dataset.target);
    });
  });

  document.addEventListener('click', e => {
    const jump = e.target.closest('[data-jump]');
    if (jump) showSection(jump.dataset.jump);
  });

  $('#menuToggle').addEventListener('click', () => {
    $('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  });
  $('#scrim').addEventListener('click', closeSidebar);

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
  if (hash && document.getElementById(hash)) showSection(hash);

  setInterval(updateClock, 30_000);
  loadLocation(DEFAULT_LOCATION);
}

document.addEventListener('DOMContentLoaded', init);
