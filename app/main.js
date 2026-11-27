/* CleanFrame Home. Static materials, local preferences and public Tizen app controls. */
(function () {
  'use strict';

  // UI language. T(english[, {name, n, ...}]) returns the TV-language string (English if none).
  function T(s, params) { return window.FrameI18n ? window.FrameI18n.t(s, params) : s; }

  /* ---------- Bundled data ---------- */
  var ASSETS = 'assets/', ICONS = ASSETS + 'icons/', WP = ASSETS + 'wallpapers/';
  // Extra bundled marks that saved native apps may use (see device.js EXTRA_BRANDS).
  var MARK_BRANDS = ['hbomax', 'spotify', 'tubi', 'crunchyroll', 'airplay', 'globoplay', 'xbox', 'streamiso', 'internet', 'emanual', 'devicecare', 'mercadoplay', 'twitch', 'alexa', 'security', 'camera'];
  var CAP = 64, SCRIM_Y = 560, DOCK_COLS = 5, DOCK_ROWS = 2, DOCK_ROW_GAP = 16;
  // HDMI inputs dock below the app grid: tile size, dock height and gap above it.
  var IN_TW = 336, IN_TH = 96, IN_PITCH = 344, IN_H = IN_TH + 32, IN_GAP = 24;
  // TVs with more sources narrow the tiles down to IN_MIN_TW, then scroll within IN_MAXW.
  var IN_MAXW = 1728, IN_MIN_TW = 264;
  // Saved antenna channels: one column to the right of the app grid, scrolling vertically.
  var CH_TW = 168, CH_TH = 104, CH_PITCH = 112, CH_W = CH_TW + 32, CH_GAP = 24;
  // Saved channels live in the preferences (c.channels); channels.js is the first-run list.
  // Each entry: { num, major, minor, name, icon }; minor 0 = analog or no subchannel.
  var CH_MAX = 64, CH_ICONS = [['globo', /globo/i], ['record', /record/i], ['sbt', /\bsbt\b/i], ['band', /\bband\b|bandeirantes/i]];
  function chNum(major, minor) { return (major < 10 ? '0' : '') + major + (minor ? '.' + minor : ''); }
  function chIcon(name) { for (var i = 0; i < CH_ICONS.length; i++) if (CH_ICONS[i][1].test(name)) return CH_ICONS[i][0]; return ''; }
  function sameChannel(a, b) { return a.major === b.major && (a.minor === b.minor || (!(a.minor > 0) && !(b.minor > 0))); }
  function cleanChannel(c) {
    if (!c || typeof c.major !== 'number' || !isFinite(c.major) || c.major < 0 || Math.floor(c.major) !== c.major) return null;
    var minor = typeof c.minor === 'number' && isFinite(c.minor) && c.minor > 0 ? Math.floor(c.minor) : 0;
    var name = typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 40) : chNum(c.major, minor);
    return { key: 'ch' + c.major + '.' + minor, major: c.major, minor: minor, name: name,
      num: typeof c.num === 'string' && c.num ? c.num.slice(0, 8) : chNum(c.major, minor),
      icon: typeof c.icon === 'string' && /^[a-z0-9-]{1,40}$/.test(c.icon) ? c.icon : chIcon(name) };
  }
  function cleanChannels(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (c) {
      var ch = cleanChannel(c);
      if (ch && out.length < CH_MAX && !out.some(function (o) { return sameChannel(o, ch); })) out.push(ch);
    });
    return out;
  }
  function stripChannel(ch) { return { num: ch.num, major: ch.major, minor: ch.minor, name: ch.name, icon: ch.icon }; }
  var CH_ALL = { key: 'ch-all', kind: 'all' };
  // Column items: saved channels, then "All channels".
  function colItems() { return (S.c.channels || []).concat([CH_ALL]); }
  var DOCK_MODES = { both: { tw: 288, th: 200, pitch: 296 }, text: { tw: 288, th: 104, pitch: 296 }, icons: { tw: 176, th: 144, pitch: 184 } };
  var GRID_ROW = 240, GRID_COL = 344, COLS = 5;
  var ED_ROW = 80, ED_SEP = 56, ED_VIEW = 752;
  var PH_TOP = 220, PH_PITCH = 128, PH_FULL = 5, PH_HEIGHT = 944, PH_COMPACT_TOP = 144, PH_COMPACT_PITCH = 88, PH_COMPACT_VISIBLE = 9;
  var WALL_VISIBLE = 6, WALL_ROW = 92, WALL_DELAY = 200;
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 10009: 'back', 461: 'back' };
  var FULL = T('Home is full. Remove an app first.'), LAST = T('Home needs one app');

  var PRIMARY_APPS = [
    { id: 'stremio', name: 'Stremio', mark: true, appId: 'IkWsFHtOY9.Stremio' },
    { id: 'netflix', name: 'Netflix', mark: true, appId: 'org.tizen.netflix-app' },
    { id: 'disneyplus', name: 'Disney+', mark: true, appId: 'MCmYXNxgcu.DisneyPlus' },
    { id: 'youtube', name: 'YouTube', mark: true, appId: '9Ur5IzDKqV.TizenYouTube' },
    { id: 'appletv', name: 'Apple TV', mark: true, appId: 'com.samsung.tv.aria-video' },
    { id: 'primevideo', name: 'Prime Video', mark: true, appId: 'org.tizen.primevideo' },
    { id: 'abciview', name: 'ABC iview', mark: true, appId: 'mWK87Xghap.ABCiview' },
    { id: 'sbs', name: 'SBS On Demand', mark: true, appId: 'OyE7OuxlUi.SBSOnDemand' },
    { id: 'applemusic', name: 'Apple Music', mark: true, appId: 'org.tizen.apple.apple-music' }
  ];
  var PRIMARY = PRIMARY_APPS.map(function (a) { return a.id; }), APPS = PRIMARY_APPS.slice(), ALPHA = [];
  var WALLS = window.CleanFrameWallpapers || [{ id: 'misty', name: 'Misty coast', tone: 'light', ut: { tr: 'mist', br: 'mist' }, frostVeil: .20 }];
  var ADAPTIVE_INK = window.CleanFrameAdaptiveInk || {};
  WALLS.forEach(function (w) { w.ut = w.ut || { tr: 'light', br: 'light' }; w.frostVeil = w.frostVeil || .12; });
  var MODES = [
    { id: 'fixed', name: T('Fixed'), min: 0 }, { id: 'open', name: T('Each time Home opens'), min: 0 },
    { id: '5', name: T('Every 5 minutes'), min: 5 }, { id: '15', name: T('Every 15 minutes'), min: 15 },
    { id: '60', name: T('Every hour'), min: 60 }
  ];
  var KEY = 'cleanframe.home.v1', storageOk = true, catalog = { loading: false, loaded: false, error: null, request: 0, revision: 0 };
  var QA = window.ShoreQA = { minuteMs: window.ShoreQA && window.ShoreQA.minuteMs || 60000 };
  var FONTS = {
    manrope: { name: 'Manrope', family: 'Manrope', display: 600, ui: 500, clock: 500 },
    montreal: { name: 'Neue Montreal', family: 'Study Montreal', display: 300, ui: 400, clock: 300 },
    mori: { name: 'Mori', family: 'Study Mori', display: 200, ui: 400, clock: 200 },
    pangram: { name: 'Pangram Sans', family: 'Study Pangram', display: 300, ui: 400, clock: 300 },
    geist: { name: 'Geist', family: 'Study Geist', display: 300, ui: 400, clock: 300 },
    newsreader: { name: 'Newsreader', family: 'Study Newsreader', display: 400, ui: 400, clock: 400 }
  };
  var PRIVATE_FONTS = window.CleanFramePrivateFontIDs || [], fontMetrics = {}, unavailableFonts = {}, widthCache = {}, fontRevision = 0, fontsReady = false;
  var LOOK_VALUES = { bg: ['dark', 'light'], opacity: ['25', '50', '75', '100'], chdock: ['right', 'left'], indock: ['below', 'above'], layout: ['list', 'dock'], apps: ['icons', 'both', 'text'], font: Object.keys(FONTS).filter(function (id) { return id === 'manrope' || PRIVATE_FONTS.indexOf(id) >= 0; }), controls: ['icons', 'both', 'text'], focus: ['type', 'glass'], material: ['soft', 'frost', 'tint'] };
  var LOOK_NAMES = { bg: T('Background'), layout: T('Layout'), apps: T('Apps'), font: T('Font'), controls: T('Home controls'), focus: T('Focus'), material: T('Material') };
  var VALUE_NAMES = { custom: T('Custom order'), az: T('Name A–Z'), za: T('Name Z–A'), recent: T('Recently used'), oldest: T('Least used'), on: T('On'), off: T('Off'), dark: T('Dark'), light: T('Light'), photo: T('Photo'), list: T('List'), dock: T('Dock'), type: T('Type'), glass: T('Glass'), soft: T('Soft'), frost: T('Frost'), tint: T('Clear tint'), icons: T('Icons'), both: T('Icons and text'), text: T('Text'), left: T('Left'), right: T('Right'), center: T('Center'), above: T('Above'), below: T('Below') };
  var UTIL = { home: [T('Home'), 'home'], tv: [T('Controls'), 'controls'], art: [T('Art Mode'), 'art'], apps: [T('All apps'), 'apps'], channels: [T('All channels'), 'channels'], arrange: [T('Arrange'), 'arrange'], settings: [T('Settings'), 'settings'] };
  var MSG = {
    leave: { title: T('Leave Home?'), line: T('Open Samsung Home?'), note: '', actions: [['stay', T('Stay')], ['samsung', T('Samsung Home')]] }
  };
  var SVG = {
    art: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.8" r="1.5"/><path d="m4.5 17.5 4.5-4.5 3 3 2.5-2.5 5 5"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    arrange: '<path d="M4 8.5h14M15 5.5l3 3-3 3M20 15.5H6M9 12.5l-3 3 3 3"/>',
    settings: '<path d="m9 3-.6 2.4-2 1.2L4 6l-2 3.5L3.8 11v2L2 14.5 4 18l2.4-.6 2 1.2L9 21h6l.6-2.4 2-1.2 2.4.6 2-3.5-1.8-1.5v-2L22 9.5 20 6l-2.4.6-2-1.2L15 3Z"/><circle cx="12" cy="12" r="3.2"/>',
    home: '<path d="M4 11 12 4.5l8 6.5v8a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"/>',
    undo: '<path d="M9 6 5 10l4 4"/><path d="M5 10h9.5a4.5 4.5 0 0 1 0 9H11"/>',
    check: '<path d="m5.5 12.5 4 4 9-9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>',
    right: '<path d="m9.5 5 7 7-7 7"/>',
    up: '<path d="m5 15.5 7-7 7 7"/>',
    down: '<path d="m5 8.5 7 7 7-7"/>',
    updown: '<path d="m7.5 9.5 4.5-4.5 4.5 4.5M7.5 14.5l4.5 4.5 4.5-4.5"/>',
    tv: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7"/>',
    channels: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M8 9h9M8 12h9M8 15h6"/>',
    controls: '<path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2.6"/><circle cx="15" cy="16" r="2.6"/>',
    input: '<path d="M3.5 8h17v5.5L18 17H6l-2.5-3.5Z"/><path d="M8 11.5h8"/>',
    'wx-sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    'wx-moon': '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    'wx-cloud': '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 10 4.25 4.25 0 0 0 7 18.5Z"/>',
    'wx-partly': '<path d="M8.5 3.5V5M3 8.5h1.5M4.6 4.6l1 1M12.4 4.6l-1 1"/><path d="M5.2 11.2a3.5 3.5 0 0 1 6.3-3.4"/><path d="M9 19.5h8.5a3.5 3.5 0 0 0 .5-6.95A4.75 4.75 0 0 0 8.9 12 3.75 3.75 0 0 0 9 19.5Z"/>',
    'wx-rain': '<path d="M7 14.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 6 4.25 4.25 0 0 0 7 14.5Z"/><path d="M8.5 17.5 7.5 20M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    'wx-storm': '<path d="M7 14.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 6 4.25 4.25 0 0 0 7 14.5Z"/><path d="m12.5 15.5-2 3.5h3l-2 3.5"/>',
    'wx-snow': '<path d="M7 14.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 6 4.25 4.25 0 0 0 7 14.5Z"/><path d="M8 18v.1M12 19.5v.1M16 18v.1M10 21.5v.1M14 21.5v.1"/>',
    'wx-fog': '<path d="M4 8h16M6 12h12M4 16h16M8 20h8"/>',
    remote: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8.5 20h7M10 12.5l4.5-4.5M11 8h3.5v3.5"/>',
    guide: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.8-1.1 1.5v.4M12 16.9v.1"/>',
    warn: '<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4.5M12 17.3v.1"/>'
  };

  /* ---------- State ---------- */
  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var S = {
    variant: 'B', geom: 'broad', c: null, stack: null,
    inputs: [], wx: null, sel: null, selIdx: 0, lastUtil: 0, appsFocus: null, settingsFocus: 'background', appearanceFocus: 'bg', detailFocus: {},
    undo: [], removedAt: {}, note: null, err: null,
    writes: 0, failed: 0, log: [], logN: 0, lastLaunch: null, press: null,
    wallShown: null, wallPending: null, wallError: null,
    shown: null, pending: null, lookError: null, bundleKey: null, previewBundle: null, reflow: false, fontSwitch: false
  };
  var scroll = { first: 0, off: 0, photo: 0, photoArrange: 0, ch: 0, inp: 0 };
  function pick(v, list, fallback) {
    v = String(v || '').toLowerCase();
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === v) return list[i];
    return fallback;
  }
  function lookOf(c) { return { bg: c.bg, opacity: c.opacity, chdock: c.chdock, indock: c.indock, wall: c.wall, layout: c.layout, apps: c.apps, font: c.font, controls: c.controls, focus: c.focus, material: c.material }; }
  function materialApplies(c) { c = c || S.c; return c.bg === 'photo' && (c.layout === 'dock' || c.focus === 'glass'); }

  /* ---------- Helpers ---------- */
  function app(id) { for (var i = 0; i < APPS.length; i++) if (APPS[i].id === id) return APPS[i]; return null; }
  function wall(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return WALLS[i]; return null; }
  function wallIndex(id) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return i; return 0; }
  function frostClass(w) { var i = [.12, .20, .30, .36, .44].indexOf(w.frostVeil); return i > 0 ? ' fv-' + (i + 1) : ''; }
  function wallClasses(w) { return frostClass(w) + (w.listColumn ? ' lc-' + w.listColumn : '') + (w.dockQuiet ? ' db-quiet' : '') + (w.clockMist ? ' tl-mist' : ''); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function without(list, id) { return list.filter(function (x) { return x !== id; }); }
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function onHome(id) { return S.c.home.indexOf(id) >= 0; }
  function top() { return S.stack[S.stack.length - 1]; }
  function push(e) { S.stack.push(e); return e; }
  function pop() { if (S.stack.length > 1) S.stack.pop(); }
  function px(n) { return n.toFixed(2) + 'px'; }
  function icon(name, cls, underlay) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">'
      + (underlay ? '<g class="ut-underlay" transform="translate(0 .5)">' + SVG[name] + '</g><g class="ut-ink">' + SVG[name] + '</g>' : SVG[name]) + '</svg>';
  }
  function badge(on) {
    return on
      ? '<svg class="badge is-on" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path class="badge-tick" d="m7.6 12.4 3 3 5.8-6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg class="badge is-off" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  }
  // Filled device icon framed in a box; a mask keeps it monochrome, with an <img> fallback.
  function deviceIcon(name, size) {
    size = size || 40; var url = ICONS + name + '.svg';
    return maskSupport
      ? '<span class="dev-mark" style="width:' + size + 'px;height:' + size + 'px;-webkit-mask-image:url(' + url + ');mask-image:url(' + url + ')"></span>'
      : '<img class="dev-mark-img" alt="" src="' + url + '" style="width:' + size + 'px;height:' + size + 'px">';
  }
  function log(text) { S.log.unshift('#' + (++S.logN) + ' ' + text); if (S.log.length > 10) S.log.pop(); }

  var maskSupport = 'webkitMaskImage' in document.documentElement.style || 'maskImage' in document.documentElement.style, markProbes = {};
  function probeMark(id) {
    if (markProbes[id]) return;
    var im = new Image(); markProbes[id] = 'loading';
    im.onload = function () { markProbes[id] = 'ok'; };
    im.onerror = function () {
      markProbes[id] = 'bad';
      Array.prototype.forEach.call(document.querySelectorAll('[data-mark="' + id + '"]'), function (el) { el.className += ' is-bad'; });
    };
    im.src = ICONS + id + '.svg';
  }
  /* Optical placement is identical for the CSS mask and the image fallback. */
  function markHtml(id, w, h, size) {
    var m = window.FrameIconMetrics && window.FrameIconMetrics[id], st;
    if (m) {
      var weight = clamp(Math.pow(0.45 / m.fill, 0.3), 0.84, 1.25);
      var k = Math.min(w / m.w, h / m.h, size * weight / Math.sqrt(m.w * m.h)), s = m.n * k;
      st = 'width:' + px(s) + ';height:' + px(s) + ';left:' + px(w / 2 - (m.x + m.w / 2) * k) + ';top:' + px(h / 2 - (m.y + m.h / 2) * k);
    } else st = 'width:' + w + 'px;height:' + h + 'px;left:0;top:0;object-fit:contain';
    probeMark(id);
    return '<span class="mark' + (markProbes[id] === 'bad' ? ' is-bad' : '') + '" data-mark="' + id + '" style="width:' + w + 'px;height:' + h + 'px">'
      + (maskSupport ? '<span class="mk" style="' + st + ';-webkit-mask-image:url(' + ICONS + id + '.svg);mask-image:url(' + ICONS + id + '.svg)"></span>' : '<img alt="" src="' + ICONS + id + '.svg" style="' + st + '">') + '</span>';
  }
  function appMark(a, w, h, size) {
    if (a.mark && (maskSupport || S.c.bg !== 'light')) return markHtml(a.brand || a.id, w, h, size);
    var words = a.name.split(/\s+/), letters = words[0].charAt(0) + (words.length > 1 ? words[1].charAt(0) : '');
    return '<span class="mark monogram' + (a.icon ? ' native-icon' : '') + '" style="width:' + w + 'px;height:' + h + 'px;font-size:' + Math.round(size * .65) + 'px"><span>' + esc(letters.toUpperCase()) + '</span>'
      + (a.icon ? '<img alt="" data-native-icon="true" src="' + esc(a.icon) + '">' : '') + '</span>';
  }
  function smallMark(a) { return appMark(a, 56, 44, 36); }
  var measureCanvas = document.createElement('canvas'), measureContext = measureCanvas.getContext('2d'), measureSpan = document.createElement('span');
  measureSpan.setAttribute('aria-hidden', 'true');
  measureSpan.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;white-space:pre;font-synthesis:none;';
  document.body.appendChild(measureSpan);
  function homeFont() { return S.shown && S.shown.font || 'manrope'; }
  function fontRole(id, role, size) {
    var f = FONTS[id], serif = id === 'newsreader';
    return { family: f.family,
      weight: role === 'display' ? f.display : role === 'clock' ? f.clock : serif ? 400 : f.ui,
      opsz: serif ? role === 'display' ? 72 : role === 'clock' ? 48 : role === 'ui' && (!size || size === 28) ? 28 : 36 : 0 };
  }
  function measureFace(id, faces) {
    var result = { roles: {}, digits: [], digitCell: 0 }, roles = { display: [88, 76, 56], clock: [48], primary: [30, 32, 34, 36, 40], ui: [28, 30, 48] };
    var face = id === 'newsreader' ? faces[0][0] : null, original = face ? face.variationSettings : '', r, widths, min, max;
    Object.keys(roles).forEach(function (role) {
      result.roles[role] = {};
      // Canvas has no optical-size property. Set this face's default only while measuring;
      // CSS specifies each rendered role explicitly, and the descriptor is restored below.
      roles[role].forEach(function (size) {
        r = fontRole(id, role, size);
        if (face) face.variationSettings = r.opsz ? '"opsz" ' + r.opsz : original;
        measureContext.font = r.weight + ' ' + size + 'px "' + r.family + '"';
        var m = measureContext.measureText('H'), d = measureContext.measureText('gjpqy');
        result.roles[role][size] = { cap: m.actualBoundingBoxAscent || size * .72, ascent: m.fontBoundingBoxAscent || size * 1.066, descent: m.fontBoundingBoxDescent || size * .3, lower: d.actualBoundingBoxDescent || size * .255 };
      });
    });
    if (face) face.variationSettings = original;
    r = fontRole(id, 'clock');
    measureSpan.style.font = r.weight + ' 48px/64px "' + r.family + '"';
    measureSpan.style.letterSpacing = '0'; measureSpan.style.fontVariantNumeric = 'tabular-nums';
    measureSpan.style.fontVariationSettings = r.opsz ? '"opsz" ' + r.opsz : 'normal';
    widths = '0123456789'.split('').map(function (n) { measureSpan.textContent = n; return measureSpan.getBoundingClientRect().width; });
    min = Math.min.apply(Math, widths); max = Math.max.apply(Math, widths);
    result.digits = widths; result.digitCell = max - min > .02 ? max : 0;
    return result;
  }
  function fontChoices() {
    LOOK_VALUES.font = Object.keys(FONTS).filter(function (id) { return id === 'manrope' || PRIVATE_FONTS.indexOf(id) >= 0 && !unavailableFonts[id]; });
  }
  function retryFontFaces(id) {
    // A rejected CSS FontFace cannot load again. Recreate only that failed family's
    // rules; the displayed family's faces and the rest of the stylesheet stay intact.
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules, i, rule, family, css;
      try { rules = sheet.cssRules; } catch (e) { return; }
      if (!rules) return;
      for (i = 0; i < rules.length; i++) {
        rule = rules[i];
        if (rule.type !== 5) continue;
        family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
        if (family !== FONTS[id].family) continue;
        css = rule.cssText; sheet.deleteRule(i); sheet.insertRule(css, i);
      }
    });
  }
  function loadFont(id, done) {
    var f = FONTS[id], weights = [f.display], timer, ended = false;
    if (fontMetrics[id]) { done(true); return; }
    if (!document.fonts || !document.fonts.load) { if (id === 'manrope') { fontMetrics.manrope = measureFace('manrope', []); fontsReady = true; done(true); } else done(false, 'unsupported'); return; }
    if (unavailableFonts[id]) retryFontFaces(id);
    if (id !== 'newsreader' && weights.indexOf(f.ui) < 0) weights.push(f.ui);
    function finish(ok, reason, faces) {
      if (ended) return;
      ended = true; clearTimeout(timer);
      if (ok) {
        fontMetrics[id] = measureFace(id, faces); delete unavailableFonts[id];
        // Measurements and cached markup belong to a particular loaded font.
        widthCache = {}; fontRevision++;
        if (id === 'manrope') fontsReady = true;
      } else if (reason !== 'timeout') unavailableFonts[id] = true;
      fontChoices(); done(ok, reason);
    }
    timer = setTimeout(function () { finish(false, 'timeout'); }, 3000);
    Promise.all(weights.map(function (weight) { return document.fonts.load(weight + ' 88px "' + f.family + '"'); })).then(function (faces) {
      finish(faces.every(function (list) { return list.length > 0 && list.every(function (face) { return face.status === 'loaded'; }); }), 'load', faces);
    }, function () { finish(false, 'load'); });
  }
  var baselineRecovery = false;
  function ensureFont(id, done) {
    loadFont('manrope', function (ok, reason) {
      if (!ok && id === 'manrope') {
        // The local fallback keeps Home usable if the baseline face is slow or missing.
        fontMetrics.manrope = measureFace('manrope', []); fontMetrics.manrope.fallback = true; fontsReady = true;
        done(true, reason);
        if (!baselineRecovery && document.fonts && document.fonts.ready) {
          baselineRecovery = true;
          document.fonts.ready.then(function () {
            delete fontMetrics.manrope; delete unavailableFonts.manrope;
            loadFont('manrope', function (loaded) {
              if (!loaded) { fontMetrics.manrope = measureFace('manrope', []); fontMetrics.manrope.fallback = true; fontsReady = true; }
              render();
            });
          });
        }
        return;
      }
      if (!ok || id === 'manrope') done(ok, reason); else loadFont(id, done);
    });
  }
  function fontShift(role, size) {
    var id = homeFont(), base = fontMetrics.manrope, metrics = fontMetrics[id], a, b;
    if (id === 'manrope' || !base || !metrics) return 0;
    a = base.roles[role][size]; b = metrics.roles[role][size];
    return (a.ascent - a.descent - a.cap - b.ascent + b.descent + b.cap) / 2;
  }
  function textWidth(text, size, weight, spacing, role) {
    var id = homeFont(), r = fontRole(id, role || 'ui', size), key, width;
    if (id !== 'manrope') { weight = r.weight; spacing = role === 'display' ? -size * .01 : 0; }
    key = [id, role || 'ui', text, size, weight, spacing].join('|');
    if (widthCache.hasOwnProperty(key)) return widthCache[key];
    if (r.opsz) {
      measureSpan.style.font = weight + ' ' + size + 'px "' + r.family + '"';
      measureSpan.style.fontVariationSettings = '"opsz" ' + r.opsz;
      measureSpan.style.fontVariantNumeric = 'normal'; measureSpan.style.letterSpacing = '0'; measureSpan.textContent = text;
      width = measureSpan.getBoundingClientRect().width;
    } else {
      measureContext.font = (weight || 500) + ' ' + size + 'px "' + r.family + '", Arial, sans-serif';
      width = measureContext.measureText(text).width;
    }
    width += Math.max(0, text.length - 1) * (spacing || 0);
    // Do not retain fallback measurements made before the baseline font is ready.
    if (fontMetrics[id] && !fontMetrics[id].fallback) widthCache[key] = width;
    return width;
  }
  function dockLabelSize(id) { return S.c.apps === 'text' ? (textWidth(app(id).name, 40, 600, -.8, 'primary') > 264 ? 34 : 40) : textWidth(app(id).name, 36, 500, -.8, 'primary') > 280 ? 32 : 36; }
  function reducedDockLabel(id) { return S.c.apps !== 'icons' && dockLabelSize(id) === (S.c.apps === 'text' ? 34 : 32); }
  function actionWidth(text) { return clamp(Math.ceil(textWidth(text, 30, 500, -.3) + 40), 288, 400); }
  function photoLabel(id, compact) {
    var text = app(id).name, size = compact ? 56 : 88, limit = compact ? 640 : 992, width = textWidth(text, size, 600, -1.8, 'display');
    if (!compact && width > limit) { size = 76; width = textWidth(text, size, 600, -1.8, 'display'); }
    // Newsreader's ninth compact Type row otherwise enters the lower fade by .63px.
    return { size: size, top: (compact ? 10.66 : size === 76 ? 10.36 : 9.68) + fontShift('display', size) - (compact && homeFont() === 'newsreader' ? .7 : 0), width: Math.min(limit, width), ellipsis: width > limit };
  }
  function listPlateWidth(id, compact) {
    if (S.c.apps === 'icons') return compact ? 120 : 144;
    var text = S.c.apps === 'text';
    return clamp(Math.ceil(photoLabel(id, compact).width + (text ? 84 : compact ? 156 : 184)), text ? 280 : 360, text ? compact ? 724 : 1076 : compact ? 796 : 1176);
  }

  /* Keyed children: elements persist by key so transforms animate instead of re-creating.
     Children are absolutely positioned, so DOM order never needs to change. */
  function keyed(parent, items, update) {
    var map = parent._k || (parent._k = {}), seen = {}, i, it, el, isNew, k;
    for (i = 0; i < items.length; i++) {
      it = items[i]; el = map[it.key]; isNew = !el;
      if (isNew) { el = document.createElement('div'); map[it.key] = el; }
      update(el, it, i);
      if (isNew) parent.appendChild(el);
      seen[it.key] = 1;
    }
    for (k in map) if (map.hasOwnProperty(k) && !seen[k]) { if (map[k].parentNode === parent) parent.removeChild(map[k]); delete map[k]; }
  }
  function setContent(el, sig, renderContent) {
    sig += '|' + catalog.revision + '|' + fontRevision;
    if (el._sig === sig) return;
    el.innerHTML = renderContent();
    el._sig = sig;
    Array.prototype.forEach.call(el.querySelectorAll('[data-native-icon]'), function (img) {
      function ready() { img.parentNode.classList.add('has-native-icon'); }
      function failed() { img.style.display = 'none'; img.parentNode.classList.remove('has-native-icon'); }
      img.onload = ready; img.onerror = failed;
      if (img.complete) { if (img.naturalWidth) ready(); else failed(); }
    });
  }
  function setHTML(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html; } }
  function attrs(el, z, i, action) { el.setAttribute('data-z', z); el.setAttribute('data-i', String(i)); el.setAttribute('data-action', action); }

  /* ---------- Saved preferences ---------- */
  function safeId(id) { return typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}$/.test(id) && ['constructor', 'prototype', '__proto__'].indexOf(id) < 0; }
  function safeIcon(path) { return typeof path === 'string' && path.length < 2048 && /^(?:\/[^\/]|file:\/\/\/|wgt-package:\/\/\/)/.test(path) ? path : ''; }
  function load() {
    var keys = [KEY, 'cleanframe.shore.v1'], raw, saved, i;
    for (i = 0; i < keys.length; i++) {
      try {
        raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        saved = JSON.parse(raw);
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
      } catch (e) { storageOk = false; }
    }
    return null;
  }
  function clean(saved) {
    var s = saved && typeof saved === 'object' ? saved : {}, modern = s.look && typeof s.look === 'object' ? s.look : s;
    var legacyList = s.theme === 'list', h = [], recent = [], records = Array.isArray(s.appRecords) ? s.appRecords : [];
    records.slice(0, 256).forEach(function (a) {
      if (!a || !safeId(a.id) || !safeId(a.appId) || typeof a.name !== 'string' || !a.name.trim() || app(a.id)) return;
      APPS.push({ id: a.id, appId: a.appId, name: a.name.slice(0, 160), brand: MARK_BRANDS.indexOf(a.brand) >= 0 ? a.brand : '', mark: MARK_BRANDS.indexOf(a.brand) >= 0, icon: safeIcon(a.icon) });
    });
    (Array.isArray(s.home) ? s.home : Array.isArray(s.dock) ? s.dock : []).forEach(function (id) {
      if (!safeId(id) || h.indexOf(id) >= 0 || h.length >= CAP) return;
      if (!app(id) && id.indexOf('.') > 0) APPS.push({ id: id, appId: id, name: id.split('.').pop(), mark: false });
      if (app(id)) h.push(id);
    });
    if (!h.length) h = PRIMARY.slice();
    (Array.isArray(s.recent) ? s.recent : []).forEach(function (id) { if (safeId(id) && app(id) && h.indexOf(id) < 0 && recent.indexOf(id) < 0 && recent.length < 5) recent.push(id); });
    // Installed apps already offered to Home; a removed app stays removed.
    var seen = (Array.isArray(s.seen) ? s.seen : []).filter(function (id, i, all) { return safeId(id) && all.indexOf(id) === i; }).slice(0, 256);
    return {
      seen: seen, wfx: s.wfx === 'off' ? 'off' : 'on',
      sort: SORT_IDS.indexOf(s.sort) >= 0 ? s.sort : 'custom', used: cleanUsed(s.used), inputs: cleanInputMap(s.inputs),
      channels: cleanChannels(Array.isArray(s.channels) ? s.channels : window.CleanTVChannels),
      bg: pick(modern.bg, LOOK_VALUES.bg, 'dark'), opacity: pick(modern.opacity, LOOK_VALUES.opacity, '50'),
      chdock: pick(modern.chdock, LOOK_VALUES.chdock, 'right'), indock: pick(modern.indock, LOOK_VALUES.indock, 'below'),
      layout: pick(modern.layout, LOOK_VALUES.layout, legacyList ? 'list' : 'dock'),
      apps: pick(modern.apps, LOOK_VALUES.apps, legacyList ? 'text' : 'both'), controls: pick(modern.controls, LOOK_VALUES.controls, 'both'),
      focus: pick(modern.focus, LOOK_VALUES.focus, legacyList ? 'type' : 'glass'), material: pick(modern.material, LOOK_VALUES.material, 'soft'),
      font: pick(modern.font, LOOK_VALUES.font, 'manrope'), wall: wall(modern.wall || s.wallpaper) ? modern.wall || s.wallpaper : WALLS[0].id,
      home: h, recent: recent, lastApp: h.indexOf(s.lastApp) >= 0 ? s.lastApp : h[0],
      mode: pick(s.mode, MODES.map(function (m) { return m.id; }), 'fixed')
    };
  }
  var SORT_IDS = ['custom', 'az', 'za', 'recent', 'oldest'];
  function cleanUsed(u) {
    var out = {}, k, n = 0;
    if (u && typeof u === 'object') for (k in u) if (u.hasOwnProperty(k) && safeId(k) && typeof u[k] === 'number' && isFinite(u[k]) && n++ < 256) out[k] = u[k];
    return out;
  }
  function withUsed(id) { var u = {}, k, s = S.c.used || {}; for (k in s) if (s.hasOwnProperty(k)) u[k] = s[k]; u[id] = Date.now(); return u; }
  // { "<type><number>": "<presetId>" } for input device icons; unknown keys/values dropped.
  function cleanInputMap(m) {
    var out = {}, k, n = 0;
    if (m && typeof m === 'object') for (k in m) if (m.hasOwnProperty(k) && /^[A-Za-z]{1,8}[0-9]{1,3}$/.test(k) && inputPreset(m[k]) && n++ < 32) out[k] = m[k];
    return out;
  }
  function withInput(key, presetId) {
    var o = {}, k, s = S.c.inputs || {}; for (k in s) if (s.hasOwnProperty(k)) o[k] = s[k];
    if (presetId && inputPreset(presetId)) o[key] = presetId; else delete o[key];
    return o;
  }
  // Returns a copy of order sorted per the chosen mode; 'custom' keeps the manual order.
  function sortedOrder(order, sort) {
    sort = sort || S.c.sort; var used = S.c.used || {}, arr = order.slice();
    if (sort === 'custom') return arr;
    function byName(x, y) { return app(x).name.toLowerCase().localeCompare(app(y).name.toLowerCase()); }
    arr.sort(function (x, y) {
      if (sort === 'az') return byName(x, y);
      if (sort === 'za') return byName(y, x);
      var ux = used[x] || 0, uy = used[y] || 0;
      if (ux !== uy) return sort === 'oldest' ? ux - uy : uy - ux;
      return byName(x, y);
    });
    return arr;
  }
  function serialise(c) {
    var out = {};
    Object.keys(c).forEach(function (key) { out[key] = c[key]; });
    out.channels = (c.channels || []).map(stripChannel);
    out.version = 2; out.look = lookOf(c); out.dock = c.home.slice(); out.wallpaper = c.wall;
    out.theme = c.layout === 'list' ? 'list' : 'shore';
    out.appRecords = [];
    c.home.concat(c.recent).forEach(function (key) {
      var a = app(key);
      if (a && PRIMARY.indexOf(key) < 0 && !out.appRecords.some(function (r) { return r.id === key; })) out.appRecords.push({ id: a.id, appId: a.appId, name: a.name, brand: a.brand || '', icon: a.icon || '' });
    });
    return out;
  }
  function initialise() {
    var saved = load(), initial; S.c = clean(saved); initial = next(S.c.home.slice(), S.c.recent.slice());
    initial.home = sortedOrder(initial.home, initial.sort);
    S.stack = [{ id: 'home', f: { zone: 'apps', u: 0 } }];
    S.sel = S.c.lastApp; S.selIdx = S.c.home.indexOf(S.sel);
    if (saved && initial.mode === 'open') initial.wall = WALLS[(wallIndex(initial.wall) + 1) % WALLS.length].id;
    // Keep the old schema keys alongside the builder values for in-place updates.
    try { localStorage.setItem(KEY, JSON.stringify(serialise(initial))); S.c = initial; storageOk = true; } catch (e) { storageOk = false; }
  }
  function clearSession() { S.undo = []; S.removedAt = {}; S.note = null; S.err = null; }
  function begin() { S.note = null; }
  function next(home, recent) { var c = lookOf(S.c); c.home = home; c.recent = recent; c.lastApp = S.c.lastApp; c.mode = S.c.mode; c.seen = (S.c.seen || []).slice(); c.wfx = S.c.wfx; c.sort = S.c.sort; c.used = S.c.used; c.inputs = S.c.inputs; c.channels = S.c.channels; return c; }
  function snap() { return { home: S.c.home.slice(), recent: S.c.recent.slice() }; }
  function pushRecent(list, id) { return [id].concat(without(list, id)).slice(0, 5); }
  function write(c, label) {
    try { localStorage.setItem(KEY, JSON.stringify(serialise(c))); }
    catch (e) { storageOk = false; S.failed++; S.err = label; log('Not saved: ' + label); return false; }
    if (c.wall !== S.c.wall || c.mode !== S.c.mode) resetRotation();
    storageOk = true; S.c = c; S.writes++; S.err = null; log('Saved: ' + label);
    return true;
  }
  function errText(lifted) {
    return T('Couldn’t save. Nothing changed.');
  }
  function statusHtml(def, lifted) {
    if (S.err) return '<span class="warn error-chip">' + esc(errText(lifted)) + '</span>';
    return esc(S.note || def);
  }

  function ensureSel() {
    var h = S.c.home, i;
    if (!h.length) { S.sel = null; return -1; }
    i = h.indexOf(S.sel);
    if (i < 0) { i = clamp(S.selIdx, 0, h.length - 1); S.sel = h[i]; }
    S.selIdx = i;
    return i;
  }
  function setSel(id) { S.sel = id; S.selIdx = S.c.home.indexOf(id); }

  /* Membership and order operations shared by B and C. A works on slots (below). */
  function homeRemove(id) {
    var a = app(id), i = S.c.home.indexOf(id), before = snap(), h;
    if (i < 0) return false;
    if (S.c.home.length <= 1) { S.note = LAST; return false; }
    h = S.c.home.slice(); h.splice(i, 1);
    if (!write(next(h, pushRecent(S.c.recent, id)), 'Remove ' + a.name + ' from Home')) return false;
    S.removedAt[id] = i;
    S.undo.push({ label: T('Remove {name}', { name: a.name }), snap: before });
    return true;
  }
  function homeAdd(id) {
    var a = app(id), before = snap(), h = S.c.home.slice(), at;
    if (h.length >= CAP) { S.note = FULL; return false; }
    at = S.removedAt.hasOwnProperty(id) ? Math.min(S.removedAt[id], h.length) : h.length;
    h.splice(at, 0, id);
    if (!write(next(h, without(S.c.recent, id)), 'Add ' + a.name + ' to Home')) return false;
    S.undo.push({ label: T('Add {name}', { name: a.name }), snap: before });
    return true;
  }
  function homeMove(order, id, before) {
    var a = app(id), c = next(order, S.c.recent.slice());
    c.sort = 'custom'; // A manual drag switches off automatic sorting.
    if (!write(c, 'Move ' + a.name)) return false;
    S.undo.push({ label: T('Move {name}', { name: a.name }), snap: before });
    return true;
  }
  function undoLast(arr) {
    var u = S.undo[S.undo.length - 1];
    if (!u) { S.note = T('Nothing to undo'); return false; }
    if (!write(next(u.snap.home.slice(), u.snap.recent.slice()), 'Undo ' + u.label)) return false;
    S.undo.pop();
    S.note = T('Undone: {label}.', { label: u.label });
    return true;
  }
  function undoLabel() { var u = S.undo[S.undo.length - 1]; return u ? u.label : ''; }
  function undoCaption() { var label = undoLabel(); return label ? T('Undo {label}', { label: label.charAt(0).toLowerCase() + label.slice(1) }) : T('Nothing to undo'); }
  function editStatus(hint, move) {
    if (S.err) return statusHtml('', !!move);
    if (S.note === FULL || S.note === LAST) return '<span class="warn">' + esc(S.note) + '</span>';
    if (hint === FULL || hint === LAST) return '<span class="warn">' + esc(hint) + '</span>';
    return esc(move || hint || S.note || '');
  }

  var busy = false, busyTimer = 0;
  function release() { busy = false; clearTimeout(busyTimer); S.press = null; }
  function message(title, line, note) {
    push({ id: 'message', msg: 'error', content: { title: title, line: line, note: note || '', actions: [['back', T('Back')]] }, f: { b: 0 } });
  }
  function perform(title, run) {
    if (busy) return;
    busy = true; busyTimer = setTimeout(release, 10000);
    run(function (err) {
      release();
      if (err && !err.cancelled) message(title, err.message || T('The TV could not open this screen.'), err.detail || '');
      render(); syncRotation();
    });
  }
  function launch(id) {
    var a = app(id), c;
    if (!a || busy) return;
    if (S.c.home.indexOf(id) >= 0) {
      c = next(S.c.home.slice(), S.c.recent.slice()); c.lastApp = id; c.used = withUsed(id);
      if (c.sort === 'recent' || c.sort === 'oldest') c.home = sortedOrder(c.home, c.sort);
      write(c, 'Last app');
    }
    S.press = id; S.lastLaunch = a.name;
    perform(a.name, function (done) { FrameDevice.launchApp(a.appId, done); });
  }
  /* Source dock items, like Samsung's source bar: TV tuner, HDMI ports, then system
     shortcuts that open from a web app on this TV. Discovery failures keep the last
     known sources; shortcuts appear only when their app is installed. */
  var SOURCE_APPS = [
    { appId: 'com.samsung.tv.remote-workspace', name: 'Remote Access', state: 'PC and cloud', icon: 'remote' },
    { appId: 'org.tizen.connection-guide-app', name: 'Connection Guide', state: 'Setup help', icon: 'guide' }
  ];
  // Device presets for the input dock: the owner picks one, its icon and name follow.
  var INPUT_PRESETS = [
    { id: 'switch', name: 'Nintendo Switch', icon: 'dev-switch' }, { id: 'ps', name: 'PlayStation', icon: 'dev-playstation' },
    { id: 'xbox', name: 'Xbox', icon: 'dev-xbox' }, { id: 'bluray', name: 'Blu-ray', icon: 'dev-bluray' },
    { id: 'dvd', name: 'DVD', icon: 'dev-dvd' }, { id: 'vcr', name: 'VCR', icon: 'dev-vcr' },
    { id: 'cable', name: 'Cable box', icon: 'dev-cable' }, { id: 'pc', name: 'PC', icon: 'dev-pc' },
    { id: 'soundbar', name: 'Soundbar', icon: 'dev-soundbar' }, { id: 'streaming', name: 'Streaming', icon: 'dev-streaming' }
  ];
  function inputPreset(id) { for (var i = 0; i < INPUT_PRESETS.length; i++) if (INPUT_PRESETS[i].id === id) return INPUT_PRESETS[i]; return null; }
  var inputsLoading = false, homeSources = [];
  function buildInputs() {
    var custom = S.c.inputs || {};
    var items = homeSources.map(function (s) {
      var key = s.type + s.number, preset = inputPreset(custom[key]);
      return { key: key, kind: 'source', type: s.type, number: s.number, name: preset ? T(preset.name) : s.type === 'TV' ? T('TV') : s.name, connected: s.connected,
        state: s.active ? T('Active') : s.type === 'TV' ? T('Live TV') : s.connected ? T('Connected') : T('Not connected'),
        icon: preset ? preset.icon : s.type === 'TV' ? 'tv' : 'input', mark: !!preset };
    });
    SOURCE_APPS.forEach(function (a) {
      if (FrameDevice.hasApp(a.appId)) items.push({ key: 'app' + a.appId, kind: 'app', appId: a.appId, name: T(a.name), connected: true, state: T(a.state), icon: a.icon });
    });
    return items;
  }
  function refreshHomeInputs() {
    if (inputsLoading) return;
    inputsLoading = true;
    FrameDevice.sources(function (err, list) {
      inputsLoading = false;
      if (!err && Array.isArray(list)) homeSources = list;
      S.inputs = buildInputs(); render();
    }, true);
  }
  function switchInput(item) {
    if (!item) return;
    perform(item.name, function (done) {
      if (item.kind === 'app') FrameDevice.launchApp(item.appId, done);
      else FrameDevice.setSource(item.number, function (err) { done(err); refreshHomeInputs(); }, item.type);
    });
  }
  function tuneChannel(ch) {
    if (!ch) return;
    perform(ch.name, function (done) { FrameDevice.tuneChannel(ch, done); });
  }
  /* ---------- Weather caption and effects ---------- */
  // WMO weather codes (Open-Meteo) grouped into the effects this TV can afford.
  function wxInfo(code) {
    if (code === 0) return { kind: 'clear', label: 'Clear' };
    if (code === 1) return { kind: 'clear', label: 'Mainly clear' };
    if (code === 2) return { kind: 'partly', label: 'Partly cloudy' };
    if (code === 3) return { kind: 'cloudy', label: 'Overcast' };
    if (code === 45 || code === 48) return { kind: 'fog', label: 'Fog' };
    if (code >= 51 && code <= 57) return { kind: 'rain', label: 'Drizzle' };
    if (code >= 61 && code <= 67) return { kind: 'rain', label: 'Rain' };
    if (code >= 80 && code <= 82) return { kind: 'rain', label: 'Showers' };
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', label: 'Snow' };
    if (code >= 95) return { kind: 'storm', label: 'Thunderstorm' };
    return { kind: 'cloudy', label: 'Cloudy' };
  }
  function wxNight() {
    var w = S.wx, now = Date.now();
    if (!w) return false;
    if (w.sunrise && w.sunset && now - w.at < 24 * 3600000) return now < w.sunrise || now >= w.sunset;
    return !w.isDay;
  }
  function wxIcon(kind, night) {
    return kind === 'clear' ? (night ? 'wx-moon' : 'wx-sun') : kind === 'partly' ? (night ? 'wx-cloud' : 'wx-partly') : 'wx-' + (kind === 'cloudy' ? 'cloud' : kind);
  }
  function wxCaption() {
    var w = S.wx, info, range;
    if (!w) return '';
    info = wxInfo(w.code);
    range = w.max !== null && w.min !== null ? ' · ' + Math.round(w.max) + '° / ' + Math.round(w.min) + '°' : '';
    return '<span class="cap-line wx-line">' + icon(wxIcon(info.kind, wxNight())) + '<span class="wx-temp">' + Math.round(w.temp) + '°</span><span class="wx-desc">' + esc(T(info.label) + range) + '</span></span>';
  }
  function wxClasses() { return S.wx && wxNight() ? ' wx-night' : ''; }
  var wxKey = '', wxTimer = 0, wxNightShown = null, wxLoading = false;
  // Rebuild the effect layer only when the weather kind or day/night changes.
  function renderWeatherFx() {
    var w = S.wx, night = wxNight(), info = w ? wxInfo(w.code) : null, windy = w && w.wind >= 25;
    var on = w && S.c.wfx !== 'off' && !REDUCED_MOTION, key = on ? info.kind + '|' + night + '|' + windy : 'off', html = '', i;
    if (key === wxKey) return;
    wxKey = key;
    if (on) {
      if (info.kind === 'rain' || info.kind === 'storm') html += '<div class="wx-rain-wrap"><div class="wx-rain"></div></div>';
      if (info.kind === 'storm') html += '<div class="wx-flash"></div>';
      if (info.kind === 'snow') html += '<div class="wx-snow-wrap"><div class="wx-snow"></div></div>';
      if (info.kind === 'fog') html += '<div class="wx-fog"></div>';
      if ((info.kind === 'clear' || info.kind === 'partly') && !night) html += '<div class="wx-sun' + (info.kind === 'partly' ? ' is-soft' : '') + '"></div>';
      if (info.kind === 'clear' && night) html += '<div class="wx-stars"></div>';
      // Falling leaves on windy days without precipitation.
      if (windy && ['rain', 'storm', 'snow'].indexOf(info.kind) < 0) for (i = 0; i < 7; i++) {
        html += '<div class="wx-leaf" style="left:' + (6 + i * 14) + '%;animation-duration:' + (11 + (i * 7) % 6) + 's;animation-delay:-' + (i * 2.3).toFixed(1) + 's">'
          + '<div class="wx-leaf-i wx-leaf-' + (i % 2 ? 'b' : 'a') + '" style="animation-duration:' + (2.4 + (i % 3) * 0.5).toFixed(1) + 's"></div></div>';
      }
    }
    wxEl.innerHTML = html;
  }
  function refreshWeather() {
    clearTimeout(wxTimer);
    wxTimer = setTimeout(refreshWeather, 20 * 60000);
    if (wxLoading || document.hidden || !window.FrameWeather) return;
    wxLoading = true;
    window.FrameWeather.current(function (err, w) {
      wxLoading = false;
      if (!err && w) { S.wx = w; render(); }
    });
  }
  function applyWeatherFx(value) {
    var c = next(S.c.home.slice(), S.c.recent.slice());
    S.err = null; S.lookError = null;
    if (value === S.c.wfx) return;
    c.wfx = value;
    write(c, 'Weather effects');
  }
  function applySort(value) {
    S.err = null; S.lookError = null;
    var c = next(S.c.home.slice(), S.c.recent.slice());
    c.sort = value; c.home = sortedOrder(c.home, value);
    write(c, 'Sort apps');
  }
  // Store names often carry a tagline ("Spotify - Music and Podcasts"); keep the service name.
  function shortName(name) {
    var full = String(name).slice(0, 160), head = full.split(/\s+[-–—:|]\s+/)[0];
    return head.length >= 2 ? head : full;
  }
  function refreshCatalog() {
    var request, oldFocus;
    if (catalog.loading) return;
    request = ++catalog.request; catalog.loading = true; catalog.error = null;
    FrameDevice.apps(function (err, entries) {
      if (request !== catalog.request) return;
      catalog.loading = false;
      if (err) { catalog.error = err.message || 'Could not read installed apps.'; if (!catalog.loaded) ALPHA = []; render(); return; }
      oldFocus = top().id === 'apps' ? ALPHA[top().f.i] : null;
      ALPHA = [];
      entries.forEach(function (entry) {
        var id = PRIMARY.indexOf(entry.brand) >= 0 ? entry.brand : entry.appId, a;
        if (!safeId(id) || !safeId(entry.appId) || ALPHA.indexOf(id) >= 0) return;
        a = app(id);
        if (!a) { a = { id: id }; APPS.push(a); }
        a.appId = entry.appId; a.brand = entry.brand || ''; a.mark = !!entry.brand;
        a.icon = safeIcon(entry.icon);
        a.name = PRIMARY.indexOf(id) >= 0 ? PRIMARY_APPS[PRIMARY.indexOf(id)].name : shortName(entry.name);
        ALPHA.push(id);
      });
      ALPHA.sort(function (a, b) { return app(a).name.toLowerCase().localeCompare(app(b).name.toLowerCase()); });
      catalog.loaded = true; catalog.error = null; catalog.revision++;
      if (top().id === 'apps' && oldFocus && ALPHA.indexOf(oldFocus) >= 0) top().f.i = ALPHA.indexOf(oldFocus);
      syncInstalledApps();
      norm(); render();
    });
  }
  /* Home shows every installed app: newly discovered apps join the end, uninstalled
     ones leave. Apps the owner removed from Home are remembered in seen and stay off. */
  function syncInstalledApps() {
    var seen = (S.c.seen || []).slice(), h, kept, c, changed = false;
    if (!ALPHA.length) return;
    kept = S.c.home.filter(function (id) { return ALPHA.indexOf(id) >= 0; });
    h = kept.length ? kept : S.c.home.slice();
    if (h.length !== S.c.home.length) changed = true;
    ALPHA.forEach(function (id) {
      if (seen.indexOf(id) >= 0) return;
      seen.push(id); changed = true;
      if (h.indexOf(id) < 0 && h.length < CAP) h.push(id);
    });
    if (!changed) return;
    if (seen.length > 256) seen = seen.filter(function (id) { return ALPHA.indexOf(id) >= 0; }).slice(0, 256);
    if (S.c.sort !== 'custom') h = sortedOrder(h, S.c.sort);
    c = next(h, S.c.recent.filter(function (id) { return h.indexOf(id) < 0 && ALPHA.indexOf(id) >= 0; }));
    c.seen = seen;
    if (h.indexOf(c.lastApp) < 0) c.lastApp = h[0];
    write(c, 'Show installed apps on Home');
  }

  /* ---------- Navigation targets ---------- */
  // This TV has no Art Mode app, so the first control opens Samsung's TV settings.
  function utils() { return ['home', 'tv', 'apps', 'channels', 'settings']; }
  /* prev/next run along the apps; out goes to the controls, inn comes back (or to a per-app action). */
  function axes() {
    var v = S.c.layout === 'list';
    return { prev: v ? 'up' : 'left', next: v ? 'down' : 'right', out: v ? 'right' : 'up', inn: v ? 'left' : 'down' };
  }
  function utilAction(u) {
    if (u === 'home') perform('Samsung Home', FrameDevice.home);
    else if (u === 'tv') perform('TV settings', FrameDevice.settings);
    else if (u === 'art') perform('Art Mode', FrameDevice.art);
    else if (u === 'apps') openApps();
    else if (u === 'channels') openChannels();
    else openSettings();
  }
  function addAppsRoute() { openEditor('home'); }
  function openSettings() { push({ id: 'settings', f: { id: S.settingsFocus } }); }
  function openAppearance(group) {
    var axis = { background: 'bg', docklayout: 'chdock', layout: 'layout', typography: 'font', focus: 'focus', weather: 'wfx', sort: 'sort' }[group];
    var action = S.detailFocus[group] || (axis ? 'choice.' + axis + '.' + S.c[axis] : group === 'rotation' ? 'rotation.' + S.c.mode : 'samsung.home');
    push({ id: 'appearance', group: group, f: { action: action } });
  }
  function openApps(edit) {
    var e = { id: 'apps', mode: edit ? 'edit' : 'browse', top: 0, f: { zone: 'grid', i: Math.max(0, ALPHA.indexOf(S.appsFocus)), h: 0 } };
    push(e); refreshCatalog(); return e;
  }
  function openEditor(origin) {
    var i = ensureSel();
    clearSession();
    refreshCatalog();
    push({ id: 'editor', origin: origin, lifted: null, top: 0, homeTop: 0, otherReturn: { id: otherList()[0] || null, index: 0, top: 0 }, f: { zone: S.c.home.length ? 'home' : 'other', i: Math.max(0, i), part: 'name', h: 1, j: 0 } });
  }
  function openWallpaper() {
    var i = wallIndex(S.c.wall);
    S.err = null; S.wallError = null;
    push({ id: 'wallpaper', i: i, top: clamp(i - 2, 0, Math.max(0, WALLS.length - WALL_VISIBLE)), f: { zone: 'photo' },
      previewTimer: 0, previewDue: null, applyPending: null, failedId: null, failedApply: false, retryBundle: null });
  }
  function isSettingsDetail(t) { return t.id === 'appearance' || t.id === 'wallpaper'; }

  var V = {};

  /* ---------- Home (browse) ---------- */
  V.home = {
    key: function (t, k) {
      var f = t.f, h = S.c.home, U = utils(), x = axes(), i = ensureSel();
      var chLeft = S.c.chdock === 'left', inAbove = S.c.indock === 'above';
      if (S.c.layout === 'list') { listHomeKey(t, k, i, U); return; }
      if (f.zone === 'util') {
        f.u = clamp(f.u, 0, U.length - 1);
        if (k === x.prev && f.u > 0) f.u--;
        else if (k === x.next && f.u < U.length - 1) f.u++;
        else if (k === x.inn || k === 'back') { f.zone = f.uf === 'channels' ? 'channels' : 'apps'; f.uf = null; }
        else if (k === 'ok') { S.lastUtil = f.u; utilAction(U[f.u]); return; }
        S.lastUtil = f.u;
        return;
      }
      f.uf = null;
      if (f.zone === 'channels') {
        // Channel column: Up/Down choose (Up from the first reaches the controls),
        // OK tunes (or opens All channels), Left or Back returns to the selected app.
        var col = colItems(), cn = col.length;
        f.c = clamp(f.c || 0, 0, cn - 1);
        if (k === 'up') { if (f.c > 0) f.c--; else { f.zone = 'util'; f.uf = 'channels'; f.u = clamp(S.lastUtil, 0, U.length - 1); } }
        else if (k === 'down') { if (f.c < cn - 1) f.c++; }
        else if (k === 'back' || k === (chLeft ? 'right' : 'left')) f.zone = 'apps';
        else if (k === 'ok') { if (col[f.c].kind === 'all') openChannels(); else tuneChannel(col[f.c]); }
        return;
      }
      if (f.zone === 'inputs') {
        // Inputs dock: Left/Right choose, OK switches, Up or Back returns to the apps.
        var m = S.inputs.length;
        if (!m) { f.zone = 'apps'; return; }
        f.n = clamp(f.n || 0, 0, m - 1);
        if (k === 'left' && f.n > 0) f.n--;
        else if (k === 'right' && f.n < m - 1) f.n++;
        else if (k === 'ok') switchInput(S.inputs[f.n]);
        else if (k === 'back' || k === (inAbove ? 'down' : 'up')) f.zone = 'apps';
        else if (inAbove && k === 'up') { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); }
        return;
      }
      f.zone = 'apps';
      var cols = dockGeom(h.length).cols, col = i % cols;
      function toInputs() { if (S.inputs.length) { f.zone = 'inputs'; f.n = clamp(f.n || 0, 0, S.inputs.length - 1); } }
      function toChannels() { f.zone = 'channels'; f.c = clamp(f.c || 0, 0, colItems().length - 1); }
      if (k === 'back') FrameDevice.hide();
      else if (!h.length) {
        if (k === 'up') { if (inAbove) toInputs(); else { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); } }
        else if (k === 'down') { if (!inAbove) toInputs(); }
        else if (k === (chLeft ? 'left' : 'right')) toChannels();
        else if (k === 'ok') addAppsRoute();
      }
      // Grid: Up/Down move between rows; the edge rows reach the controls, inputs and
      // channel column on the sides chosen in Dock layout.
      else if (k === 'up') { if (i >= cols) setSel(h[i - cols]); else if (inAbove) toInputs(); else { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); } }
      else if (k === 'down') { if (Math.floor(i / cols) < Math.floor((h.length - 1) / cols)) setSel(h[Math.min(i + cols, h.length - 1)]); else if (!inAbove) toInputs(); }
      else if (k === 'left') { if (col > 0) setSel(h[i - 1]); else if (chLeft) toChannels(); }
      else if (k === 'right') { if (col < cols - 1 && i < h.length - 1) setSel(h[i + 1]); else if (!chLeft) toChannels(); }
      else if (k === 'ok') launch(S.sel);
    },
    point: function (t, z, i) {
      if (z === 'util') { t.f.zone = 'util'; t.f.u = i; S.lastUtil = i; }
      else if (z === 'app') { t.f.zone = 'apps'; setSel(S.c.home[i]); }
      else if (z === 'channel') { t.f.zone = 'channels'; t.f.c = i; }
      else if (z === 'input') { t.f.zone = 'inputs'; t.f.n = i; }
      else if (z === 'empty') t.f.zone = 'apps';
      else return;
      this.key(t, 'ok');
    }
  };
  function listHomeKey(t, k, i, U) {
    var f = t.f, h = S.c.home;
    if (f.zone === 'util') {
      f.u = clamp(f.u, 0, U.length - 1);
      if (k === 'up' && f.u > 0) f.u--;
      else if (k === 'down' && f.u < U.length - 1) f.u++;
      else if (k === 'left' || k === 'back') f.zone = 'apps';
      else if (k === 'ok') { S.lastUtil = f.u; utilAction(U[f.u]); return; }
      S.lastUtil = f.u;
      return;
    }
    f.zone = 'apps';
    if (k === 'up' && i > 0) setSel(h[i - 1]);
    else if (k === 'right') { f.zone = 'util'; f.u = clamp(S.lastUtil, 0, U.length - 1); }
    else if (k === 'down' && i < h.length - 1) setSel(h[i + 1]);
    else if (k === 'back') FrameDevice.hide();
    else if (k === 'ok') { if (h.length) launch(S.sel); else addAppsRoute(); }
  }

  /* ---------- Wallpaper child: focus previews, activation applies ---------- */
  function cancelWallpaperTimer(t) {
    clearTimeout(t.previewTimer); t.previewTimer = 0; t.previewDue = null;
  }
  function failWallpaper(t, id, apply, bundle) {
    t.applyPending = null; t.failedId = id; t.failedApply = apply; t.retryBundle = bundle || null;
    restoreLook();
    if (!bundle) S.wallError = id;
  }
  function applyWallpaper(t, prepared) {
    var w = WALLS[t.i], c, bundle = prepared || S.previewBundle;
    if (!prepared && (S.wallPending || t.previewDue || S.wallShown !== w.id || S.wallError)) {
      t.applyPending = w.id;
      if (t.previewDue || S.wallPending !== w.id) { cancelWallpaperTimer(t); loadWallpaperPreview(t); }
      return;
    }
    t.applyPending = null;
    if (w.id === S.c.wall) { S.err = null; t.failedId = null; t.failedApply = false; t.retryBundle = null; return; }
    if (!bundle || bundle.key !== bundleKey({ wall: w.id, material: S.c.material })) { t.applyPending = w.id; loadWallpaperPreview(t); return; }
    c = next(S.c.home.slice(), S.c.recent.slice()); c.wall = w.id;
    if (!write(c, 'Wallpaper ' + w.name)) { failWallpaper(t, w.id, true, bundle); return; }
    installBundle(bundle, c); committedBundle = bundle; S.previewBundle = null;
    t.failedId = null; t.failedApply = false; t.retryBundle = null;
  }
  function loadWallpaperPreview(t) {
    var id = WALLS[t.i].id;
    cancelWallpaperTimer(t);
    showWall(id, function (ok) {
      if (top() !== t || WALLS[t.i].id !== id) return;
      if (!ok) failWallpaper(t, id, t.applyPending === id, null);
      else if (t.applyPending === id) applyWallpaper(t);
      render(); syncRotation();
    });
  }
  function previewWallpaper(t, index, apply, immediate) {
    var id, target;
    cancelWallpaperTimer(t); cancelLook();
    t.i = index; t.f.zone = 'photo'; id = WALLS[index].id;
    t.applyPending = apply ? id : null; t.failedId = null; t.failedApply = false; t.retryBundle = null;
    S.err = null; S.wallError = null;
    if (id === S.c.wall && committedBundle) {
      installBundle(committedBundle, S.c, true); S.previewBundle = null;
      if (apply) applyWallpaper(t);
      return;
    }
    if (S.wallShown === id && S.previewBundle && S.previewBundle.key === bundleKey({ wall: id, material: S.c.material })) {
      if (apply) applyWallpaper(t);
      return;
    }
    if (apply || immediate) { loadWallpaperPreview(t); return; }
    target = lookOf(S.c); target.wall = id;
    S.pending = { patch: { wall: id }, target: target, row: 'bg', preview: true, transient: false, deferred: true };
    t.previewDue = id;
    t.previewTimer = setTimeout(function () { if (top() === t && WALLS[t.i].id === id) loadWallpaperPreview(t); }, WALL_DELAY);
  }
  function retryWallpaper(t) {
    var apply = t.failedApply, bundle = t.retryBundle;
    t.f.zone = 'photo';
    if (bundle && apply) applyWallpaper(t, bundle);
    else previewWallpaper(t, t.i, apply, true);
  }
  function closeWallpaper(t) {
    cancelWallpaperTimer(t); t.applyPending = null; S.err = null; pop(); restoreLook();
    if (top().id === 'appearance' && top().group === 'background') detailFocus(top(), { action: 'background.wallpaper' }, 0);
  }
  V.wallpaper = {
    norm: function (t) {
      t.i = clamp(t.i, 0, WALLS.length - 1);
      if (t.f.zone === 'retry' && !t.failedId) t.f.zone = 'photo';
      if (t.i < t.top) t.top = t.i;
      if (t.i >= t.top + WALL_VISIBLE) t.top = t.i - WALL_VISIBLE + 1;
      t.top = clamp(t.top, 0, Math.max(0, WALLS.length - WALL_VISIBLE));
    },
    key: function (t, k) {
      if (k === 'back') { closeWallpaper(t); return; }
      if (t.f.zone === 'back') {
        if (k === 'ok') closeWallpaper(t);
        else if (k === 'down' || k === 'right') t.f.zone = 'photo';
        return;
      }
      if (t.f.zone === 'retry') {
        if (k === 'ok') retryWallpaper(t);
        else if (k === 'up' || k === 'left') t.f.zone = 'photo';
        return;
      }
      if (k === 'left' || k === 'up' && t.i === 0) { t.f.zone = 'back'; t.applyPending = null; }
      else if (k === 'up' && t.i > 0) previewWallpaper(t, t.i - 1, false);
      else if (k === 'down' && t.i < WALLS.length - 1) previewWallpaper(t, t.i + 1, false);
      else if ((k === 'right' || k === 'down') && t.failedId) t.f.zone = 'retry';
      else if (k === 'ok') { if (t.retryBundle) applyWallpaper(t, t.retryBundle); else applyWallpaper(t); }
    },
    point: function (t, z, i) {
      if (z === 'wall-back') closeWallpaper(t);
      else if (z === 'wall-retry') retryWallpaper(t);
      else if (z === 'wall-choice' && i >= 0 && i < WALLS.length) {
        if (i === t.i) { t.f.zone = 'photo'; this.key(t, 'ok'); }
        else previewWallpaper(t, i, true);
      }
    }
  };

  /* ---------- Installed apps ---------- */
  function appsItems() { return catalog.error ? [] : ALPHA; }
  function appsHead(t) {
    if (catalog.error) return [['retry', T('Try again'), '', '']];
    return t.mode === 'edit' ? [['done', T('Done'), '', 'check']] : [['edit', T('Edit Home apps'), '', 'plus']];
  }
  function toggleHome(id) {
    if (!app(id)) return;
    var home = S.c.home.slice(), i = home.indexOf(id), c;
    if (i >= 0) { if (home.length <= 1) { S.note = LAST; return; } home.splice(i, 1); }
    else if (home.length >= CAP) { S.note = FULL; return; }
    else home.push(id);
    c = next(home, S.c.recent.slice());
    if (home.indexOf(c.lastApp) < 0) c.lastApp = home[0] || null;
    S.note = write(c, i >= 0 ? 'Remove app' : 'Add app') ? (i >= 0 ? T('{name} removed from Home.', { name: app(id).name }) : T('{name} added to Home.', { name: app(id).name })) : null;
  }
  V.apps = {
    sheet: true,
    norm: function (t) {
      var n = appsItems().length;
      t.f.i = clamp(t.f.i, 0, Math.max(0, n - 1));
      if (!n) t.f.zone = 'head';
    },
    key: function (t, k) {
      var f = t.f, items = appsItems(), n = items.length, col = f.i % COLS, row = Math.floor(f.i / COLS);
      S.note = null;
      if (k === 'back') { if (t.mode === 'edit') t.mode = 'browse'; else pop(); return; }
      if (f.zone === 'head') {
        if (k === 'down' && n) f.zone = 'grid';
        else if (k === 'ok') { if (catalog.error) refreshCatalog(); else t.mode = t.mode === 'edit' ? 'browse' : 'edit'; }
        return;
      }
      if (k === 'left' && col > 0) f.i--;
      else if (k === 'right' && col < COLS - 1 && f.i < n - 1) f.i++;
      else if (k === 'down' && row < Math.ceil(n / COLS) - 1) f.i = Math.min(f.i + COLS, n - 1);
      else if (k === 'up') { if (row > 0) f.i -= COLS; else f.zone = 'head'; }
      else if (k === 'ok' && n) { if (t.mode === 'edit') toggleHome(items[f.i]); else launch(items[f.i]); }
      S.appsFocus = items[f.i] || null;
    },
    point: function (t, z, i) { if (z === 'grid') { t.f.zone = 'grid'; t.f.i = i; } else if (z === 'head') t.f.zone = 'head'; else return; this.key(t, 'ok'); }
  };

  /* ---------- All channels (from the TV's last channel scan) ---------- */
  function openChannels(edit) {
    var t = push({ id: 'channels', mode: edit ? 'edit' : 'browse', top: 0, list: [], loading: true, error: null, f: { zone: 'grid', i: 0 } });
    loadChannels(t);
  }
  function loadChannels(t) {
    t.loading = true; t.error = null;
    FrameDevice.channels(function (err, list) {
      t.loading = false;
      var scanned = (!err && Array.isArray(list)) ? list.map(function (c) {
        var saved = savedChannel(c);
        return saved ? stripChannel(saved) : { major: c.major, minor: c.minor, name: c.name };
      }) : [];
      // Always include the curated seed channels and saved channels the scan omits (e.g.
      // analog/VCR), so they stay listable and can be added to or removed from the column.
      (window.CleanTVChannels || []).concat(S.c.channels || []).forEach(function (s) {
        if (!scanned.some(function (x) { return sameChannel(x, s); })) scanned.push(stripChannel(s));
      });
      scanned.sort(function (a, b) { return (a.major || 0) - (b.major || 0) || (a.minor || 0) - (b.minor || 0); });
      t.list = cleanChannels(scanned);
      t.error = (err && !t.list.length) ? (err.message || T('The TV could not open this screen.')) : null;
      // Focus the first channel once the list arrives (it starts empty while loading).
      if (top() === t) t.f.zone = t.list.length ? 'grid' : 'head';
      render();
    });
  }
  function savedChannel(c) { var s = S.c.channels || [], i; for (i = 0; i < s.length; i++) if (sameChannel(s[i], c)) return s[i]; return null; }
  function toggleSaved(ch) {
    var saved = savedChannel(ch), list = (S.c.channels || []).slice(), c = next(S.c.home.slice(), S.c.recent.slice());
    if (saved) list = list.filter(function (s) { return s !== saved; });
    else if (list.length >= CH_MAX) { S.note = T('The column is full. Remove a channel first.'); return; }
    else list.push(cleanChannel(stripChannel(ch)));
    c.channels = list;
    S.note = write(c, saved ? 'Remove channel' : 'Save channel') ? (saved ? T('{name} removed from the column.', { name: ch.name }) : T('{name} added to the column.', { name: ch.name })) : null;
  }
  function channelsHead(t) {
    if (t.error) return [['retry', T('Try again'), '', '']];
    return t.mode === 'edit' ? [['done', T('Done'), '', 'check']] : [['edit', T('Edit Home channels'), '', 'plus']];
  }
  V.channels = {
    sheet: true,
    norm: function (t) {
      var n = t.list.length;
      t.f.i = clamp(t.f.i, 0, Math.max(0, n - 1));
      if (!n) t.f.zone = 'head';
    },
    key: function (t, k) {
      var f = t.f, items = t.list, n = items.length, col = f.i % COLS, row = Math.floor(f.i / COLS);
      S.note = null;
      if (k === 'back') { if (t.mode === 'edit') t.mode = 'browse'; else pop(); return; }
      if (f.zone === 'head') {
        if (k === 'down' && n) f.zone = 'grid';
        else if (k === 'ok') { if (t.error) loadChannels(t); else t.mode = t.mode === 'edit' ? 'browse' : 'edit'; }
        return;
      }
      if (k === 'left' && col > 0) f.i--;
      else if (k === 'right' && col < COLS - 1 && f.i < n - 1) f.i++;
      else if (k === 'down' && row < Math.ceil(n / COLS) - 1) f.i = Math.min(f.i + COLS, n - 1);
      else if (k === 'up') { if (row > 0) f.i -= COLS; else f.zone = 'head'; }
      else if (k === 'ok' && n) { if (t.mode === 'edit') toggleSaved(items[f.i]); else tuneChannel(items[f.i]); }
    },
    point: function (t, z, i) { if (z === 'grid') { t.f.zone = 'grid'; t.f.i = i; } else if (z === 'head') t.f.zone = 'head'; else return; this.key(t, 'ok'); }
  };

  /* ---------- B: two-zone Home editor ---------- */
  function otherGroups() {
    var rec = S.c.recent.filter(function (id) { return !onHome(id) && app(id); });
    return { recent: rec, rest: ALPHA.filter(function (id) { return !onHome(id) && rec.indexOf(id) < 0; }) };
  }
  function otherList() { var o = otherGroups(); return o.recent.concat(o.rest); }
  function editorHomeY(i) { return i * ED_ROW; }
  function editorOtherY(j) {
    var o = otherGroups();
    return j * ED_ROW + (o.recent.length ? ED_SEP : 0) + (o.recent.length && j >= o.recent.length ? ED_SEP : 0);
  }
  function rememberOther(t) {
    var list = otherList();
    t.otherReturn = { id: list[t.f.j] || null, index: t.f.j, top: t.top };
  }
  function returnOther(t) {
    var list = otherList(), memory = t.otherReturn, i = memory ? list.indexOf(memory.id) : -1;
    t.f.zone = 'other';
    t.f.j = i >= 0 ? i : clamp(memory ? memory.index : 0, 0, Math.max(0, list.length - 1));
    if (memory) t.top = memory.top;
  }
  function nearestHome(t, count) {
    var target = editorOtherY(t.f.j) - t.top + 36, best = 0, distance = Infinity, i, d;
    for (i = 0; i < count; i++) {
      d = Math.abs(editorHomeY(i) + 36 - target);
      if (d < distance) { best = i; distance = d; }
    }
    return best;
  }
  V.editor = {
    sheet: true,
    norm: function (t) {
      var f = t.f, nh = (t.lifted ? t.lifted.order : S.c.home).length, no = otherList().length;
      f.i = clamp(f.i, 0, Math.max(0, nh - 1));
      f.j = clamp(f.j, 0, Math.max(0, no - 1));
      if (f.zone === 'home' && !nh) f.zone = no ? 'other' : 'head';
      if (f.zone === 'other' && !no) f.zone = nh ? 'home' : 'head';
    },
    key: function (t, k) {
      var f = t.f, H = t.lifted ? t.lifted.order : S.c.home, O = otherList(), nh = H.length, no = O.length, d, tmp;
      if (t.lifted) {
        d = k === 'up' ? -1 : k === 'down' ? 1 : 0;
        if (d && f.i + d >= 0 && f.i + d < nh) { tmp = H[f.i + d]; H[f.i + d] = H[f.i]; H[f.i] = tmp; f.i += d; S.err = null; }
        else if (k === 'ok') editorPlace(t);
        else if (k === 'back') { f.i = t.lifted.from; t.lifted = null; S.err = null; }
        return;
      }
      if (k === 'back') { closeEditor(t); return; }
      if (f.zone === 'head') {
        if (k === 'left' && f.h > 0) f.h--;
        else if (k === 'right' && f.h < 1) f.h++;
        else if (k === 'down') { if (no) returnOther(t); else if (nh) f.zone = 'home'; }
        else if (k === 'ok') { begin(); if (f.h === 0) undoLast(null); else closeEditor(t); }
      } else if (f.zone === 'home') {
        if (k === 'up') { if (f.i > 0) f.i--; else f.zone = 'head'; }
        else if (k === 'down') { if (f.i < nh - 1) f.i++; }
        else if (k === 'right') { if (f.part === 'name') f.part = 'remove'; else if (no) returnOther(t); }
        else if (k === 'left') { if (f.part === 'remove') f.part = 'name'; }
        else if (k === 'ok') {
          begin();
          if (f.part === 'name') t.lifted = { id: H[f.i], from: f.i, order: H.slice(), snap: snap() };
          else editorRemove(t, H[f.i]);
        }
      } else {
        if (k === 'up') { if (f.j > 0) { f.j--; rememberOther(t); } else f.zone = 'head'; }
        else if (k === 'down') { if (f.j < no - 1) { f.j++; rememberOther(t); } }
        else if (k === 'left') { if (nh) { rememberOther(t); f.i = nearestHome(t, nh); f.zone = 'home'; f.part = 'name'; } }
        else if (k === 'ok') { begin(); editorAdd(t, O[f.j]); }
      }
    },
    point: function (t, z, i) {
      if (t.lifted) { if (z === 'name' && i === t.f.i) this.key(t, 'ok'); return; }
      if (z === 'name' || z === 'remove') { t.f.zone = 'home'; t.f.i = i; t.f.part = z; }
      else if (z === 'other') { t.f.zone = 'other'; t.f.j = i; rememberOther(t); }
      else if (z === 'head') { t.f.zone = 'head'; t.f.h = i; }
      else return;
      this.key(t, 'ok');
    }
  };
  /* Focus follows the app between zones, so a repeated OK toggles the same app. */
  function editorRemove(t, id) {
    if (!homeRemove(id)) return;
    t.f.zone = 'other'; t.f.j = otherList().indexOf(id);
    S.note = T('{name} is in Recently removed. OK puts it back.', { name: app(id).name });
  }
  function editorAdd(t, id) {
    rememberOther(t);
    if (!homeAdd(id)) return;
    var remaining = otherList(), at = clamp(t.otherReturn.index, 0, Math.max(0, remaining.length - 1));
    t.otherReturn.id = remaining[at] || null; t.otherReturn.index = at;
    t.f.zone = 'home'; t.f.i = S.c.home.indexOf(id); t.f.part = 'remove';
    S.note = T('{name} is on Home, position {n}.', { name: app(id).name, n: t.f.i + 1 });
  }
  function editorPlace(t) {
    var L = t.lifted;
    begin();
    if (same(L.order, S.c.home)) { t.lifted = null; return; }
    if (!homeMove(L.order.slice(), L.id, L.snap)) return;
    t.lifted = null;
    S.note = T('{name} moved to position {n}.', { name: app(L.id).name, n: t.f.i + 1 });
  }
  function closeEditor() { clearSession(); pop(); }

  /* ---------- Settings, Layout and messages ---------- */
  function mode() { for (var i = 0; i < MODES.length; i++) if (MODES[i].id === S.c.mode) return MODES[i]; return MODES[0]; }
  function settingsRows() {
    var n = S.c.home.length;
    return [{ id: 'background', label: T('Background'), value: VALUE_NAMES[S.c.bg] + ' · ' + S.c.opacity + '%' },
      { id: 'docklayout', label: T('Dock layout'), value: VALUE_NAMES[S.c.chdock] + ' · ' + VALUE_NAMES[S.c.indock] },
      { id: 'weather', label: T('Weather effects'), value: VALUE_NAMES[S.c.wfx] }, { id: 'editor', label: T('Apps on Home'), value: n + (n === 1 ? ' app' : ' apps') },
      { id: 'chanedit', label: T('Channels on Home'), value: T('{n} channels', { n: (S.c.channels || []).length }) },
      { id: 'sort', label: T('Sort apps'), value: VALUE_NAMES[S.c.sort] }]
      .concat(inputSources().length ? [{ id: 'inputedit', label: T('Input icons'), value: (function () { var ni = Object.keys(S.c.inputs || {}).length; return ni ? String(ni) : T('Default'); }()) }] : [])
      .concat([{ id: 'samsung', label: T('Samsung'), value: T('Home and TV settings') }]);
  }
  function settingsIds() { return settingsRows().map(function (r) { return r.id; }); }
  V.settings = {
    sheet: true,
    norm: function (t) { var ids = settingsIds(); if (ids.indexOf(t.f.id) < 0) t.f.id = ids[0]; },
    key: function (t, k) {
      var ids = settingsIds(), i = Math.max(0, ids.indexOf(t.f.id));
      if (k === 'up' && i > 0) i--;
      else if (k === 'down' && i < ids.length - 1) i++;
      else if (k === 'back') { pop(); return; }
      t.f.id = ids[i]; S.settingsFocus = ids[i];
      if (k === 'ok') settingsOk(ids[i]);
    },
    point: function (t, z, i, id) { if (z === 'row' && id) { t.f.id = id; this.key(t, 'ok'); } }
  };
  function settingsOk(id) {
    if (id === 'editor') openApps(true);
    else if (id === 'chanedit') openChannels(true);
    else if (id === 'inputedit') openInputEditor();
    else openAppearance(id);
  }
  var DETAIL_NAMES = { background: T('Background'), docklayout: T('Dock layout'), layout: T('Layout'), typography: T('Typography'), focus: T('Focus'), rotation: T('Rotation'), weather: T('Weather effects'), sort: T('Sort apps'), inputedit: T('Input icons'), samsung: T('Samsung'), inputs: T('Inputs') };
  function backName(group) {
    return group === 'rotation' ? T('Background') : group === 'inputs' ? T('Samsung') : group === 'inputpick' ? T('Input icons') : T('Settings');
  }
  // Input-icon editor: one row per discovered source; its icon picker is a second screen.
  function inputSources() { return (S.inputs || []).filter(function (it) { return it.kind === 'source'; }); }
  function inputEditRows() {
    return inputSources().map(function (it) {
      var preset = inputPreset((S.c.inputs || {})[it.key]);
      return { action: 'inputedit.' + it.key, label: it.type === 'TV' ? T('TV') : 'HDMI ' + it.number, description: preset ? T(preset.name) : T('Default') };
    });
  }
  function openInputEditor() {
    var rows = inputEditRows();
    push({ id: 'appearance', group: 'inputedit', f: { action: rows.length ? rows[0].action : 'settings.back' } });
  }
  function openInputPick(key, name) {
    push({ id: 'appearance', group: 'inputpick', inputKey: key, inputName: name, f: { action: 'choice.inputicon.' + ((S.c.inputs || {})[key] || 'default') } });
  }
  function applyInputIcon(key, value) {
    S.err = null; S.lookError = null;
    var c = next(S.c.home.slice(), S.c.recent.slice());
    c.inputs = withInput(key, value === 'default' ? null : value);
    if (write(c, 'Input icon')) S.inputs = buildInputs();
    pop();
  }
  function choice(axis, value, disabled) {
    return { action: axis === 'mode' ? 'rotation.' + value : 'choice.' + axis + '.' + value, axis: axis, value: value, disabled: !!disabled,
      label: axis === 'opacity' ? value + '%' : axis === 'font' ? FONTS[value].name : axis === 'mode' ? MODES.filter(function (m) { return m.id === value; })[0].name : value === 'both' ? T('Both') : VALUE_NAMES[value] };
  }
  function detailSections(t) {
    var flat = S.c.bg !== 'photo', inactive = !materialApplies();
    function options(axis, values, disabled) { return values.map(function (value) { return choice(axis, value, disabled); }); }
    if (t.group === 'inputs') return [{ id: 'inputs', title: '', items: t.inputs.length ? t.inputs.map(function (input) {
      return { action: 'input.' + input.number, label: input.name, description: input.active ? T('Active') : input.connected ? T('Connected') : T('Disconnected — may be asleep') };
    }) : [{ action: 'inputs.retry', label: t.loading ? T('Loading inputs…') : T('Try again'), disabled: t.loading }],
      reason: t.inputError || (!t.loading && !t.inputs.length ? T('No HDMI inputs were reported by this TV.') : '') }];
    if (t.group === 'docklayout') return [
      { id: 'chdock', title: T('Channel dock'), horizontal: true, items: options('chdock', ['left', 'right']) },
      { id: 'indock', title: T('Inputs'), horizontal: true, items: options('indock', ['above', 'below']) }
    ];
    if (t.group === 'background') return [
      { id: 'bg', title: T('Panel colour'), horizontal: true, items: options('bg', ['dark', 'light']) },
      { id: 'opacity', title: T('Panel opacity'), horizontal: true, items: options('opacity', LOOK_VALUES.opacity),
        reason: T('Lower is more see-through over live content; higher makes the panels easier to read.') }
    ];
    if (t.group === 'weather') return [{ id: 'wfx', title: '', horizontal: true, items: options('wfx', ['on', 'off']),
      reason: REDUCED_MOTION ? T('Animated effects follow the reduced-motion setting.') : T('Rain, storms, sun, stars and falling leaves follow the local weather.') }];
    if (t.group === 'layout') return [
      { id: 'layout', title: T('Layout'), horizontal: true, items: options('layout', ['list', 'dock']) },
      { id: 'apps', title: T('App display'), horizontal: true, items: options('apps', ['text', 'icons', 'both']) },
      { id: 'controls', title: T('Home controls'), horizontal: true, items: options('controls', ['text', 'icons', 'both']) }
    ];
    if (t.group === 'typography') return [{ id: 'font', title: '', items: options('font', LOOK_VALUES.font) }];
    if (t.group === 'sort') return [{ id: 'sort', title: '', items: options('sort', SORT_IDS),
      reason: T('Reorders the apps on Home. Dragging an app in Apps on Home switches back to Custom order.') }];
    if (t.group === 'inputedit') {
      var rows = inputEditRows();
      return [{ id: 'inputedit', title: '', items: rows.length ? rows : [{ action: 'inputedit.none', label: T('No inputs found'), disabled: true }],
        reason: T('Choose a device icon for each input shown on the Home bar.') }];
    }
    if (t.group === 'inputpick') {
      var cur = (S.c.inputs || {})[t.inputKey] || 'default';
      var items = [{ action: 'choice.inputicon.default', axis: 'inputicon', value: 'default', label: T('Default'), inputDefault: true, applied: cur === 'default' }];
      INPUT_PRESETS.forEach(function (p) {
        items.push({ action: 'choice.inputicon.' + p.id, axis: 'inputicon', value: p.id, label: T(p.name), inputIcon: p.icon, applied: cur === p.id });
      });
      return [{ id: 'inputpick', title: '', items: items }];
    }
    if (t.group === 'focus') return [
      { id: 'focus', title: T('Focus style'), horizontal: true, items: options('focus', ['type', 'glass']) },
      { id: 'material', title: T('Material'), horizontal: true, items: options('material', ['soft', 'frost', 'tint'], inactive),
        reason: inactive ? flat ? T('Materials are available with a Photo background.') : T('Choose Glass focus or the Dock layout to use materials.') : '' }
    ];
    if (t.group === 'rotation') return [{ id: 'mode', title: '', items: options('mode', MODES.map(function (m) { return m.id; }), flat),
      reason: flat ? T('Choose Photo in Background to use rotation.') : T('Timed changes pause while Settings or another panel is open.') }];
    return [{ id: 'samsung', title: '', items: [
      { action: 'samsung.home', label: T('Samsung Home'), description: T('Open Samsung’s Home screen') },
      { action: 'samsung.settings', label: T('TV settings'), description: T('Picture, sound and network settings') },
      { action: 'samsung.inputs', label: T('Inputs'), description: T('Choose an HDMI input') }
    ] }];
  }
  function detailRows(t) {
    var rows = [[{ action: 'settings.back', label: backName(t.group) }]];
    detailSections(t).forEach(function (section) {
      var enabled = section.items.filter(function (item) { return !item.disabled; });
      if (section.horizontal && enabled.length) rows.push(enabled);
      else enabled.forEach(function (item) { rows.push([item]); });
    });
    if (S.lookError) rows.push([{ action: 'settings.retry', label: 'Try again' }]);
    return rows;
  }
  function detailLocation(t) {
    var rows = detailRows(t), row = 0, column = 0;
    rows.forEach(function (items, r) { items.forEach(function (item, c) { if (item.action === t.f.action) { row = r; column = c; } }); });
    return { rows: rows, row: row, column: column, item: rows[row][column] };
  }
  function detailFocus(t, item, column) {
    t.f.action = item.action;
    if (item.action !== 'settings.back') S.detailFocus[t.group] = item.action;
    if (column !== undefined) t.f.column = column;
    if (item.axis) S.appearanceFocus = item.axis;
  }
  function applyRotation(value) {
    var c;
    if (S.c.bg !== 'photo') return;
    S.err = null; S.lookError = null;
    if (value === S.c.mode) return;
    c = next(S.c.home.slice(), S.c.recent.slice()); c.mode = value;
    if (!write(c, 'Wallpaper rotation')) S.lookError = { type: 'save', patch: { mode: value }, row: 'mode', transient: false };
  }
  function loadInputs(t) {
    t.loading = true; t.inputError = null;
    FrameDevice.sources(function (err, list) {
      if (top() !== t) return;
      t.loading = false; t.inputs = list || []; t.inputError = err ? err.message : null; after();
    });
  }
  function openInputs() {
    openAppearance('inputs'); var t = top(); t.inputs = []; loadInputs(t);
  }
  function detailBack() { cancelLook(); S.err = null; pop(); FrameDevice.cancelSource(); }
  function detailOk(t, item) {
    var patch = {}, error = S.lookError;
    if (item.action === 'settings.back') { detailBack(); return; }
    if (item.disabled || S.pending) return;
    if (item.action === 'settings.retry') {
      if (error && error.patch[error.row] !== undefined) detailFocus(t, choice(error.row, error.patch[error.row]), 0);
      if (error && error.row === 'mode') applyRotation(error.patch.mode);
      else if (error) setLook(error.patch, { row: error.row });
    } else if (item.axis === 'mode') applyRotation(item.value);
    else if (item.axis === 'wfx') applyWeatherFx(item.value);    else if (item.axis === 'sort') applySort(item.value);
    else if (item.axis === 'inputicon') applyInputIcon(t.inputKey, item.value);
    else if (item.action.indexOf('inputedit.') === 0) openInputPick(item.action.slice(10), item.label);
    else if (item.axis) { patch[item.axis] = item.value; setLook(patch, { row: item.axis }); }
    else if (item.action === 'background.wallpaper') openWallpaper();
    else if (item.action === 'background.rotation') openAppearance('rotation');
    else if (item.action === 'samsung.home') perform('Samsung Home', FrameDevice.home);
    else if (item.action === 'samsung.settings') perform('TV settings', FrameDevice.settings);
    else if (item.action === 'samsung.inputs') openInputs();
    else if (item.action === 'inputs.retry') loadInputs(t);
    else if (item.action.indexOf('input.') === 0) perform(item.label, function (done) {
      FrameDevice.setSource(Number(item.action.slice(6)), function (err) {
        t.refreshInputs = true;
        done(top() === t && !document.hidden && !(err && err.cancelled) ? err : null);
      });
    });
  }
  V.appearance = {
    norm: function (t) {
      var rows = detailRows(t), exists = false, applied = null;
      var axis = { background: 'bg', layout: 'layout', typography: 'font', focus: 'focus', rotation: 'mode', weather: 'wfx', sort: 'sort' }[t.group];
      rows.forEach(function (items) { items.forEach(function (item) {
        if (item.action === t.f.action) exists = true;
        if (item.axis === axis && item.value === S.c[axis]) applied = item;
      }); });
      if (!exists) detailFocus(t, applied || (rows[1] || rows[0])[0], 0);
      if (t.f.column === undefined) t.f.column = detailLocation(t).column;
    },
    key: function (t, k) {
      var at = detailLocation(t), row = at.row, column = at.column;
      if (k === 'back') { detailBack(); return; }
      if (k === 'ok') { detailOk(t, at.item); return; }
      if (k === 'up' || k === 'down') {
        row = clamp(row + (k === 'up' ? -1 : 1), 0, at.rows.length - 1);
        column = Math.min(t.f.column || 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column]);
      } else if (k === 'left' || k === 'right') {
        column = clamp(column + (k === 'left' ? -1 : 1), 0, at.rows[row].length - 1);
        detailFocus(t, at.rows[row][column], column);
      }
    },
    point: function (t, z, i, action) {
      if (z !== 'detail') return;
      detailRows(t).some(function (items) { return items.some(function (item, column) {
        if (item.action !== action) return false;
        detailFocus(t, item, column); detailOk(t, item); return true;
      }); });
    }
  };
  function messageContent(t) { return t.content || MSG[t.msg]; }
  V.message = {
    sheet: true,
    key: function (t, k) {
      var A = messageContent(t).actions, a;
      if (k === 'left') t.f.b = Math.max(0, t.f.b - 1);
      else if (k === 'right') t.f.b = Math.min(A.length - 1, t.f.b + 1);
      else if (k === 'back') pop();
      else if (k === 'ok') { a = A[t.f.b][0]; pop(); if (a === 'samsung') perform('Samsung Home', FrameDevice.home); }
    },
    point: function (t, z, i) { if (z === 'act') { t.f.b = i; this.key(t, 'ok'); } }
  };

  /* ---------- Dispatch ---------- */
  function norm() { var t = top(), v = V[t.id]; if (v.norm) v.norm(t); }
  function press(k) {
    norm();
    var t = top();
    V[t.id].key(t, k);
    norm();
    render();
    syncRotation();
  }

  /* ---------- Rendering ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), homeEl = $('home'), caption = $('caption'), utilsEl = $('utils');
  var utilFocusLabel = $('utilFocusLabel'), utilFocusKey = '', appFocusName = $('appFocusName');
  var wxEl = $('wx');
  var inDock = $('inDock'), inShelf = $('inShelf'), inTrack = $('inTrack'), inPlate = $('inPlate'), matScrim2 = $('matScrim2');
  var chDock = $('chDock'), chShelf = $('chShelf'), chTrack = $('chTrack'), chPlate = $('chPlate'), matScrim3 = $('matScrim3');
  var dock = $('dock'), shelf = $('shelf'), track = $('track'), plate = $('plate'), matScrim = $('matScrim'), dockEmpty = $('dockEmpty');
  var cueL = $('cueL'), cueR = $('cueR'), dockAction = $('dockAction');
  var focusStatus = $('focusStatus'), sceneEl = $('scene'), appearanceEl = $('appearance'), appearanceRows = $('appearanceRows'), appearanceDesc = $('appearanceDesc');
  var appearanceBack = $('appearanceBack'), appearanceTitle = $('appearanceTitle'), appearanceStatus = $('appearanceStatus');
  var phScene = $('phScene'), phPlate = $('phPlate'), phField = $('phField'), phList = $('phList'), phRows = $('phRows'), phAction = $('phAction'), phEmpty = $('phEmpty');
  var phPlates = [phPlate, $('phPlateAlt')], phFields = [phField, $('phFieldAlt')], photoPlateIndex = 0, photoPlateKey = null;
  var utPlates = [$('utLens'), $('utLensAlt')], utFields = [$('utField'), $('utFieldAlt')], utPlateIndex = 0, utPlateKey = null;
  var photoMode = null, photoTransitionToken = 0;
  var sheetEl = $('sheet'), sheetView = $('sheetView');
  var IMG = { photo: $('photo'), mat: $('matImg'), mat2: $('matImg2'), mat3: $('matImg3'), bg: $('sheetBg'), field: $('phFieldImg'), fieldAlt: $('phFieldImgAlt'), utility: $('utFieldImg'), utilityAlt: $('utFieldImgAlt') };
  var sheetKey = '', slotEls = {}, dockAnchorCenter = 960;
  var appliedPalette = null, appliedPhoto = null, appliedFont = null, appliedFontMetrics = null;

  /* Curated locked palettes keep the existing rendering path exactly. */
  function applyAdaptiveInk(palette) {
    var active = S.c.bg === 'photo' && palette && !palette.locked && palette.light && palette.tl && palette.tr && palette.br;
    if (appliedPalette === palette && appliedPhoto === (S.c.bg === 'photo')) return !!active;
    appliedPalette = palette; appliedPhoto = S.c.bg === 'photo';
    ['tl', 'tr', 'br'].forEach(function (zone) {
      var r = active ? palette[zone] : null;
      var values = r ? { ink: r.ink, 'clock-ink': r.clockInk || r.ink, 'rest-ink': r.restInk, 'peer-ink': r.peerInk, rest: r.restAlpha, peer: r.peerAlpha, under: r.halo, shadow: r.shadow } : {};
      ['ink', 'clock-ink', 'rest-ink', 'peer-ink', 'rest', 'peer', 'under', 'shadow'].forEach(function (key) {
        var name = '--' + zone + '-' + key, value = values[key];
        if (value !== undefined && value !== null) stage.style.setProperty(name, String(value));
        else stage.style.removeProperty(name);
      });
    });
    if (active && palette.light) stage.style.setProperty('--home-app-ink', palette.light);
    else stage.style.removeProperty('--home-app-ink');
    return !!active;
  }
  function inkRungClasses(palette, active) {
    if (!active) return '';
    return ['tl', 'tr', 'br'].map(function (zone) {
      var rung = palette[zone].rung;
      return ['light', 'mist', 'mist-high', 'dark', 'dark-halo'].indexOf(rung) >= 0 ? ' ink-' + zone + '-' + rung : '';
    }).join('');
  }
  function render() {
    var t = top(), sheet = !!V[t.id].sheet, shown = wall(S.shown ? S.shown.wall : S.c.wall), palette = ADAPTIVE_INK[shown.id];
    var adaptive = applyAdaptiveInk(palette), tr = adaptive && palette.tr ? palette.tr.pol : shown.ut.tr, br = adaptive && palette.br ? palette.br.pol : shown.ut.br;
    stage.className = 'stage bg-' + S.c.bg + ' l-' + S.c.layout + ' v-' + S.variant + ' m-' + (materialApplies() ? S.c.material : 'none') + ' f-' + S.c.focus + ' a-' + S.c.apps + ' u-' + S.c.controls + ' g-' + S.geom + ' tone-' + shown.tone + ' tr-' + tr + ' br-' + br + wallClasses(shown) + inkRungClasses(palette, adaptive) + ' at-' + t.id + ' font-' + homeFont() + (homeFont() !== 'manrope' ? ' font-custom' : '') + (S.fontSwitch ? ' is-font-switch' : '') + (adaptive ? ' has-adaptive-ink adaptive-tl-' + palette.tl.pol : '') + (!adaptive && shown.clockInk ? ' has-clock-ink' : '') + (!adaptive && shown.dockClockInk ? ' has-dock-clock-ink' : '') + (registeredMaterial(shown.id) ? ' registered-material' : '') + (sheet ? ' is-sheet' : '') + (S.reflow ? ' is-reflow' : '') + wxClasses();
    wxNightShown = wxNight();
    renderWeatherFx();
    if (!adaptive && shown.clockInk) stage.style.setProperty('--clock-ink', shown.clockInk);
    else stage.style.removeProperty('--clock-ink');
    if (!adaptive && shown.dockClockInk) stage.style.setProperty('--dock-clock-ink', shown.dockClockInk);
    else stage.style.removeProperty('--dock-clock-ink');
    // Overlay panel fill: chosen colour (dark/light) at the chosen opacity.
    stage.style.setProperty('--ov', 'rgba(' + (S.c.bg === 'light' ? '242,242,238' : '6,10,14') + ',' + (Number(S.c.opacity) / 100) + ')');
    applyHomeFont();
    if (!sheet) renderHome(t);
    renderSheet(t, sheet);
    renderAppearance(t);
    renderFocusStatus(t);
  }

  function applyHomeFont() {
    var id = homeFont(), f = FONTS[id], primary = fontRole(id, 'primary'), ui = fontRole(id, 'ui'), metrics = fontMetrics[id];
    if (appliedFont === id && appliedFontMetrics === metrics) return;
    appliedFont = id; appliedFontMetrics = metrics;
    var values = { 'display-family': '"' + f.family + '"', 'ui-family': '"' + ui.family + '"', 'primary-family': '"' + primary.family + '"', 'display-weight': f.display, 'ui-weight': ui.weight, 'primary-weight': primary.weight, 'clock-weight': f.clock,
      'clock-shift': px(fontShift('clock', 48)), 'utility-shift': px(fontShift('ui', 28)), 'action-shift': px(fontShift('ui', 30)), 'heading-shift': px(fontShift('ui', 48)), 'full-name-shift': px(fontShift('primary', 30)), 'clock-digit': px(metrics ? metrics.digitCell : 0) };
    Object.keys(values).forEach(function (key) { homeEl.style.setProperty('--font-' + key, String(values[key])); });
  }

  function homeState(t) {
    var h = S.c.home, hs = { mode: 'browse', zone: null, i: Math.max(0, ensureSel()), u: -1, lifted: false, from: -1, arr: null, items: h.map(function (id) { return { key: id, kind: 'app', id: id }; }) };
    if (isSettingsDetail(t)) hs.zone = 'preview';
    else if (t.id === 'home') { hs.zone = t.f.zone; hs.u = t.f.u; hs.n = t.f.n || 0; hs.c = t.f.c || 0; }
    return hs;
  }

  function renderHome(t) {
    var hs = homeState(t);
    renderCaption(t, hs);
    renderUtils(hs);
    if (S.c.layout === 'list') renderList(hs);
    else { photoMode = null; renderDock(hs); }
    renderAppFocusName(hs);
  }

  function clockText() {
    var d = new Date(), h = d.getHours() % 12 || 12, m = d.getMinutes();
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  function clockHtml() {
    var text = clockText(), metrics = fontMetrics[homeFont()];
    if (!metrics || !metrics.digitCell) return text;
    return text.replace(/[0-9]/g, function (digit) { return '<span class="clock-digit">' + digit + '</span>'; });
  }
  function renderCaption(t, hs) {
    var html = '<span class="clock">' + clockHtml() + '</span>' + wxCaption();
    if (S.c.apps !== 'icons' && hs.items[hs.i] && (S.c.layout === 'list' ? photoLabel(hs.items[hs.i].id, false).size < 88 || photoLabel(hs.items[hs.i].id, false).ellipsis : hs.zone === 'apps' && reducedDockLabel(hs.items[hs.i].id))) html += '<span class="cap-line full-name">' + esc(app(hs.items[hs.i].id).name) + '</span>';
    setHTML(caption, html);
  }

  function utilBtn(z, i, action, inner, extra, name) {
    return '<button type="button" tabindex="-1" class="u' + (extra || '') + '" data-z="' + z + '" data-i="' + i + '" data-action="' + action + '" aria-label="' + esc(name) + '"><span class="u-content">' + inner + '</span></button>';
  }
  function renderUtils(hs) {
    var html = '', style = hs.mode === 'arrange' && S.c.controls !== 'text' ? 'both' : S.c.controls;
    var iconsOnly = style === 'icons', U = utils(), focused = null;
    utilsEl.className = 'utils quiet-utils is-' + style + (hs.zone === 'util' || hs.zone === 'ctl' ? ' is-awake' : '');
    U.forEach(function (u, i) { html += utilBtn('util', i, 'util.' + u, icon(UTIL[u][1], '', true) + '<span class="u-label">' + UTIL[u][0] + '</span>', '', UTIL[u][0]); });
    setHTML(utilsEl, html);
    Array.prototype.forEach.call(utilsEl.querySelectorAll('.u'), function (b) {
      var z = b.getAttribute('data-z'), focus = hs.zone === z && hs.u === Number(b.getAttribute('data-i'));
      b.className = b.className.replace(/\s+is-focus/g, '') + (focus ? ' is-focus' : '');
      if (focus) focused = b;
    });
    renderUtilFocusLabel(iconsOnly ? focused : null);
    renderUtilityLens(focused, iconsOnly);
  }
  function renderUtilFocusLabel(button) {
    var text, key, r, sr, scale, width, x;
    if (!button) { utilFocusLabel.className = 'util-focus-label'; utilFocusKey = ''; return; }
    text = S.err ? T('Not saved. OK tries again.') : button.getAttribute('aria-label');
    key = button.getAttribute('data-action') + '|' + text + '|' + homeFont();
    if (key !== utilFocusKey) {
      utilFocusLabel.className = 'util-focus-label'; utilFocusLabel.textContent = text;
      utilFocusLabel.offsetWidth;
      utilFocusKey = key;
    }
    r = button.getBoundingClientRect(); sr = sceneEl.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    width = Math.ceil(textWidth(text, 28, 500, -.2) + 8); x = (r.left + r.width / 2 - sr.left) / scale - width / 2;
    if (S.c.layout === 'list') x = 1730 - width;
    utilFocusLabel.style.width = width + 'px'; utilFocusLabel.style.left = clamp(x, 112, 1808 - width) + 'px';
    utilFocusLabel.style.top = ((S.c.layout === 'list' ? (r.top + r.height / 2 - sr.top) / scale - 19 : 140) + fontShift('ui', 28)) + 'px';
    utilFocusLabel.className = 'util-focus-label is-on';
  }
  function renderUtilityLens(button, iconsOnly) {
    var r, label, sr, scale, x, y, width, key, el;
    if (!button || S.c.focus !== 'glass') {
      utPlates.forEach(function (plateEl) { plateEl.className = 'ph-plate ut-lens is-outgoing'; });
      utPlateKey = null;
      return;
    }
    r = button.getBoundingClientRect(); sr = sceneEl.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    y = (r.top - sr.top) / scale + 2;
    if (S.c.layout === 'list') {
      label = iconsOnly ? utilFocusLabel : button.querySelector('.u-label');
      x = (label.getBoundingClientRect().left - sr.left) / scale - 24;
      width = 1800 - x;
    } else {
      // Dock icons keep a fixed lens; the separate caption cannot overlap its neighbours.
      x = (r.left - sr.left) / scale; width = r.width / scale;
    }
    key = button.getAttribute('data-action') + '|' + x + '|' + y + '|' + width;
    if (key !== utPlateKey) {
      utPlates[utPlateIndex].className = 'ph-plate ut-lens is-outgoing';
      utPlateIndex = 1 - utPlateIndex; el = utPlates[utPlateIndex];
      el.className = 'ph-plate ut-lens is-preparing';
      el.style.width = width + 'px'; el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      fieldTransform(utFields[utPlateIndex], x, y, width, 60);
      el.offsetWidth;
      utPlateKey = key;
    }
    fieldTransform(utFields[utPlateIndex], x, y, width, 60);
    utPlates[utPlateIndex].className = 'ph-plate ut-lens is-current on-focus';
  }
  function renderAppFocusName(hs) {
    var it = hs.items[hs.i], width, x, y, placement;
    if (S.c.apps !== 'icons' || hs.mode !== 'browse' || hs.zone !== 'apps' || !it) { appFocusName.className = 'app-focus-name'; return; }
    appFocusName.textContent = app(it.id).name;
    width = Math.min(S.c.layout === 'list' ? 1056 : 1640, Math.ceil(textWidth(app(it.id).name, S.c.layout === 'list' ? 40 : 36, 500, -.6, 'primary') + 8));
    appFocusName.style.width = width + 'px';
    if (S.c.layout === 'list') {
      x = 280; placement = phFields[photoPlateIndex]._placement;
      y = placement.y + placement.height / 2 - 24;
    } else {
      x = clamp(dockAnchorCenter - width / 2, 140, 1780 - width); y = 932;
    }
    appFocusName.style.left = x + 'px'; appFocusName.style.top = (y + fontShift('primary', S.c.layout === 'list' ? 40 : 36)) + 'px';
    appFocusName.className = 'app-focus-name is-on';
  }

  /* Grid dock: up to five columns and three visible rows, scrolling a row at a time. */
  function dockGeom(n) {
    var m = DOCK_MODES[S.c.apps], cols = Math.max(1, Math.min(DOCK_COLS, n)), total = Math.max(1, Math.ceil(Math.max(n, 1) / cols));
    var rows = Math.min(DOCK_ROWS, total), rp = m.th + DOCK_ROW_GAP, shelfW = cols * m.pitch - 8, w = shelfW + 32, h = rows * rp - DOCK_ROW_GAP + 32;
    if (n < 0) { w = 912; shelfW = 880; rows = total = 1; h = m.th + 32; }
    // The app dock and channel column form a horizontal pair; appdock aligns it, chdock
    // picks the channel's side, indock puts the inputs bar above or below the pair.
    var hasIn = S.inputs.length > 0, M = 40, chLeft = S.c.chdock === 'left';
    // Channel column pinned to a side; the app dock centres in the remaining width.
    var chx = chLeft ? M : 1920 - M - CH_W;
    var regL = chLeft ? M + CH_W + CH_GAP : M, regR = chLeft ? 1920 - M : 1920 - M - CH_W - CH_GAP;
    var x = clamp(Math.round(regL + (regR - regL - w) / 2), M, Math.max(M, 1920 - M - w));
    var above = S.c.indock === 'above' && hasIn;
    var pairBottom = (hasIn && !above) ? 908 - IN_H - IN_GAP : 908;
    var iny = above ? (pairBottom - h) - IN_GAP - IN_H : 908 - IN_H;
    return { x: x, y: pairBottom - h, chx: chx, iny: iny, h: h, w: w, shelf: shelfW, cols: cols, rows: rows, total: total, rp: rp, vis: cols, broad: false, empty: n < 0, tw: m.tw, th: m.th, pitch: m.pitch };
  }
  /* Returns the vertical offset: the window moves one row when focus passes an edge. */
  function dockOffset(n, i, g) {
    var row = Math.floor(i / g.cols), first = clamp(scroll.first, 0, Math.max(0, g.total - g.rows));
    if (row < first) first = row;
    if (row > first + g.rows - 1) first = row - g.rows + 1;
    if (!S.reflow) { scroll.first = first; scroll.off = first; }
    return first * g.rp;
  }
  function dockTileHtml(it, full) {
    var a, body;
    if (it.kind === 'add') return '<span class="add">' + icon('plus') + '</span><span class="label">' + (full ? T('Home is full') : T('Add app')) + '</span>';
    a = app(it.id);
    body = S.c.apps === 'text' ? '' : appMark(a, S.c.apps === 'icons' ? 136 : 120, S.c.apps === 'icons' ? 88 : 72, S.c.apps === 'icons' ? 72 : 58);
    return body + (S.c.apps === 'icons' ? '' : '<span class="label" style="font-size:' + dockLabelSize(a.id) + 'px;top:' + ((S.c.apps === 'text' ? 28 : 128) + fontShift('primary', dockLabelSize(a.id))) + 'px"><span class="label-ink">' + esc(a.name) + '</span></span>') + '<span class="nudge nudge-l">' + icon('left') + '</span><span class="nudge nudge-r">' + icon('right') + '</span>';
  }

  /* Horizontal inputs dock: same glass material as the app grid, registered to the stage. */
  function renderInputs(hs, g) {
    var list = S.inputs, n = list.length, w, x, y, focus = hs.zone === 'inputs', at = clamp(hs.n || 0, 0, Math.max(0, n - 1));
    var room = IN_MAXW - 32 + 8, pitch = IN_PITCH, tw = IN_TW, vis = n, first = 0;
    if (!n || hs.mode === 'arrange') { inDock.className = 'dock inputs-dock is-off'; return; }
    // Narrow the tiles to fit; past the minimum width, scroll a tile at a time.
    if (n * IN_PITCH > room) { tw = Math.max(IN_MIN_TW, Math.floor(room / n) - 8); pitch = tw + 8; }
    if (n * pitch > room) {
      vis = Math.max(1, Math.floor(room / pitch));
      first = clamp(scroll.inp, 0, n - vis);
      if (at < first) first = at;
      if (at > first + vis - 1) first = at - vis + 1;
    }
    scroll.inp = first;
    w = vis * pitch - 8 + 32; x = Math.round((1920 - w) / 2); y = g ? g.iny : 908 - IN_H;
    inDock.className = 'dock inputs-dock';
    inDock.style.left = x + 'px'; inDock.style.top = y + 'px'; inDock.style.width = w + 'px'; inDock.style.height = IN_H + 'px';
    inShelf.style.width = (vis * pitch - 8) + 'px';
    inShelf.className = 'shelf' + (first > 0 ? ' fade-l' : '') + (first + vis < n ? ' fade-r' : '');
    inTrack.style.transform = 'translate3d(' + (-first * pitch) + 'px,0,0)';
    inDock.style.setProperty('--tile-w', tw + 'px'); inDock.style.setProperty('--tile-h', IN_TH + 'px'); inDock.style.setProperty('--dock-h', IN_H + 'px');
    IMG.mat2.style.left = (-x) + 'px'; IMG.mat2.style.top = (-y) + 'px';
    IMG.mat2.style.transformOrigin = '960px ' + (y + IN_H / 2) + 'px';
    matScrim2.style.left = (-x) + 'px'; matScrim2.style.top = (SCRIM_Y - y) + 'px';
    keyed(inTrack, list, function (el, it, i) {
      setContent(el, it.name + '|' + it.state + '|' + it.icon + '|' + (it.mark ? 'm' : 's'), function () {
        return '<span class="tile-content"><span class="in-ico">' + (it.mark ? deviceIcon(it.icon) : icon(it.icon)) + '</span><span class="in-name">' + esc(it.name) + '</span><span class="in-state">' + esc(it.state) + '</span></span>';
      });
      el.className = 'tile k-input' + (focus && i === at ? ' is-focus' : '') + (!it.connected ? ' is-unplugged' : '');
      el.style.transform = 'translate3d(' + (i * pitch) + 'px,0,0)';
      el.setAttribute('role', 'button'); el.setAttribute('aria-label', it.name + ', ' + it.state);
      attrs(el, 'input', i, 'home.input.' + it.key);
    });
    inPlate.className = 'plate' + (focus ? ' on-focus' : '');
    inPlate.style.transform = 'translate3d(' + (at * pitch) + 'px,0,0)';
  }
  /* Channel column: same glass as the grid, its height, one tile per row; the track
     scrolls a tile at a time so the focused channel stays in view. */
  function renderChannels(hs, g) {
    var items = colItems(), n = items.length, focus = hs.zone === 'channels', at = clamp(hs.c || 0, 0, Math.max(0, n - 1));
    var x, y, h, vis, first;
    x = g.chx; y = g.y; h = g.h;
    vis = Math.max(1, Math.floor((h - 32 + 8) / CH_PITCH));
    first = clamp(scroll.ch, 0, Math.max(0, n - vis));
    if (at < first) first = at;
    if (at > first + vis - 1) first = at - vis + 1;
    scroll.ch = first;
    chDock.className = 'dock ch-dock' + (hs.mode === 'arrange' ? ' is-idle' : '');
    chDock.style.left = x + 'px'; chDock.style.top = y + 'px'; chDock.style.width = CH_W + 'px'; chDock.style.height = h + 'px';
    chDock.style.setProperty('--tile-w', CH_TW + 'px'); chDock.style.setProperty('--tile-h', CH_TH + 'px'); chDock.style.setProperty('--dock-h', h + 'px');
    chShelf.className = 'shelf' + (first > 0 ? ' fade-t' : '') + (first + vis < n ? ' fade-b' : '');
    chShelf.style.width = CH_TW + 'px';
    chTrack.style.transform = 'translate3d(0,' + (-first * CH_PITCH) + 'px,0)';
    IMG.mat3.style.left = (-x) + 'px'; IMG.mat3.style.top = (-y) + 'px';
    IMG.mat3.style.transformOrigin = '960px ' + (y + h / 2) + 'px';
    matScrim3.style.left = (-x) + 'px'; matScrim3.style.top = (SCRIM_Y - y) + 'px';
    keyed(chTrack, items, function (el, ch, i) {
      var all = ch.kind === 'all';
      setContent(el, all ? 'all' : ch.key + '|' + ch.icon + '|' + ch.name, function () {
        if (all) return '<span class="tile-content"><span class="ch-all-label">' + esc(T('All channels')) + '</span></span>';
        return '<span class="tile-content">' + (ch.icon ? markHtml(ch.icon, 64, 40, 40) : '<span class="ch-num-big">' + esc(ch.num) + '</span>')
          + '<span class="ch-label">' + (ch.icon ? '<span class="ch-num">' + esc(ch.num) + '</span> ' : '') + esc(ch.name) + '</span></span>';
      });
      el.className = 'tile k-ch' + (all ? ' k-ch-all' : '') + (focus && i === at ? ' is-focus' : '');
      el.style.transform = 'translate3d(0,' + (i * CH_PITCH) + 'px,0)';
      el.setAttribute('role', 'button'); el.setAttribute('aria-label', all ? T('All channels') : T('Channel {n}', { n: ch.num }) + ', ' + ch.name);
      attrs(el, 'channel', i, all ? 'home.channels.all' : 'home.channel.' + ch.key);
    });
    chPlate.className = 'plate' + (focus ? ' on-focus' : '');
    chPlate.style.transform = 'translate3d(0,' + (at * CH_PITCH) + 'px,0)';
  }
  function renderDock(hs) {
    var items = hs.items, n = items.length, empty = hs.mode !== 'arrange' && !n, g = dockGeom(empty ? -1 : n);
    var anchor = clamp(hs.i, 0, Math.max(0, n - 1)), off = empty ? 0 : dockOffset(n, anchor, g);
    var full = false, ns = n;
    // Leaving the app grid for the controls or inputs drops its selection highlight, so
    // focus reads in one place only. Arrange/settings-preview keep their selection.
    var tileFocus = hs.zone === 'apps' || hs.zone === 'tiles', tileSel = hs.zone === 'act' || hs.zone === 'ctl' || hs.zone === 'preview';
    var focusItem = items[anchor], s, ax, label, width;
    renderInputs(hs, g);
    renderChannels(hs, g);

    dock.className = 'dock' + (empty ? ' is-empty' : '');
    dock.style.left = g.x + 'px'; dock.style.top = g.y + 'px'; dock.style.width = g.w + 'px'; dock.style.height = g.h + 'px';
    dock.style.setProperty('--tile-w', g.tw + 'px'); dock.style.setProperty('--tile-h', g.th + 'px'); dock.style.setProperty('--dock-h', g.h + 'px');
    dock.style.setProperty('--nudge-top', ((g.th - 48) / 2) + 'px');
    dockAnchorCenter = g.x + 16 + (anchor % g.cols) * g.pitch + g.tw / 2;
    IMG.mat.style.left = (-g.x) + 'px'; IMG.mat.style.top = (-g.y) + 'px';
    IMG.mat.style.transformOrigin = '960px ' + (g.y + g.h / 2) + 'px';
    matScrim.style.left = (-g.x) + 'px'; matScrim.style.top = (SCRIM_Y - g.y) + 'px';
    matScrim.style.transformOrigin = '960px ' + (g.y + g.h / 2 - SCRIM_Y) + 'px';
    shelf.style.width = g.shelf + 'px';
    shelf.className = 'shelf';
    track.style.height = (g.total * g.rp + 16) + 'px';

    keyed(track, empty ? [] : items, function (el, it, i) {
      var a = it.id ? app(it.id) : null, left = (i % g.cols) * g.pitch, rowY = Math.floor(i / g.cols) * g.rp, focus = tileFocus && i === anchor, sel = tileSel && i === anchor;
      var lifted = hs.lifted && i === anchor, partial = false;
      setContent(el, it.kind + '|' + (it.id || '') + '|' + (it.id ? dockLabelSize(it.id) : full) + '|' + S.c.bg + '|' + S.c.apps + '|' + homeFont(), function () { return '<span class="tile-content">' + dockTileHtml(it, full) + '</span>'; });
      el.className = 'tile k-' + it.kind + (focus ? ' is-focus' : '') + (sel ? ' is-sel' : '') + (lifted ? ' is-lifted' : '') + (partial ? ' is-partial' : '')
        + (a && !a.mark ? ' is-text' : '') + (it.kind === 'add' && full ? ' is-full' : '') + (it.kind === 'app' && S.press === it.id ? ' is-press' : '')
        + (lifted && i === 0 ? ' no-l' : '') + (lifted && i >= ns - 1 ? ' no-r' : '');
      el.style.transform = 'translate3d(' + left + 'px,' + rowY + 'px,0)';
      el.setAttribute('role', 'button');
      if (a) el.setAttribute('aria-label', a.name);
      if (hs.mode === 'arrange') attrs(el, 'tile', i, 'arrange.' + (it.kind === 'add' ? 'add' : (it.kind === 'ph' ? 'placeholder.' : 'tile.') + it.id));
      else attrs(el, 'app', i, 'home.app.' + it.id);
    });
    // Grid rows scroll whole, so no per-tile edge measurement (forced layout) is needed.
    track.style.transform = 'translate3d(0,' + (-off) + 'px,0)';
    plate.className = 'plate' + (!n || empty || hs.zone === null ? '' : hs.lifted ? ' on-lift' : tileFocus ? ' on-focus' : tileSel ? ' on-sel' : '');
    plate.style.transform = 'translate3d(' + ((anchor % g.cols) * g.pitch) + 'px,' + (Math.floor(anchor / g.cols) * g.rp) + 'px,0)';

    // Up/down cues sit to the right of the grid when rows are hidden above or below.
    cueL.style.left = cueR.style.left = (g.x + g.w + 24) + 'px';
    cueL.style.top = (g.y + 16) + 'px'; cueR.style.top = (g.y + g.h - 64) + 'px';
    cueL.style.transform = cueR.style.transform = 'rotate(90deg)';
    cueL.className = 'cue' + (!empty && scroll.first > 0 ? ' is-on' : '');
    cueR.className = 'cue' + (!empty && scroll.first + g.rows < g.total ? ' is-on' : '');

    ax = g.x + 16 + (anchor % g.cols) * g.pitch;
    if (hs.mode === 'arrange' && !hs.lifted && (hs.zone === 'tiles' || hs.zone === 'act') && focusItem && focusItem.kind !== 'add') {
      s = hs.arr.slots[anchor];
      label = (s.removed ? 'Restore ' : 'Remove ') + app(s.id).name; width = actionWidth(label);
      ax = clamp(ax + (g.tw - width) / 2, 112, 1808 - width);
      setHTML(dockAction, '<span>' + esc(label) + '</span>');
      dockAction.className = 'dock-action is-on' + (hs.zone === 'act' ? ' is-focus' : '');
      dockAction.style.width = width + 'px';
      dockAction.style.transform = 'translate3d(' + ax + 'px,0,0)';
      attrs(dockAction, 'act', anchor, 'arrange.' + (s.removed ? 'restore.' : 'remove.') + s.id);
    } else {
      dockAction.className = 'dock-action';
      dockAction.removeAttribute('data-z'); dockAction.removeAttribute('data-action');
    }
    setHTML(dockEmpty, empty ? '<p>' + T('No apps on Home') + '</p><button type="button" tabindex="-1" class="btn' + (hs.zone === 'empty' ? ' is-focus' : '') + '" data-z="empty" data-i="0" data-action="home.add-apps">' + icon('plus') + '<span>' + T('Add apps') + '</span></button>' : '');
  }

  function photoModeTransition(compact) {
    if (photoMode !== null && photoMode !== compact) {
      var ghost = phScene.cloneNode(true), token = ++photoTransitionToken;
      ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(ghost.querySelectorAll('[id],[data-action],[data-z]'), function (el) {
        el.removeAttribute('id'); el.removeAttribute('data-action'); el.removeAttribute('data-z');
      });
      ghost.className = 'ph-scene ph-ghost';
      phScene.parentNode.appendChild(ghost);
      phScene.className = 'ph-scene ph-incoming';
      setTimeout(function () {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
        if (token === photoTransitionToken) phScene.className = 'ph-scene';
      }, 180);
    }
    photoMode = compact;
  }
  /* Each plate keeps a stationary, stage-registered field while its opacity changes.
     Reuse the hidden group for the next label; never animate plate width or position. */
  function renderPhotoPlate(id, width, height, y, state) {
    var key = id + '|' + width + '|' + height + '|' + y, plateEl, fieldEl;
    if (key !== photoPlateKey) {
      phPlates[photoPlateIndex].className = phPlates[photoPlateIndex].className.replace(' is-current', '') + ' is-outgoing';
      photoPlateIndex = 1 - photoPlateIndex;
      plateEl = phPlates[photoPlateIndex]; fieldEl = phFields[photoPlateIndex];
      plateEl.className = 'ph-plate is-preparing';
      plateEl.style.width = width + 'px'; plateEl.style.height = height + 'px';
      plateEl.style.transform = 'translate3d(0,' + y + 'px,0)';
      fieldTransform(fieldEl, 112, y, width, height);
      plateEl.offsetWidth; // Establish zero opacity before the incoming crossfade.
      photoPlateKey = key;
    }
    fieldTransform(phFields[photoPlateIndex], 112, y, width, height);
    phPlates[photoPlateIndex].className = 'ph-plate is-current' + (state ? ' ' + state : '');
  }
  function fieldTransform(el, x, y, width, height) {
    el._placement = { x: x, y: y, width: width, height: height };
    el.style.transformOrigin = (x + width / 2) + 'px ' + (y + height / 2) + 'px';
    el.style.transform = 'translate3d(' + (-x) + 'px,' + (-y) + 'px,0)' + (S.c.bg === 'photo' && S.c.material === 'tint' && !REDUCED_MOTION ? ' scale(1.04)' : '');
  }
  function renderList(hs) {
    var items = hs.items, n = items.length, compact = hs.mode === 'arrange', pitch = compact ? PH_COMPACT_PITCH : PH_PITCH;
    var anchor = clamp(hs.i, 0, Math.max(0, n - 1)), first, off, width, slot, y, s, label, aw, plateState;
    var rowFocus = hs.zone === 'apps' || hs.zone === 'tiles', remembered = hs.zone === 'util' || hs.zone === 'act' || hs.zone === 'ctl' || hs.zone === 'preview';
    photoModeTransition(compact);
    if (compact) {
      first = clamp(scroll.photoArrange, anchor - 7, anchor - 1);
      first = clamp(first, 0, Math.max(0, n - PH_COMPACT_VISIBLE));
      scroll.photoArrange = first;
    } else {
      first = clamp(scroll.photo, anchor - 3, anchor - 1);
      first = clamp(first, 0, Math.max(0, n - PH_FULL));
      scroll.photo = first;
    }
    off = first * pitch; slot = anchor - first;
    width = items[anchor] ? listPlateWidth(items[anchor].id, compact) : 360;
    phList.className = 'ph-list' + (compact ? ' is-compact' : '');
    phList.style.height = PH_HEIGHT + 'px';
    phRows.style.top = (compact ? 72 : 148) + 'px';
    keyed(phRows, items, function (row, it, i) {
      var typography = photoLabel(it.id, compact), focus = rowFocus && i === anchor, lifted = hs.lifted && i === anchor, markImage, body = '';
      setContent(row, it.id + '|' + typography.size + '|' + S.c.bg + '|' + S.c.apps + '|' + homeFont(), function () {
        if (S.c.apps !== 'text') body += appMark(app(it.id), S.c.apps === 'icons' ? compact ? 64 : 88 : compact ? 60 : 84, S.c.apps === 'icons' ? compact ? 64 : 88 : compact ? 44 : 64, S.c.apps === 'icons' ? compact ? 52 : 72 : compact ? 42 : 54);
        if (S.c.apps !== 'icons') body += '<span class="ph-name" style="font-size:' + typography.size + 'px;top:' + typography.top + 'px">' + esc(app(it.id).name) + '</span>';
        return '<span class="ph-group">' + body + '</span><span class="ph-move ph-move-up">' + icon('up') + '</span><span class="ph-move ph-move-down">' + icon('down') + '</span>';
      });
      markImage = row.querySelector('.mark img');
      if (markImage) {
        markImage.onerror = function () { this.style.visibility = 'hidden'; };
        if (markImage.complete && !markImage.naturalWidth) markImage.style.visibility = 'hidden';
      }
      row.className = 'ph-row k-' + it.kind + (focus ? ' is-focus' : '') + (remembered && i === anchor ? ' is-sel' : '') + (lifted ? ' is-lifted' : '')
        + (lifted && i === 0 ? ' no-up' : '') + (lifted && i === n - 1 ? ' no-down' : '')
        + (it.kind === 'app' && S.press === it.id ? ' is-press' : '');
      row.style.width = (compact ? listPlateWidth(it.id, compact) : 1200) + 'px'; row.style.height = pitch + 'px';
      row.style.transform = 'translate3d(0,' + (i * pitch) + 'px,0)';
      row.setAttribute('role', 'button'); row.setAttribute('aria-label', app(it.id).name);
      attrs(row, compact ? 'tile' : 'app', i, compact ? 'arrange.' + (it.kind === 'ph' ? 'placeholder.' : 'tile.') + it.id : 'home.app.' + it.id);
    });
    phRows.style.transform = 'translate3d(0,' + (-off) + 'px,0)';
    y = (compact ? PH_COMPACT_TOP + 2 : PH_TOP + 1) + slot * pitch;
    plateState = !n || hs.zone === null ? '' : hs.lifted ? 'on-lift' : S.c.focus === 'glass' && rowFocus ? 'on-focus' : S.c.focus === 'glass' && remembered ? 'on-sel' : '';
    renderPhotoPlate(items[anchor] ? items[anchor].id : '', width, compact ? 88 : 134, y, plateState);
    if (compact && !hs.lifted && (hs.zone === 'tiles' || hs.zone === 'act') && items[anchor]) {
      s = hs.arr.slots[anchor]; label = (s.removed ? 'Restore ' : 'Remove ') + app(s.id).name; aw = actionWidth(label);
      setHTML(phAction, '<span>' + esc(label) + '</span>');
      phAction.className = 'ph-action is-on' + (hs.zone === 'act' ? ' is-focus' : '');
      phAction.style.width = aw + 'px';
      phAction.style.transform = 'translate3d(' + (112 + width + 24) + 'px,' + (PH_COMPACT_TOP + slot * pitch + 12) + 'px,0)';
      attrs(phAction, 'act', anchor, 'arrange.' + (s.removed ? 'restore.' : 'remove.') + s.id);
    } else { phAction.className = 'ph-action'; phAction.removeAttribute('data-z'); phAction.removeAttribute('data-action'); }
    phEmpty.className = 'ph-empty' + (!compact && !n ? ' is-on' : '');
    setHTML(phEmpty, !compact && !n ? '<p>' + T('No apps on Home') + '</p><button type="button" tabindex="-1" class="btn' + (hs.zone === 'empty' ? ' is-focus' : '') + '" data-z="empty" data-i="0" data-action="home.add-apps">' + icon('plus') + '<span>' + T('Add apps') + '</span></button>' : '');
  }

  /* Sheets: a frame is built once per view/mode; fill() updates its slots. Persistent
     scrollers let transforms animate. */
  function renderSheet(t, sheet) {
    var key;
    sheetEl.hidden = !(sheet || isSettingsDetail(t));
    sheetView.hidden = !sheet;
    if (sheet) sheetView.setAttribute('aria-modal', 'true');
    else sheetView.removeAttribute('aria-modal');
    sceneEl.setAttribute('aria-hidden', sheet || isSettingsDetail(t) ? 'true' : 'false');
    if (!sheet) { sheetView.innerHTML = ''; sheetKey = ''; return; }
    key = t.id + '|' + (t.mode || '') + '|' + (t.msg || '') + '|' + S.variant + '|' + S.c.bg;
    if (key !== sheetKey) {
      sheetView.innerHTML = FRAMES[t.id](t);
      sheetKey = key; slotEls = {};
      Array.prototype.forEach.call(sheetView.querySelectorAll('[data-slot]'), function (el) { slotEls[el.getAttribute('data-slot')] = el; });
    }
    FILLS[t.id](t, slotEls);
  }
  var DETAIL_VIEW = 696;
  // Scroll a long options list so the focused choice stays in view (e.g. input icons).
  function scrollDetail(t) {
    var scroller = appearanceRows.firstChild, foc = appearanceRows.querySelector('.setting-choice.is-focus');
    if (!scroller || !scroller.style) return;
    var top = t.detailTop || 0, oy, oh;
    if (foc) {
      oy = foc.offsetTop; oh = foc.offsetHeight;
      if (oy < top) top = oy;
      if (oy + oh > top + DETAIL_VIEW) top = oy + oh - DETAIL_VIEW;
    }
    top = Math.max(0, Math.min(top, Math.max(0, scroller.offsetHeight - DETAIL_VIEW)));
    t.detailTop = top;
    scroller.style.transform = 'translate3d(0,' + (-top) + 'px,0)';
    appearanceRows.className = 'appearance-rows' + (scroller.offsetHeight > DETAIL_VIEW ? ' is-scrollable' : '');
  }
  function renderAppearance(t) {
    appearanceEl.hidden = !isSettingsDetail(t);
    if (appearanceEl.hidden) { appearanceEl.removeAttribute('aria-modal'); return; }
    appearanceEl.setAttribute('aria-modal', 'true');
    if (t.id === 'wallpaper') { renderWallpaper(t); return; }
    V.appearance.norm(t);
    appearanceEl.className = 'appearance detail-' + t.group;
    appearanceRows.className = 'appearance-rows';
    appearanceTitle.textContent = t.group === 'inputpick' ? t.inputName : DETAIL_NAMES[t.group];
    var at = detailLocation(t), selected = at.item, error = S.lookError, status = '', hint;
    function command(item, inner, cls) {
      var applied = typeof item.applied === 'boolean' ? item.applied : (item.axis && S.c[item.axis] === item.value);
      var loading = !!(item.axis && S.pending && S.pending.target[item.axis] === item.value && S.pending.row === item.axis);
      return '<button type="button" tabindex="-1" class="setting-choice' + (cls ? ' ' + cls : '') + (t.f.action === item.action ? ' is-focus' : '') + (item.disabled ? ' is-disabled' : '') + (applied ? ' is-applied' : '') + (loading ? ' is-loading' : '') + '"'
        + (item.axis ? ' role="radio" aria-checked="' + !!applied + '"' : '') + ' aria-label="' + esc(item.axis && item.value === 'both' ? T('Icons and text') : item.label) + '" aria-disabled="' + !!item.disabled + '" aria-busy="' + loading + '"'
        + ' data-z="detail" data-i="0" data-id="' + item.action + '" data-action="' + item.action + '">' + inner
        + (item.axis ? '<span class="setting-tick" aria-hidden="true">' + (applied ? icon('check') : '') + '</span>' : '') + '</button>';
    }
    setHTML(appearanceBack, command({ action: 'settings.back', label: backName(t.group) }, icon('left') + '<span>' + esc(backName(t.group)) + '</span>', 'setting-back'));
    setHTML(appearanceRows, '<div class="appearance-scroll">' + detailSections(t).map(function (section) {
      return '<section class="setting-section' + (section.horizontal ? ' is-horizontal' : '') + ' section-' + section.id + '">'
        + (section.title ? '<h3 class="setting-label" id="setting-' + section.id + '">' + section.title + '</h3>' : '')
        + '<div class="setting-options"' + (section.items[0].axis ? ' role="radiogroup" aria-label="' + esc(section.title || LOOK_NAMES[section.id] || DETAIL_NAMES[t.group]) + '"' : '') + '>'
        + section.items.map(function (item) {
          var swatch = item.axis === 'bg', body = '';
          if (swatch || item.thumbnail) body += item.value === 'light' || item.value === 'dark'
            ? '<span class="setting-swatch swatch-' + item.value + '" aria-hidden="true"></span>'
            : '<img class="setting-swatch" src="' + WP + S.c.wall + '-thumb.jpg" alt="">';
          if (item.inputIcon) body += deviceIcon(item.inputIcon, 44);
          else if (item.inputDefault) body += icon('input', 'setting-devicon-line');
          body += '<span class="setting-copy"><span class="setting-name">' + esc(item.label) + '</span>'
            + (item.description ? '<span class="setting-description">' + esc(item.description) + '</span>' : '') + '</span>';
          if (!item.axis) body += icon('right', 'setting-forward');
          return command(item, body, item.description ? 'has-description' : '');
        }).join('') + '</div>'
        + (section.reason ? '<p class="setting-reason">' + esc(section.reason) + '</p>' : '') + '</section>';
    }).join('') + '</div>');
    scrollDetail(t);
    if (S.pending) status = '<p>' + esc(T('Loading {name}…', { name: S.pending.row === 'font' ? FONTS[S.pending.target.font].name : T('your choice') })) + '</p><p>' + esc(T('Back cancels this change.')) + '</p>';
    else if (error) {
      status = '<p class="setting-error">' + esc((error.type === 'save' ? T('Couldn’t save this change.') : error.type === 'font' ? T('Couldn’t load {name}.', { name: FONTS[error.font].name }) : T('Couldn’t load this appearance.')) + ' ' + T('Your current choice is kept.')) + '</p>'
        + command({ action: 'settings.retry', label: T('Try again') }, '<span>' + T('Try again') + '</span>', 'setting-retry');
    }
    setHTML(appearanceStatus, status);
    hint = selected.disabled ? '' : selected.action === 'settings.back' ? T('Return to {name}', { name: t.group === 'rotation' ? T('Background') : t.group === 'inputs' ? T('Samsung') : T('Settings') }) : selected.action === 'settings.retry' ? T('Retry this change') : selected.axis ? T('Apply selected setting') : selected.action === 'background.wallpaper' ? T('Choose a wallpaper') : selected.action === 'background.rotation' ? T('Choose a rotation interval') : T('Open on the TV');
    setHTML(appearanceDesc, hint ? '<span class="remote-key">OK</span><span>' + esc(hint) + '</span>' : '');
  }
  function renderWallpaper(t) {
    V.wallpaper.norm(t);
    appearanceEl.className = 'appearance detail-wallpaper';
    appearanceTitle.textContent = T('Wallpaper');
    appearanceRows.className = 'appearance-rows wallpaper-picker';
    setHTML(appearanceBack, '<button type="button" tabindex="-1" class="setting-choice setting-back' + (t.f.zone === 'back' ? ' is-focus' : '') + '" data-z="wall-back" data-action="wallpaper.back">' + icon('left') + '<span>' + T('Background') + '</span></button>');
    setHTML(appearanceRows, '<div class="wallpaper-edge wallpaper-before" aria-hidden="true">' + icon('up') + '</div><div class="wallpaper-list" role="radiogroup" aria-label="Wallpaper"><div class="wallpaper-rows"></div></div><div class="wallpaper-edge wallpaper-after" aria-hidden="true">' + icon('down') + '</div>');
    var rows = appearanceRows.querySelector('.wallpaper-rows'), shown = wall(S.wallShown) || wall(S.c.wall), candidate = WALLS[t.i], status, note, hint;
    keyed(rows, WALLS.map(function (w) { return { key: w.id, wall: w }; }), function (row, item, i) {
      var visible = i >= t.top && i < t.top + WALL_VISIBLE, w = item.wall, image;
      setContent(row, w.id + '|' + visible, function () { return '<span class="wallpaper-thumb">' + (visible ? '<img src="' + WP + w.id + '-thumb.jpg" alt="">' : '') + '</span><span class="setting-copy"><span class="setting-name">' + esc(T(w.name)) + '</span></span><span class="setting-tick" aria-hidden="true"></span>'; });
      row.className = 'setting-choice wallpaper-choice' + (t.f.zone === 'photo' && t.i === i ? ' is-focus' : '') + (w.id === S.c.wall ? ' is-applied' : '');
      row.style.transform = 'translate3d(0,' + (i * WALL_ROW) + 'px,0)'; row.style.visibility = visible ? 'visible' : 'hidden';
      row.setAttribute('role', 'radio'); row.setAttribute('tabindex', '-1'); row.setAttribute('aria-label', T(w.name));
      row.setAttribute('aria-checked', String(w.id === S.c.wall)); row.setAttribute('aria-posinset', String(i + 1)); row.setAttribute('aria-setsize', String(WALLS.length));
      row.setAttribute('aria-busy', String(t.previewDue === w.id || S.wallPending === w.id));
      attrs(row, 'wall-choice', i, 'wallpaper.choose.' + w.id);
      setHTML(row.querySelector('.setting-tick'), w.id === S.c.wall ? icon('check') : '');
      image = row.querySelector('img');
      if (image && !image._wallBound) {
        image._wallBound = true;
        image.onerror = function () { this.parentNode.className = 'wallpaper-thumb is-missing'; };
        if (image.complete && !image.naturalWidth) image.onerror();
      }
    });
    rows.style.transform = 'translate3d(0,' + (-t.top * WALL_ROW) + 'px,0)';
    appearanceRows.querySelector('.wallpaper-before').className = 'wallpaper-edge wallpaper-before' + (t.top > 0 ? ' is-on' : '');
    appearanceRows.querySelector('.wallpaper-after').className = 'wallpaper-edge wallpaper-after' + (t.top + WALL_VISIBLE < WALLS.length ? ' is-on' : '');
    note = t.previewDue ? T('Preparing {name}…', { name: T(candidate.name) }) : S.wallPending ? (t.applyPending ? T('Applying {name}…', { name: T(candidate.name) }) : T('Loading {name}…', { name: T(candidate.name) })) : shown.id === S.c.wall ? T('Applied') : T('Preview');
    if (t.failedId) note = S.err ? T('Couldn’t save {name}.', { name: T(wall(t.failedId).name) }) : T('Couldn’t load {name}.', { name: T(wall(t.failedId).name) });
    status = '<p class="wallpaper-preview-name"><span>' + esc(T(shown.name)) + '</span><span class="wallpaper-count">' + T('{n} of {cap}', { n: wallIndex(shown.id) + 1, cap: WALLS.length }) + '</span></p><p class="wallpaper-preview-state' + (t.failedId ? ' setting-error' : '') + '">' + esc(note) + '</p>';
    if (t.failedId) status += '<button type="button" tabindex="-1" class="setting-choice setting-retry' + (t.f.zone === 'retry' ? ' is-focus' : '') + '" data-z="wall-retry" data-action="wallpaper.retry">' + T('Try again') + '</button>';
    setHTML(appearanceStatus, status);
    hint = t.f.zone === 'back' ? T('Return to {name}', { name: T('Background') }) : t.f.zone === 'retry' ? T('Retry this photo') : T('Apply selected photo');
    if (t.f.zone === 'photo' && candidate.id === S.c.wall && !S.pending && !t.failedId) hint = '';
    setHTML(appearanceDesc, hint ? '<span class="remote-key">OK</span><span>' + hint + '</span>' : '');
  }
  /* Keep the retry or membership state on the focused control. The stage-level line
     shares its position without changing the control's identity or key behaviour. */
  function renderFocusStatus(t) {
    if (isSettingsDetail(t)) { focusStatus.className = 'focus-status'; return; }
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, active = root.querySelectorAll('.is-focus[data-action]'), target = null, text = S.err ? T('Not saved. OK tries again.') : '', i, r, sr, scale, x, y, w, action, solid, photoRow = false, photoFree = false;
    Array.prototype.forEach.call(stage.querySelectorAll('.has-local-status'), function (el) { el.className = el.className.replace(/\s+has-local-status/g, ''); });
    for (i = 0; i < active.length; i++) if (renderedAction(active[i])) { target = active[i]; break; }
    if (!text && t.id === 'arrange' && (t.f.zone === 'act' || t.f.zone === 'tiles')) {
      var slot = t.slots[t.f.i];
      if (slot && !slot.removed && t.f.zone === 'act' && S.c.home.length === 1) text = LAST;
    }
    if (!text && S.note === LAST && t.id === 'arrange') text = LAST;
    if (!target || !text) { focusStatus.className = 'focus-status'; return; }
    if (target.parentNode === utilsEl && utilsEl.className.indexOf('is-icons') >= 0) { renderUtilFocusLabel(target); focusStatus.className = 'focus-status'; return; }
    // Photo action pills stay on one line; the header already carries this status.
    if (S.c.layout === 'list' && t.id === 'arrange' && !t.lifted && (t.f.zone === 'act' || t.f.zone === 'tiles')) { focusStatus.className = 'focus-status'; return; }
    photoRow = S.c.layout === 'list' && target.className.indexOf('ph-row') >= 0;
    if (photoRow && phAction.className.indexOf('is-on') >= 0) target = phAction;
    else if (photoRow) photoFree = true;
    target.className += ' has-local-status';
    action = target.getAttribute('data-action');
    r = target.getBoundingClientRect(); sr = stage.getBoundingClientRect(); scale = sr.width / 1920 || 1;
    x = (r.left - sr.left) / scale; y = (r.top - sr.top) / scale; w = r.width / scale;
    if (photoFree) { x = 112 + parseFloat(phPlates[photoPlateIndex].style.width) + 24; y += (r.height / scale - 28) / 2; w = 400; }
    else if (action.indexOf('home.app.') === 0 || action.indexOf('arrange.tile.') === 0 || action.indexOf('arrange.placeholder.') === 0) y += 171;
    else if (action.indexOf('apps.order.') === 0) y += 86;
    else if (action.indexOf('apps.toggle.') === 0 || action.indexOf('apps.add.') === 0) y += 164;
    else if (action.indexOf('layout.') === 0) y += 54;
    else y += action.indexOf('arrange.remove.') === 0 || action.indexOf('arrange.restore.') === 0 ? 43 : 40;
    solid = /(?:^|\s)(?:u|btn|er-rm|dock-action|set-row|ph-action)(?:\s|$)/.test(target.className) && target.parentNode !== utilsEl && target.parentNode.className.indexOf('s-head') < 0;
    if (target === phAction && target.className.indexOf('is-focus') < 0) solid = false;
    focusStatus.className = 'focus-status is-on' + (solid ? ' dark-ink' : '') + (photoFree ? ' photo-status' : '');
    focusStatus.textContent = text;
    focusStatus.style.left = clamp(x + 8, 112, 1808 - Math.min(w - 16, 800)) + 'px';
    focusStatus.style.top = clamp(y, 72, 988) + 'px';
    focusStatus.style.width = Math.min(w - 16, 800) + 'px';
  }
  function headButtons(list, fi, prefix) {
    return list.map(function (b, i) {
      return '<button type="button" tabindex="-1" class="btn' + (i === fi ? ' is-focus' : '') + (b[2] ? ' ' + b[2] : '') + '" data-z="head" data-i="' + i + '" data-action="' + prefix + '.' + b[0] + '" aria-label="' + esc(b[0] === 'undo' ? undoCaption() : b[1]) + '">' + (b[3] ? icon(b[3]) : '') + '<span>' + b[1] + '</span></button>';
    }).join('');
  }
  var FRAMES = {
    apps: function () {
      return '<h2 class="s-title" data-slot="title"></h2><p class="s-sub" data-slot="sub"></p><div class="s-head" data-slot="head"></div>'
        + '<div class="grid-view" data-slot="view"><div class="grid-in" data-slot="grid"></div></div>'
        + '<div class="row-cue grid-before" data-slot="before" aria-hidden="true">' + icon('up') + '</div><div class="row-cue grid-after" data-slot="after" aria-hidden="true">' + icon('down') + '</div>';
    },
    editor: function () {
      return '<h2 class="s-title">Apps on Home</h2><p class="s-sub" data-slot="sub"></p><div class="s-head" data-slot="head"></div>'
        + '<p class="s-label z-home" data-slot="lh"></p><p class="s-label z-other">Not on Home</p>'
        + '<div class="ed-home" data-slot="home"></div><div class="ed-order-break" data-slot="break">Then scroll</div><div class="ed-other-view" data-slot="ov"><div class="ed-other" data-slot="other"></div></div><div class="ed-origin" data-slot="origin"></div>'
        + '<div class="row-cue editor-before" data-slot="otherBefore" aria-hidden="true">' + icon('up') + '</div><div class="row-cue editor-after" data-slot="otherAfter" aria-hidden="true">' + icon('down') + '</div>';
    },
    settings: function () { return '<h2 class="s-title">' + T('Settings') + '</h2><div class="settings-overview" data-slot="list"></div><p class="settings-overview-hint"><span class="remote-key">OK</span><span>' + T('Open selected group') + '</span></p>'; },
    message: function (t) {
      var m = messageContent(t);
      return '<h2 class="msg-title">' + esc(m.title) + '</h2><p class="msg-line">' + esc(m.line) + '</p><p class="msg-note">' + esc(m.note) + '</p><div class="msg-acts" data-slot="acts"></div>';
    }
  };
  function gridTileHtml(id, edit) {
    var a = app(id);
    return '<span class="panel-content">' + appMark(a, 120, 72, 58) + '<span class="label">' + esc(a.name) + '</span></span>'
      + (edit ? '<span class="state">' + badge(onHome(id)) + '</span>' : '');
  }
  FRAMES.channels = FRAMES.apps;
  function channelTileHtml(ch, edit) {
    return '<span class="panel-content">' + (ch.icon ? markHtml(ch.icon, 120, 72, 58) : '<span class="ch-big">' + esc(ch.num) + '</span>')
      + '<span class="label">' + (ch.icon ? '<span class="ch-num">' + esc(ch.num) + '</span> ' : '') + esc(ch.name) + '</span></span>'
      + (edit ? '<span class="state">' + badge(!!savedChannel(ch)) + '</span>' : '');
  }
  var FILLS = {
    channels: function (t, el) {
      var f = t.f, items = t.list, n = items.length, rows = Math.ceil(n / COLS), vis = 3, row = Math.floor(f.i / COLS), edit = t.mode === 'edit';
      var sub = t.loading ? T('Loading channels…') : t.error ? t.error : !n ? T('No channels found. Run a channel scan in the TV settings.')
        : S.note || (edit ? T('OK adds or removes the channel from the column.') : T('{n} channels', { n: n }));
      setHTML(el.title, T('All channels'));
      setHTML(el.sub, esc(sub));
      setHTML(el.head, headButtons(channelsHead(t), f.zone === 'head' ? 0 : -1, 'channels'));
      el.head.className = 's-head' + (f.zone === 'head' ? ' is-awake' : '');
      if (f.zone === 'grid') { if (row < t.top) t.top = row; if (row > t.top + vis - 1) t.top = row - vis + 1; }
      t.top = clamp(t.top, 0, Math.max(0, rows - vis));
      keyed(el.grid, items, function (tile, ch, i) {
        var focus = f.zone === 'grid' && i === f.i;
        setContent(tile, [ch.key, ch.name, ch.icon, edit, !!savedChannel(ch)].join('|'), function () { return channelTileHtml(ch, edit); });
        tile.className = 'gt gt-ch' + (focus ? ' is-focus' : '');
        tile.style.transform = 'translate3d(' + ((i % COLS) * GRID_COL) + 'px,' + (Math.floor(i / COLS) * GRID_ROW) + 'px,0)';
        tile.setAttribute('role', 'button'); tile.setAttribute('aria-label', T('Channel {n}', { n: ch.num }) + ', ' + ch.name);
        attrs(tile, 'grid', i, 'channels.' + (edit ? 'toggle.' : 'watch.') + ch.key);
      });
      el.grid.style.transform = 'translate3d(0,' + (-t.top * GRID_ROW) + 'px,0)';
      el.view.className = 'grid-view' + (t.top > 0 ? ' more-before' : '') + (rows - t.top > vis ? ' more-after' : '');
      el.before.className = 'row-cue grid-before' + (t.top > 0 ? ' is-on' : '');
      el.after.className = 'row-cue grid-after' + (rows - t.top > vis ? ' is-on' : '');
    },
    apps: function (t, el) {
      var f = t.f, items = appsItems(), n = items.length, rows = Math.ceil(n / COLS), vis = 3, row = Math.floor(f.i / COLS), edit = t.mode === 'edit';
      var sub = catalog.loading ? T('Loading installed apps…') : catalog.error ? catalog.error : !n ? T('No installed apps found.') : S.note || (edit ? T('OK adds or removes the app from Home.') : T('{n} apps', { n: n }));
      setHTML(el.title, T('All apps'));
      setHTML(el.sub, esc(sub));
      setHTML(el.head, headButtons(appsHead(t), f.zone === 'head' ? 0 : -1, 'apps'));
      el.head.className = 's-head' + (f.zone === 'head' ? ' is-awake' : '');
      if (f.zone === 'grid') { if (row < t.top) t.top = row; if (row > t.top + vis - 1) t.top = row - vis + 1; }
      t.top = clamp(t.top, 0, Math.max(0, rows - vis));
      keyed(el.grid, items.map(function (id) { return { key: id, id: id }; }), function (tile, it, i) {
        var focus = f.zone === 'grid' && i === f.i;
        setContent(tile, [it.id, app(it.id).name, edit, onHome(it.id)].join('|'), function () { return gridTileHtml(it.id, edit); });
        tile.className = 'gt' + (focus ? ' is-focus' : '');
        tile.style.transform = 'translate3d(' + ((i % COLS) * GRID_COL) + 'px,' + (Math.floor(i / COLS) * GRID_ROW) + 'px,0)';
        tile.setAttribute('role', 'button'); tile.setAttribute('aria-label', app(it.id).name);
        attrs(tile, 'grid', i, 'apps.' + (edit ? 'toggle.' : 'open.') + it.id);
      });
      el.grid.style.transform = 'translate3d(0,' + (-t.top * GRID_ROW) + 'px,0)';
      el.view.className = 'grid-view' + (t.top > 0 ? ' more-before' : '') + (rows - t.top > vis ? ' more-after' : '');
      el.before.className = 'row-cue grid-before' + (t.top > 0 ? ' is-on' : '');
      el.after.className = 'row-cue grid-after' + (rows - t.top > vis ? ' is-on' : '');
    },
    editor: function (t, el) {
      var f = t.f, H = t.lifted ? t.lifted.order : S.c.home, O = otherGroups(), list = O.recent.concat(O.rest), full = S.c.home.length >= CAP;
      var entries = [], ys = [], y = 0, yf, minTop, maxTop = 0, rowEnd, before = false, afterRows = false;
      var hint = catalog.error ? catalog.error : catalog.loading ? T('Loading installed apps…') : f.zone === 'head' && f.h === 0 ? undoCaption() : f.zone === 'home' && f.part === 'remove' ? (H.length <= 1 ? LAST : T('{name} stays installed.', { name: app(H[f.i]).name })) : '';
      setHTML(el.sub, editStatus(hint, t.lifted ? T('Moving {name}. OK places it, Back puts it back.', { name: app(t.lifted.id).name }) : ''));
      setHTML(el.head, headButtons([['undo', T('Undo'), S.undo.length ? '' : 'is-idle', 'undo'], ['done', T('Done'), '', 'check']], f.zone === 'head' ? f.h : -1, 'editor'));
      el.head.className = 's-head' + (f.zone === 'head' ? ' is-awake' : '');
      setHTML(el.lh, T('On Home') + ' <span class="s-count">' + T('{n} of {cap}', { n: S.c.home.length, cap: CAP }) + '</span>');
      // Left column scrolls like the right: keep the focused On Home row in view.
      var hn = H.length, fy;
      if (f.zone === 'home') {
        fy = editorHomeY(f.i);
        if (fy < t.homeTop) t.homeTop = fy;
        if (fy + 72 > t.homeTop + ED_VIEW) t.homeTop = fy + 72 - ED_VIEW;
      }
      t.homeTop = clamp(t.homeTop || 0, 0, Math.max(0, editorHomeY(hn - 1) + 72 - ED_VIEW));
      el['break'].className = 'ed-order-break';

      keyed(el.home, H.map(function (id) { return { key: id, id: id }; }), function (row, it, i) {
        var a = app(it.id), here = f.zone === 'home' && i === f.i, lifted = !!t.lifted && i === f.i, ry = editorHomeY(i);
        setContent(row, it.id, function () { return '<div class="er-name" role="button"><span class="panel-content"><span class="er-num"></span>' + smallMark(a) + '<span class="er-text">' + esc(a.name) + '</span><span class="er-move">' + icon('updown') + '</span></span></div><div class="er-rm" role="button"><span></span></div>'; });
        row.className = 'er' + (here ? ' is-active' : '') + (lifted ? ' is-lifted' : '');
        row.style.transform = 'translate3d(' + (lifted ? 16 : 0) + 'px,' + (ry - t.homeTop) + 'px,0)';
        row.style.visibility = ry + 72 > t.homeTop && ry < t.homeTop + ED_VIEW ? 'visible' : 'hidden';
        row.querySelector('.er-num').textContent = String(i + 1);
        row.firstChild.className = 'er-name' + (here && (f.part === 'name' || lifted) ? ' is-focus' : '');
        row.lastChild.className = 'er-rm' + (here && f.part === 'remove' && !lifted ? ' is-focus' : '') + (H.length <= 1 ? ' is-limit' : '');
        row.lastChild.firstChild.textContent = H.length <= 1 ? LAST : T('Remove from Home');
        attrs(row.firstChild, 'name', i, 'editor.move.' + it.id);
        attrs(row.lastChild, 'remove', i, 'editor.remove.' + it.id);
      });
      el.origin.className = 'ed-origin' + (t.lifted && t.lifted.from !== f.i ? ' is-on' : '');
      if (t.lifted) el.origin.style.transform = 'translate3d(0,' + (264 + editorHomeY(t.lifted.from) + 16 - t.homeTop) + 'px,0)';

      if (O.recent.length) { entries.push({ key: 'sep-recent', sep: T('Recently removed'), y: y }); y += ED_SEP; }
      O.recent.forEach(function (id) { entries.push({ key: id, id: id, y: y }); ys.push(y); y += ED_ROW; });
      if (O.recent.length && O.rest.length) { entries.push({ key: 'sep-rest', sep: T('Other installed apps'), y: y }); y += ED_SEP; }
      O.rest.forEach(function (id) { entries.push({ key: id, id: id, y: y }); ys.push(y); y += ED_ROW; });
      if (f.zone === 'other' && ys.length) {
        yf = ys[f.j] - (O.recent.length && (f.j === 0 || f.j === O.recent.length) ? ED_SEP : 0);
        if (yf < t.top) t.top = yf;
        if (ys[f.j] + 72 > t.top + ED_VIEW) {
          minTop = ys[f.j] + 72 - ED_VIEW;
          entries.some(function (it) { if (it.y < minTop) return false; t.top = it.y; return true; });
        }
      }
      entries.some(function (it) { if (it.y < Math.max(0, y - ED_VIEW)) return false; maxTop = it.y; return true; });
      t.top = clamp(t.top, 0, maxTop);
      keyed(el.other, entries, function (row, it) {
        var j, focus, a;
        row.style.transform = 'translate3d(0,' + it.y + 'px,0)';
        rowEnd = it.y + (it.sep ? ED_SEP : 72);
        row.style.visibility = it.y >= t.top && rowEnd <= t.top + ED_VIEW ? 'visible' : 'hidden';
        before = before || it.y < t.top; afterRows = afterRows || rowEnd > t.top + ED_VIEW;
        if (it.sep) { setContent(row, 'sep|' + it.sep, function () { return esc(it.sep); }); row.className = 'eo-sep'; return; }
        j = list.indexOf(it.id); focus = f.zone === 'other' && j === f.j; a = app(it.id);
        setContent(row, it.id, function () { return '<span class="panel-content">' + smallMark(a) + '<span class="eo-text">' + esc(a.name) + '</span><span class="eo-verb"></span></span>'; });
        setHTML(row.querySelector('.eo-verb'), focus ? '<span class="verb' + (full ? ' is-off' : '') + '">' + (full ? T('Home is full') : T('Add to Home')) + '</span>' : '');
        row.className = 'eo' + (focus ? ' is-focus' : '');
        row.setAttribute('role', 'button');
        attrs(row, 'other', j, 'editor.add.' + it.id);
      });
      el.other.style.transform = 'translate3d(0,' + (-t.top) + 'px,0)';
      el.ov.className = 'ed-other-view';
      el.otherBefore.className = 'row-cue editor-before' + (before ? ' is-on' : '');
      el.otherAfter.className = 'row-cue editor-after' + (afterRows ? ' is-on' : '');
    },
    settings: function (t, el) {
      var rows = settingsRows(), ids = rows.map(function (r) { return r.id; }), fi = Math.max(0, ids.indexOf(t.f.id));
      var vis = 6, pitch = 120, html = '';
      // Scroll the overview so the focused group stays visible once the list is long.
      if (typeof t.top !== 'number') t.top = 0;
      if (fi < t.top) t.top = fi;
      if (fi > t.top + vis - 1) t.top = fi - vis + 1;
      t.top = clamp(t.top, 0, Math.max(0, rows.length - vis));
      rows.forEach(function (r) {
        html += '<button type="button" tabindex="-1" class="settings-group' + (r.id === t.f.id ? ' is-focus' : '') + '" data-z="row" data-i="0" data-id="' + r.id + '" data-action="settings.' + (r.id === 'editor' ? 'editor' : 'group.' + r.id) + '"><span class="settings-group-copy"><span class="settings-group-name">' + esc(r.label) + '</span><span class="settings-group-value">' + esc(r.value) + '</span></span>' + icon('right') + '</button>';
      });
      setHTML(el.list, '<div class="settings-scroll" style="transform:translate3d(0,' + (-t.top * pitch) + 'px,0)">' + html + '</div>');
      el.list.className = 'settings-overview' + (t.top > 0 ? ' more-before' : '') + (t.top + vis < rows.length ? ' more-after' : '');
    },
    message: function (t, el) {
      setHTML(el.acts, messageContent(t).actions.map(function (a, i) {
        return '<button type="button" tabindex="-1" class="btn' + (i === t.f.b ? ' is-focus' : '') + '" data-z="act" data-i="' + i + '" data-action="message.' + a[0] + '"><span>' + a[1] + '</span></button>';
      }).join(''));
    }
  };

  /* ---------- Atomic appearance bundles ---------- */
  var wallToken = 0, committedBundle = null, reflowToken = 0, fontSwitchToken = 0;
  function registeredMaterial(id) { return S.c.bg === 'photo' && S.c.material === 'soft' && !!wall(id); }
  function matSrc(id, material) { return 'assets/materials/' + id + (material === 'soft' ? '-study-soft.jpg' : material === 'tint' ? '-field-clear.jpg' : '-field-frost.jpg'); }
  function fieldSrc(id, material) { return 'assets/materials/' + id + (material === 'soft' ? '-field-blur.jpg' : material === 'tint' ? '-field-clear.jpg' : '-field-frost.jpg'); }
  function makeImg(cls, src) { var im = document.createElement('img'); im.className = cls; im.alt = ''; im._src = src; im.src = src; return im; }
  function whenReady(im, done) {
    var fin = false, timer = setTimeout(function () { finish(!!(im.complete && im.naturalWidth)); }, document.hidden ? 20000 : 8000);
    function finish(ok) { if (fin) return; fin = true; clearTimeout(timer); done(ok); }
    function ready() {
      // Hidden TV prelaunch may suspend decode even after a valid image loads.
      if (document.hidden || !im.decode) { finish(true); return; }
      im.decode().then(function () { finish(true); }, function () { finish(!!(im.complete && im.naturalWidth)); });
    }
    if (im.complete) { if (im.naturalWidth) ready(); else finish(false); }
    else { im.onload = ready; im.onerror = function () { finish(false); }; }
  }
  function swapImg(k, im) { var old = IMG[k]; if (old === im) return; im.style.cssText = old.style.cssText; if (old.id) im.id = old.id; old.parentNode.replaceChild(im, old); IMG[k] = im; }
  function bundleKey(look) { return look.wall + '|' + look.material; }
  function loadBundle(look, token, done) {
    var imgs = { photo: makeImg('photo', WP + look.wall + '.jpg'), bg: makeImg('sheet-bg', WP + look.wall + '-panel.jpg') }, keys, left, allOk = true;
    imgs.mat = makeImg('mat-img', matSrc(look.wall, look.material));
    imgs.mat2 = makeImg('mat-img', matSrc(look.wall, look.material));
    imgs.mat3 = makeImg('mat-img', matSrc(look.wall, look.material));
    imgs.field = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    imgs.fieldAlt = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    imgs.utility = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    imgs.utilityAlt = makeImg('ph-field-img', fieldSrc(look.wall, look.material));
    keys = Object.keys(imgs); left = keys.length;
    keys.forEach(function (k) { whenReady(imgs[k], function (ok) {
      allOk = allOk && ok;
      if (--left || token !== wallToken) return;
      done(allOk ? { key: bundleKey(look), imgs: imgs } : null);
    }); });
  }
  function installBundle(bundle, look, previewOnly) {
    if (bundle) {
      Object.keys(bundle.imgs).forEach(function (k) { if (!previewOnly || k !== 'bg') swapImg(k, bundle.imgs[k]); });
      S.bundleKey = bundle.key;
    }
    S.shown = { bg: look.bg, wall: look.wall, material: look.material, font: look.font };
    phFields.concat(utFields).forEach(function (el) { var p = el._placement; if (p) fieldTransform(el, p.x, p.y, p.width, p.height); });
    S.wallShown = look.wall; S.wallPending = null; S.wallError = null;
  }
  function cleanPatch(patch) {
    var out = {}, k;
    if (!patch || typeof patch !== 'object') throw new Error('look needs an appearance patch');
    for (k in patch) if (patch.hasOwnProperty(k)) {
      if (k === 'wall') { if (!wall(patch[k])) throw new Error('Unknown wallpaper: ' + patch[k]); }
      else if (k === 'font') { if (!FONTS[patch[k]] || patch[k] !== 'manrope' && PRIVATE_FONTS.indexOf(patch[k]) < 0) throw new Error('Unavailable font: ' + patch[k]); }
      else if (!LOOK_VALUES[k] || LOOK_VALUES[k].indexOf(patch[k]) < 0) throw new Error('Invalid appearance value: ' + k);
      out[k] = patch[k];
    }
    return out;
  }
  function cancelLook() { wallToken++; S.pending = null; S.wallPending = null; S.lookError = null; }
  function setLook(patch, options) {
    var opts = options || {}, changes = cleanPatch(patch), target = lookOf(S.c), k, token, needs, needsFont, changed, loadedBundle = null, imageDone, fontDone, failed = false;
    for (k in changes) if (changes.hasOwnProperty(k)) target[k] = changes[k];
    changed = Object.keys(target).some(function (key) { return target[key] !== S.c[key]; });
    cancelLook(); S.err = null; token = wallToken;
    function finish(bundle) {
      var c = next(S.c.home.slice(), S.c.recent.slice()), fontChanged = target.font !== S.c.font, reflow = target.apps !== S.c.apps || target.controls !== S.c.controls || fontChanged, frame, fontFrame;
      Object.keys(target).forEach(function (key) { c[key] = target[key]; });
      S.pending = null; S.wallPending = null;
      if (!opts.transient && changed && !write(c, 'Appearance')) { S.lookError = { type: 'save', patch: changes, row: opts.row || S.appearanceFocus, transient: false }; render(); syncRotation(); return; }
      if (opts.transient) S.c = c;
      if (reflow) { S.reflow = true; frame = ++reflowToken; }
      if (fontChanged) { S.fontSwitch = true; fontFrame = ++fontSwitchToken; }
      installBundle(bundle, target);
      if (bundle) committedBundle = bundle;
      S.lookError = null; S.previewBundle = null;
      render(); syncRotation();
      if (reflow) window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
        if (frame !== reflowToken) return;
        S.reflow = false; stage.className = stage.className.replace(/\s+is-reflow/g, '');
      }); });
      if (fontChanged) setTimeout(function () {
        if (fontFrame !== fontSwitchToken) return;
        S.fontSwitch = false; stage.className = stage.className.replace(/\s+is-font-switch/g, '');
      }, REDUCED_MOTION ? 130 : 170);
    }
    function fail(type, reason) {
      if (token !== wallToken || failed) return;
      failed = true; S.pending = null; S.wallPending = null;
      if (type === 'load') S.wallError = target.wall;
      S.lookError = { type: type, reason: reason || null, patch: changes, row: opts.row || (type === 'font' ? 'font' : S.appearanceFocus), transient: !!opts.transient, wall: target.wall, font: target.font };
      if (type === 'font') log((opts.startup ? 'font fallback: ' : 'Font kept: ') + (opts.startup ? target.font : FONTS[S.c.font].name) + (opts.startup ? '' : ' (' + reason + ')'));
      if (type === 'font' && opts.startup && target.font !== 'manrope') { setLook({ font: 'manrope' }, { transient: true }); return; }
      render(); syncRotation();
    }
    function complete() {
      if (!imageDone || !fontDone || failed || token !== wallToken) return;
      if (document.hidden) { finish(loadedBundle); return; }
      window.requestAnimationFrame(function () { if (!failed && token === wallToken) finish(loadedBundle); });
    }
    needs = target.bg === 'photo' && S.bundleKey !== bundleKey(target) && (!S.shown || S.shown.bg !== 'photo' || target.wall !== S.c.wall || materialApplies(target));
    needsFont = !fontMetrics[target.font]; imageDone = !needs; fontDone = !needsFont;
    if (!needs && !needsFont) { finish(null); return; }
    S.pending = { patch: changes, target: target, row: opts.row || (needsFont ? 'font' : S.appearanceFocus), transient: !!opts.transient, preview: false };
    if (needs) {
      S.wallPending = target.wall;
      loadBundle(target, token, function (bundle) {
        if (!bundle) { fail('load'); return; }
        loadedBundle = bundle; imageDone = true; complete();
      });
    }
    if (needsFont) ensureFont(target.font, function (ok, reason) {
      if (!ok) { fail('font', reason); return; }
      fontDone = true; complete();
    });
    render();
  }
  function showWall(id, done) {
    var target = lookOf(S.c), token;
    target.bg = 'photo'; target.wall = id;
    cancelLook(); token = wallToken; S.wallError = null;
    S.pending = { patch: { wall: id }, target: target, row: 'bg', preview: true, transient: false }; S.wallPending = id;
    loadBundle(target, token, function (bundle) {
      S.pending = null; S.wallPending = null;
      if (!bundle) { S.wallError = id; done(false); return; }
      S.previewBundle = bundle; installBundle(bundle, target, true); done(true);
    });
    render();
  }
  function restoreLook() {
    cancelLook(); S.previewBundle = null;
    if (S.c.bg === 'photo' && committedBundle && committedBundle.key === bundleKey(S.c)) installBundle(committedBundle, S.c);
    else if (S.c.bg !== 'photo' || S.bundleKey === bundleKey(S.c)) installBundle(null, S.c);
    else setLook({}, { transient: true });
  }

  /* ---------- Lifecycle and remote input ---------- */
  var clockTimer = 0, rotationTimer = 0, activeSince = 0, activeMs = 0, rotationKey = '';
  function rotationActive() { return !document.hidden && top().id === 'home' && S.c.bg === 'photo' && !S.pending && mode().min > 0; }
  function pauseRotation() {
    if (activeSince) { activeMs += Date.now() - activeSince; activeSince = 0; }
    clearTimeout(rotationTimer); rotationTimer = 0;
  }
  function resetRotation() { pauseRotation(); activeMs = 0; rotationKey = ''; }
  function syncRotation() {
    var key = S.c.wall + '|' + S.c.mode;
    pauseRotation();
    if (key !== rotationKey) { activeMs = 0; rotationKey = key; }
    if (!rotationActive()) return;
    activeSince = Date.now();
    rotationTimer = setTimeout(function () {
      pauseRotation(); activeMs = 0;
      if (rotationActive()) setLook({ wall: WALLS[(wallIndex(S.c.wall) + 1) % WALLS.length].id }, { row: 'bg' });
    }, Math.max(10, mode().min * QA.minuteMs - activeMs));
  }
  function updateClock() {
    clearTimeout(clockTimer);
    if (document.hidden) return;
    if (top().id === 'home' || isSettingsDetail(top())) renderCaption(top(), homeState(top()));
    if (S.wx && wxNight() !== wxNightShown) render(); // Sunrise or sunset passed.
    clockTimer = setTimeout(updateClock, 60000 - (Date.now() % 60000) + 30);
  }
  function focusStage() { try { stage.focus({ preventScroll: true }); } catch (e) { stage.focus(); } }
  function after() {
    norm(); var t = top();
    if (t.group === 'inputs' && t.refreshInputs && !t.loading && !document.hidden) { t.refreshInputs = false; loadInputs(t); }
    render(); syncRotation();
  }
  function refreshInputsOnReturn() { var t = top(); if (t.group === 'inputs' && !t.loading) t.refreshInputs = true; }
  function goScene(name) {
    FrameDevice.cancelSource();
    if (top().id === 'wallpaper') cancelWallpaperTimer(top());
    S.stack = [S.stack[0]]; S.stack[0].f.zone = 'apps'; clearSession(); restoreLook();
    if (name === 'apps') openApps();
    else if (name === 'settings') openSettings();
    else if (name === 'appearance') { openSettings(); top().f.id = 'background'; S.settingsFocus = 'background'; openAppearance('background'); }
    else if (name === 'editor') { openSettings(); openEditor('settings'); }
    after();
  }
  function fit() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = ((window.innerWidth - 1920 * scale) / 2) + 'px';
    stage.style.top = ((window.innerHeight - 1080 * scale) / 2) + 'px';
  }
  function renderedAction(el) {
    return el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== 'hidden';
  }
  function focusedAction() {
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, els = root.querySelectorAll('.is-focus[data-action]'), i;
    for (i = 0; i < els.length; i++) if (renderedAction(els[i])) return els[i].getAttribute('data-action');
    return null;
  }
  function activate(action) {
    var root = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl, els = root.querySelectorAll('[data-action]'), i;
    if (action === 'appearance.bg' && top().id === 'appearance' && top().group === 'background') action = 'background.wallpaper';
    if (action === 'settings.appearance' && top().id === 'settings') action = 'settings.group.background';
    for (i = 0; i < els.length; i++) if (renderedAction(els[i]) && els[i].getAttribute('data-action') === action) { pointAt(els[i]); return true; }
    return false;
  }
  function pointAt(el) {
    var t = top(), v = V[t.id];
    norm();
    if (v.point) v.point(t, el.getAttribute('data-z'), +el.getAttribute('data-i'), el.getAttribute('data-id'));
    norm();
    render();
    syncRotation();
  }

  utilsEl.addEventListener('mouseover', function (ev) {
    var b = ev.target, t = top(), z, i;
    if (utilsEl.className.indexOf('quiet-utils') < 0 || t.lifted) return;
    while (b && b !== utilsEl && !(b.getAttribute && b.getAttribute('data-z'))) b = b.parentNode;
    if (!b || b === utilsEl || (ev.relatedTarget && b.contains(ev.relatedTarget))) return;
    z = b.getAttribute('data-z'); i = Number(b.getAttribute('data-i'));
    if ((t.id !== 'home' || z !== 'util') && (t.id !== 'arrange' || z !== 'ctl')) return;
    if (t.f.zone === z && t.f.u === i) return;
    t.f.zone = z; t.f.u = i;
    if (z === 'util') S.lastUtil = i;
    render();
  });
  stage.addEventListener('click', function (ev) {
    var el = ev.target;
    while (el && el !== stage && !(el.getAttribute && el.getAttribute('data-z'))) el = el.parentNode;
    focusStage();
    if (!el || el === stage) return;
    pointAt(el);
  });
  var heldKeys = {};
  document.addEventListener('keydown', function (ev) {
    var code = ev.keyCode, k = KEYS[code];
    if (code === 9) { ev.preventDefault(); return; }
    if (!k || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    ev.preventDefault();
    if (k === 'ok' || k === 'back') { if (ev.repeat || heldKeys[code]) return; heldKeys[code] = true; }
    press(k);
  });
  document.addEventListener('keyup', function (ev) { delete heldKeys[ev.keyCode]; });
  window.addEventListener('blur', function () { heldKeys = {}; });
  window.addEventListener('focus', function () { FrameDevice.cancelSource(); release(); refreshInputsOnReturn(); focusStage(); after(); updateClock(); });
  document.addEventListener('visibilitychange', function () {
    heldKeys = {};
    if (document.hidden) { FrameDevice.cancelSource(); pauseRotation(); clearTimeout(clockTimer); }
    else {
      release();
      if (S.c.bg === 'photo' && !S.pending && !S.previewBundle && (!committedBundle || S.bundleKey !== bundleKey(S.c))) setLook({}, { transient: true, startup: true });
      refreshInputsOnReturn(); after(); updateClock(); focusStage();
      refreshCatalog(); refreshHomeInputs();
      // Weather refreshes on return only when the last forecast is over 15 minutes old.
      if (!S.wx || Date.now() - S.wx.at > 15 * 60000) refreshWeather();
    }
  });
  window.addEventListener('resize', fit);

  /* Readable browser checks use the real state and actions, without fake outcomes. */
  var NAV = { left: 'left', right: 'right', up: 'up', down: 'down', ok: 'ok', enter: 'ok', back: 'back', escape: 'back' };
  QA.state = function () {
    var out = serialise(S.c), t = top(), item = t.id === 'appearance' ? detailLocation(t).item : null;
    out.committed = S.c; out.shown = S.shown; out.pending = S.pending; out.view = t.id; out.selected = S.sel;
    out.focusAction = focusedAction(); out.writes = S.writes; out.failedWrites = S.failed; out.error = S.err;
    out.catalog = { loading: catalog.loading, loaded: catalog.loaded, error: catalog.error, ids: ALPHA.slice() };
    out.fonts = { available: LOOK_VALUES.font.slice(), loaded: Object.keys(fontMetrics).filter(function (id) { return !fontMetrics[id].fallback; }), baselineFallback: !!(fontMetrics.manrope && fontMetrics.manrope.fallback), error: S.lookError && S.lookError.type === 'font' ? S.lookError : null };
    out.rotation = { activeMs: activeMs + (activeSince ? Date.now() - activeSince : 0), active: !!activeSince };
    out.draft = t.lifted ? { id: t.lifted.id, order: t.lifted.order.slice() } : null;
    out.settingsGroup = t.id === 'wallpaper' ? 'wallpaper' : t.id === 'appearance' ? t.group : null;
    out.focusedChoice = item && item.axis ? { axis: item.axis, value: item.value, action: item.action, disabled: item.disabled } : null;
    out.candidate = out.focusedChoice ? { axis: item.axis, value: item.value, action: item.action, pending: !!S.pending, pendingTarget: S.pending ? S.pending.target : null } : null;
    out.wallpaperPicker = t.id === 'wallpaper' ? { candidate: WALLS[t.i].id, applied: S.c.wall, shown: S.wallShown, pending: t.previewDue || S.wallPending,
      queuedApplying: !!t.applyPending, applyPending: t.applyPending, failed: t.failedId, zone: t.f.zone, top: t.top, visible: WALL_VISIBLE, backdrop: IMG.bg.src } : null;
    out.undo = S.undo.map(function (u) { return u.label; }); out.storageOk = storageOk;
    return JSON.parse(JSON.stringify(out));
  };
  QA.where = function () {
    var action = focusedAction(), active = stage.querySelectorAll('.is-focus[data-action]'), count = 0, name = '';
    Array.prototype.forEach.call(active, function (el) { if (renderedAction(el)) { count++; if (el.getAttribute('data-action') === action) name = el.getAttribute('aria-label') || el.textContent.replace(/\s+/g, ' ').trim(); } });
    return { view: top().id, settingsGroup: top().id === 'wallpaper' ? 'wallpaper' : top().id === 'appearance' ? top().group : null, focus: name, focusAction: action, focusCount: count, wallpaper: S.wallShown, zone: top().f.zone || null };
  };
  QA.ready = function () { return fontsReady && !S.pending && !!S.shown && S.shown.bg === S.c.bg && S.shown.wall === S.c.wall && S.shown.font === S.c.font; };
  QA.nav = function () { var keys = arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments); keys.forEach(function (key) { if (!NAV[key]) throw new Error('Unknown key'); press(NAV[key]); }); return QA.state(); };
  QA.look = function (patch) { setLook(patch, {}); return QA.state(); };
  QA.scene = function (name) { if (['home', 'apps', 'settings', 'appearance', 'editor'].indexOf(name) < 0) throw new Error('Unknown view'); goScene(name); return QA.state(); };
  QA.activate = function (action) { return activate(action) ? QA.state() : null; };
  QA.actions = function () { var view = isSettingsDetail(top()) ? appearanceEl : sheetEl.hidden ? homeEl : sheetEl; return Array.prototype.filter.call(view.querySelectorAll('[data-action]'), renderedAction).map(function (el) { return el.getAttribute('data-action'); }); };

  /* ---------- Start ---------- */
  cueL.innerHTML = icon('left'); cueR.innerHTML = icon('right');
  initialise();
  S.wx = window.FrameWeather ? window.FrameWeather.cached() : null;
  setLook({}, { transient: true, startup: true });
  norm(); render(); fit(); focusStage(); updateClock(); syncRotation();
  // Discover installed apps for Home; hidden startup waits for visibility instead.
  if (!document.hidden) { refreshCatalog(); refreshHomeInputs(); refreshWeather(); }
})();
