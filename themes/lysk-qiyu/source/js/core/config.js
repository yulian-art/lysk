(function (global) {
  'use strict';

  var QiyuTheme = global.QiyuTheme || {};
  var utils = QiyuTheme.utils;

  var defaults = {
  sakura: true,                // 是否显示静态樱花
  fallingSakura: true,         // 是否显示飘落樱花
  fish: true,                  // 是否显示游鱼
  fishCount: 20,               // 鱼的数量
  fishMin: 18,                 // 鱼的最小尺寸
  fishMax: 22,                 // 鱼的最大尺寸
  sakuraClickMin: 50,          // 点击生成樱花的最小数量
  sakuraClickMax: 80,          // 点击生成樱花的最大数量
  density: 1,                  // 全局密度系数（影响粒子数量等）
  lowPowerMode: 'auto',        // 低功耗模式 ('auto' / true / false)
  trail: {                     // 鼠标轨迹相关
    fishImages: [],            // 鱼图片 URL 数组
    bubbleImage: ''            // 气泡图片 URL
  },
  cursors: {                   // 自定义光标
    normal: '',                // 普通状态光标 URL
    text: ''                   // 文本状态光标 URL
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
