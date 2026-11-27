/* Browser preview only (served by scripts/preview.mjs, never packaged): sample TV
   sources so the Home inputs dock can be seen without a TV. Pick a sample with the
   page's ?inputs= parameter:
     few (default)  TV + 2 HDMI      — narrow bar, centred
     many           TV + 7 HDMI      — bar spans the stage and scrolls
     none           no inputs dock
     <n>            TV + n-1 HDMI ports (1-12)
   Only FrameDevice.sources is replaced; every device action still reports that it
   needs the TV. */
(function () {
  'use strict';
  if (window.tizen || !window.FrameDevice) return;
  var match = /[?&]inputs=([^&#]*)/.exec(location.search), kind = match ? decodeURIComponent(match[1]) : 'few';
  var count = kind === 'none' ? 0 : kind === 'many' ? 8 : /^\d+$/.test(kind) ? Math.min(12, Number(kind)) : 3;
  var list = [];
  for (var i = 0; i < count; i++) {
    var tv = i === 0;
    list.push({ type: tv ? 'TV' : 'HDMI', number: tv ? 0 : i, name: tv ? 'TV' : 'HDMI ' + i, connected: tv || i % 3 !== 0, active: i === 1, source: null });
  }
  window.FrameDevice.sources = function (done) { setTimeout(function () { done(null, list.slice()); }, 0); };
}());
