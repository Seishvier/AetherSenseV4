/**
 * AetherSense — Real-Time Weather & Air Quality Intelligence
 * Vanilla JS · Open-Meteo API (no key required)
 */

const DOM = {
  cityInput: document.getElementById('cityInput'),
  searchBtn: document.getElementById('searchBtn'),
  currentLocation: document.getElementById('currentLocation'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),
  lastUpdate: document.getElementById('lastUpdate'),
  temperature: document.getElementById('temperature'),
  feelsLike: document.getElementById('feelsLike'),
  weatherIcon: document.getElementById('weatherIcon'),
  weatherDescription: document.getElementById('weatherDescription'),
  humidity: document.getElementById('humidity'),
  windSpeed: document.getElementById('windSpeed'),
  pressure: document.getElementById('pressure'),
  visibility: document.getElementById('visibility'),
  tempMax: document.getElementById('tempMax'),
  tempMin: document.getElementById('tempMin'),
  precipitationProb: document.getElementById('precipitationProb'),
  uvIndex: document.getElementById('uvIndex'),
  cloudCover: document.getElementById('cloudCover'),
  aqiValue: document.getElementById('aqiValue'),
  aqiLabel: document.getElementById('aqiLabel'),
  aqiFill: document.getElementById('aqiFill'),
  pm25: document.getElementById('pm25'),
  pm10: document.getElementById('pm10'),
  ozone: document.getElementById('ozone'),
  no2: document.getElementById('no2'),
  healthList: document.getElementById('healthList'),
  agriList: document.getElementById('agriList'),
  outdoorList: document.getElementById('outdoorList'),
  sidebar: document.getElementById('sidebar'),
  sidebarToggle: document.getElementById('sidebarToggle'),
  navItems: document.querySelectorAll('.nav-item'),
  sections: document.querySelectorAll('.section')
};

// WMO Weather interpretation
const WMO = {
  0:  { desc: 'Cerah', icon: 'fa-sun', theme: 'clear' },
  1:  { desc: 'Sebagian Cerah', icon: 'fa-cloud-sun', theme: 'clear' },
  2:  { desc: 'Berawan Sebagian', icon: 'fa-cloud-sun', theme: 'cloudy' },
  3:  { desc: 'Berawan', icon: 'fa-cloud', theme: 'cloudy' },
  45: { desc: 'Berkabut', icon: 'fa-smog', theme: 'fog' },
  48: { desc: 'Kabut Beku', icon: 'fa-smog', theme: 'fog' },
  51: { desc: 'Gerimis Ringan', icon: 'fa-cloud-rain', theme: 'rain' },
  53: { desc: 'Gerimis', icon: 'fa-cloud-rain', theme: 'rain' },
  55: { desc: 'Gerimis Lebat', icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  61: { desc: 'Hujan Ringan', icon: 'fa-cloud-rain', theme: 'rain' },
  63: { desc: 'Hujan', icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  65: { desc: 'Hujan Lebat', icon: 'fa-cloud-showers-heavy', theme: 'storm' },
  71: { desc: 'Salju Ringan', icon: 'fa-snowflake', theme: 'snow' },
  73: { desc: 'Salju', icon: 'fa-snowflake', theme: 'snow' },
  75: { desc: 'Salju Lebat', icon: 'fa-snowflake', theme: 'snow' },
  80: { desc: 'Hujan Ringan', icon: 'fa-cloud-rain', theme: 'rain' },
  81: { desc: 'Hujan', icon: 'fa-cloud-showers-heavy', theme: 'rain' },
  82: { desc: 'Hujan Sangat Lebat', icon: 'fa-cloud-showers-heavy', theme: 'storm' },
  95: { desc: 'Badai Petir', icon: 'fa-bolt', theme: 'storm' },
  96: { desc: 'Badai Petir + Hujan Es', icon: 'fa-bolt', theme: 'storm' },
  99: { desc: 'Badai Petir Berat', icon: 'fa-bolt', theme: 'storm' }
};

const AQI_LABELS = {
  1: { text: 'Baik', color: '#34d399' },
  2: { text: 'Baik', color: '#34d399' },
  3: { text: 'Sedang', color: '#38bdf8' },
  4: { text: 'Cukup', color: '#fbbf24' },
  5: { text: 'Buruk', color: '#fb923c' },
  6: { text: 'Sangat Buruk', color: '#f87171' }
};

// ---------- Navigation ----------
DOM.navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.section;
    DOM.navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    DOM.sections.forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    if (window.innerWidth <= 900) {
      DOM.sidebar.classList.remove('open');
    }
  });
});

DOM.sidebarToggle?.addEventListener('click', () => {
  DOM.sidebar.classList.toggle('open');
});

// ---------- Search ----------
DOM.searchBtn.addEventListener('click', handleSearch);
DOM.cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});

function handleSearch() {
  const query = DOM.cityInput.value.trim();
  if (!query) return;
  fetchLocation(query);
}

// ---------- API Helpers ----------
async function fetchLocation(name) {
  showLoading(true);
  hideError();
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=id&format=json`
    );
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error('Kota tidak ditemukan. Coba nama lain.');
    }
    const place = geoData.results[0];
    const label = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
    DOM.currentLocation.innerHTML = `<i class="fa-solid fa-map-marker-alt"></i><span>${label}</span>`;
    await fetchWeatherAndAir(place.latitude, place.longitude, label);
  } catch (err) {
    showError(err.message || 'Gagal mencari lokasi.');
  } finally {
    showLoading(false);
  }
}

async function fetchWeatherAndAir(lat, lon, label) {
  showLoading(true);
  hideError();
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,visibility&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide`;

    const [weatherRes, airRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airUrl)
    ]);

    if (!weatherRes.ok || !airRes.ok) throw new Error('Gagal mengambil data cuaca.');

    const weather = await weatherRes.json();
    const air = await airRes.json();

    updateUI(weather, air, label);
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan saat memuat data.');
  } finally {
    showLoading(false);
  }
}

// ---------- UI Update ----------
function updateUI(weather, air, label) {
  const cur = weather.current;
  const daily = weather.daily;
  const airCur = air.current;

  // Weather
  const code = cur.weather_code;
  const wmo = WMO[code] || { desc: 'Tidak diketahui', icon: 'fa-cloud', theme: 'cloudy' };

  DOM.temperature.textContent = Math.round(cur.temperature_2m);
  DOM.feelsLike.textContent = Math.round(cur.apparent_temperature);
  DOM.weatherDescription.textContent = wmo.desc;
  DOM.weatherIcon.className = `weather-icon fa-solid ${wmo.icon}`;
  DOM.humidity.textContent = `${cur.relative_humidity_2m}%`;
  DOM.windSpeed.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
  DOM.pressure.textContent = `${Math.round(cur.pressure_msl || cur.surface_pressure)} hPa`;
  DOM.visibility.textContent = cur.visibility != null
    ? `${(cur.visibility / 1000).toFixed(1)} km`
    : '—';

  DOM.tempMax.textContent = Math.round(daily.temperature_2m_max[0]);
  DOM.tempMin.textContent = Math.round(daily.temperature_2m_min[0]);
  DOM.precipitationProb.textContent = `${daily.precipitation_probability_max[0] ?? '—'}%`;
  DOM.uvIndex.textContent = daily.uv_index_max[0] != null
    ? daily.uv_index_max[0].toFixed(1)
    : '—';
  DOM.cloudCover.textContent = `${cur.cloud_cover}%`;

  // Theme
  document.body.className = `theme-${wmo.theme}`;

  // Air Quality
  const aqi = airCur.european_aqi ?? 1;
  const aqiInfo = AQI_LABELS[Math.min(Math.max(Math.round(aqi), 1), 6)] || AQI_LABELS[1];
  DOM.aqiValue.textContent = Math.round(aqi);
  DOM.aqiLabel.textContent = aqiInfo.text;
  DOM.aqiLabel.style.color = aqiInfo.color;
  DOM.aqiFill.style.width = `${(Math.min(aqi, 6) / 6) * 100}%`;
  DOM.aqiFill.style.background = aqiInfo.color;

  DOM.pm25.textContent = airCur.pm2_5 != null ? airCur.pm2_5.toFixed(1) : '—';
  DOM.pm10.textContent = airCur.pm10 != null ? airCur.pm10.toFixed(1) : '—';
  DOM.ozone.textContent = airCur.ozone != null ? airCur.ozone.toFixed(1) : '—';
  DOM.no2.textContent = airCur.nitrogen_dioxide != null ? airCur.nitrogen_dioxide.toFixed(1) : '—';

  // Timestamp
  const now = new Date();
  DOM.lastUpdate.textContent = `Diperbarui: ${now.toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })}`;

  // Recommendations
  generateRecommendations({
    temp: cur.temperature_2m,
    humidity: cur.relative_humidity_2m,
    wind: cur.wind_speed_10m,
    precipProb: daily.precipitation_probability_max[0] ?? 0,
    weatherCode: code,
    aqi: aqi,
    pm25: airCur.pm2_5 ?? 0,
    uv: daily.uv_index_max[0] ?? 0,
    cloud: cur.cloud_cover
  });
}

// ---------- Recommendation Engine ----------
function generateRecommendations(data) {
  const health = [];
  const agri = [];
  const outdoor = [];

  // === HEALTH ===
  if (data.aqi <= 2) {
    health.push('Kualitas udara sangat baik. Aman untuk semua aktivitas di luar ruangan.');
  } else if (data.aqi === 3) {
    health.push('Kualitas udara sedang. Kelompok sensitif (anak, lansia, penderita asma) disarankan mengurangi aktivitas outdoor yang berat.');
  } else if (data.aqi === 4) {
    health.push('Kualitas udara cukup buruk. Batasi olahraga outdoor, terutama di pagi dan sore hari.');
  } else {
    health.push('Kualitas udara buruk. Sebaiknya tetap di dalam ruangan. Gunakan masker jika harus keluar.');
  }

  if (data.pm25 > 35) {
    health.push(`Konsentrasi PM2.5 tinggi (${data.pm25.toFixed(1)} µg/m³). Hindari olahraga pagi di luar.`);
  }

  if (data.temp >= 33) {
    health.push('Suhu tinggi. Pastikan cukup minum air putih dan hindari paparan matahari terlalu lama.');
  } else if (data.temp <= 18) {
    health.push('Suhu cukup dingin. Jaga kehangatan tubuh, terutama bagi anak-anak dan lansia.');
  }

  if (data.uv >= 8) {
    health.push('Indeks UV tinggi. Gunakan sunscreen SPF 30+ dan topi jika beraktivitas di luar.');
  }

  if (data.humidity >= 85 && data.temp >= 28) {
    health.push('Kelembapan tinggi + suhu hangat dapat menyebabkan dehidrasi. Perbanyak cairan.');
  }

  // === AGRICULTURE ===
  if (data.precipProb >= 60) {
    agri.push('Peluang hujan tinggi. Tunda penyemprotan pestisida dan pupuk daun.');
    agri.push('Periksa sistem drainase lahan untuk mencegah genangan.');
  } else if (data.precipProb <= 20 && data.temp >= 28 && data.humidity <= 60) {
    agri.push('Kondisi kering. Pertimbangkan irigasi tambahan untuk tanaman sayuran dan padi.');
  }

  if (data.humidity >= 80 && data.wind < 8) {
    agri.push('Kelembapan tinggi + angin lemah → risiko penyakit jamur (blast, busuk daun) meningkat. Pantau tanaman dengan cermat.');
  }

  if (data.temp >= 24 && data.temp <= 32 && data.humidity >= 60 && data.humidity <= 80) {
    agri.push('Kondisi suhu & kelembapan ideal untuk pertumbuhan padi dan sayuran dataran tinggi.');
  }

  if (data.wind >= 25) {
    agri.push('Angin kencang. Lindungi tanaman muda dan pastikan tiang penopang kuat.');
  }

  if (data.weatherCode >= 95) {
    agri.push('Ada potensi badai. Amankan peralatan pertanian dan hindari aktivitas di lahan terbuka.');
  }

  // Default agri if empty
  if (agri.length === 0) {
    agri.push('Kondisi cuaca relatif stabil. Lanjutkan pemeliharaan rutin tanaman.');
    agri.push('Pantau kelembapan tanah sebelum melakukan irigasi.');
  }

  // === OUTDOOR ===
  if (data.aqi <= 2 && data.precipProb < 30 && data.temp >= 20 && data.temp <= 30) {
    outdoor.push('Kondisi sangat baik untuk hiking, jogging, atau bersepeda.');
  } else if (data.precipProb >= 50) {
    outdoor.push('Peluang hujan cukup tinggi. Siapkan payung atau tunda aktivitas outdoor yang lama.');
  }

  if (data.aqi >= 4) {
    outdoor.push('Kualitas udara kurang mendukung. Pilih aktivitas indoor atau olahraga di gym.');
  }

  if (data.uv >= 7 && data.cloud < 40) {
    outdoor.push('Sinar matahari cukup terik. Lakukan aktivitas outdoor di pagi (sebelum 10.00) atau sore (setelah 15.00).');
  }

  if (data.weatherCode >= 61 && data.weatherCode <= 65) {
    outdoor.push('Sedang hujan. Hindari area terbuka dan waspadai jalan licin.');
  }

  if (outdoor.length === 0) {
    outdoor.push('Kondisi cukup mendukung untuk aktivitas ringan di luar ruangan.');
    outdoor.push('Selalu perhatikan perubahan cuaca secara berkala.');
  }

  // Render
  DOM.healthList.innerHTML = health.map(t => `<li>${t}</li>`).join('');
  DOM.agriList.innerHTML = agri.map(t => `<li>${t}</li>`).join('');
  DOM.outdoorList.innerHTML = outdoor.map(t => `<li>${t}</li>`).join('');
}

// ---------- Helpers ----------
function showLoading(show) {
  DOM.loadingOverlay.classList.toggle('visible', show);
}

function showError(msg) {
  DOM.errorText.textContent = msg;
  DOM.errorMessage.hidden = false;
}

function hideError() {
  DOM.errorMessage.hidden = true;
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  // Default: Malang, East Java
  fetchLocation('Malang');
});
