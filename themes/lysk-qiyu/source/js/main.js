(function () {
  "use strict";

  var shell = document.querySelector(".theme-shell");
  var canvas = document.getElementById("qiyu-ocean-canvas");
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
    mode: "normal"
  };

  var history = [];
  var fish = [];
  var burstPetals = [];
  var fallingPetals = [];
  var cursorImages = {
    normal: loadImage(config.cursors.normal),
    text: loadImage(config.cursors.text)
  };

  if (finePointer) {
    document.body.classList.add("has-qiyu-cursor");
  }

  resize();
  seedHistory();
  createFish();
  createFallingPetals();
  bindEvents();
  requestAnimationFrame(frame);

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
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
    pointer.moved = pointer.moved || moved;
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
    for (var i = 0; i < 90; i += 1) {
      var ratio = i / 89;
      history.push({
        x: width * (0.5 + Math.sin(ratio * Math.PI * 2) * 0.12),
        y: height * (0.5 + Math.cos(ratio * Math.PI * 2) * 0.08)
      });
    }
  }

  function pushHistory(x, y) {
    history.unshift({ x: x, y: y });
    if (history.length > 110) {
      history.length = 110;
    }
  }

  function createFish() {
    fish.length = 0;
    if (!config.fish || reducedMotion) return;

    var min = Math.max(1, Math.round(Number(config.fishMin) || 18));
    var max = Math.max(min, Math.round(Number(config.fishMax) || 22));
    var count = clamp(Math.round(Number(config.fishCount) || random(min, max)), min, max);
    count = Math.max(4, Math.round(count * config.density * (lowPower ? 0.58 : 1)));

    for (var i = 0; i < count; i += 1) {
      fish.push(new Fish(i));
    }
  }

  function Fish(index) {
    var palette = ["#fff7fb", "#ffb7c5", "#ffd5df", "#78d6d0", "#d4a574"];
    this.index = index;
    this.x = random(0, width);
    this.y = random(0, height);
    this.size = random(7, 14) * (index % 3 === 0 ? 1.18 : 1);
    this.color = palette[index % palette.length];
    this.speed = random(0.0016, 0.0038);
    this.ease = random(0.018, 0.05);
    this.delay = index * random(3.4, 5.8) + random(0, 12);
    this.orbit = random(12, 52);
    this.phase = random(0, Math.PI * 2);
    this.angle = 0;
    this.trail = [];
  }

  Fish.prototype.update = function (time) {
    var target = history[Math.min(history.length - 1, Math.floor(this.delay))] || pointer;
    var wave = Math.sin(time * this.speed + this.phase);
    var swirl = Math.cos(time * this.speed * 0.76 + this.phase);
    var targetX = target.x + wave * this.orbit + swirl * this.orbit * 0.36;
    var targetY = target.y + swirl * this.orbit * 0.52 + Math.sin(time * 0.001 + this.index) * 8;
    var oldX = this.x;
    var oldY = this.y;

    this.x += (targetX - this.x) * this.ease;
    this.y += (targetY - this.y) * this.ease;
    this.angle = Math.atan2(this.y - oldY, this.x - oldX);
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 16) {
      this.trail.length = 16;
    }
  };

  Fish.prototype.draw = function () {
    drawTrail(this.trail, this.color, this.size);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    var bodyLength = this.size * 2.45;
    var bodyHeight = this.size * 1.02;

    ctx.globalAlpha = 0.88;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLength, bodyHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.86, 0);
    ctx.lineTo(-bodyLength * 1.45, -bodyHeight * 0.82);
    ctx.lineTo(-bodyLength * 1.24, 0);
    ctx.lineTo(-bodyLength * 1.45, bodyHeight * 0.82);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#fff7fb";
    ctx.beginPath();
    ctx.ellipse(bodyLength * 0.12, -bodyHeight * 0.74, this.size * 0.7, this.size * 0.24, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.84;
    ctx.fillStyle = "rgba(8, 16, 31, 0.84)";
    ctx.beginPath();
    ctx.arc(bodyLength * 0.68, -bodyHeight * 0.22, Math.max(1.2, this.size * 0.14), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  };

  function drawTrail(points, color, size) {
    if (points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var i = points.length - 1; i > 0; i -= 1) {
      var alpha = (1 - i / points.length) * 0.18;
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = Math.max(0.8, size * (1 - i / points.length) * 0.55);
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[i - 1].x, points[i - 1].y);
      ctx.stroke();
    }
    ctx.restore();
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
    glow.addColorStop(0, "rgba(255, 247, 251, 0.95)");
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
    lastFrame = time;

    if (!pointer.moved) {
      var idleX = width * (0.5 + Math.sin(time * 0.00028) * 0.18);
      var idleY = height * (0.5 + Math.cos(time * 0.00022) * 0.12);
      pointer.x = idleX;
      pointer.y = idleY;
      pushHistory(idleX, idleY);
    }

    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < fallingPetals.length; i += 1) {
      fallingPetals[i].update(time);
      fallingPetals[i].draw();
    }

    updateBurstPetals();
    drawBurstPetals();

    for (var j = 0; j < fish.length; j += 1) {
      fish[j].update(time);
      fish[j].draw();
    }

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

  function rgba(hex, alpha) {
    var value = hex.replace("#", "");
    if (value.length === 3) {
      value = value.split("").map(function (char) {
        return char + char;
      }).join("");
    }
    var red = parseInt(value.slice(0, 2), 16);
    var green = parseInt(value.slice(2, 4), 16);
    var blue = parseInt(value.slice(4, 6), 16);
    return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
  }

  function resolveLowPower(mode, prefersReduced) {
    if (mode === true || mode === "true" || mode === "on") return true;
    if (mode === false || mode === "false" || mode === "off") return false;
    var hardwareWeak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || window.innerWidth < 768;
    return prefersReduced || hardwareWeak;
  }
})();
