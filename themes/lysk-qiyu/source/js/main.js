(function () {
  "use strict";

  var shell = document.querySelector(".theme-shell");
  var canvas = document.getElementById("qiyu-ocean-canvas");
  var fishLayer = document.getElementById("qiyu-fish-layer");
  if (!shell || !canvas) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

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
    lowPowerMode: "auto",
    trail: {
      fishImages: [],
      bubbleImage: ""
    },
    cursors: {
      normal: "",
      text: ""
    }
  };

  var parsed = {};
  try {
    parsed = JSON.parse(shell.getAttribute("data-effect-config") || "{}");
  } catch (error) {
    parsed = {};
  }

  var config = Object.assign({}, defaults, parsed);
  config.cursors = Object.assign({}, defaults.cursors, parsed.cursors || {});
  config.trail = Object.assign({}, defaults.trail, parsed.trail || {});
  config.trail.fishImages = Array.isArray(config.trail.fishImages) ? config.trail.fishImages.filter(Boolean) : [];
  config.density = clamp(Number(config.density) || 1, 0.12, 1.4);

  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lowPower = resolveLowPower(config.lowPowerMode, reducedMotion);
  var width = 0;
  var height = 0;
  var dpr = 1;
  var lastFrame = 0;
  var lastTouchAt = 0;
  var pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: finePointer,
    moved: false,
    mode: "normal",
    angle: -Math.PI * 0.75,
    lastMoveAt: 0
  };

  var trailCount = clamp(Math.round(Number(config.fishCount) || 42), 10, 30);
  var maxHistory = trailCount * 4;
  var history = [];
  var trailFish = [];
  var companionFish = [];
  var trailDrops = [];
  var burstPetals = [];
  var fallingPetals = [];
  var fishAssets = createFishAssets(config.trail.fishImages);
  var bubbleImageSrc = config.trail.bubbleImage || "";
  var idleTrailLastPush = 0;
  var cursorImages = {
    normal: loadImage(config.cursors.normal),
    text: loadImage(config.cursors.text)
  };

  if (finePointer) {
    document.body.classList.add("has-qiyu-cursor");
  }

  function bindEvents() {
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerenter", function () {
      pointer.active = true;
    }, { passive: true });
    window.addEventListener("pointerleave", function () {
      pointer.active = false;
    }, { passive: true });

    window.addEventListener("click", function (event) {
      if (Date.now() - lastTouchAt < 520) return;
      triggerClickEffects(event.clientX, event.clientY);
    }, { passive: true });

    window.addEventListener("touchstart", function (event) {
      if (!event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      lastTouchAt = Date.now();
      updatePointer(touch.clientX, touch.clientY, true);
      triggerClickEffects(touch.clientX, touch.clientY);
      preventHomeTouchScroll(event);
    }, { passive: false });

    window.addEventListener("touchmove", function (event) {
      if (!event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      updatePointer(touch.clientX, touch.clientY, true);
      preventHomeTouchScroll(event);
    }, { passive: false });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        lastFrame = performance.now();
      }
    });
  }

  function onPointerMove(event) {
    updatePointer(event.clientX, event.clientY, true);
  }

  function updatePointer(x, y, moved) {
    var dx = x - pointer.x;
    var dy = y - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.4) {
      pointer.angle = Math.atan2(dy, dx);
    }

    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    pointer.moved = pointer.moved || moved;
    if (moved) {
      pointer.lastMoveAt = performance.now();
    }
    pointer.mode = detectCursorMode(x, y);
    document.body.classList.toggle("is-text-cursor", pointer.mode === "text");
    pushHistory(x, y);
  }

  function preventHomeTouchScroll(event) {
    var isHome = document.body.classList.contains("page-kind-home");
    var target = event.target;
    var nativeArea = target && target.closest("a, button, input, textarea, select, .site-header, .post-dock, .content-card, .listing-card");
    if (isHome && !nativeArea) {
      event.preventDefault();
    }
  }

  function createFishAssets(images) {
    return images.map(function (src, index) {
      return {
        src: src,
        baseAngle: index === 0 ? Math.PI * 0.74 : Math.PI * 0.12
      };
    });
  }

  function createTrailImage(src, className) {
    var image = document.createElement("img");
    image.className = className;
    image.src = src;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    image.style.opacity = "0";
    return image;
  }

  function updateFishEffects(time, delta) {
    if (!trailFish.length) return;
    updateTrailFade(time, delta);
    drawFishTrail();
    drawCompanionFish(time);
    drawTrailDrops(time);
  }

  function updateTrailFade(time, delta) {
    if (!pointer.moved) return;
    var idleFor = time - pointer.lastMoveAt;
    if (idleFor <= 90) return;

    var decay = delta / (lowPower ? 760 : 1120);
    for (var i = 0; i < history.length; i += 1) {
      history[i].life = Math.max(0, history[i].life - decay);
    }
  }

  function drawFishTrail() {
    var now = performance.now();
    for (var i = 0; i < trailFish.length; i += 1) {
      var item = trailFish[i];
      var idx = Math.max(0, Math.min(history.length - 1, Math.floor(i * item.trailStep + item.trailOffset)));
      var point = history[idx];
      if (!point || point.life <= 0.01) {
        hideTrailNode(item.el);
        continue;
      }

      var ratio = i / Math.max(1, trailFish.length - 1);
      var tail = ratio;
      var front = 1 - ratio;
      var alpha = lerp(0.08, 0.98, front) * point.life * item.alphaJitter;

      var size = lerp(18, 64, front) * lerp(0.38, 1, point.life) * item.sizeJitter;
      var spread = item.spreadRadius * lerp(0.35, 1, tail);
      var spreadAngle = item.spreadAngle + now * item.spreadSpin;
      var spreadX = Math.cos(spreadAngle) * spread;
      var spreadY = Math.sin(spreadAngle) * spread * 0.72;
      var driftX = Math.sin(now * item.driftSpeed + item.phase) * item.drift * lerp(0.18, 1, tail);
      var driftY = Math.cos(now * item.driftSpeed * 0.82 + item.phase) * item.drift * lerp(0.18, 1, tail);
      var angle = resolveTrailAngle(idx) - item.baseAngle + item.angleJitter + Math.sin(now * 0.0008 + item.phase) * 0.12;

      item.el.style.width = Math.max(10, size).toFixed(2) + "px";
      item.el.style.opacity = Math.min(1, Math.max(0, alpha)).toFixed(3);
      item.el.style.left = (point.x + spreadX + driftX).toFixed(2) + "px";
      item.el.style.top = (point.y + spreadY + driftY).toFixed(2) + "px";
      item.el.style.transform = "translate(-50%, -50%) rotate(" + angle.toFixed(4) + "rad)";
    }
  }

  function drawCompanionFish(time) {
    var head = history[0];
    var visible = head ? head.life : 0;

    for (var i = 0; i < companionFish.length; i += 1) {
      var fishItem = companionFish[i];
      var anchor = history[Math.min(history.length - 1, fishItem.delay)] || head;
      if (!anchor || visible <= 0.01) {
        hideTrailNode(fishItem.el);
        continue;
      }

      var driftX = Math.cos(time * fishItem.speed + fishItem.phase) * 8;
      var driftY = Math.sin(time * fishItem.speed * 1.18 + fishItem.phase) * 8;
      var targetX = anchor.x + fishItem.offsetX + driftX;
      var targetY = anchor.y + fishItem.offsetY + driftY;
      var oldX = fishItem.x;
      var oldY = fishItem.y;

      fishItem.x += (targetX - fishItem.x) * fishItem.ease;
      fishItem.y += (targetY - fishItem.y) * fishItem.ease;
      if (Math.abs(fishItem.x - oldX) + Math.abs(fishItem.y - oldY) > 0.3) {
        fishItem.angle = Math.atan2(fishItem.y - oldY, fishItem.x - oldX);
      }

      var size = fishItem.size * lerp(0.48, 1, visible);
      fishItem.el.style.width = size.toFixed(2) + "px";
      fishItem.el.style.opacity = (0.82 * visible).toFixed(3);
      fishItem.el.style.left = fishItem.x.toFixed(2) + "px";
      fishItem.el.style.top = fishItem.y.toFixed(2) + "px";
      fishItem.el.style.transform = "translate(-50%, -50%) rotate(" + (fishItem.angle - fishItem.baseAngle).toFixed(4) + "rad)";
    }
  }

  function drawTrailDrops(time) {
    for (var i = 0; i < trailDrops.length; i += 1) {
      var drop = trailDrops[i];
      var index = Math.min(history.length - 1, drop.slot);
      var point = history[index];
      if (!point || point.life <= 0.01) {
        hideTrailNode(drop.el);
        continue;
      }

      var ratio = index / Math.max(1, trailCount - 1);
      var front = 1 - ratio;
      var floatX = Math.cos(time * drop.speed + drop.phase) * 7;
      var floatY = Math.sin(time * drop.speed * 1.22 + drop.phase) * 7;
      var x = point.x + drop.offsetX + floatX;
      var y = point.y + drop.offsetY + floatY;
      var alpha = lerp(0.06, 0.56, front) * point.life * drop.alpha;
      var size = lerp(7, 22, front) * drop.scale * lerp(0.4, 1, point.life);

      drop.el.style.width = size.toFixed(2) + "px";
      drop.el.style.opacity = alpha.toFixed(3);
      drop.el.style.left = x.toFixed(2) + "px";
      drop.el.style.top = y.toFixed(2) + "px";
      drop.el.style.transform = "translate(-50%, -50%) scale(" + lerp(0.72, 1.08, front).toFixed(3) + ")";
    }
  }

  function resolveTrailAngle(index) {
    var point = history[index];
    var previous = history[Math.max(0, index - 1)];
    var next = history[Math.min(history.length - 1, index + 1)];

    if (previous && point && (Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y) > 0.4)) {
      return Math.atan2(previous.y - point.y, previous.x - point.x);
    }
    if (next && point && (Math.abs(point.x - next.x) + Math.abs(point.y - next.y) > 0.4)) {
      return Math.atan2(point.y - next.y, point.x - next.x);
    }
    return point ? point.angle : pointer.angle;
  }

  function hideTrailNode(node) {
    node.style.opacity = "0";
  }

  function triggerClickEffects(x, y) {
    createRipple(x, y);
    if (config.sakura && !reducedMotion) {
      burstSakura(x, y);
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.35 : 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedHistory() {
    history.length = 0;
    var count = maxHistory || trailCount * 4;
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

  function pushHistory(x, y) {
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

  function createTrailPoint(x, y, angle, life) {
    return {
      x: x,
      y: y,
      angle: angle || 0,
      life: life === undefined ? 1 : life
    };
  }

  function createFish() {
    trailFish.length = 0;
    companionFish.length = 0;
    trailDrops.length = 0;
    if (fishLayer) {
      fishLayer.textContent = "";
    }
    if (!config.fish || reducedMotion || !fishLayer || !fishAssets.length) return;

    for (var i = 0; i < trailCount; i += 1) {
      var asset = fishAssets[i % fishAssets.length];
      var fishNode = createTrailImage(asset.src, "qiyu-trail-fish");
      fishLayer.appendChild(fishNode);
      trailFish.push({
        el: fishNode,
        baseAngle: asset.baseAngle,
        trailStep: random(3.2, 10),  //数值越大间隔越开
        trailOffset: random(-1.8, 2.4),
        spreadRadius: random(4, 32),
        spreadAngle: random(0, Math.PI * 2),
        spreadSpin: random(-0.0011, 0.0011),
        drift: random(2.5, 13),
        driftSpeed: random(0.00065, 0.0018),
        phase: random(0, Math.PI * 2),
        sizeJitter: random(0.78, 1.18),
        alphaJitter: random(0.72, 1.08),
        angleJitter: random(-0.34, 0.34)
      });
    }

    var companionCount = lowPower ? 2 : Math.floor(random(2, 4));
    for (var j = 0; j < companionCount; j += 1) {
      var companionAsset = fishAssets[(j + 1) % fishAssets.length];
      var orbitAngle = random(0, Math.PI * 2);
      var orbitRadius = random(30, 76);
      var companionNode = createTrailImage(companionAsset.src, "qiyu-companion-fish");
      fishLayer.appendChild(companionNode);
      companionFish.push({
        el: companionNode,
        baseAngle: companionAsset.baseAngle,
        x: pointer.x,
        y: pointer.y,
        angle: pointer.angle,
        delay: Math.round(random(0, Math.min(12, trailCount - 1))),
        offsetX: Math.cos(orbitAngle) * orbitRadius,
        offsetY: Math.sin(orbitAngle) * orbitRadius,
        phase: random(0, Math.PI * 2),
        speed: random(0.0012, 0.0026),
        ease: random(0.06, 0.11),
        size: random(28, 46)
      });
    }

    if (!bubbleImageSrc) return;
    var dropCount = Math.round((lowPower ? 10 : 18) * config.density);
    for (var k = 0; k < dropCount; k += 1) {
      var dropNode = createTrailImage(bubbleImageSrc, "qiyu-trail-drop");
      fishLayer.appendChild(dropNode);
      trailDrops.push({
        el: dropNode,
        slot: Math.round(random(2, trailCount - 1)),
        offsetX: random(-46, 46),
        offsetY: random(-38, 38),
        phase: random(0, Math.PI * 2),
        speed: random(0.0014, 0.0034),
        scale: random(0.66, 1.28),
        alpha: random(0.58, 1)
      });
    }
  }

  function createFallingPetals() {
    fallingPetals.length = 0;
    if (!config.sakura || !config.fallingSakura || reducedMotion) return;

    var count = Math.round((lowPower ? 16 : 34) * config.density);
    for (var i = 0; i < count; i += 1) {
      var petal = new FallingPetal();
      petal.y = random(-height * 0.2, height);
      fallingPetals.push(petal);
    }
  }

  function FallingPetal() {
    this.reset(true);
  }

  FallingPetal.prototype.reset = function (inside) {
    this.x = random(-40, width + 40);
    this.y = inside ? random(-40, height) : random(-90, -20);
    this.size = random(5, 12);
    this.vx = random(-0.22, 0.26);
    this.vy = random(0.12, 0.38);
    this.rotate = random(0, Math.PI * 2);
    this.rotateSpeed = random(-0.011, 0.014);
    this.swing = random(0.0012, 0.0032);
    this.alpha = random(0.18, 0.46);
    this.phase = random(0, Math.PI * 2);
  };

  FallingPetal.prototype.update = function (time) {
    this.x += this.vx + Math.sin(time * this.swing + this.phase) * 0.28;
    this.y += this.vy;
    this.rotate += this.rotateSpeed;
    if (this.y > height + 40 || this.x < -80 || this.x > width + 80) {
      this.reset(false);
    }
  };

  FallingPetal.prototype.draw = function () {
    drawPetal(this.x, this.y, this.size, this.rotate, this.alpha);
  };

  function burstSakura(x, y) {
    var min = Math.max(1, Number(config.sakuraClickMin) || 50);
    var max = Math.max(min, Number(config.sakuraClickMax) || 80);
    var amount = Math.round(random(min, max) * config.density * (lowPower ? 0.56 : 1));

    for (var i = 0; i < amount; i += 1) {
      var angle = random(0, Math.PI * 2);
      var speed = random(1.2, lowPower ? 4.4 : 6.8);
      burstPetals.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - random(1.2, 3.2),
        gravity: random(0.035, 0.075),
        drag: random(0.982, 0.992),
        size: random(5, 13),
        rotate: random(0, Math.PI * 2),
        rotateSpeed: random(-0.16, 0.16),
        life: 1,
        decay: random(0.008, 0.016)
      });
    }

    var cap = lowPower ? 140 : 260;
    if (burstPetals.length > cap) {
      burstPetals.splice(0, burstPetals.length - cap);
    }
  }

  function updateBurstPetals() {
    for (var i = burstPetals.length - 1; i >= 0; i -= 1) {
      var petal = burstPetals[i];
      petal.vx *= petal.drag;
      petal.vy = petal.vy * petal.drag + petal.gravity;
      petal.x += petal.vx;
      petal.y += petal.vy;
      petal.rotate += petal.rotateSpeed;
      petal.life -= petal.decay;

      if (petal.life <= 0 || petal.y > height + 80) {
        burstPetals.splice(i, 1);
      }
    }
  }

  function drawBurstPetals() {
    for (var i = 0; i < burstPetals.length; i += 1) {
      var petal = burstPetals[i];
      drawPetal(petal.x, petal.y, petal.size, petal.rotate, Math.max(0, petal.life));
    }
  }

  function drawPetal(x, y, size, rotate, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotate);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffb7c5";
    ctx.strokeStyle = "rgba(255, 247, 251, 0.56)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.95, -size * 0.78, size * 0.92, size * 0.48, 0, size);
    ctx.bezierCurveTo(-size * 0.92, size * 0.48, -size * 0.95, -size * 0.78, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawCursor() {
    if (!finePointer || (!pointer.active && !pointer.moved)) return;

    ctx.save();
    var glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 28);
    glow.addColorStop(0, "hsla(330, 39%, 93%, 0.95)");
    glow.addColorStop(0.34, "rgba(255, 183, 197, 0.42)");
    glow.addColorStop(1, "rgba(255, 183, 197, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 28, 0, Math.PI * 2);
    ctx.fill();

    var image = pointer.mode === "text" ? cursorImages.text : cursorImages.normal;
    if (image && image.complete && image.naturalWidth) {
      var size = pointer.mode === "text" ? 28 : 34;
      var offset = pointer.mode === "text" ? size / 2 : 4;
      ctx.globalAlpha = 0.96;
      ctx.drawImage(image, pointer.x - offset, pointer.y - offset, size, size);
    } else {
      ctx.fillStyle = "#fff7fb";
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function detectCursorMode(x, y) {
    var element = document.elementFromPoint(x, y);
    if (!element) return "normal";
    return element.closest("input, textarea, select, [contenteditable='true'], .article-content p, .article-content li, .article-content blockquote, .article-content code, .article-content pre, .article-content h1, .article-content h2, .article-content h3") ? "text" : "normal";
  }

  function createRipple(x, y) {
    var ripple = document.createElement("span");
    ripple.className = "qiyu-ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    shell.appendChild(ripple);
    window.setTimeout(function () {
      ripple.remove();
    }, 820);
  }

  function frame(time) {
    if (!lastFrame) lastFrame = time;
    var delta = Math.min(48, Math.max(0, time - lastFrame));
    lastFrame = time;

    if (!pointer.moved) {
      var idleX = width * (0.5 + Math.sin(time * 0.00028) * 0.18);
      var idleY = height * (0.5 + Math.cos(time * 0.00022) * 0.12);
      var idleDx = idleX - pointer.x;
      var idleDy = idleY - pointer.y;
      if (Math.abs(idleDx) + Math.abs(idleDy) > 0.4) {
        pointer.angle = Math.atan2(idleDy, idleDx);
      }
      pointer.x = idleX;
      pointer.y = idleY;
      if (time - idleTrailLastPush > 42) {
        pushHistory(idleX, idleY);
        idleTrailLastPush = time;
      }
    }

    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < fallingPetals.length; i += 1) {
      fallingPetals[i].update(time);
      fallingPetals[i].draw();
    }

    updateBurstPetals();
    drawBurstPetals();

    updateFishEffects(time, delta);

    drawCursor();
    requestAnimationFrame(frame);
  }

  function loadImage(src) {
    if (!src) return null;
    var image = new Image();
    image.decoding = "async";
    image.src = src;
    return image;
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(min, max, amount) {
    return min + (max - min) * amount;
  }

  function resolveLowPower(mode, prefersReduced) {
    if (mode === true || mode === "true" || mode === "on") return true;
    if (mode === false || mode === "false" || mode === "off") return false;
    var hardwareWeak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || window.innerWidth < 768;
    return prefersReduced || hardwareWeak;
  }

  resize();
  seedHistory();
  createFish();
  createFallingPetals();
  bindEvents();
  requestAnimationFrame(frame);
})();
