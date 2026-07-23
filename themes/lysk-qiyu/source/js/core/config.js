(function (global) {
  'use strict';

  var QiyuTheme = global.QiyuTheme || {};
  var utils = QiyuTheme.utils;

  var defaults = {
    sakura: true,
    fallingSakura: true,
    fish: true,
    fishCount: 20,
    fishMin: 18,
    fishMax: 22,
    sakuraClickMin: 50,
    sakuraClickMax: 80,
    density: 1,
    lowPowerMode: 'auto',
    trail: {
      fishImages: [],
      bubbleImage: ''
    },
    cursors: {
      normal: '',
      text: ''
    }
  };

  QiyuTheme.createConfig = function (shell) {
    var parsed = {};

    try {
      parsed = JSON.parse(shell.getAttribute('data-effect-config') || '{}');
    } catch (error) {
      parsed = {};
    }

    var config = Object.assign({}, defaults, parsed);
    config.cursors = Object.assign({}, defaults.cursors, parsed.cursors || {});
    config.trail = Object.assign({}, defaults.trail, parsed.trail || {});
    config.trail.fishImages = Array.isArray(config.trail.fishImages) ? config.trail.fishImages.filter(Boolean) : [];
    config.density = utils.clamp(Number(config.density) || 1, 0.12, 1.4);

    return config;
  };

  global.QiyuTheme = QiyuTheme;
})(window);
