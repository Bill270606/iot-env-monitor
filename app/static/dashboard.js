// ── AUTH CHECK ──
const user = JSON.parse(localStorage.getItem('em_user') || 'null');
if (!user) { window.location.href = '/login'; }
else {
  const initial = (user.name || 'U')[0].toUpperCase();
  ['sb-avatar','chip-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = initial;
  });
  const nameEl = document.getElementById('sb-name');
  const chipEl = document.getElementById('chip-name');
  if(nameEl) nameEl.textContent = user.name || 'User';
  if(chipEl) chipEl.textContent = (user.name || 'User').split(' ').slice(-1)[0];
}

function logout() {
  localStorage.removeItem('em_user');
  window.location.href = '/login';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── CONFIG ──
const ARC = 235.6;
const SENSORS = {
  temp: { min:15, max:45,   warn:35,   color:'#ff6b35' },
  hum:  { min:0,  max:100,  warn:85,   color:'#00b4d8' },
  wind: { min:0,  max:30,   warn:20,   color:'#06d6a0' },
  pres: { min:980,max:1030, warn:null, color:'#8338ec' },
  co2:  { min:400,max:2000, warn:1000, color:'#ffb700', unit:'ppm'   },
  pm25: { min:0,  max:150,  warn:75,   color:'#ff006e', unit:'μg/m³' },
};

// ── STATS ──
let readings = 0;
let alertCount = 0;
const startTime = Date.now();

function updateUptime() {
  const sec = Math.floor((Date.now() - startTime) / 1000);
  const h = String(Math.floor(sec/3600)).padStart(2,'0');
  const m = String(Math.floor((sec%3600)/60)).padStart(2,'0');
  const s = String(sec%60).padStart(2,'0');
  const el = document.getElementById('sc-uptime');
  if(el) el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateUptime, 1000);

// ── GAUGE ──
function setGauge(key, value) {
  const cfg = SENSORS[key];
  const arc = document.getElementById(`g-${key}`);
  const val = document.getElementById(`v-${key}`);
  const badge = document.getElementById(`b-${key}`);
  const card = document.getElementById(`card-${key}`);
  if(!arc) return;

  const pct = Math.max(0, Math.min(1, (value - cfg.min) / (cfg.max - cfg.min)));
  arc.style.strokeDashoffset = ARC * (1 - pct);
  if(val) val.textContent = value;

  const warn = cfg.warn !== null && value > cfg.warn;
  if(badge) {
    badge.textContent = warn ? '⚠ Alto' : '✓ Normal';
    badge.className = 'gc-badge ' + (warn ? 'warn' : 'ok');
  }
  if(card) card.classList.toggle('warn', warn);
  return warn;
}

// ── BAR ──
function setBar(key, value) {
  const cfg = SENSORS[key];
  const bar = document.getElementById(`bf-${key}`);
  const val = document.getElementById(`v-${key}`);
  const badge = document.getElementById(`b-${key}`);
  const card = document.getElementById(`card-${key}`);
  if(!bar) return;

  const pct = Math.max(0, Math.min(100, (value-cfg.min)/(cfg.max-cfg.min)*100));
  bar.style.width = `${pct}%`;
  if(val) val.innerHTML = `${value} <span class="big-unit">${cfg.unit}</span>`;

  const warn = cfg.warn !== null && value > cfg.warn;
  if(badge) {
    badge.textContent = warn ? '⚠ Cao' : '✓ Bình thường';
    badge.className = 'gc-badge ' + (warn ? 'warn' : 'ok');
  }
  if(card) card.classList.toggle('warn', warn);
  return warn;
}

// ── CHART ──
const chartCtx = document.getElementById('chart').getContext('2d');

function makeGrad(ctx, color) {
  const g = ctx.createLinearGradient(0, 0, 0, 280);
  g.addColorStop(0, color + '35');
  g.addColorStop(1, color + '05');
  return g;
}

const chart = new Chart(chartCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label:'Nhiệt độ (°C)', data:[], yAxisID:'y1', borderColor:'#ff6b35', backgroundColor:makeGrad(chartCtx,'#ff6b35'), borderWidth:2, fill:true, tension:.4, pointRadius:2 },
      { label:'Độ ẩm (%)',     data:[], yAxisID:'y1', borderColor:'#00b4d8', backgroundColor:makeGrad(chartCtx,'#00b4d8'), borderWidth:2, fill:false,tension:.4, pointRadius:2 },
      { label:'Gió (m/s)',     data:[], yAxisID:'y2', borderColor:'#06d6a0', backgroundColor:makeGrad(chartCtx,'#06d6a0'), borderWidth:2, fill:false,tension:.4, pointRadius:2 },
    ]
  },
  options: {
    responsive:true, animation:{duration:200},
    interaction:{mode:'index',intersect:false},
    scales:{
      x:{grid:{color:'#1a2d4a60'},ticks:{color:'#4a6a8a',maxTicksLimit:8,font:{size:10}},border:{color:'#1a2d4a'}},
      y1:{grid:{color:'#1a2d4a40'},ticks:{color:'#4a6a8a',font:{size:10}},border:{color:'#1a2d4a'}},
      y2:{position:'right',grid:{drawOnChartArea:false},ticks:{color:'#06d6a0',font:{size:10}},border:{color:'#1a2d4a'}},
    },
    plugins:{
      legend:{display:false},
      tooltip:{backgroundColor:'#0d1626',borderColor:'#1a2d4a',borderWidth:1,titleColor:'#e2eaf6',bodyColor:'#4a6a8a',padding:10},
    }
  }
});

function addChartPoint(d) {
  if(chart.data.labels.length >= 30) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.data.labels.push(d.timestamp);
  chart.data.datasets[0].data.push(d.temperature);
  chart.data.datasets[1].data.push(d.humidity);
  chart.data.datasets[2].data.push(d.wind_speed);
  chart.update('none');
}

// ── ALERTS LOG ──
const alertsLog = [];

function addAlert(msg) {
  const now = new Date().toLocaleTimeString('vi-VN');
  alertsLog.unshift({ msg, time: now });
  if(alertsLog.length > 20) alertsLog.pop();

  alertCount++;
  const countEls = [
    document.getElementById('alert-count'),
    document.getElementById('notif-badge'),
    document.getElementById('sc-alerts'),
  ];
  countEls.forEach(el => { if(el) el.textContent = alertCount; });
  const badge = document.getElementById('notif-badge');
  if(badge) badge.style.display = 'block';

  renderAlerts();
  showToast('⚠ ' + msg);
}

function renderAlerts() {
  const list = document.getElementById('alerts-list');
  if(!list) return;
  if(alertsLog.length === 0) {
    list.innerHTML = '<div class="no-alerts">✅ Không có cảnh báo</div>';
    return;
  }
  list.innerHTML = alertsLog.slice(0,10).map(a => `
    <div class="alert-item">
      <span class="alert-icon">⚠️</span>
      <div class="alert-info">
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${a.time}</div>
      </div>
    </div>`).join('');
}

// ── TOAST ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 4000);
}

// ── MAIN UPDATE ──
const prevAlerts = {};

async function fetchData() {
  try {
    const res  = await fetch('/data/latest');
    const d    = await res.json();

    // Time / date
    const tsEl   = document.getElementById('time-display');
    const dateEl = document.getElementById('date-display');
    if(tsEl)   tsEl.textContent   = d.timestamp;
    if(dateEl) dateEl.textContent = d.date;

    // Connection status
    const conn = document.getElementById('conn-status');
    if(conn) { conn.classList.add('online'); conn.querySelector('span').style.display = 'inline-block'; conn.innerHTML = '<span class="conn-dot"></span>Đã kết nối'; }

    // Readings counter
    readings++;
    const rEl = document.getElementById('sc-readings');
    if(rEl) rEl.textContent = readings;

    // Gauges
    const wTemp = setGauge('temp',  d.temperature);
    const wHum  = setGauge('hum',   d.humidity);
    const wWind = setGauge('wind',  d.wind_speed);
                  setGauge('pres',  d.pressure);
    const wCo2  = setBar('co2',  d.co2);
    const wPm   = setBar('pm25', d.pm25);

    // Alert log (only on new warnings)
    const warns = [
      [wTemp, `Nhiệt độ cao: ${d.temperature}°C`],
      [wHum,  `Độ ẩm cao: ${d.humidity}%`],
      [wWind, `Gió mạnh: ${d.wind_speed} m/s`],
      [wCo2,  `CO₂ cao: ${d.co2} ppm`],
      [wPm,   `PM2.5 cao: ${d.pm25} μg/m³`],
    ];
    warns.forEach(([isWarn, msg]) => {
      const key = msg.split(':')[0];
      if(isWarn && !prevAlerts[key]) addAlert(msg);
      prevAlerts[key] = isWarn;
    });

    // Stat card
    const alertNow = warns.filter(([w]) => w).length;
    const scAlert = document.getElementById('sc-alerts');
    if(scAlert) scAlert.textContent = alertNow;

    // Chart
    addChartPoint(d);

  } catch(e) {
    const conn = document.getElementById('conn-status');
    if(conn) { conn.classList.remove('online'); conn.innerHTML = '<span class="conn-dot"></span>Mất kết nối'; }
  }
}

fetchData();
setInterval(fetchData, 2000);
