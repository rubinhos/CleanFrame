/* Public Tizen application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  function T(s) { return window.FrameI18n ? window.FrameI18n.t(s) : s; }
  var IDS = {
    stremio: 'IkWsFHtOY9.Stremio', netflix: 'org.tizen.netflix-app',
    disneyplus: 'MCmYXNxgcu.DisneyPlus', youtube: '9Ur5IzDKqV.TizenYouTube',
    appletv: 'com.samsung.tv.aria-video', primevideo: 'org.tizen.primevideo',
    abciview: 'mWK87Xghap.ABCiview', sbs: 'OyE7OuxlUi.SBSOnDemand',
    applemusic: 'org.tizen.apple.apple-music'
  };
  var STREAMING = ['as6cYRgkPy.Binge', '73iTZRTc34.Stan', '5b8c3eb16b.BeamCTVDev',
    'cj37Ni3qXM.HBONow', 'LBUAQX1exg.Hulu', 'gzcc4LRFBF.Peacock', 'rJyOSqC6Up.CBSAllAccess',
    'Rk72oKFsRS.OtterKidsProd', '70fRFUwYlD.OtterGAProd', 'PvWgqxV3Xa.YouTubeTV',
    'XtU8fQk2gN.ESPN', 'ZmmGjO6VKO.slingtv', 'VtuWAiZdHN.STARZPlay', 'ckfgqqzvt0.dplus',
    'kk8MbItQ0H.VUDU', 'Jz7aUrV2Q4.Twitch', 'OK2Rdkjmsi.IMDbTV', 'Ob3XhAVMu6.amcplus',
    'KaLitts8bq.tenplaySamsungTizen', 'eYuOiOLYQX.KayoSports', 'Ne2ZsPWdKl.9NOW',
    '3KA0pm7a7V.TubiTV', 'rJeHak5zRg.Spotify', 'icp4AvUPiA.7plus'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var EXTRA_BRANDS = {'rJeHak5zRg.Spotify': 'spotify', '5b8c3eb16b.BeamCTVDev': 'hbomax', 'cj37Ni3qXM.HBONow': 'hbomax', '3KA0pm7a7V.TubiTV': 'tubi',
    'OGLLvqej7u.CrunchyrollWebApp': 'crunchyroll', 'NRi6kdBYJ0.AirPlayWebApp': 'airplay', 'LnLzvqrcEY.globo': 'globoplay',
    'GHI3a0zMSx.XboxGamePass': 'xbox', 'StrmisoTV1.Streamiso': 'streamiso', 'org.tizen.browser': 'internet',
    'C9cMLuRno1.emanual': 'emanual', 'jPPp4KCHp4.emanual': 'emanual', 'qtMHjALHus.TVDeviceCare': 'devicecare', 'nbCEREFaoy.mercadoplay': 'mercadoplay',
    'Jz7aUrV2Q4.Twitch': 'twitch', 'AQKO41xyKP.AmazonAlexa': 'alexa', 'J9fZJDMi1v.SecurityCenter': 'security', 'XPkceUl3N4.UsbCamApp': 'camera'};
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'd0m1lV1nt2.emanual', '2022ePop01.SmartTV', 'Oxv5Tb6i2d.SmartTV',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = 'nClrkHome1.FrameHome';
  function api() { return window.tizen && window.tizen.application; }
  function selfId() {
    try { return api().getCurrentApplication().appInfo.id || SELF; }
    catch (err) { return SELF; }
  }
  function unavailable(done) {
    done({ message: T('Open the app on the TV to use this control.'), detail: T('The web preview cannot control the TV.') });
  }
  function failure(err) {
    return { message: T('The TV could not open this screen.'), detail: err && (err.message || err.name) || T('Try again, or press the remote’s Home button to return to the app.') };
  }
  function bounded(done, timeout) {
    var finished = false, timer = setTimeout(function () { finish({ message: T('The TV did not respond. Please try again.') }); }, timeout || 8000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    return finish;
  }
  var sourceCancel = null;
  function cancelSource() { if (sourceCancel) sourceCancel(); }
  // HDMI sources by default; withTv also lists the TV tuner source (Live TV) first.
  function sources(done, withTv) {
    var sys = window.tizen && window.tizen.systeminfo, tvw = window.tizen && window.tizen.tvwindow;
    if (!sys || typeof sys.getPropertyValue !== 'function' || !tvw || typeof tvw.setSource !== 'function') { unavailable(done); return; }
    var finish = bounded(done);
    try {
      sys.getPropertyValue('VIDEOSOURCE', function (video) {
        var list = [], byPort = {}, active = null;
        try { if (typeof tvw.getSource === 'function') active = tvw.getSource(); } catch (err) { /* Status may be unavailable while discovery still works. */ }
        function record(src, connected) {
          if (!src || !(src.type === 'HDMI' || (withTv && src.type === 'TV')) || typeof src.number !== 'number' || !isFinite(src.number) || src.number < 0 || Math.floor(src.number) !== src.number) return;
          var key = src.type + src.number, item = byPort[key];
          if (!item) {
            item = { type: src.type, number: src.number, name: src.type === 'TV' ? 'TV' : 'HDMI ' + src.number, connected: false, active: !!(active && active.type === src.type && active.number === src.number), source: src };
            byPort[key] = item; list.push(item);
          }
          if (connected) { item.connected = true; item.source = src; }
        }
        if (video && Array.isArray(video.disconnected)) video.disconnected.forEach(function (src) { record(src, false); });
        if (video && Array.isArray(video.connected)) video.connected.forEach(function (src) { record(src, true); });
        list.sort(function (a, b) { return (a.type === 'TV' ? -1 : 0) - (b.type === 'TV' ? -1 : 0) || a.number - b.number; });
        finish(null, list);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  function setSource(port, done, type) {
    type = type === 'TV' ? 'TV' : 'HDMI';
    cancelSource();
    var tvw = window.tizen && window.tizen.tvwindow, app = api(), finished = false;
    if (typeof port !== 'number' || !isFinite(port) || port < 0 || Math.floor(port) !== port) { done({ message: T('This HDMI input is not available.') }); return; }
    if (!tvw || typeof tvw.setSource !== 'function' || !app || typeof app.launch !== 'function') { unavailable(done); return; }
    var timer = setTimeout(function () { finish({ message: T('The TV did not respond. Please try again.') }); }, 8000);
    function finish(err, value) {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (sourceCancel === cancel) sourceCancel = null;
      done(err, value);
    }
    function cancel() { finish({ message: T('Input change cancelled.'), cancelled: true }); }
    sourceCancel = cancel;
    sources(function (err, list) {
      if (finished) return;
      if (err) { finish(err); return; }
      var input = null;
      list.some(function (item) { if (item.type === type && item.number === port) { input = item; return true; } return false; });
      if (!input) { finish({ message: T('This input is no longer available.') }); return; }
      try {
        tvw.setSource(input.source, function (selected) {
          if (finished) return;
          if (selected && (selected.type !== type || selected.number !== port)) { finish({ message: T('The TV selected a different input. Please try again.') }); return; }
          try {
            app.launch('org.tizen.tv-viewer', function () { finish(null, input); }, function () {
              finish({ message: T('The input was selected, but the TV viewer could not open.'), detail: T('Use the remote’s Source control to view the input.') });
            });
          } catch (error) { finish({ message: T('The input was selected, but the TV viewer could not open.') }); }
        }, function (error) { if (!finished) finish(failure(error)); });
      } catch (error) { finish(failure(error)); }
    }, type === 'TV');
  }
  /* Saved antenna channel: make the tuner the active source, find major.minor in the TV's
     channel list (so analog and digital numbering match the scan), tune it, then open the
     TV viewer. Needs the tv.channel privilege. No signal still opens the viewer. */
  function tuneChannel(ch, done) {
    var tvc = window.tizen && window.tizen.tvchannel, tvw = window.tizen && window.tizen.tvwindow, app = api(), finished = false;
    if (!ch || typeof ch.major !== 'number' || !isFinite(ch.major)) { done({ message: T('This channel is not available.') }); return; }
    if (!tvc || typeof tvc.tune !== 'function' || !app || typeof app.launch !== 'function') { unavailable(done); return; }
    cancelSource();
    var timer = setTimeout(function () { finish({ message: T('The TV did not respond. Please try again.') }); }, 12000);
    function finish(err, value) {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (sourceCancel === cancel) sourceCancel = null;
      done(err, value);
    }
    function cancel() { finish({ message: T('Channel change cancelled.'), cancelled: true }); }
    sourceCancel = cancel;
    function view() {
      try {
        app.launch('org.tizen.tv-viewer', function () { finish(null, ch); }, function () {
          finish({ message: T('The channel was tuned, but the TV viewer could not open.'), detail: T('Use the remote’s Source control to view the input.') });
        });
      } catch (error) { finish({ message: T('The channel was tuned, but the TV viewer could not open.') }); }
    }
    function tune(major, minor) {
      if (finished) return;
      try {
        tvc.tune({ major: major, minor: minor }, {
          onsuccess: function () { if (!finished) view(); },
          onnosignal: function () { if (!finished) view(); },
          onprograminforeceived: function () {}
        }, function (error) { if (!finished) finish(failure(error)); });
      } catch (error) { finish(failure(error)); }
    }
    function lookup() {
      if (finished) return;
      if (typeof tvc.getChannelList !== 'function') { tune(ch.major, ch.minor || 0); return; }
      try {
        tvc.getChannelList(function (list) {
          var hit = null;
          if (finished) return;
          (list || []).some(function (c) {
            if (c && c.major === ch.major && (c.minor === ch.minor || (!ch.minor && !(c.minor > 0)))) { hit = c; return true; }
            return false;
          });
          if (!hit) { finish({ message: T('Channel {n} was not found.', { n: ch.num || String(ch.major) }), detail: T('Run a channel scan in the TV settings, then try again.') }); return; }
          tune(hit.major, hit.minor);
        }, function () { tune(ch.major, ch.minor || 0); }, 'ALL', 0, 1000);
      } catch (error) { tune(ch.major, ch.minor || 0); }
    }
    if (!tvw || typeof tvw.setSource !== 'function') { lookup(); return; }
    sources(function (err, list) {
      var tv = null;
      if (finished) return;
      if (!err && list) list.some(function (s) { if (s.type === 'TV') { tv = s; return true; } return false; });
      if (!tv) { lookup(); return; }
      try { tvw.setSource(tv.source, function () { lookup(); }, function () { lookup(); }); } catch (error) { lookup(); }
    }, true);
  }
  // Every channel from the TV's last scan: [{ major, minor, name }], sorted by number.
  function channels(done) {
    var tvc = window.tizen && window.tizen.tvchannel;
    if (!tvc || typeof tvc.getChannelList !== 'function') { unavailable(done); return; }
    var finish = bounded(done, 15000);
    try {
      tvc.getChannelList(function (list) {
        var out = [];
        (list || []).forEach(function (c) {
          if (!c || typeof c.major !== 'number' || !isFinite(c.major) || c.major < 0) return;
          out.push({ major: c.major, minor: typeof c.minor === 'number' && c.minor > 0 ? c.minor : 0, name: String(c.channelName || c.serviceName || '').trim() });
        });
        out.sort(function (a, b) { return a.major - b.major || a.minor - b.minor; });
        finish(null, out);
      }, function (err) { finish(failure(err)); }, 'ALL', 0, 1000);
    } catch (err) { finish(failure(err)); }
  }
  // True when an app is installed; system shortcuts are shown only if their app exists.
  function hasApp(id) {
    try { return !!(api() && api().getAppInfo(id)); } catch (err) { return false; }
  }
  function launchApp(id, done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try { api().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }
  function launch(brand, done) {
    if (!IDS[brand]) { done({message: T('This app has no launch target.')}); return; }
    launchApp(IDS[brand], done);
  }
  function art(done) {
    if (!api()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      var data = [new tizen.ApplicationControlData('mode', ['fullscreen']), new tizen.ApplicationControlData('requester', ['mobile'])];
      var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, data);
      api().launchAppControl(control, 'org.tizen.art-app', function () { finish(null); }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  function home(done) { launchApp('com.samsung.tv.csfs', done); }
  // Dismiss the overlay: background the resident app, revealing whatever is behind it.
  function hide() { try { var a = api(); if (a && a.getCurrentApplication) a.getCurrentApplication().hide(); } catch (err) { /* preview or unsupported */ } }
  // Tizen 5.5 TVs ignore launches of coba.setting from web apps; org.tizen.menu opens the same settings.
  function settings(done) { launchApp(hasApp('org.tizen.menu') ? 'org.tizen.menu' : 'com.samsung.tv.coba.setting', done); }
  function apps(done) {
    if (!api()) { unavailable(done); return; }
    // Large installed catalogues can take longer than a launch response.
    var finish = bounded(done, 20000);
    try {
      api().getAppsInfo(function (list) {
        var known = {}, seen = {}, result = [], self = selfId();
        Object.keys(IDS).forEach(function (brand) { known[IDS[brand]] = brand; });
        list.forEach(function (a) {
          var primary = !!known[a.id], stream = STREAMING.indexOf(a.id) >= 0;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === self || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!primary && !stream && (!a.show || !consumer))) return;
          if (!primary && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, brand: known[a.id] || EXTRA_BRANDS[a.id] || '', icon: a.iconPath || '', rank: primary ? Object.keys(IDS).indexOf(known[a.id]) : (stream ? 20 : 30) });
        });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        finish(null, result);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }
  window.FrameDevice = { hasApp: hasApp, launch: launch, launchApp: launchApp, art: art, home: home, hide: hide, settings: settings, apps: apps, sources: sources, setSource: setSource, cancelSource: cancelSource, tuneChannel: tuneChannel, channels: channels };
}());
