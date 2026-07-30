(function (global) {
  'use strict';

  var QiyuTheme = global.QiyuTheme || {};

  QiyuTheme.createCursorEffects = function (options) {
    var ctx = options.ctx;  //Canvas 上下文，用于绘制光标
    var pointer = options.pointer;  //指针状态对象，包含 x, y（坐标）、active（是否激活）、moved（是否移动过）等属性
    var finePointer = options.finePointer;  //是否启用精细指针（通常为 true 时显示自定义光标，否则可能使用系统光标）
    var config = options.config;  //配置对象，包含 cursors.normal 和 cursors.text 图片 URL
    var utils = QiyuTheme.utils;  
    //加载光标图片
    var cursorImages = {
      normal: utils.loadImage(config.cursors.normal),
      text: utils.loadImage(config.cursors.text)
    };
    //添加标记类
    if (finePointer) {
      document.body.classList.add('has-qiyu-cursor');
    }
    //模式检测函数
    function detectMode(x, y) {
      var element = document.elementFromPoint(x, y);
      if (!element) return 'normal';

      var textTarget = element.closest(
        'input, textarea, select, [contenteditable=true], .article-content p, .article-content li, .article-content blockquote, .article-content code, .article-content pre, .article-content h1, .article-content h2, .article-content h3'
      );

      return textTarget ? 'text' : 'normal';
    }
    //模式同步函数
    function syncMode(x, y) {
      pointer.mode = detectMode(x, y);
      document.body.classList.toggle('is-text-cursor', pointer.mode === 'text');
    }

    function draw() {
      if (!finePointer || (!pointer.active && !pointer.moved)) return;

      ctx.save();
      //绘制光晕
      var glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 28);
      glow.addColorStop(0, 'hsla(330, 39%, 93%, 0.95)');
      glow.addColorStop(0.34, 'rgba(255, 183, 197, 0.42)');
      glow.addColorStop(1, 'rgba(255, 183, 197, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 28, 0, Math.PI * 2);
      ctx.fill();
      //绘制光标图标
      var image = pointer.mode === 'text' ? cursorImages.text : cursorImages.normal;
      if (image && image.complete && image.naturalWidth) {
        var size = pointer.mode === 'text' ? 28 : 34;
        var offset = pointer.mode === 'text' ? size / 2 : 4;
        ctx.globalAlpha = 0.96;
        ctx.drawImage(image, pointer.x - offset, pointer.y - offset, size, size);
      } else {
        ctx.fillStyle = '#fff7fb';
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    return {
      syncMode: syncMode,
      draw: draw
    };
  };

  global.QiyuTheme = QiyuTheme;
})(window);
