/* CleanTV saved antenna channels, shown as a one-column dock to the right of the apps.
   num: label as the TV shows it; major/minor: what tizen.tvchannel tunes (minor 0 = analog
   or a channel without a subchannel); icon: a monochrome SVG in assets/icons/ (optional,
   the number is shown when it is missing). Edit this list to add, remove or reorder. */
window.CleanTVChannels = [
  { num: '03', major: 3, minor: 0, name: 'VCR', icon: 'dev-vcr' },
  { num: '05.1', major: 5, minor: 1, name: 'Globo', icon: 'globo' },
  { num: '08.1', major: 8, minor: 1, name: 'Record', icon: 'record' },
  { num: '13.1', major: 13, minor: 1, name: 'SBT', icon: 'sbt' },
  { num: '39.1', major: 39, minor: 1, name: 'Band', icon: 'band' }
];
