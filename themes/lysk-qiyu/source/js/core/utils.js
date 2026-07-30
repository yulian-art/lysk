(function (global) {
  'use strict';

  var QiyuTheme = global.QiyuTheme || {};

  QiyuTheme.utils = {
    //生成一个介于min和max的随机浮点数
    random: function (min, max) {
      return Math.random() * (max - min) + min;
    },
    //将一个数值限制在 [min, max] 区间内。
    // 若 value 小于 min 则返回 min，大于 max 则返回 max，否则返回原值。
    clamp: function (value, min, max) {
      return Math.min(max, Math.max(min, value));
    },
    //线性插值（Linear Interpolation），
    // 根据 amount（通常在 0~1 之间）在 min 和 max 之间进行线性插值
    // 用途：动画过渡、颜色混合、位置平滑变化等
    lerp: function (min, max, amount) {
      return min + (max - min) * amount;
    },
    //根据图片 URL 创建一个 Image 对象，并异步解码（decoding: 'async' 避免阻塞渲染），
    // 然后返回该对象。若 src 为空，则返回 null。
    loadImage: function (src) {
      if (!src) return null;
      var image = new Image();
      image.decoding = 'async';
      image.src = src;
      return image;
    },
    // 判断是否应启用低功耗模式，用于在性能较差的设备上减少特效开销
    resolveLowPower: function (mode, prefersReduced) {
      if (mode === true || mode === 'true' || mode === 'on') return true;
      if (mode === false || mode === 'false' || mode === 'off') return false;

      var hardwareWeak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || window.innerWidth < 768;
      return prefersReduced || hardwareWeak;
    }
  };

  global.QiyuTheme = QiyuTheme;
})(window);
