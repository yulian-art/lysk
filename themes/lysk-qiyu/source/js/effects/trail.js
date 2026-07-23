(function (global) {
  'use strict';

  var QiyuTheme = global.QiyuTheme || {};
  var utils = QiyuTheme.utils;

  QiyuTheme.createTrailEffects = function (options) {
    var config = options.config;
    var fishLayer = options.fishLayer;
    var pointer = options.pointer;
    var lowPower = options.lowPower;
    var reducedMotion = options.reducedMotion;
    var trailCount = utils.clamp(Math.round(Number(config.fishCount) || 42), 10, 30);
    var maxHistory = trailCount * 4;
    var history = [];
    var trailFish = [];
    var companionFish = [];
    var trailDrops = [];
    var fishAssets = createFishAssets(config.trail.fishImages);
    var bubbleImageSrc = config.trail.bubbleImage || '';

    function createFishAssets(images) {
      return images.map(function (src, index) {
        return {
          src: src,
          baseAngle: index === 0 ? Math.PI * 0.74 : Math.PI * 0.12
        };
      });
    }

    function createTrailImage(src, className) {
      var image = document.createElement('img');
      image.className = className;
      image.src = src;
      image.alt = '';
      image.decoding = 'async';
      image.draggable = false;
      image.style.opacity = '0';
      return image;
    }

    function createTrailPoint(x, y, angle, life) {
      return {
        x: x,
        y: y,
        angle: angle || 0,
        life: life === undefined ? 1 : life
      };
    }

    function seed(width, height) {
      history.length = 0;

      for (var i = 0; i < trailCount; i += 1) {
        var ratio = i / Math.max(1, trailCount - 1);
        var angle = ratio * Math.PI * 2;
        history.push(createTrailPoint(
          width * (0.5 + Math.sin(angle) * 0.12),
          height * (0.5 + Math.cos(angle) * 0.08),
          angle + Math.PI * 0.5,
          1
        ));
      }
    }

    function push(x, y) {
      var head = history[0];
      if (head && Math.hypot(x - head.x, y - head.y) < 2) {
        head.x = x;
        head.y = y;
        head.angle = pointer.angle;
        head.life = 1;
        return;
      }

      history.unshift(createTrailPoint(x, y, pointer.angle, 1));
      if (history.length > maxHistory) {
        history.length = maxHistory;
      }
    }

    function hide(node) {
      node.style.opacity = '0';
    }

    function resolveAngle(index) {
      var point = history[index];
      var previous = history[Math.max(0, index - 1)];
      var next = history[Math.min(history.length - 1, index + 1)];

      if (previous && point && Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y) > 0.4) {
        return Math.atan2(previous.y - point.y, previous.x - point.x);
      }
      if (next && point && Math.abs(point.x - next.x) + Math.abs(point.y - next.y) > 0.4) {
        return Math.atan2(point.y - next.y, point.x - next.x);
      }

      return point ? point.angle : pointer.angle;
    }

    function updateFade(time, delta) {
      if (!pointer.moved || time - pointer.lastMoveAt <= 90) return;

      var decay = delta / (lowPower ? 760 : 1120);
      for (var i = 0; i < history.length; i += 1) {
        history[i].life = Math.max(0, history[i].life - decay);
      }
    }

    function drawFish(time) {
      var now = performance.now();

      for (var i = 0; i < trailFish.length; i += 1) {
        var item = trailFish[i];
        var index = Math.max(0, Math.min(history.length - 1, Math.floor(i * item.trailStep + item.trailOffset)));
        var point = history[index];

        if (!point || point.life <= 0.01) {
          hide(item.el);
          continue;
        }

        var ratio = i / Math.max(1, trailFish.length - 1);
        var tail = ratio;
        var front = 1 - ratio;
        var alpha = utils.lerp(0.08, 0.98, front) * point.life * item.alphaJitter;
        var size = utils.lerp(18, 64, front) * utils.lerp(0.38, 1, point.life) * item.sizeJitter;
        var spread = item.spreadRadius * utils.lerp(0.35, 1, tail);
        var spreadAngle = item.spreadAngle + now * item.spreadSpin;
        var spreadX = Math.cos(spreadAngle) * spread;
        var spreadY = Math.sin(spreadAngle) * spread * 0.72;
        var driftX = Math.sin(now * item.driftSpeed + item.phase) * item.drift * utils.lerp(0.18, 1, tail);
        var driftY = Math.cos(now * item.driftSpeed * 0.82 + item.phase) * item.drift * utils.lerp(0.18, 1, tail);
        var angle = resolveAngle(index) - item.baseAngle + item.angleJitter + Math.sin(now * 0.0008 + item.phase) * 0.12;

        item.el.style.width = Math.max(10, size).toFixed(2) + 'px';
        item.el.style.opacity = Math.min(1, Math.max(0, alpha)).toFixed(3);
        item.el.style.left = (point.x + spreadX + driftX).toFixed(2) + 'px';
        item.el.style.top = (point.y + spreadY + driftY).toFixed(2) + 'px';
        item.el.style.transform = 'translate(-50%, -50%) rotate(' + angle.toFixed(4) + 'rad)';
      }
    }

    function drawCompanion(time) {
      var head = history[0];
      var visible = head ? head.life : 0;

      for (var i = 0; i < companionFish.length; i += 1) {
        var item = companionFish[i];
        var anchor = history[Math.min(history.length - 1, item.delay)] || head;

        if (!anchor || visible <= 0.01) {
          hide(item.el);
          continue;
        }

        var driftX = Math.cos(time * item.speed + item.phase) * 8;
        var driftY = Math.sin(time * item.speed * 1.18 + item.phase) * 8;
        var targetX = anchor.x + item.offsetX + driftX;
        var targetY = anchor.y + item.offsetY + driftY;
        var oldX = item.x;
        var oldY = item.y;

        item.x += (targetX - item.x) * item.ease;
        item.y += (targetY - item.y) * item.ease;
        if (Math.abs(item.x - oldX) + Math.abs(item.y - oldY) > 0.3) {
          item.angle = Math.atan2(item.y - oldY, item.x - oldX);
        }

        var size = item.size * utils.lerp(0.48, 1, visible);
        item.el.style.width = size.toFixed(2) + 'px';
        item.el.style.opacity = (0.82 * visible).toFixed(3);
        item.el.style.left = item.x.toFixed(2) + 'px';
        item.el.style.top = item.y.toFixed(2) + 'px';
        item.el.style.transform = 'translate(-50%, -50%) rotate(' + (item.angle - item.baseAngle).toFixed(4) + 'rad)';
      }
    }

    function drawDrops(time) {
      for (var i = 0; i < trailDrops.length; i += 1) {
        var drop = trailDrops[i];
        var index = Math.min(history.length - 1, drop.slot);
        var point = history[index];

        if (!point || point.life <= 0.01) {
          hide(drop.el);
          continue;
        }

        var ratio = index / Math.max(1, trailCount - 1);
        var front = 1 - ratio;
        var floatX = Math.cos(time * drop.speed + drop.phase) * 7;
        var floatY = Math.sin(time * drop.speed * 1.22 + drop.phase) * 7;
        var alpha = utils.lerp(0.06, 0.56, front) * point.life * drop.alpha;
        var size = utils.lerp(7, 22, front) * drop.scale * utils.lerp(0.4, 1, point.life);

        drop.el.style.width = size.toFixed(2) + 'px';
        drop.el.style.opacity = alpha.toFixed(3);
        drop.el.style.left = (point.x + drop.offsetX + floatX).toFixed(2) + 'px';
        drop.el.style.top = (point.y + drop.offsetY + floatY).toFixed(2) + 'px';
        drop.el.style.transform = 'translate(-50%, -50%) scale(' + utils.lerp(0.72, 1.08, front).toFixed(3) + ')';
      }
    }

    function create() {
      trailFish.length = 0;
      companionFish.length = 0;
      trailDrops.length = 0;

      if (fishLayer) {
        fishLayer.textContent = '';
      }
      if (!config.fish || reducedMotion || !fishLayer || !fishAssets.length) return;

      for (var i = 0; i < trailCount; i += 1) {
        var asset = fishAssets[i % fishAssets.length];
        var fishNode = createTrailImage(asset.src, 'qiyu-trail-fish');
        fishLayer.appendChild(fishNode);
        trailFish.push({
          el: fishNode,
          baseAngle: asset.baseAngle,
          trailStep: utils.random(3.2, 10),
          trailOffset: utils.random(-1.8, 2.4),
          spreadRadius: utils.random(4, 32),
          spreadAngle: utils.random(0, Math.PI * 2),
          spreadSpin: utils.random(-0.0011, 0.0011),
          drift: utils.random(2.5, 13),
          driftSpeed: utils.random(0.00065, 0.0018),
          phase: utils.random(0, Math.PI * 2),
          sizeJitter: utils.random(0.78, 1.18),
          alphaJitter: utils.random(0.72, 1.08),
          angleJitter: utils.random(-0.34, 0.34)
        });
      }

      var companionCount = lowPower ? 2 : Math.floor(utils.random(2, 4));
      for (var j = 0; j < companionCount; j += 1) {
        var companionAsset = fishAssets[(j + 1) % fishAssets.length];
        var orbitAngle = utils.random(0, Math.PI * 2);
        var orbitRadius = utils.random(30, 76);
        var companionNode = createTrailImage(companionAsset.src, 'qiyu-companion-fish');
        fishLayer.appendChild(companionNode);
        companionFish.push({
          el: companionNode,
          baseAngle: companionAsset.baseAngle,
          x: pointer.x,
          y: pointer.y,
          angle: pointer.angle,
          delay: Math.round(utils.random(0, Math.min(12, trailCount - 1))),
          offsetX: Math.cos(orbitAngle) * orbitRadius,
          offsetY: Math.sin(orbitAngle) * orbitRadius,
          phase: utils.random(0, Math.PI * 2),
          speed: utils.random(0.0012, 0.0026),
          ease: utils.random(0.06, 0.11),
          size: utils.random(28, 46)
        });
      }

      if (!bubbleImageSrc) return;

      var dropCount = Math.round((lowPower ? 10 : 18) * config.density);
      for (var k = 0; k < dropCount; k += 1) {
        var dropNode = createTrailImage(bubbleImageSrc, 'qiyu-trail-drop');
        fishLayer.appendChild(dropNode);
        trailDrops.push({
          el: dropNode,
          slot: Math.round(utils.random(2, trailCount - 1)),
          offsetX: utils.random(-46, 46),
          offsetY: utils.random(-38, 38),
          phase: utils.random(0, Math.PI * 2),
          speed: utils.random(0.0014, 0.0034),
          scale: utils.random(0.66, 1.28),
          alpha: utils.random(0.58, 1)
        });
      }
    }

    function update(time, delta) {
      if (!trailFish.length) return;
      updateFade(time, delta);
      drawFish(time);
      drawCompanion(time);
      drawDrops(time);
    }

    return {
      seed: seed,
      push: push,
      create: create,
      update: update
    };
  };

  global.QiyuTheme = QiyuTheme;
})(window);
