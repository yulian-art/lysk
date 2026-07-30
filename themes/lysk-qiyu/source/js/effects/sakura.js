(function (global) {
  'use strict';
/*创建樱花粒子特效 */

  var QiyuTheme = global.QiyuTheme || {};
  var utils = QiyuTheme.utils;

  QiyuTheme.createSakuraEffects = function (options) {
    var ctx = options.ctx;
    var config = options.config;
    var viewport = options.viewport;  //视口尺寸，用于粒子边界判断
    var lowPower = options.lowPower;
    var reducedMotion = options.reducedMotion;  //
    var burstPetals = [];
    var fallingPetals = [];

    function drawPetal(x, y, size, rotate, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffb7c5';
      ctx.strokeStyle = 'rgba(255, 247, 251, 0.56)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      // 在绘制时生成随机偏移因子（但保持对称）
var wave = 0.92 + Math.random() * 0.08;
var cx1 = size * 0.95 * wave;
var cy1 = -size * 0.78 * wave;
var cx2 = size * 0.92 * wave;
var cy2 = size * 0.48 * wave;
ctx.moveTo(0, -size);
ctx.bezierCurveTo(cx1, cy1, cx2, cy2, 0, size);
ctx.bezierCurveTo(-cx2, cy2, -cx1, cy1, 0, -size); // 注意顺序和符号
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function FallingPetal() {
      this.reset(true);
    }

    FallingPetal.prototype.reset = function (inside) {
      this.x = utils.random(-40, viewport.width + 40);
      this.y = inside ? utils.random(-40, viewport.height) : utils.random(-90, -20);
      this.size = utils.random(5, 12);
      this.vx = utils.random(-0.22, 0.26);
      this.vy = utils.random(0.12, 0.38);
      this.rotate = utils.random(0, Math.PI * 2);
      this.rotateSpeed = utils.random(-0.011, 0.014);
      this.swing = utils.random(0.0012, 0.0032);
      this.alpha = utils.random(0.18, 0.46);
      this.phase = utils.random(0, Math.PI * 2);
    };

    FallingPetal.prototype.update = function (time) {
      this.x += this.vx + Math.sin(time * this.swing + this.phase) * 0.28;
      this.y += this.vy;
      this.rotate += this.rotateSpeed;
      //当粒子完全离开屏幕（超出下方或水平过远）时，调用 reset(false) 将其重置到顶部，形成循环。
      if (this.y > viewport.height + 40 || this.x < -80 || this.x > viewport.width + 80) {
        this.reset(false);
      }
    };

    FallingPetal.prototype.draw = function () {
      drawPetal(this.x, this.y, this.size, this.rotate, this.alpha);
    };
    //创建飘落樱花 
    function createFallingPetals() {
      fallingPetals.length = 0;
      if (!config.sakura || !config.fallingSakura || reducedMotion) return;

      var count = Math.round((lowPower ? 16 : 34) * config.density);
      for (var i = 0; i < count; i += 1) {
        fallingPetals.push(new FallingPetal());
      }
    }
    // 爆破特效
    function burst(x, y) {
      var min = Math.max(1, Number(config.sakuraClickMin) || 50);
      var max = Math.max(min, Number(config.sakuraClickMax) || 80);
      var amount = Math.round(utils.random(min, max) * config.density * (lowPower ? 0.56 : 1));

      for (var i = 0; i < amount; i += 1) {
        var angle = utils.random(0, Math.PI * 2);
        var speed = utils.random(1.2, lowPower ? 4.4 : 6.8);
        burstPetals.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - utils.random(1.2, 3.2),
          gravity: utils.random(0.035, 0.075),
          drag: utils.random(0.982, 0.992),
          size: utils.random(5, 13),
          rotate: utils.random(0, Math.PI * 2),
          rotateSpeed: utils.random(-0.16, 0.16),
          life: 1,
          decay: utils.random(0.008, 0.016)
        });
      }

      var cap = lowPower ? 140 : 260;
      if (burstPetals.length > cap) {
        burstPetals.splice(0, burstPetals.length - cap);
      }
    }
    // 更新爆破粒子
    function updateBurst() {
      for (var i = burstPetals.length - 1; i >= 0; i -= 1) {
        var petal = burstPetals[i];
        petal.vx *= petal.drag;
        petal.vy = petal.vy * petal.drag + petal.gravity;
        petal.x += petal.vx;
        petal.y += petal.vy;
        petal.rotate += petal.rotateSpeed;
        petal.life -= petal.decay;

        if (petal.life <= 0 || petal.y > viewport.height + 80) {
          burstPetals.splice(i, 1);
        }
      }
    }
    //
    //
    // 主更新循环
    function update(time) {
      for (var i = 0; i < fallingPetals.length; i += 1) {
        fallingPetals[i].update(time);
        fallingPetals[i].draw();
      }

      updateBurst();
      for (var j = 0; j < burstPetals.length; j += 1) {
        var petal = burstPetals[j];
        drawPetal(petal.x, petal.y, petal.size, petal.rotate, Math.max(0, petal.life));
      }
    }

    return {
      createFallingPetals: createFallingPetals,
      burst: burst,
      update: update
    };
  };

  global.QiyuTheme = QiyuTheme;
})(window);
