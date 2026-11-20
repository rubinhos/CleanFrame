/* Weather for the Home caption and effects. Approximate location comes from the
   connection's public IP; forecasts come from Open-Meteo. No account or key. */
(function () {
  'use strict';
  var KEY = 'cleanframe.weather.v1', LOCATION_TTL = 24 * 3600000, TIMEOUT = 10000;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* Weather still shows this session. */ } }
  function number(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  function getJSON(url, done) {
    var xhr = new window.XMLHttpRequest(), finished = false;
    function finish(err, value) { if (finished) return; finished = true; done(err, value); }
    try {
      xhr.open('GET', url, true);
      xhr.timeout = TIMEOUT;
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) { finish({ message: 'Weather service returned ' + xhr.status }); return; }
        try { finish(null, JSON.parse(xhr.responseText)); } catch (e) { finish({ message: 'Weather service sent unreadable data.' }); }
      };
      xhr.onerror = function () { finish({ message: 'Weather service is unreachable.' }); };
      xhr.ontimeout = function () { finish({ message: 'Weather service timed out.' }); };
      xhr.send();
    } catch (e) { finish({ message: 'Weather request failed.' }); }
  }

  // Two IP lookups; the second is only used when the first fails.
  var LOOKUPS = [
    { url: 'https://ipwho.is/', read: function (d) { return d && d.success !== false ? { lat: number(d.latitude), lon: number(d.longitude), city: d.city } : null; } },
    { url: 'https://ipapi.co/json/', read: function (d) { return d && !d.error ? { lat: number(d.latitude), lon: number(d.longitude), city: d.city } : null; } }
  ];
  function locate(done) {
    var cached = load().location, i = 0;
    if (cached && Date.now() - cached.at < LOCATION_TTL) { done(null, cached); return; }
    (function next() {
      if (i >= LOOKUPS.length) { done(cached ? null : { message: 'Location unavailable.' }, cached || null); return; }
      var lookup = LOOKUPS[i++];
      getJSON(lookup.url, function (err, data) {
        var loc = err ? null : lookup.read(data);
        if (!loc || loc.lat === null || loc.lon === null) { next(); return; }
        loc.city = typeof loc.city === 'string' ? loc.city.slice(0, 80) : '';
        loc.at = Date.now();
        var store = load(); store.location = loc; save(store);
        done(null, loc);
      });
    }());
  }

  // Open-Meteo local times have no offset; convert with the returned UTC offset.
  function localTime(text, offset) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(text || '');
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - offset * 1000 : null;
  }
  function forecast(loc, done) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat.toFixed(3) + '&longitude=' + loc.lon.toFixed(3)
      + '&current=temperature_2m,weather_code,is_day,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset'
      + '&timezone=auto&forecast_days=1';
    getJSON(url, function (err, d) {
      var c = d && d.current, day = d && d.daily, offset = d && number(d.utc_offset_seconds) || 0;
      if (err || !c || number(c.temperature_2m) === null || number(c.weather_code) === null) { done(err || { message: 'Weather data incomplete.' }); return; }
      done(null, {
        temp: c.temperature_2m, code: c.weather_code, isDay: c.is_day === 1, wind: number(c.wind_speed_10m) || 0,
        max: day && number(day.temperature_2m_max && day.temperature_2m_max[0]), min: day && number(day.temperature_2m_min && day.temperature_2m_min[0]),
        sunrise: day && day.sunrise ? localTime(day.sunrise[0], offset) : null, sunset: day && day.sunset ? localTime(day.sunset[0], offset) : null,
        city: loc.city, at: Date.now()
      });
    });
  }

  // Last saved forecast, so Home can show weather before the network answers.
  function cached() { var w = load().weather; return w && Date.now() - w.at < 3 * 3600000 ? w : null; }
  function current(done) {
    locate(function (err, loc) {
      if (err || !loc) { done(err || { message: 'Location unavailable.' }); return; }
      forecast(loc, function (fail, weather) {
        if (!fail) { var store = load(); store.weather = weather; save(store); }
        done(fail, weather);
      });
    });
  }
  window.FrameWeather = { current: current, cached: cached };
}());
