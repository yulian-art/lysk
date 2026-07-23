(function () {
  'use strict';

  var QiyuTheme = window.QiyuTheme || {};
  var shell = document.querySelector('.theme-shell');
  var canvas = document.getElementById('qiyu-ocean-canvas');
  var fishLayer = document.getElementById('qiyu-fish-layer');

  if (!shell || !canvas || !QiyuTheme.createConfig || !QiyuTheme.createTrailEffects || !QiyuTheme.createSakuraEffects || !QiyuTheme.createCursorEffects) {
    return;
  }

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var config = QiyuTheme.createConfig(shell);
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lowPower = QiyuTheme.utils.resolveLowPower(config.lowPowerMode, reducedMotion);
  var viewport = {
    width: 0,
    height: 0,
    dpr: 1
  };
  var lastFrame = 0;
  var lastTouchAt = 0;
  var idleTrailLastPush = 0;
  var pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: finePointer,
    moved: false,
    mode: 'normal',
    angle: -Math.PI * 0.75,
    lastMoveAt: 0
  };

  var cursorEffects = QiyuTheme.createCursorEffects({
    ctx: ctx,
    pointer: pointer,
    finePointer: finePointer,
    config: config
  });
  var trailEffects = QiyuTheme.createTrailEffects({
    config: config,
    fishLayer: fishLayer,
    pointer: pointer,
    lowPower: lowPower,
    reducedMotion: reducedMotion
  });
  var sakuraEffects = QiyuTheme.createSakuraEffects({
    ctx: ctx,
    config: config,
    viewport: viewport,
    lowPower: lowPower,
    reducedMotion: reducedMotion
  });

  function bindEvents() {
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerenter', function () {
      pointer.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', function () {
      pointer.active = false;
    }, { passive: true });

    window.addEventListener('click', function (event) {
      if (Date.now() - lastTouchAt < 520) return;
      triggerClickEffects(event.clientX, event.clientY);
    }, { passive: true });

    window.addEventListener('touchstart', function (event) {
      if (!event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      lastTouchAt = Date.now();
      updatePointer(touch.clientX, touch.clientY, true);
      triggerClickEffects(touch.clientX, touch.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      if (!event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      updatePointer(touch.clientX, touch.clientY, true);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
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

    cursorEffects.syncMode(x, y);
    trailEffects.push(x, y);
  }

  function triggerClickEffects(x, y) {
    createRipple(x, y);
    if (config.sakura && !reducedMotion) {
      sakuraEffects.burst(x, y);
    }
  }

  function createRipple(x, y) {
    var ripple = document.createElement('span');
    ripple.className = 'qiyu-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    shell.appendChild(ripple);
    window.setTimeout(function () {
      ripple.remove();
    }, 820);
  }

  function resize() {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    viewport.dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.35 : 2);
    canvas.width = Math.floor(viewport.width * viewport.dpr);
    canvas.height = Math.floor(viewport.height * viewport.dpr);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  }

  function frame(time) {
    if (!lastFrame) lastFrame = time;
    var delta = Math.min(48, Math.max(0, time - lastFrame));
    lastFrame = time;

    if (!pointer.moved) {
      var idleX = viewport.width * (0.5 + Math.sin(time * 0.00028) * 0.18);
      var idleY = viewport.height * (0.5 + Math.cos(time * 0.00022) * 0.12);
      var idleDx = idleX - pointer.x;
      var idleDy = idleY - pointer.y;

      if (Math.abs(idleDx) + Math.abs(idleDy) > 0.4) {
        pointer.angle = Math.atan2(idleDy, idleDx);
      }

      pointer.x = idleX;
      pointer.y = idleY;
      if (time - idleTrailLastPush > 42) {
        trailEffects.push(idleX, idleY);
        idleTrailLastPush = time;
      }
    }

    ctx.clearRect(0, 0, viewport.width, viewport.height);
    sakuraEffects.update(time);
    trailEffects.update(time, delta);
    cursorEffects.draw();
    requestAnimationFrame(frame);
  }

  resize();
  trailEffects.seed(viewport.width, viewport.height);
  trailEffects.create();
  sakuraEffects.createFallingPetals();
  bindEvents();
  requestAnimationFrame(frame);
})();
