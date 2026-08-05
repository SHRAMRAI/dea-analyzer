'use strict';

// ============================================================
// DATA STORE
// ============================================================
var D = { shipments: [], packages: [], alarms: [], cpt: [], equip: [] };
var CH = {}; // Chart instances
var PAL = ['#388bfd','#3fb950','#bc8cff','#ffa657','#39d353','#f85149','#d29922','#f0f6fc'];

// ============================================================
// UTILITIES
// ============================================================
function countBy(arr, fn) {
  return arr.reduce(function(a, r) { var k = fn(r); a[k] = (a[k] || 0) + 1; return a; }, {});
}
function topN(obj, n) {
  return Object.entries(obj).sort(function(a, b) { return b[1] - a[1]; }).slice(0, n || 10);
}
function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

function pd(s) {
  if (!s) return null;
  s = String(s).trim();
  var d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  var m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*([\d:]+\s*[AP]?M?)?/i);
  if (m) {
    var yr = m[3].length === 2 ? '20' + m[3] : m[3];
    var dt = new Date(yr + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0'));
    return dt;
  }
  return null;
}

function cleanChute(s) {
  if (!s) return '';
  s = s.trim();
  var main = s.match(/FlatSorter-F(\d+)/i);
  if (main) return 'F' + parseInt(main[1]);
  var m = s.match(/-([A-Z]\w+)$/);
  return m ? m[1] : s;
}

// ============================================================
// AUTO-DETECT FILE TYPE
// ============================================================
function detectType(cols) {
  var s = cols.join('|').toLowerCase().replace(/[^a-z0-9|_]/g, '');
  if (s.includes('activetime') || (s.includes('duration') && s.includes('area') && s.includes('description'))) return 'alarms';
  if (s.includes('typeofchange') || s.includes('type_of_change') || (s.includes('changemade') && s.includes('userid'))) return 'equip';
  if (s.includes('lane') && (s.includes('cpttime') || s.includes('cpt_time') || s.includes('cpt')) && s.includes('date')) return 'cpt';
  if (s.includes('l0bucket') || s.includes('l0_bucket') || s.includes('missortowner')) return 'packages';
  if (s.includes('amazonbarcode') || s.includes('amazon_barcode') || s.includes('lumindea') || s.includes('level0')) return 'shipments';
  if (s.includes('barcode') && s.includes('route')) return 'shipments';
  return null;
}

// ============================================================
// PARSERS
// ============================================================
function parseShipments(rows) {
  if (!rows.length) return [];
  var k = Object.keys(rows[0]);
  var find = function(patterns) {
    for (var i = 0; i < k.length; i++) {
      var kl = k[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      for (var j = 0; j < patterns.length; j++) { if (kl.includes(patterns[j])) return k[i]; }
    }
    return null;
  };
  var fBarcode = find(['amazonbarcode', 'amazon_barcode', 'barcode']) || '';
  var fSlam = find(['firstslamtime', 'slamdate', 'slam_date', 'slamtime']) || '';
  var fRoute = find(['route']) || '';
  var fShift = find(['shift']) || '';
  var fChute = find(['lastchute', 'last_chute', 'chuteid']) || '';
  var fL0 = find(['level0', 'level_0', 'l0bucket', 'l0_bucket']) || '';
  var fL1 = find(['lumindealevel1', 'level1', 'l1bucket']) || '';
  var fDea = find(['deabucket', 'dea_bucket']) || '';
  var fCpt = find(['cpt']) || '';
  var fMissQty = find(['deamissqty', 'dea_miss_qty', 'missqty']) || '';
  return rows.filter(function(x) { return x[fBarcode]; }).map(function(x) {
    return {
      barcode: (x[fBarcode] || '').slice(0, 20),
      slamDate: x[fSlam] || '',
      route: x[fRoute] || '',
      shift: x[fShift] || '',
      lastChute: cleanChute(x[fChute] || ''),
      l0: x[fL0] || '',
      l1: x[fL1] || '',
      deaBucket: x[fDea] || '',
      cptTime: x[fCpt] || '',
      deaMissQty: x[fMissQty] || ''
    };
  });
}

function parsePackages(rows) {
  if (!rows.length) return [];
  var k = Object.keys(rows[0]);
  var find = function(patterns) {
    for (var i = 0; i < k.length; i++) {
      var kl = k[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      for (var j = 0; j < patterns.length; j++) { if (kl.includes(patterns[j])) return k[i]; }
    }
    return null;
  };
  var fBarcode = find(['amazonbarcode', 'amazon_barcode', 'barcode']) || '';
  var fSlam = find(['slamdate', 'slam_date']) || '';
  var fRoute = find(['route']) || '';
  var fChute = find(['lastchute', 'last_chute', 'chute']) || '';
  var fL0 = find(['l0bucket', 'l0_bucket', 'l0', 'owner']) || '';
  var fL1 = find(['l1bucket', 'l1_bucket', 'l1', 'bucket']) || '';
  var fL2 = find(['l2bucket', 'l2_bucket', 'l2', 'subbucket']) || '';
  return rows.filter(function(x) { return x[fBarcode]; }).map(function(x) {
    return {
      barcode: (x[fBarcode] || '').slice(0, 20),
      slamDate: (x[fSlam] || '').slice(0, 10),
      route: x[fRoute] || '',
      lastChute: cleanChute(x[fChute] || ''),
      l0: x[fL0] || '',
      l1: x[fL1] || '',
      l2: x[fL2] || ''
    };
  });
}

function parseAlarms(rows) {
  if (!rows.length) return [];
  var k = Object.keys(rows[0]);
  var find = function(patterns) {
    for (var i = 0; i < k.length; i++) {
      var kl = k[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      for (var j = 0; j < patterns.length; j++) { if (kl.includes(patterns[j])) return k[i]; }
    }
    return null;
  };
  var fTime = find(['activetime', 'active_time', 'timestamp', 'time']) || '';
  var fDur = find(['duration']) || '';
  var fDesc = find(['description', 'desc']) || '';
  var fArea = find(['area', 'zone']) || '';
  return rows.filter(function(x) { return x[fTime]; }).map(function(x) {
    var desc = (x[fDesc] || '').trim();
    var location = '';
    var cm = desc.match(/CHUTE\s+(\w+)/i);
    if (cm) location = 'F' + cm[1];
    else {
      var ind = desc.match(/^(IND\d+)/i);
      if (ind) location = ind[1];
      else location = 'Other';
    }
    return {
      time: pd(x[fTime]),
      duration: parseFloat((x[fDur] || '0').replace(',', '.')) || 0,
      chute: location,
      description: desc,
      area: (x[fArea] || '').trim()
    };
  }).filter(function(x) { return x.time; });
}

function parseCPT(rows) {
  if (!rows.length) return [];
  var k = Object.keys(rows[0]);
  var find = function(patterns) {
    for (var i = 0; i < k.length; i++) {
      var kl = k[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      for (var j = 0; j < patterns.length; j++) { if (kl.includes(patterns[j])) return k[i]; }
    }
    return null;
  };
  var fLane = find(['lane']) || '';
  var fShift = find(['shift']) || '';
  var fDate = find(['date']) || '';
  var fCpt = find(['cpttime', 'cpt_time', 'cpt']) || '';
  var fBucket = find(['bucket', 'reason']) || '';
  var fLoc = find(['location']) || '';
  return rows.filter(function(x) { return x[fLane] && x[fDate]; }).map(function(x) {
    return { lane: x[fLane] || '', shift: x[fShift] || '', date: x[fDate] || '', cptTime: x[fCpt] || '', bucket: x[fBucket] || '', location: x[fLoc] || '' };
  });
}

function parseEquip(rows) {
  if (!rows.length) return [];
  var k = Object.keys(rows[0]);
  var find = function(patterns) {
    for (var i = 0; i < k.length; i++) {
      var kl = k[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      for (var j = 0; j < patterns.length; j++) { if (kl.includes(patterns[j])) return k[i]; }
    }
    return null;
  };
  var fDate = find(['date', 'datetime', 'timestamp']) || '';
  var fTime = find(['time']) || '';
  var fUser = find(['userid', 'user_id', 'user']) || '';
  var fChange = find(['changemade', 'change_made']) || '';
  var fType = find(['typeofchange', 'type_of_change']) || '';
  var fCurrent = find(['current', 'newvalue']) || '';
  var fPrev = find(['previous', 'oldvalue']) || '';
  return rows.filter(function(x) { return x[fDate]; }).map(function(x) {
    var uid = (x[fUser] || '').trim();
    var dtStr = x[fTime] ? (x[fDate] + ' ' + x[fTime]) : x[fDate];
    return {
      dt: pd(dtStr),
      userId: uid,
      changeMade: (x[fChange] || '').trim(),
      typeOfChange: (x[fType] || '').trim(),
      current: (x[fCurrent] || '').trim(),
      previous: (x[fPrev] || '').trim(),
      isSystem: /system|hulk|floco|auto/i.test(uid)
    };
  }).filter(function(x) { return x.dt; });
}



// ============================================================
// FILE HANDLING
// ============================================================
function handleFiles(files) {
  if (!files || !files.length) return;
  var prog = document.getElementById('prog');
  prog.style.display = 'block';
  prog.textContent = 'Reading ' + files.length + ' file(s)...';
  var pending = files.length;

  Array.from(files).forEach(function(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function(h) { return h.replace(/^\uFEFF/, '').trim(); },
      complete: function(res) {
        if (!res.data || !res.data.length) { pending--; if (!pending) done(); return; }
        var cols = (res.meta.fields || Object.keys(res.data[0])).filter(function(c) { return c.trim(); });
        var type = detectType(cols);
        if (!type) {
          log('Cannot identify: ' + file.name, '#d29922');
          pending--; if (!pending) done(); return;
        }
        var parsed = [];
        if (type === 'shipments') parsed = parseShipments(res.data);
        else if (type === 'packages') parsed = parsePackages(res.data);
        else if (type === 'alarms') parsed = parseAlarms(res.data);
        else if (type === 'cpt') parsed = parseCPT(res.data);
        else if (type === 'equip') parsed = parseEquip(res.data);

        D[type] = D[type].concat(parsed);
        log('+' + parsed.length + ' ' + type + ' from ' + file.name, '#3fb950');
        pending--;
        if (!pending) done();
      },
      error: function() { pending--; if (!pending) done(); }
    });
  });

  function done() {
    prog.style.display = 'none';
    updateDots();
    refreshAll();
    document.getElementById('csv-input').value = '';
  }
}

function log(msg, color) {
  var el = document.getElementById('upload-log');
  el.style.display = 'block';
  el.innerHTML += '<div style="color:' + (color || '#8b949e') + '">' + msg + '</div>';
}

function clearAll() {
  D = { shipments: [], packages: [], alarms: [], cpt: [], equip: [] };
  Object.keys(CH).forEach(function(k) { CH[k].destroy(); });
  CH = {};
  updateDots();
  refreshAll();
  document.getElementById('upload-log').style.display = 'none';
  document.getElementById('upload-log').innerHTML = '';
  document.getElementById('status-lbl').textContent = 'No data loaded';
}

// ============================================================
// UI
// ============================================================
function switchTab(name) {
  document.querySelectorAll('.tb').forEach(function(t) { t.classList.remove('on'); });
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('on'); });
  document.getElementById('panel-' + name).classList.add('on');
  // Highlight the clicked tab
  event.target.classList.add('on');
}

function updateDots() {
  ['shipments', 'packages', 'alarms', 'cpt', 'equip'].forEach(function(k) {
    var el = document.getElementById('ds-' + k);
    if (el) el.classList.toggle('on', D[k].length > 0);
  });
  var total = D.shipments.length + D.packages.length + D.alarms.length + D.cpt.length + D.equip.length;
  document.getElementById('status-lbl').textContent = total ? total + ' records loaded' : 'No data loaded';
}

// ============================================================
// CHART HELPERS
// ============================================================
function mkChart(id, type, labels, datasets, opts) {
  var el = document.getElementById(id);
  if (!el) return;
  if (CH[id]) CH[id].destroy();
  var isPie = (type === 'pie' || type === 'doughnut');
  var cfg = {
    type: type,
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#8b949e', font: { size: 10 }, padding: 8, boxWidth: 10 } }
      },
      scales: {}
    }
  };
  if (!isPie) {
    cfg.options.scales.x = { ticks: { color: '#8b949e', font: { size: 9 } }, grid: { color: '#21262d' } };
    cfg.options.scales.y = { ticks: { color: '#8b949e', font: { size: 9 } }, grid: { color: '#21262d' } };
    if (opts && opts.stacked) { cfg.options.scales.x.stacked = true; cfg.options.scales.y.stacked = true; }
  } else {
    cfg.options.plugins.legend.position = 'right';
  }
  CH[id] = new Chart(el, cfg);
}

function barChart(id, labels, data, colors) {
  mkChart(id, 'bar', labels, [{ data: data, backgroundColor: colors || PAL.slice(0, data.length), borderRadius: 3, maxBarThickness: 36 }]);
}

function doughnut(id, labels, data) {
  mkChart(id, 'doughnut', labels, [{ data: data, backgroundColor: PAL.slice(0, data.length), borderWidth: 0 }]);
}

function kcard(container, lbl, val, sub, cls) {
  var d = document.createElement('div');
  d.className = 'kc' + (cls ? ' ' + cls : '');
  d.innerHTML = '<div class="lbl">' + lbl + '</div><div class="val">' + val + '</div><div class="sub">' + (sub || '') + '</div>';
  container.appendChild(d);
}

// ============================================================
// REFRESH ALL PANELS
// ============================================================
function refreshAll() {
  refreshOverview();
  refreshShipments();
  refreshPackages();
  refreshAlarms();
  refreshCPT();
  refreshEquip();
}

function refreshOverview() {
  var c = document.getElementById('kpi-overview');
  c.innerHTML = '';
  var totalPkgs = D.shipments.length;
  var misses = D.shipments.filter(function(r) { return r.l0 && r.l0.toLowerCase().indexOf('good') < 0; }).length;
  var missRate = pct(misses, totalPkgs);
  kcard(c, 'Total Shipments', totalPkgs || '-', totalPkgs ? 'packages processed' : 'Upload data');
  kcard(c, 'DEA Miss Rate', totalPkgs ? missRate + '%' : '-', misses + ' misses', missRate > 5 ? 'bad' : 'ok');
  kcard(c, 'Total Jams', D.alarms.length || '-', D.alarms.length ? 'events recorded' : '');
  kcard(c, 'Avg Jam Duration', D.alarms.length ? Math.round(D.alarms.reduce(function(a, r) { return a + r.duration; }, 0) / D.alarms.length) + 's' : '-', '');
  kcard(c, 'CPT Misses', D.cpt.filter(function(r) { return r.bucket && r.bucket.toLowerCase().indexOf('good') < 0; }).length || '-', '');
  kcard(c, 'Equip Changes', D.equip.length || '-', D.equip.length ? D.equip.filter(function(r) { return !r.isSystem; }).length + ' human' : '');

  // DEA distribution chart
  if (D.shipments.length) {
    var dist = countBy(D.shipments, function(r) { return r.l0 || 'Unknown'; });
    var entries = topN(dist, 6);
    doughnut('chart-dea-dist', entries.map(function(e) { return e[0]; }), entries.map(function(e) { return e[1]; }));
  }
  // Daily jams chart
  if (D.alarms.length) {
    var byDay = countBy(D.alarms, function(r) { return r.time.toISOString().slice(0, 10); });
    var days = Object.keys(byDay).sort();
    barChart('chart-daily-jams', days, days.map(function(d) { return byDay[d]; }), ['#f85149']);
  }
  // Missorts by chute
  if (D.packages.length) {
    var byChute = countBy(D.packages, function(r) { return r.lastChute || 'Unknown'; });
    var chuteTop = topN(byChute, 8);
    barChart('chart-chute-missorts', chuteTop.map(function(e) { return e[0]; }), chuteTop.map(function(e) { return e[1]; }), ['#d29922']);
  }
  // Equipment by type
  if (D.equip.length) {
    var byType = countBy(D.equip, function(r) { return r.typeOfChange || 'Other'; });
    var typeTop = topN(byType, 6);
    doughnut('chart-equip-types', typeTop.map(function(e) { return e[0]; }), typeTop.map(function(e) { return e[1]; }));
  }
}

function refreshShipments() {
  var c = document.getElementById('kpi-shipments');
  c.innerHTML = '';
  if (!D.shipments.length) { kcard(c, 'Shipments', '-', 'Upload shipment CSV'); return; }
  var good = D.shipments.filter(function(r) { return (r.l0 || '').toLowerCase().indexOf('good') >= 0; }).length;
  kcard(c, 'Total', D.shipments.length, '');
  kcard(c, 'Good', good, pct(good, D.shipments.length) + '%', 'ok');
  kcard(c, 'Missed', D.shipments.length - good, pct(D.shipments.length - good, D.shipments.length) + '%', 'bad');

  // L0 chart
  var l0 = countBy(D.shipments, function(r) { return r.l0 || 'Unknown'; });
  var l0e = topN(l0, 6);
  doughnut('chart-l0', l0e.map(function(e) { return e[0]; }), l0e.map(function(e) { return e[1]; }));

  // Route chart
  var routes = countBy(D.shipments, function(r) { return r.route || 'Unknown'; });
  var rte = topN(routes, 8);
  barChart('chart-routes', rte.map(function(e) { return e[0]; }), rte.map(function(e) { return e[1]; }));

  // Table
  var tbody = document.querySelector('#tbl-shipments tbody');
  tbody.innerHTML = D.shipments.slice(0, 100).map(function(r) {
    var cls = (r.l0 || '').toLowerCase().indexOf('good') >= 0 ? 'g' : 'r';
    return '<tr><td>' + r.barcode + '</td><td>' + r.slamDate + '</td><td>' + r.route + '</td><td>' + r.lastChute + '</td><td><span class="bx ' + cls + '">' + r.l0 + '</span></td><td>' + r.deaBucket + '</td></tr>';
  }).join('');
}

function refreshPackages() {
  var c = document.getElementById('kpi-packages');
  c.innerHTML = '';
  if (!D.packages.length) { kcard(c, 'Missorts', '-', 'Upload package CSV'); return; }
  kcard(c, 'Total Missorts', D.packages.length, '');
  var topChute = topN(countBy(D.packages, function(r) { return r.lastChute; }), 1);
  kcard(c, 'Top Offender', topChute.length ? topChute[0][0] : '-', topChute.length ? topChute[0][1] + ' missorts' : '', 'bad');

  var l0 = countBy(D.packages, function(r) { return r.l0 || 'Unknown'; });
  doughnut('chart-pkg-l0', Object.keys(l0), Object.values(l0));
  var l1 = countBy(D.packages, function(r) { return r.l1 || 'Unknown'; });
  var l1e = topN(l1, 8);
  barChart('chart-pkg-l1', l1e.map(function(e) { return e[0]; }), l1e.map(function(e) { return e[1]; }));

  var tbody = document.querySelector('#tbl-packages tbody');
  tbody.innerHTML = D.packages.map(function(r) {
    return '<tr><td>' + r.barcode + '</td><td>' + r.slamDate + '</td><td>' + r.route + '</td><td>' + r.lastChute + '</td><td><span class="bx r">' + r.l0 + '</span></td><td>' + r.l1 + '</td><td>' + r.l2 + '</td></tr>';
  }).join('');
}

function refreshAlarms() {
  var c = document.getElementById('kpi-alarms');
  c.innerHTML = '';
  if (!D.alarms.length) { kcard(c, 'Jams', '-', 'Upload alarms CSV'); return; }
  var avg = Math.round(D.alarms.reduce(function(a, r) { return a + r.duration; }, 0) / D.alarms.length);
  var maxJam = D.alarms.reduce(function(a, r) { return r.duration > a.duration ? r : a; }, D.alarms[0]);
  kcard(c, 'Total Jams', D.alarms.length, '');
  kcard(c, 'Avg Duration', avg + 's', '', avg > 60 ? 'warn' : 'ok');
  kcard(c, 'Max Duration', maxJam.duration + 's', maxJam.chute, 'bad');

  var byLoc = countBy(D.alarms, function(r) { return r.chute || 'Unknown'; });
  var locTop = topN(byLoc, 8);
  barChart('chart-jam-locs', locTop.map(function(e) { return e[0]; }), locTop.map(function(e) { return e[1]; }), ['#f85149']);

  // Duration buckets
  var durBuckets = { '0-30s': 0, '30-60s': 0, '60-120s': 0, '120s+': 0 };
  D.alarms.forEach(function(r) {
    if (r.duration <= 30) durBuckets['0-30s']++;
    else if (r.duration <= 60) durBuckets['30-60s']++;
    else if (r.duration <= 120) durBuckets['60-120s']++;
    else durBuckets['120s+']++;
  });
  barChart('chart-jam-dur', Object.keys(durBuckets), Object.values(durBuckets), ['#3fb950', '#d29922', '#ffa657', '#f85149']);

  var tbody = document.querySelector('#tbl-alarms tbody');
  tbody.innerHTML = D.alarms.slice(0, 100).map(function(r) {
    var cls = r.duration > 120 ? 'r' : r.duration > 60 ? 'y' : 'g';
    return '<tr><td>' + r.time.toLocaleString() + '</td><td><span class="bx ' + cls + '">' + r.duration + '</span></td><td>' + r.chute + '</td><td>' + r.description.slice(0, 50) + '</td><td>' + r.area + '</td></tr>';
  }).join('');
}

function refreshCPT() {
  var c = document.getElementById('kpi-cpt');
  c.innerHTML = '';
  if (!D.cpt.length) { kcard(c, 'CPT', '-', 'Upload CPT CSV'); return; }
  var misses = D.cpt.filter(function(r) { return r.bucket && r.bucket.toLowerCase().indexOf('good') < 0; });
  kcard(c, 'Total Records', D.cpt.length, '');
  kcard(c, 'CPT Misses', misses.length, pct(misses.length, D.cpt.length) + '% miss rate', misses.length > 0 ? 'bad' : 'ok');

  var byLane = countBy(misses, function(r) { return r.lane || 'Unknown'; });
  var laneTop = topN(byLane, 8);
  barChart('chart-cpt-lanes', laneTop.map(function(e) { return e[0]; }), laneTop.map(function(e) { return e[1]; }), ['#bc8cff']);

  var byBucket = countBy(misses, function(r) { return r.bucket || 'Unknown'; });
  doughnut('chart-cpt-buckets', Object.keys(byBucket), Object.values(byBucket));

  var tbody = document.querySelector('#tbl-cpt tbody');
  tbody.innerHTML = D.cpt.map(function(r) {
    var cls = r.bucket.toLowerCase().indexOf('good') >= 0 ? 'g' : 'r';
    return '<tr><td>' + r.lane + '</td><td>' + r.shift + '</td><td>' + r.date + '</td><td>' + r.cptTime + '</td><td><span class="bx ' + cls + '">' + r.bucket + '</span></td><td>' + r.location + '</td></tr>';
  }).join('');
}

function refreshEquip() {
  var c = document.getElementById('kpi-equip');
  c.innerHTML = '';
  if (!D.equip.length) { kcard(c, 'Equipment', '-', 'Upload equipment CSV'); return; }
  var human = D.equip.filter(function(r) { return !r.isSystem; });
  var system = D.equip.filter(function(r) { return r.isSystem; });
  kcard(c, 'Total Changes', D.equip.length, '');
  kcard(c, 'Human', human.length, pct(human.length, D.equip.length) + '%', 'b');
  kcard(c, 'System/Auto', system.length, pct(system.length, D.equip.length) + '%');

  var byUser = countBy(D.equip, function(r) { return r.userId || 'Unknown'; });
  var userTop = topN(byUser, 8);
  barChart('chart-equip-users', userTop.map(function(e) { return e[0]; }), userTop.map(function(e) { return e[1]; }));

  doughnut('chart-equip-human', ['Human', 'System'], [human.length, system.length]);

  var tbody = document.querySelector('#tbl-equip tbody');
  tbody.innerHTML = D.equip.map(function(r) {
    var cls = r.isSystem ? 'b' : 'y';
    return '<tr><td>' + r.dt.toLocaleString() + '</td><td><span class="bx ' + cls + '">' + r.userId + '</span></td><td>' + r.changeMade + '</td><td>' + r.typeOfChange + '</td><td>' + r.current + '</td><td>' + r.previous + '</td></tr>';
  }).join('');
}

// ============================================================
// DRAG & DROP
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener('dragover', function(e) { e.preventDefault(); });
  document.body.addEventListener('drop', function(e) {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
});
