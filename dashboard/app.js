// Token Radar's page: a sortable, filterable board, a detail view per protocol,
// and the live set aside. Reads window.RADAR (data.js, written by main.ts).
// No network, no framework: the page renders from the data it ships with.
(function () {
  'use strict';
  var R = window.RADAR;
  var rows = R.rows;
  // The watchlist is the snapshot's own list; the board marks it from the data.
  var wl = new Set(R.watchlist || []);
  rows.forEach(function (r) { r._wl = wl.has(r.slug); });

  var $ = function (id) { return document.getElementById(id); };
  var fmt$ = function (n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  };
  var fmtPct = function (v) {
    if (v === null || v === undefined) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
  };
  var fmtAge = function (d) {
    if (d === null || d === undefined) return '—';
    if (d < 30) return d + 'd';
    if (d < 365) return Math.round(d / 30) + 'mo';
    return (d / 365).toFixed(1) + 'y';
  };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // ---- stats -------------------------------------------------------------
  $('stats').innerHTML = [
    [R.board_size, 'protocols ranked'],
    [R.watchlist_size, 'on the watchlist'],
    [R.early_size, 'early finds below the floor'],
    [R.live_size, 'already launched'],
    [R.as_of, 'snapshot date'],
  ].map(function (s) { return '<div><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join('');

  // ---- filter options ----------------------------------------------------
  var cats = [], chains = [];
  rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  cats.forEach(function (c) { $('cat').add(new Option(c, c)); });
  chains.forEach(function (c) { $('chain').add(new Option(c, c)); });

  // ---- state -------------------------------------------------------------
  var state = { q: '', cat: '', chain: '', watch: false, sort: 'value', dir: -1, sel: null };
  var SORTS = {
    rank: function (a, b) { return a.rank - b.rank; },
    value: function (a, b) { return b.implied_value_usd - a.implied_value_usd || a.rank - b.rank; },
    tvl: function (a, b) { return b.tvl_usd - a.tvl_usd || a.rank - b.rank; },
    growth: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0) || a.rank - b.rank; },
    age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0) || a.rank - b.rank; },
    name: function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : a.rank - b.rank; },
  };

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (state.watch && !r._wl) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(SORTS[state.sort] || SORTS.value);
  }

  function render() {
    var list = filtered();
    $('count').textContent = list.length + ' of ' + rows.length + ' ranked protocols' +
      (state.watch ? ' · watchlist only' : '') + (state.cat ? ' · ' + state.cat : '') +
      (state.chain ? ' · ' + state.chain : '');
    $('rows').innerHTML = list.map(function (r) {
      var g = r.change_7d;
      var cls = g === null ? '' : (g >= 0 ? 'up' : 'down');
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.slug) + ' · ' + esc(r.category || '—') + '</span></td>' +
        '<td class="num">' + fmt$(r.tvl_usd) + '</td>' +
        '<td class="num ' + cls + '">' + fmtPct(g) + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td class="num"><b>' + fmt$(r.implied_value_usd) + '</b></td>' +
        '<td>' + (r._wl ? '<span class="badge">WATCHLIST</span>' : '<span class="badge early">EARLY</span>') + '</td></tr>';
    }).join('');
  }

  function showDetail(slug) {
    var r = rows.find(function (x) { return x.slug === slug; });
    var box = $('detail');
    if (!r) { box.className = 'detail'; box.innerHTML = ''; state.sel = null; render(); return; }
    state.sel = slug;
    var m = R.model;
    var base = Math.round(r.tvl_usd * m.base_multiple);
    var g = r.change_7d === null ? 0 : Math.max(m.growth_floor, Math.min(m.growth_cap, r.change_7d));
    box.className = 'detail open';
    box.innerHTML =
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="meta">Rank #' + r.rank + ' · ' + esc(r.slug) + ' · ' + esc(r.category || 'no category') + ' · ' +
      esc(r.chains.join(', ') || 'no chain listed') + ' · listed ' + esc(r.listed_at || 'unknown date') +
      (r._wl ? ' · <span class="badge">WATCHLIST</span>' : ' · <span class="badge early">EARLY FIND</span>') + '</p>' +
      '<h3>Why this value — the model, step by step</h3><div class="math">' +
      '<div><b>' + fmt$(base) + '</b><span>Base · TVL × ' + m.base_multiple + '</span></div>' +
      '<div><b>× ' + r.growth_multiplier.toFixed(2) + '</b><span>Growth · ' + fmtPct(g) + ' over 7 days</span></div>' +
      '<div><b>× ' + r.maturity_multiplier.toFixed(2) + '</b><span>Maturity · ' + fmtAge(r.age_days) + ' with no token</span></div>' +
      '<div><b>× ' + r.chain_multiplier.toFixed(2) + '</b><span>Reach · ' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</span></div>' +
      '<div><b>' + fmt$(r.implied_value_usd) + '</b><span>Implied value</span></div></div>' +
      '<h3>How to farm it — six steps</h3><ol class="steps">' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    render();
  }

  // ---- live table --------------------------------------------------------
  $('liverows').innerHTML = R.live.map(function (p) {
    var g = p.change_7d;
    var cls = g === null ? '' : (g >= 0 ? 'up' : 'down');
    return '<tr><td><b>' + esc(p.name) + '</b><span class="sub">' + esc(p.slug) + ' · ' + esc(p.category || '—') + '</span></td>' +
      '<td class="num">' + fmt$(p.tvl_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd === null ? '—' : fmt$(p.mcap_usd)) + '</td>' +
      '<td class="num ' + cls + '">' + fmtPct(g) + '</td></tr>';
  }).join('');

  // ---- model section -----------------------------------------------------
  var m = R.model;
  $('formula').innerHTML = 'Implied value = TVL × <code>' + m.base_multiple + '</code> × growth × maturity × reach. ' +
    'Growth clamps the 7-day TVL change to <code>' + m.growth_floor + '% … +' + m.growth_cap + '%</code> and weights it <code>' + m.growth_weight + '</code>. ' +
    'Maturity runs <code>' + m.maturity_floor + ' → ' + (m.maturity_floor + m.maturity_range) + '</code> over <code>' + m.maturity_days + '</code> days with no token. ' +
    'Reach adds <code>' + (m.chain_step * 100).toFixed(0) + '%</code> per chain, up to <code>' + m.chain_cap + '</code> chains. ' +
    'Model <code>' + esc(R.model_version) + '</code> — every signal comes from the snapshot, no name is ever special-cased.';
  $('src').textContent = 'Source: ' + R.source + ' · Floor $' + (R.floor_usd / 1e6) + 'M · ' + R.board_size + ' rows · ' + R.live_size + ' live';

  // ---- events ------------------------------------------------------------
  $('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  $('cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  $('watch').addEventListener('change', function (e) { state.watch = e.target.checked; render(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
  document.querySelectorAll('#board thead th[data-k]').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-k');
      state.sort = k === 'rank' ? 'rank' : (k === 'name' ? 'name' : (k === 'tvl' ? 'tvl' : (k === 'growth' ? 'growth' : (k === 'age' ? 'age' : 'value'))));
      render();
    });
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) { showDetail(tr.getAttribute('data-slug')); $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });

  // ---- deep links: #detail=<slug> · #watchlist · #cat=<name> · #chain=<name>
  function applyHash() {
    var h = location.hash.slice(1);
    var hasDetail = false;
    if (h) h.split('&').forEach(function (part) {
      var kv = part.split('=');
      if (kv[0] === 'detail') hasDetail = true;
    });
    // A filter link shows the board: close any open detail first.
    if (!hasDetail && state.sel !== null) { state.sel = null; $('detail').className = 'detail'; $('detail').innerHTML = ''; }
    if (!h) return;
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = kv[0], v = decodeURIComponent(kv[1] || '');
      if (k === 'detail' && v) showDetail(v);
      if (k === 'watchlist') { state.watch = true; $('watch').checked = true; }
      if (k === 'cat' && v) { state.cat = v; $('cat').value = v; }
      if (k === 'chain' && v) { state.chain = v; $('chain').value = v; }
      if (k === 'q' && v) { state.q = v; $('q').value = v; }
    });
    render();
  }
  render();
  applyHash();
  window.addEventListener('hashchange', applyHash);
})();
