const SENSOR_INFO = {
  temp: { icon:'🌡️', name:'Temperature', unit:'°C',    min:15, max:45,   color:'#ff6b35', field:'temperature', desc:'Ambient air temperature measured by the node’s sensor.' },
  hum:  { icon:'💧',  name:'Humidity',    unit:'%',     min:0,  max:100,  color:'#00b4d8', field:'humidity',    desc:'Relative humidity of the surrounding air.' },
  wind: { icon:'🌬️', name:'Wind Speed',  unit:'m/s',   min:0,  max:30,   color:'#06d6a0', field:'wind_speed',  desc:'Wind speed measured near the sensor node.' },
  pres: { icon:'🌐',  name:'Pressure',    unit:'hPa',   min:980,max:1030, color:'#8338ec', field:'pressure',    desc:'Atmospheric pressure at sea-level equivalent.' },
  co2:  { icon:'🫁',  name:'CO₂',         unit:'ppm',   min:400,max:2000, color:'#ffb700', field:'co2',         desc:'Carbon dioxide concentration — high levels can signal poor ventilation.' },
  pm25: { icon:'💨',  name:'PM2.5',       unit:'μg/m³', min:0,  max:150,  color:'#ff006e', field:'pm25',        desc:'Fine particulate matter — a key indicator of outdoor air quality.' },
};

function getThreshold(key) {
  const saved = JSON.parse(localStorage.getItem('em_thresholds') || '{}');
  return typeof saved[key] === 'number' ? saved[key] : null;
}

function renderSensorCards() {
  const grid = document.getElementById('sensors-detail-grid');
  grid.innerHTML = Object.keys(SENSOR_INFO).map(key => {
    const s = SENSOR_INFO[key];
    return `
    <div class="sensor-detail-card" id="sd-${key}">
      <div class="sd-head">
        <span class="sd-icon" style="background:${s.color}20;color:${s.color}">${s.icon}</span>
        <div>
          <div class="sd-name">${s.name}</div>
          <div class="sd-range">${s.min} – ${s.max} ${s.unit}</div>
        </div>
        <span class="gc-badge" id="sd-badge-${key}">—</span>
      </div>
      <div class="sd-value" id="sd-value-${key}">-- <span class="big-unit">${s.unit}</span></div>
      <div class="bar-track"><div class="bar-fill" id="sd-bar-${key}" style="--c:${s.color}"></div></div>
      <p class="sd-desc">${s.desc}</p>
      <div class="skeleton-overlay"></div>
    </div>`;
  }).join('');
}
renderSensorCards();

function updateSensorCards(d) {
  Object.keys(SENSOR_INFO).forEach(key => {
    const s = SENSOR_INFO[key];
    const value = d[s.field];
    if(value == null) return;
    const pct = Math.max(0, Math.min(100, (value - s.min) / (s.max - s.min) * 100));
    document.getElementById(`sd-bar-${key}`).style.width = pct + '%';
    document.getElementById(`sd-value-${key}`).innerHTML = `${value} <span class="big-unit">${s.unit}</span>`;

    const warn = getThreshold(key);
    const isWarn = warn !== null && value > warn;
    const badge = document.getElementById(`sd-badge-${key}`);
    badge.textContent = warn === null ? '— No threshold' : (isWarn ? '⚠ High' : '✓ Normal');
    badge.className = 'gc-badge ' + (warn === null ? '' : (isWarn ? 'warn' : 'ok'));
  });
}

let consecutiveFailures = 0;
function showConnectionError() { document.getElementById('content-error')?.classList.add('show'); }
function hideConnectionError() { document.getElementById('content-error')?.classList.remove('show'); }

document.getElementById('ce-retry')?.addEventListener('click', async () => {
  const btn = document.getElementById('ce-retry');
  btn.disabled = true; btn.textContent = '🔄 Retrying...';
  await fetchData();
  btn.disabled = false; btn.textContent = '🔄 Retry';
});

async function fetchData() {
  try {
    const res = await fetch('/data/latest');
    const d = await res.json();
    document.body.classList.remove('is-loading');
    consecutiveFailures = 0;
    hideConnectionError();

    const conn = document.getElementById('conn-status');
    if(conn) { conn.classList.add('online'); conn.innerHTML = '<span class="conn-dot"></span>Connected'; }

    updateSensorCards(d);
  } catch(e) {
    document.body.classList.remove('is-loading');
    const conn = document.getElementById('conn-status');
    if(conn) { conn.classList.remove('online'); conn.innerHTML = '<span class="conn-dot"></span>Disconnected'; }
    consecutiveFailures++;
    if(consecutiveFailures >= 2) showConnectionError();
  }
}

function pageRefresh() { fetchData(); }

fetchData();
setInterval(fetchData, 2000);

const alertN = JSON.parse(localStorage.getItem('em_alerts') || '[]').length;
['alert-count','notif-badge'].forEach(id => {
  const el = document.getElementById(id);
  if(el && alertN > 0) { el.textContent = alertN; el.style.display = ''; }
});
