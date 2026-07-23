(function (global) {
  'use strict';

  var QiyuTheme = global.QiyuTheme || {};

  QiyuTheme.createCursorEffects = function (options) {
    var ctx = options.ctx;
    var pointer = options.pointer;
    var finePointer = options.finePointer;
    var config = options.config;
    var utils = QiyuTheme.utils;
    var cursorImages = {
      normal: utils.loadImage(config.cursors.normal),
      text: utils.loadImage(config.cursors.text)
    };

    if (finePointer) {
      document.body.classList.add('has-qiyu-cursor');
    }

    function detectMode(x, y) {
      var element = document.elementFromPoint(x, y);
      if (!element) return 'normal';

      var textTarget = element.closest(
        'input, textarea, select, [contenteditable=true], .article-content p, .article-content li, .article-content blockquote, .article-content code, .article-content pre, .article-content h1, .article-content h2, .article-content h3'
      );

      return textTarget ? 'text' : 'normal';
    }

    function syncMode(x, y) {
      pointer.mode = detectMode(x, y);
      document.body.classList.toggle('is-text-cursor', pointer.mode === 'text');
    }

    function draw() {
      if (!finePointer || (!pointer.active && !pointer.moved)) return;

      ctx.save();
      var glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 28);
      glow.addColorStop(0, 'hsla(330, 39%, 93%, 0.95)');
      glow.addColorStop(0.34, 'rgba(255, 183, 197, 0.42)');
      glow.addColorStop(1, 'rgba(255, 183, 197, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 28, 0, Math.PI * 2);
      ctx.fill();

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
