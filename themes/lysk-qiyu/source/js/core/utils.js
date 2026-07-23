(function (global) {
  'use strict';

  var QiyuTheme = global.QiyuTheme || {};

  QiyuTheme.utils = {
    random: function (min, max) {
      return Math.random() * (max - min) + min;
    },

    clamp: function (value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    lerp: function (min, max, amount) {
      return min + (max - min) * amount;
    },

    loadImage: function (src) {
      if (!src) return null;
      var image = new Image();
      image.decoding = 'async';
      image.src = src;
      return image;
    },

    resolveLowPower: function (mode, prefersReduced) {
      if (mode === true || mode === 'true' || mode === 'on') return true;
      if (mode === false || mode === 'false' || mode === 'off') return false;

      var hardwareWeak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || window.innerWidth < 768;
      return prefersReduced || hardwareWeak;
    }
  };

  global.QiyuTheme = QiyuTheme;
})(window);
