(function () {
  'use strict';
  var ROOMS = __ROOMS__;
  var WORLD = __WORLD__;
  var W = 1408, H = 768;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function (id) { return document.getElementById(id); };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- World: rooms, progress and unlocking ---------- */
  // the room being played (set by enterRoom)
  var ROOM = null, HOTSPOTS = [], RESTORED_KEY = '', restored = new Set(), prog = {};
  var view = 'map';
  var mapMsg = '';
  // the bedroom keeps its original key so earlier progress is not lost
  function progressKey(id) { return id === 'treehouse-bedroom' ? 'mm_restored' : 'mm_restored_' + id; }
  function roomCount(r) { return new Set(store.get(progressKey(r.id), [])).size; }
  function roomDone(r) { return roomCount(r) >= r.hotspots.length; }
  function roomById(id) { return ROOMS.filter(function (r) { return r.id === id; })[0]; }
  // a room opens when the room it requires is finished (no requirement: always open)
  // (a room that already has saved progress stays open)
  function isUnlocked(r) { return !r.requires || roomDone(roomById(r.requires)) || roomCount(r) > 0; }
  var tables = store.get('mm_tables', [2, 5, 10]);
  var stats = store.get('mm_stats', {});
  var review = [];

  var STAGES = [
    { name: 'Cold and grey', msg: '' },
    { name: 'First flicker', msg: 'The room is starting to wake up.' },
    { name: 'Warming up', msg: 'It already feels warmer in here.' },
    { name: 'Nearly home', msg: 'Almost there. Only a few places are left.' },
    { name: 'Alive', msg: 'The whole room is alive!' }
  ];
  var GROUPS = [
    ['spark', 'Sparks', '1 sum'],
    ['incantation', 'Incantations', '3 to 4 sums'],
    ['ritual', 'Rituals', '6 sums'],
    ['finale', 'The finale', '8 sums']
  ];

  function stageIndex(n) {
    var f = n / HOTSPOTS.length;
    if (n >= HOTSPOTS.length) return 4;
    if (f >= 0.65) return 3;
    if (f >= 0.4) return 2;
    if (f >= 0.15) return 1;
    return 0;
  }
  function small(h) { return h.kind === 'spark' || h.kind === 'incantation'; }
  function lockLeft(h) {
    if (h.kind === 'ritual') {
      var n = HOTSPOTS.filter(function (x) { return small(x) && restored.has(x.id); }).length;
      return Math.max(0, 6 - n);
    }
    if (h.kind === 'finale') {
      return HOTSPOTS.filter(function (x) { return x.kind !== 'finale' && !restored.has(x.id); }).length;
    }
    return 0;
  }
  function byId(id) { return HOTSPOTS.filter(function (h) { return h.id === id; })[0]; }
  function nextSuggestion() {
    for (var i = 0; i < HOTSPOTS.length; i++) {
      var h = HOTSPOTS[i];
      if (!restored.has(h.id) && lockLeft(h) === 0) return h;
    }
    return null;
  }

  /* ---------- Room rendering ---------- */
  var grey = $('grey');
  var colourCv = $('colour'), cctx = colourCv.getContext('2d');
  var fxCv = $('fx'), fctx = fxCv.getContext('2d');
  var mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  var mctx = mask.getContext('2d');
  var colourImg = null;
  var ready = false;

  function ease(p) { return 1 - Math.pow(1 - p, 3); }

  function render() {
    if (!ready) return;
    cctx.globalCompositeOperation = 'source-over';
    cctx.clearRect(0, 0, W, H);
    cctx.drawImage(colourImg, 0, 0, W, H);
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, W, H);
    HOTSPOTS.forEach(function (h) {
      var p = prog[h.id];
      if (!p) return;
      var e = ease(p);
      mctx.save();
      mctx.globalAlpha = e;
      if (h.full) {
        mctx.fillStyle = '#fff';
        mctx.fillRect(0, 0, W, H);
      } else {
        h.shapes.forEach(function (s) {
          var k = 0.45 + 0.55 * e;
          mctx.save();
          mctx.translate(s[0], s[1]);
          mctx.scale(s[2] * k, s[3] * k);
          var g = mctx.createRadialGradient(0, 0, 0, 0, 0, 1);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(0.62, 'rgba(255,255,255,1)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          mctx.fillStyle = g;
          mctx.fillRect(-1, -1, 2, 2);
          mctx.restore();
        });
      }
      mctx.restore();
    });
    cctx.globalCompositeOperation = 'destination-in';
    cctx.drawImage(mask, 0, 0);
    cctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- Animation and sparkles ---------- */
  var anims = [], particles = [], raf = 0;
  var COLOURS = [[255, 214, 120], [120, 240, 215], [255, 255, 255], [255, 160, 190]];

  function spawn(h, n) {
    if (reduce) return;
    n = n || 36;
    for (var i = 0; i < n; i++) {
      var x, y;
      if (h.full) { x = Math.random() * W; y = Math.random() * H; }
      else {
        var s = h.shapes[i % h.shapes.length];
        var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
        x = s[0] + Math.cos(a) * s[2] * 0.6 * r;
        y = s[1] + Math.sin(a) * s[3] * 0.6 * r;
      }
      particles.push({
        x: x, y: y, vx: (Math.random() - 0.5) * 0.6, vy: -0.4 - Math.random() * 1.1,
        life: 0, max: 60 + Math.random() * 50, size: 6 + Math.random() * 12,
        c: COLOURS[Math.floor(Math.random() * COLOURS.length)]
      });
    }
  }
  function drawFx() {
    fctx.clearRect(0, 0, W, H);
    fctx.globalCompositeOperation = 'lighter';
    particles.forEach(function (p) {
      var a = Math.max(0, 1 - p.life / p.max);
      var g = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + (0.9 * a) + ')');
      g.addColorStop(1, 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',0)');
      fctx.fillStyle = g;
      fctx.beginPath(); fctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); fctx.fill();
    });
    fctx.globalCompositeOperation = 'source-over';
  }
  function tick(now) {
    raf = 0;
    anims = anims.filter(function (a) {
      var p = Math.max(0, Math.min(1, (now - a.t0) / a.dur));
      prog[a.id] = p;
      if (a.spawned === false && p > 0) { a.spawned = true; spawn(byId(a.id), a.n); }
      return p < 1;
    });
    particles = particles.filter(function (p) {
      p.life++; p.x += p.vx; p.y += p.vy; p.vy *= 0.995;
      return p.life < p.max;
    });
    render(); drawFx();
    if (anims.length || particles.length) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  function reveal(h, delay, n) {
    if (reduce) { prog[h.id] = 1; render(); return; }
    prog[h.id] = 0;
    anims.push({ id: h.id, t0: performance.now() + (delay || 0), dur: h.full ? 2600 : 1700, spawned: false, n: n });
    kick();
  }

  /* ---------- Spell effects: sparks, rune energy and flying digits ---------- */
  var sfx = { cv: null, ctx: null, parts: [], flights: [], orbs: [], gems: [], comets: [], rings: [], gatherCb: null, raf: 0, w: 0, h: 0 };
  var keyEls = {};
  var SPARK = [[255, 214, 120], [120, 240, 215], [255, 255, 255], [190, 160, 255]];

  function sfxSize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    sfx.w = sfx.cv.clientWidth; sfx.h = sfx.cv.clientHeight;
    sfx.cv.width = Math.round(sfx.w * dpr); sfx.cv.height = Math.round(sfx.h * dpr);
    sfx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function sfxInit() {
    var cv = document.createElement('canvas');
    cv.id = 'spellfx'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    sfx.cv = cv; sfx.ctx = cv.getContext('2d');
    sfxSize(); window.addEventListener('resize', sfxSize);
  }
  function sfxKick() { if (!sfx.raf) sfx.raf = requestAnimationFrame(sfxTick); }
  function sfxClear() { sfx.flights = []; sfx.orbs = []; sfx.gems = []; sfx.comets = []; sfx.gatherCb = null; }

  var HEX = [[0.25, 0.05], [0.75, 0.05], [1, 0.5], [0.75, 0.95], [0.25, 0.95], [0, 0.5]];
  function drawGem(c, x, y, s, rot) {
    c.save();
    c.translate(x, y); c.rotate(rot);
    c.shadowColor = 'rgba(255,200,70,0.9)'; c.shadowBlur = 14;
    c.beginPath();
    HEX.forEach(function (p, i) { var px = (p[0] - 0.5) * s, py = (p[1] - 0.5) * s; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
    c.closePath();
    var g = c.createLinearGradient(0, -s / 2, 0, s / 2);
    g.addColorStop(0, '#fff3b8'); g.addColorStop(1, '#e8a02a');
    c.fillStyle = g; c.fill();
    c.shadowBlur = 0; c.lineWidth = Math.max(1.5, s * 0.07); c.strokeStyle = '#9a6a1c'; c.stroke();
    c.restore();
  }
  function roomPoint(h) {
    var r = $('stage').getBoundingClientRect();
    var sx = h.full ? W / 2 : h.shapes[0][0], sy = h.full ? H / 2 : h.shapes[0][1];
    return { x: r.left + sx / W * r.width, y: r.top + sy / H * r.height };
  }

  function burst(x, y, n, o) {
    if (reduce) return;
    o = o || {};
    var cols = o.colours || SPARK;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (o.speed || 2.4) * (0.35 + Math.random() * 0.85);
      sfx.parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (o.lift || 0), g: o.g || 0.03,
        life: 0, max: (o.life || 32) + Math.random() * 18, size: (o.size || 3) + Math.random() * 3,
        c: cols[Math.floor(Math.random() * cols.length)]
      });
    }
    sfxKick();
  }

  /* The stone charges up with energy and throws off sparks */
  function zapKey(el) {
    if (!el) return;
    el.classList.remove('zap'); void el.offsetWidth; el.classList.add('zap');
    clearTimeout(el._zt); el._zt = setTimeout(function () { el.classList.remove('zap'); }, 650);
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 14, { speed: 2.8, size: 2.5 });
  }
  /* The number leaves the stone and travels to its place in the answer */
  function flyDigit(el, d, target) {
    var r = el.getBoundingClientRect();
    sfx.flights.push({
      d: d, x0: r.left + r.width / 2, y0: r.top + r.height / 2, target: target,
      t0: performance.now(), dur: 540, s0: 26, s1: parseFloat(getComputedStyle(target).fontSize) || 44, x: 0, y: 0, e: 0
    });
    sfxKick();
  }
  function flushFlights() {
    sfx.flights.forEach(function (f) { f.target.classList.add('in'); });
    sfx.flights = [];
  }
  function ansBurst(good) {
    var r = $('ans').getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (good) burst(x, y, 18, { speed: 3, lift: -0.5, size: 3, life: 34 });
    else burst(x, y, 14, { speed: 1.2, lift: 0.4, g: 0.05, size: 3, life: 36, colours: [[255, 147, 168], [220, 130, 160], [255, 220, 230]] });
  }

  function sfxTick(now) {
    sfx.raf = 0;
    var c = sfx.ctx;
    c.clearRect(0, 0, sfx.w, sfx.h);

    sfx.flights = sfx.flights.filter(function (f) {
      if (!f.target.isConnected) return false;
      var t = Math.min(1, Math.max(0, (now - f.t0) / f.dur));
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var tr = f.target.getBoundingClientRect();
      var x2 = tr.left + tr.width / 2, y2 = tr.top + tr.height / 2;
      var cx = (f.x0 + x2) / 2, cy = Math.min(f.y0, y2) - 70, u = 1 - e;
      f.x = u * u * f.x0 + 2 * u * e * cx + e * e * x2;
      f.y = u * u * f.y0 + 2 * u * e * cy + e * e * y2;
      f.e = e;
      for (var i = 0; i < 2; i++) {
        sfx.parts.push({
          x: f.x + (Math.random() - 0.5) * 8, y: f.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, g: 0,
          life: 0, max: 18 + Math.random() * 12, size: 2 + Math.random() * 3,
          c: SPARK[Math.floor(Math.random() * 2)]
        });
      }
      if (t >= 1) { f.target.classList.add('in'); burst(x2, y2, 16, { speed: 2.6, size: 2.5 }); return false; }
      return true;
    });

    sfx.orbs = sfx.orbs.filter(function (o) {
      if (!o.target.isConnected) return false;
      var t = Math.min(1, Math.max(0, (now - o.t0) / o.dur));
      var e = t * t * (3 - 2 * t);
      var tr = o.target.getBoundingClientRect();
      var x2 = tr.left + tr.width / 2, y2 = tr.top + tr.height / 2;
      var cx = (o.x0 + x2) / 2 + o.sway, cy = (o.y0 + y2) / 2, u = 1 - e;
      o.x = u * u * o.x0 + 2 * u * e * cx + e * e * x2;
      o.y = u * u * o.y0 + 2 * u * e * cy + e * e * y2;
      o.e = e;
      for (var i = 0; i < 3; i++) {
        var a = Math.random() * Math.PI * 2;
        sfx.parts.push({
          x: o.x + Math.cos(a) * 6, y: o.y + Math.sin(a) * 6, vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5, g: 0,
          life: 0, max: 16 + Math.random() * 12, size: 2 + Math.random() * 3, c: SPARK[Math.floor(Math.random() * 3)]
        });
      }
      if (t >= 1) { o.done(); return false; }
      return true;
    });

    /* the gems spiral in towards each other */
    sfx.gems = sfx.gems.filter(function (g) {
      var t = Math.min(1, Math.max(0, (now - g.t0) / g.dur));
      var e = t * t * t, a = e * g.swirl, dx = g.x0 - g.tx, dy = g.y0 - g.ty, k = 1 - e;
      g.x = g.tx + (dx * Math.cos(a) - dy * Math.sin(a)) * k;
      g.y = g.ty + (dx * Math.sin(a) + dy * Math.cos(a)) * k;
      g.rot = e * 3; g.s = g.size * (1 - 0.35 * e);
      if (t > 0 && t < 1) {
        sfx.parts.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, g: 0, life: 0, max: 14 + Math.random() * 10, size: 2 + Math.random() * 2, c: SPARK[Math.floor(Math.random() * 2)] });
      }
      return t < 1;
    });
    if (sfx.gatherCb && !sfx.gems.length) { var cb = sfx.gatherCb; sfx.gatherCb = null; cb(); }

    /* the merged comet flies to the spot in the room */
    sfx.comets = sfx.comets.filter(function (m) {
      var t = Math.min(1, Math.max(0, (now - m.t0) / m.dur));
      var e = t * t * (3 - 2 * t), tg = m.target();
      var cx = (m.x0 + tg.x) / 2 + m.sway, cy = Math.min(m.y0, tg.y) - 90, u = 1 - e;
      m.x = u * u * m.x0 + 2 * u * e * cx + e * e * tg.x;
      m.y = u * u * m.y0 + 2 * u * e * cy + e * e * tg.y;
      m.e = e; m.spin += 0.2;
      for (var i = 0; i < 4; i++) {
        var a = Math.random() * Math.PI * 2;
        sfx.parts.push({ x: m.x + Math.cos(a) * 8, y: m.y + Math.sin(a) * 8, vx: Math.cos(a) * 0.7, vy: Math.sin(a) * 0.7, g: 0, life: 0, max: 20 + Math.random() * 16, size: 2.5 + Math.random() * 3, c: SPARK[Math.floor(Math.random() * 3)] });
      }
      if (t >= 1) {
        burst(tg.x, tg.y, 46, { speed: 4.2, size: 3.5, life: 44 });
        sfx.rings.push({ x: tg.x, y: tg.y, t0: now, dur: 750, r: 110, c: '255,214,120' });
        sfx.rings.push({ x: tg.x, y: tg.y, t0: now + 120, dur: 900, r: 170, c: '120,240,215' });
        m.done();
        return false;
      }
      return true;
    });

    c.globalCompositeOperation = 'lighter';
    sfx.parts = sfx.parts.filter(function (p) {
      var a = Math.max(0, 1 - p.life / p.max), rad = p.size * 2.2;
      var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0, 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + (0.95 * a) + ')');
      g.addColorStop(1, 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',0)');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rad, 0, Math.PI * 2); c.fill();
      p.life++; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985;
      return p.life < p.max;
    });
    sfx.orbs.forEach(function (o) {
      var r = (24 - 8 * o.e) * 1.8;
      var g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
      g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,214,120,0.9)'); g.addColorStop(1, 'rgba(255,170,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, r, 0, Math.PI * 2); c.fill();
    });
    sfx.comets.forEach(function (m) {
      var r = (30 - 8 * m.e) * 2.2;
      var g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
      g.addColorStop(0, 'rgba(255,252,230,1)'); g.addColorStop(0.3, 'rgba(255,214,120,0.9)'); g.addColorStop(1, 'rgba(255,170,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.fill();
    });
    sfx.rings = sfx.rings.filter(function (rg) {
      var t = (now - rg.t0) / rg.dur;
      if (t < 0) return true;
      if (t >= 1) return false;
      c.lineWidth = 4 * (1 - t) + 1;
      c.strokeStyle = 'rgba(' + rg.c + ',' + (0.9 * (1 - t)) + ')';
      c.beginPath(); c.arc(rg.x, rg.y, rg.r * (1 - Math.pow(1 - t, 3)), 0, Math.PI * 2); c.stroke();
      return true;
    });
    c.globalCompositeOperation = 'source-over';

    sfx.gems.forEach(function (g) { drawGem(c, g.x, g.y, g.s, g.rot); });
    sfx.comets.forEach(function (m) {
      for (var i = 0; i < m.n; i++) {
        var a = m.spin + i * Math.PI * 2 / m.n, R = 30 * (1 - 0.75 * m.e) + 8;
        drawGem(c, m.x + Math.cos(a) * R, m.y + Math.sin(a) * R, 13, a);
      }
    });

    sfx.flights.forEach(function (f) {
      var size = f.s0 + (f.s1 - f.s0) * f.e + Math.sin(Math.PI * f.e) * 8;
      c.save();
      var halo = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, size * 1.2);
      halo.addColorStop(0, 'rgba(255,230,140,0.55)'); halo.addColorStop(1, 'rgba(255,230,140,0)');
      c.fillStyle = halo; c.beginPath(); c.arc(f.x, f.y, size * 1.2, 0, Math.PI * 2); c.fill();
      c.font = '800 ' + size + 'px Nunito, system-ui, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.lineJoin = 'round'; c.lineWidth = Math.max(2, size * 0.09); c.strokeStyle = 'rgba(70,40,5,0.9)';
      c.shadowColor = 'rgba(255,200,70,0.95)'; c.shadowBlur = 18;
      var ty = f.y + size * 0.36;
      c.strokeText(f.d, f.x, ty);
      var fg = c.createLinearGradient(0, ty - size, 0, ty);
      fg.addColorStop(0, '#fff6c2'); fg.addColorStop(1, '#ffc04a');
      c.fillStyle = fg; c.fillText(f.d, f.x, ty);
      c.restore();
    });

    if (sfx.flights.length || sfx.parts.length || sfx.orbs.length || sfx.gems.length || sfx.comets.length || sfx.rings.length) sfxKick();
  }

  /* ---------- Meter, markers, list ---------- */
  function updateMeter() {
    if (view === 'map') {
      var total = 0, got = 0, rooms = 0;
      ROOMS.forEach(function (r) { total += r.hotspots.length; got += roomCount(r); if (roomDone(r)) rooms++; });
      $('stageName').textContent = 'The whole world';
      $('count').textContent = rooms + ' of ' + ROOMS.length + ' rooms restored';
      $('barFill').style.width = (got / total * 100) + '%';
      return;
    }
    var n = restored.size, si = stageIndex(n);
    $('stageName').textContent = STAGES[si].name;
    $('count').textContent = n + ' of ' + HOTSPOTS.length + ' restored';
    $('barFill').style.width = (n / HOTSPOTS.length * 100) + '%';
  }

  var overlay = $('overlay');
  var cast = null;

  function pct(v, total) { return (v / total * 100) + '%'; }

  // markers are created once and only have their state changed, so their animations never restart
  var markers = {};

  function renderOverlay() {
    var casting = cast && !cast.finished;
    HOTSPOTS.forEach(function (h) {
      var m = markers[h.id];
      var show = !restored.has(h.id) && lockLeft(h) <= 0;
      if (!show) {
        if (m && !m.gone) {
          m.gone = true; m.classList.add('gone'); m.classList.remove('current');
          setTimeout(function () { if (m.gone && m.parentNode) m.parentNode.removeChild(m); delete markers[h.id]; }, 900);
        }
        return;
      }
      if (m && m.gone) { m.gone = false; m.classList.remove('gone'); }
      if (!m) {
        m = markers[h.id] = document.createElement('button');
        m.type = 'button'; m.className = 'marker'; m.setAttribute('data-kind', h.kind);
        m.setAttribute('aria-label', 'Cast ' + h.name + ', ' + h.sums + (h.sums === 1 ? ' sum' : ' sums'));
        m.title = h.name;
        var x = h.full ? 704 : h.shapes[0][0], y = h.full ? 70 : h.shapes[0][1];
        m.style.left = pct(x, W); m.style.top = pct(y, H);
        m.innerHTML = '<span class="dot"></span><span class="star"><svg viewBox="-50 -50 100 100" aria-hidden="true"><defs><radialGradient id="starHalo"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="0.45" stop-color="currentColor" stop-opacity="0.18"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient><radialGradient id="starCore"><stop offset="0" stop-color="#fffdf0"/><stop offset="0.5" stop-color="#fff3c4"/><stop offset="1" stop-color="currentColor"/></radialGradient></defs><circle r="50" fill="url(#starHalo)"/><path class="rays" d="M0,-44 Q4,-4 44,0 Q4,4 0,44 Q-4,4 -44,0 Q-4,-4 0,-44Z"/><path class="rays small" d="M0,-26 Q3,-3 26,0 Q3,3 0,26 Q-3,3 -26,0 Q-3,-3 0,-26Z" transform="rotate(45)"/><circle r="8" fill="url(#starCore)"/></svg></span>';
        m.addEventListener('click', function () { if (!(cast && !cast.finished)) startSpell(h.id); });
        overlay.appendChild(m);
        void m.offsetWidth;
      }
      m.classList.toggle('other', !!casting && cast.h !== h);
      m.classList.toggle('current', !!casting && cast.h === h);
      m.tabIndex = casting ? -1 : 0;
    });
  }

  var DIM_KEY = 'mm_dim';
  var dim = store.get(DIM_KEY, { other: 35, current: 100 });
  function applyDim() {
    overlay.style.setProperty('--other', dim.other / 100);
    overlay.style.setProperty('--current', dim.current / 100);
  }
  ['other', 'current'].forEach(function (k) {
    var el = $('dim-' + k);
    el.value = dim[k]; $('dimv-' + k).textContent = dim[k] + '%';
    el.addEventListener('input', function () {
      dim[k] = +el.value; $('dimv-' + k).textContent = dim[k] + '%';
      applyDim(); store.set(DIM_KEY, dim);
    });
  });
  applyDim();

  function renderChips() {
    var box = $('chips'); box.textContent = '';
    for (var t = 2; t <= 12; t++) {
      (function (t) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.textContent = t;
        b.setAttribute('aria-pressed', tables.indexOf(t) >= 0 ? 'true' : 'false');
        b.setAttribute('aria-label', t + ' times table');
        b.addEventListener('click', function () {
          var i = tables.indexOf(t);
          if (i >= 0) { if (tables.length > 1) tables.splice(i, 1); } else { tables.push(t); }
          tables.sort(function (a, b) { return a - b; });
          store.set('mm_tables', tables);
          renderChips();
        });
        box.appendChild(b);
      })(t);
    }
  }

  function renderList() {
    var box = $('spells'); box.textContent = '';
    GROUPS.forEach(function (g) {
      var items = HOTSPOTS.filter(function (h) { return h.kind === g[0]; });
      if (!items.length) return;
      var wrap = document.createElement('div'); wrap.className = 'group';
      var h3 = document.createElement('h3');
      var gem = document.createElement('span'); gem.className = 'gem ' + g[0];
      var sp = document.createElement('span'); sp.textContent = g[2];
      h3.appendChild(gem); h3.appendChild(document.createTextNode(g[1])); h3.appendChild(sp);
      wrap.appendChild(h3);
      var ul = document.createElement('ul');
      items.forEach(function (h) {
        var li = document.createElement('li');
        var b = document.createElement('button'); b.type = 'button'; b.className = 'spell-btn';
        var n = document.createElement('span'); n.className = 'n'; n.textContent = h.name;
        var s = document.createElement('span'); s.className = 's';
        var left = lockLeft(h);
        if (restored.has(h.id)) { b.className += ' done'; b.disabled = true; s.textContent = 'Restored'; }
        else if (left > 0) {
          b.disabled = true;
          s.textContent = h.kind === 'finale' ? 'Restore ' + left + ' more first' : 'Restore ' + left + ' more spells first';
        } else { s.textContent = h.sums + (h.sums === 1 ? ' sum' : ' sums'); }
        b.appendChild(n); b.appendChild(s);
        b.addEventListener('click', function () { startSpell(h.id); });
        li.appendChild(b); ul.appendChild(li);
      });
      wrap.appendChild(ul); box.appendChild(wrap);
    });
  }

  /* Pip speaks above the room */
  function say(text) { $('guide').textContent = text; }
  function idleGuide() {
    var n = restored.size;
    if (n === 0) say(ROOM.intro || 'Hello, I’m Pip! Everything has gone grey and cold. Pick a spell and cast it with your maths to bring it back to life.');
    else if (n >= HOTSPOTS.length) say('The whole room is alive again. Thank you!');
    else say('What shall we wake up next?');
  }

  function showIdle() {
    cast = null;
    sfxClear();
    document.body.classList.remove('casting');
    $('viewIdle').hidden = false; $('viewCast').hidden = true;
    renderList(); renderOverlay();
  }

  /* ---------- Casting ---------- */
  function keyOf(a, t) { return a + 'x' + t; }
  function pickFact() {
    var key, a, t;
    if (review.length && cast.gap >= 1) {
      key = review.shift();
    } else {
      var pool = [], total = 0;
      tables.forEach(function (tb) {
        for (var m = 1; m <= 12; m++) {
          var k = keyOf(m, tb);
          if (k === cast.lastKey) continue;
          var st = stats[k] || { miss: 0 };
          var w = 1 + Math.min(6, 2 * (st.miss || 0));
          pool.push([k, w]); total += w;
        }
      });
      var r = Math.random() * total;
      key = pool[0][0];
      for (var i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r <= 0) { key = pool[i][0]; break; } }
    }
    cast.gap++;
    cast.lastKey = key;
    var parts = key.split('x'); a = +parts[0]; t = +parts[1];
    return { key: key, a: a, t: t, ans: a * t, flip: Math.random() < 0.5, shownAt: Date.now() };
  }

  function renderPips() {
    var chain = $('chain'), n = cast.h.sums;
    chain.textContent = '';
    chain.className = 'chain' + (n === 1 ? ' single' : '');
    chain.style.setProperty('--p', '0');
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'pip' + (i === 0 ? ' next' : '');
      p.style.setProperty('--i', i);
      ['rim', 'well', 'shine'].forEach(function (cls) {
        var layer = document.createElement('i'); layer.className = cls; p.appendChild(layer);
      });
      chain.appendChild(p);
    }
    $('pips').setAttribute('aria-label', '0 of ' + n + ' sums cast');
  }

  /* The gem fills with liquid light, the chain glows, the next gem starts to call */
  function fillPip(idx, last) {
    var chain = $('chain'), pip = chain.children[idx];
    if (!pip) return;
    var n = cast.h.sums;
    pip.classList.remove('next'); pip.classList.add('on');
    if (!reduce) {
      pip.classList.remove('pop'); void pip.offsetWidth; pip.classList.add('pop');
      setTimeout(function () { pip.classList.remove('pop'); }, 750);
    }
    if (n > 1) chain.style.setProperty('--p', String(idx / (n - 1)));
    var nxt = chain.children[idx + 1];
    if (nxt) nxt.classList.add('next');
    var r = pip.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 22, { speed: 2.8, size: 3, life: 36 });
    if (last && !reduce) chain.classList.add('allpulse');
    $('pips').setAttribute('aria-label', (idx + 1) + ' of ' + n + ' sums cast');
  }
  /* The right answer melts into an orb of energy that flies up into its gem */
  function energyToPip(idx, last) {
    var pip = $('chain').children[idx];
    if (!pip) return;
    if (reduce) { fillPip(idx, last); return; }
    var ans = $('ans'), r = ans.getBoundingClientRect();
    var x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    ans.classList.add('melt');
    burst(x0, y0, 14, { speed: 2.2, lift: -0.8, size: 2.5 });
    sfx.orbs.push({
      x0: x0, y0: y0, x: x0, y: y0, e: 0, target: pip, t0: performance.now(), dur: 520,
      sway: (Math.random() < 0.5 ? -1 : 1) * 70,
      done: function () { fillPip(idx, last); }
    });
    sfxKick();
  }
  function showQuestion() {
    var f = cast.q = pickFact();
    $('qText').textContent = f.flip ? (f.t + ' × ' + f.a) : (f.a + ' × ' + f.t);
    cast.input = '';
    sfx.flights = [];
    var an = $('ans'); an.textContent = '?'; an.className = 'ans';
    $('q').classList.remove('fizz');
    cast.busy = false; setKeys(true);
    autoSolve();
  }
  /* Testing aid: when on, every question answers itself so a whole spell can be run through quickly */
  var autoOn = false;
  function autoSolve() {
    if (!autoOn || !cast) return;
    var tk = cast, q = cast.q;
    setTimeout(function () {
      if (!autoOn || cast !== tk || tk.q !== q || tk.busy || tk.finished) return;
      setAnswerInstant(String(q.ans));
      submit();
    }, 350);
  }
  function setKeys(on) {
    var ks = document.querySelectorAll('#keypad .key');
    for (var i = 0; i < ks.length; i++) ks[i].disabled = !on;
  }

  function startSpell(id, keepGuide) {
    var h = byId(id);
    if (!h || restored.has(id) || lockLeft(h) > 0) return;
    cast = { h: h, done: 0, input: '', busy: false, gap: 1, lastKey: '', finished: false, completing: false, q: null };
    sfxClear();
    document.body.classList.add('casting');
    $('viewIdle').hidden = true; $('viewCast').hidden = false;
    $('castName').textContent = h.name;
    var g = GROUPS.filter(function (x) { return x[0] === h.kind; })[0];
    $('castType').textContent = g ? (h.kind === 'finale' ? 'Finale' : g[1].replace(/s$/, '')) : '';
    $('castType').className = 'cast-type ' + h.kind;
    $('castBody').hidden = false; $('doneCard').hidden = true;
    if (!keepGuide) say(h.sums === 1 ? 'Just one sum. You can do it!' : h.sums + ' sums to cast this spell.');
    renderPips(); renderOverlay(); showQuestion();
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
      $('panel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  /* Spell complete: the gems lift off, spiral together, and fly as one comet to the spot that is about to wake */
  function completeSequence() {
    var tk = cast;
    if (!tk || tk.finished) return;
    tk.completing = true;
    if (reduce) { finishSpell(); return; }
    var chain = $('chain'), pips = [].slice.call(chain.children), n = pips.length;
    var rects = pips.map(function (p) { return p.getBoundingClientRect(); });
    var cx = 0, cy = 0;
    rects.forEach(function (r) { cx += r.left + r.width / 2; cy += r.top + r.height / 2; });
    cx /= n; cy /= n;
    var now = performance.now();
    rects.forEach(function (r, i) {
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      sfx.gems.push({ x0: x, y0: y, x: x, y: y, tx: cx, ty: cy, size: r.width, s: r.width, rot: 0, t0: now + i * 45, dur: 420, swirl: (i % 2 ? 1 : -1) * 0.5 });
    });
    chain.classList.add('lifted');
    pips.forEach(function (p) { p.classList.add('lifted'); });
    sfx.gatherCb = function () {
      if (cast !== tk || tk.finished) return;
      burst(cx, cy, 20, { speed: 3, size: 3 });
      sfx.comets.push({
        x0: cx, y0: cy, x: cx, y: cy, e: 0, spin: 0, n: tk.h.sums, t0: performance.now(), dur: 800,
        sway: (Math.random() < 0.5 ? -1 : 1) * 60,
        target: function () { return roomPoint(tk.h); },
        done: function () { if (cast === tk && !tk.finished) finishSpell(); }
      });
      sfxKick();
    };
    sfxKick();
  }

  function submit() {
    if (!cast || cast.busy || cast.finished) return;
    if (cast.input === '') { say('Type your answer, then press Cast.'); return; }
    flushFlights();
    var f = cast.q, val = parseInt(cast.input, 10);
    var st = stats[f.key] || { seen: 0, miss: 0 };
    st.seen++;
    if (val === f.ans) {
      var quick = (Date.now() - f.shownAt) < 6000;
      st.miss = Math.max(0, st.miss - 1);
      stats[f.key] = st; store.set('mm_stats', stats);
      cast.done++;
      var tk = cast, idx = cast.done - 1, last = cast.done >= cast.h.sums;
      if (last) cast.completing = true;
      $('ans').className = 'ans ok'; ansBurst(true);
      cast.busy = true; setKeys(false);
      say(last ? 'That’s the spell complete!' : (quick ? 'Quick-cast! Lovely and fast.' : 'Spell power!'));
      setTimeout(function () { if (cast === tk) energyToPip(idx, last); }, 250);
      setTimeout(function () { if (cast !== tk) return; if (last) completeSequence(); else showQuestion(); }, last ? 1000 : 1100);
    } else {
      st.miss++; stats[f.key] = st; store.set('mm_stats', stats);
      if (review.indexOf(f.key) < 0) review.push(f.key);
      cast.gap = 0;
      var q = $('q'); q.classList.remove('fizz'); void q.offsetWidth; q.classList.add('fizz');
      var an = $('ans'); an.textContent = f.ans; an.className = 'ans miss'; ansBurst(false);
      say('Fizzle! It was ' + f.ans + '. That one will come back later.');
      cast.busy = true; setKeys(false);
      var tw = cast;
      setTimeout(function () { if (cast === tw) showQuestion(); }, 2600);
    }
  }

  function finishSpell(quiet) {
    var h = cast.h;
    if (cast.finished) return;
    cast.finished = true;
    var before = stageIndex(restored.size);
    restored.add(h.id); store.set(RESTORED_KEY, Array.from(restored));
    var after = stageIndex(restored.size);
    reveal(h, 0);
    updateMeter();
    if (quiet) return;
    var nx = nextSuggestion();
    var opened = restored.size >= HOTSPOTS.length ? ROOMS.filter(function (r) { return r.requires === ROOM.id; }) : [];
    if (opened.length) mapMsg = 'A new room has opened: ' + opened.map(function (r) { return r.title; }).join(' and ') + '!';
    say(h.line + (after !== before ? ' ' + STAGES[after].msg : '') + (opened.length ? ' A new room has opened on the map!' : ''));
    if (nx) {
      // go straight to the next spell's first sum, so the panel never flashes the done card or the spell list
      var tk = cast;
      setTimeout(function () { if (cast === tk) startSpell(nx.id, true); }, reduce ? 400 : 700);
      renderOverlay();
      return;
    }
    $('castBody').hidden = true; $('doneCard').hidden = false;
    var box = $('doneBtns'); box.textContent = '';
    var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn';
    b2.textContent = 'Back to the room';
    b2.addEventListener('click', function () { idleGuide(); showIdle(); });
    if (restored.size >= HOTSPOTS.length) {
      var b3 = document.createElement('button'); b3.type = 'button'; b3.className = 'btn primary';
      b3.textContent = 'To the world map';
      b3.addEventListener('click', function () { showMap(); });
      box.appendChild(b3);
    }
    box.appendChild(b2);
    renderOverlay();
  }

  /* ---------- Keypad and input ---------- */
  function buildKeypad() {
    var pad = $('keypad'); pad.textContent = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Cast'].forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'key'; b.textContent = k;
      if (k === 'Clear') { b.className += ' util'; b.setAttribute('aria-label', 'Clear answer'); b.addEventListener('click', clearInput); }
      else if (k === 'Cast') { b.className += ' go'; b.addEventListener('click', submit); }
      else { keyEls[k] = b; b.addEventListener('click', function () { addDigit(k, b); }); }
      pad.appendChild(b);
    });
  }
  function addDigit(d, el) {
    if (!cast || cast.busy || cast.finished) return;
    if (cast.input.length >= 3) return;
    el = el || keyEls[d];
    var ans = $('ans');
    if (cast.input === '') ans.textContent = '';
    cast.input += d;
    var sp = document.createElement('span'); sp.className = 'd'; sp.textContent = d;
    ans.appendChild(sp);
    if (!el) { sp.classList.add('in'); return; }
    zapKey(el);
    if (reduce) { sp.classList.add('in'); return; }
    flyDigit(el, d, sp);
  }
  function clearInput() {
    if (!cast || cast.busy || cast.finished || cast.input === '') return;
    var ans = $('ans'), last = ans.lastElementChild;
    if (last) {
      sfx.flights = sfx.flights.filter(function (f) { return f.target !== last; });
      var r = last.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 10, { speed: 1.8, g: 0.04, colours: [[255, 214, 120], [255, 255, 255]] });
      ans.removeChild(last);
    }
    cast.input = cast.input.slice(0, -1);
    if (cast.input === '') ans.textContent = '?';
  }
  function setAnswerInstant(str) {
    sfx.flights = [];
    var ans = $('ans'); ans.textContent = '';
    cast.input = str;
    str.split('').forEach(function (ch) {
      var sp = document.createElement('span'); sp.className = 'd in'; sp.textContent = ch; ans.appendChild(sp);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!cast || cast.finished || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-nav')) return;
    if (e.key >= '0' && e.key <= '9') { e.preventDefault(); addDigit(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); clearInput(); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  $('backBtn').addEventListener('click', function () {
    if (cast && cast.completing && !cast.finished) finishSpell(true);
    idleGuide(); showIdle();
  });

  /* ---------- Prototype tools ---------- */
  $('hintBtn').addEventListener('click', function () {
    if (!cast || cast.busy || cast.finished) return;
    setAnswerInstant(String(cast.q.ans));
  });
  $('autoBtn').addEventListener('click', function () {
    autoOn = !autoOn;
    this.textContent = 'Auto-answer: ' + (autoOn ? 'on' : 'off');
    this.setAttribute('aria-pressed', autoOn);
    if (autoOn && cast && !cast.busy && !cast.finished) autoSolve();
  });
  $('allBtn').addEventListener('click', function () {
    var i = 0;
    HOTSPOTS.forEach(function (h) {
      if (!restored.has(h.id)) { restored.add(h.id); reveal(h, i * 140, 8); i++; }
    });
    store.set(RESTORED_KEY, Array.from(restored));
    updateMeter(); idleGuide(); showIdle();
  });
  var resetArmed = false, resetTimer = 0;
  $('resetBtn').addEventListener('click', function () {
    var b = $('resetBtn');
    if (!resetArmed) {
      resetArmed = true; b.textContent = 'Tap again to reset';
      resetTimer = setTimeout(function () { resetArmed = false; b.textContent = 'Reset the room'; }, 3000);
      return;
    }
    clearTimeout(resetTimer); resetArmed = false; b.textContent = 'Reset the room';
    restored.clear(); store.set(RESTORED_KEY, []);
    anims = []; particles = [];
    HOTSPOTS.forEach(function (h) { prog[h.id] = 0; });
    render(); drawFx(); updateMeter(); idleGuide(); showIdle();
  });

  /* ---------- World map: a painting of the great tree; each room wakes into colour as you restore it ---------- */
  var mapGrey = null, mapMask = document.createElement('canvas');
  mapMask.width = W; mapMask.height = H;
  // how much colour a room has on the map: none while locked, half when open, all of it when restored
  function roomColour(r) {
    if (!isUnlocked(r)) return 0;
    if (roomDone(r)) return 1;
    return 0.5 + 0.5 * roomCount(r) / r.hotspots.length;
  }
  // a grey, darkened copy of the painting (built once from the picture's pixels)
  function loadMapGrey(cb) {
    if (mapGrey) { cb(); return; }
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      x.drawImage(img, 0, 0, W, H);
      try {
        var d = x.getImageData(0, 0, W, H), p = d.data;
        for (var i = 0; i < p.length; i += 4) { p[i] = p[i + 1] = p[i + 2] = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * 0.55; }
        x.putImageData(d, 0, 0);
      } catch (e) { x.fillStyle = 'rgba(14,16,28,0.8)'; x.fillRect(0, 0, W, H); }
      mapGrey = c; cb();
    };
    img.src = WORLD.img;
  }
  function drawMapVeil() {
    if (!mapGrey) return;
    var m = mapMask.getContext('2d');
    m.clearRect(0, 0, W, H);
    ROOMS.forEach(function (r) {
      var s = r.map, v = 1 - roomColour(r);
      if (v <= 0) return;
      m.save();
      m.globalAlpha = v;
      m.translate(s[0], s[1]); m.scale(s[2], s[3]);
      var g = m.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.62, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      m.fillStyle = g; m.fillRect(-1, -1, 2, 2);
      m.restore();
    });
    var c = $('mapVeil').getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
    c.drawImage(mapGrey, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(mapMask, 0, 0);
    c.globalCompositeOperation = 'source-over';
  }
  function roomState(r) { return !isUnlocked(r) ? 'locked' : roomDone(r) ? 'done' : 'open'; }
  function roomInfo(r) {
    var got = roomCount(r), total = r.hotspots.length;
    return !isUnlocked(r) ? 'Locked' : roomDone(r) ? 'Restored' : got === 0 ? 'Tap to enter' : got + ' of ' + total + ' restored';
  }
  function tapRoom(r) {
    if (!isUnlocked(r)) { $('mapGuide').textContent = 'This room is still asleep. Wake up the ' + roomById(r.requires).title + ' first and it will open.'; return; }
    enterRoom(r);
  }
  function renderMap() {
    var map = $('map'), list = $('mapList');
    [].slice.call(map.querySelectorAll('.node')).forEach(function (n) { map.removeChild(n); });
    list.textContent = '';
    $('mapImg').src = WORLD.img;
    loadMapGrey(drawMapVeil);
    ROOMS.forEach(function (r) {
      var st = roomState(r), s = r.map, need = r.requires && roomById(r.requires);
      var label = r.title + ', ' + (st === 'locked' ? 'locked. Finish the ' + need.title + ' first' : st === 'done' ? 'restored' : roomCount(r) + ' of ' + r.hotspots.length + ' restored');
      // an invisible button over the room's place in the painting
      var node = document.createElement('button');
      node.type = 'button'; node.className = 'node ' + st;
      node.style.left = (s[0] / W * 100) + '%'; node.style.top = (s[1] / H * 100) + '%';
      node.style.width = (s[2] * 2 / W * 100) + '%'; node.style.height = (s[3] * 2 / H * 100) + '%';
      node.setAttribute('aria-label', label);
      if (st === 'locked') node.setAttribute('aria-disabled', 'true');
      var tag = document.createElement('span'); tag.className = 'tag';
      var nm = document.createElement('b'); nm.textContent = r.title;
      var inf = document.createElement('small'); inf.textContent = roomInfo(r);
      tag.appendChild(nm); tag.appendChild(inf); node.appendChild(tag);
      node.addEventListener('click', function () { tapRoom(r); });
      map.appendChild(node);
      // the same rooms as a list under the map (used on small screens)
      var li = document.createElement('button');
      li.type = 'button'; li.className = 'room-btn ' + st;
      var a = document.createElement('span'); a.textContent = r.title;
      var b = document.createElement('small'); b.textContent = roomInfo(r);
      li.appendChild(a); li.appendChild(b);
      if (st === 'locked') li.setAttribute('aria-disabled', 'true');
      li.addEventListener('click', function () { tapRoom(r); });
      list.appendChild(li);
    });
  }
  function nextRooms() { return ROOMS.filter(function (r) { return isUnlocked(r) && !roomDone(r); }); }
  function mapGuide() {
    var any = ROOMS.some(function (r) { return roomCount(r) > 0; });
    var next = nextRooms();
    var text = mapMsg || (!next.length ? 'Every room is awake again. You did it!'
      : !any ? 'Welcome to the great tree! Tap the glowing room to begin. Finish a room and the next one opens.'
      : next.length === 1 ? 'Next up: the ' + next[0].title + '. Tap the glowing room to go in.'
      : 'Which room shall we wake up? Tap a glowing room.');
    mapMsg = '';
    $('mapGuide').textContent = text;
  }
  function showMap() {
    if (view === 'room' && ROOM) {
      if (cast && cast.completing && !cast.finished) finishSpell(true);
      cast = null; sfxClear(); anims = []; particles = [];
      document.body.classList.remove('casting');
    }
    view = 'map';
    $('roomView').hidden = true; $('mapView').hidden = false;
    $('roomName').textContent = 'World map';
    renderMap(); mapGuide(); updateMeter();
    window.scrollTo(0, 0);
  }
  function enterRoom(r) {
    ROOM = r; HOTSPOTS = r.hotspots; RESTORED_KEY = progressKey(r.id);
    restored = new Set(store.get(RESTORED_KEY, []));
    prog = {}; HOTSPOTS.forEach(function (h) { prog[h.id] = restored.has(h.id) ? 1 : 0; });
    anims = []; particles = []; cast = null; sfxClear();
    overlay.textContent = ''; markers = {};
    view = 'room';
    $('mapView').hidden = true; $('roomView').hidden = false;
    $('roomName').textContent = r.title;
    ready = false;
    grey.alt = r.alt; grey.src = r.img;
    var img = colourImg = new Image();
    img.onload = function () { if (colourImg === img) { ready = true; render(); drawFx(); } };
    img.src = r.img;
    updateMeter(); idleGuide(); showIdle();
    window.scrollTo(0, 0);
  }
  $('mapBtn').addEventListener('click', showMap);
  var resetAllArmed = false, resetAllTimer = 0;
  $('resetAllBtn').addEventListener('click', function () {
    var b = $('resetAllBtn');
    if (!resetAllArmed) {
      resetAllArmed = true; b.textContent = 'Tap again to reset every room';
      resetAllTimer = setTimeout(function () { resetAllArmed = false; b.textContent = 'Reset all progress'; }, 3000);
      return;
    }
    clearTimeout(resetAllTimer); resetAllArmed = false; b.textContent = 'Reset all progress';
    ROOMS.forEach(function (r) { store.set(progressKey(r.id), []); });
    mapMsg = ''; renderMap(); mapGuide(); updateMeter();
  });

  /* ---------- Start ---------- */
  function boot() {
    sfxInit();
    buildKeypad(); renderChips();
    showMap();
  }
  boot();
})();
