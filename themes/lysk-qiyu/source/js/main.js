(function () {
  'use strict';

  var QiyuTheme = window.QiyuTheme || {}; // 获取全局变量，不存在则创建一个空对象
  var shell = document.querySelector('.theme-shell'); //通过类选择器获取第一个.theme-shell元素
  var canvas = document.getElementById('qiyu-ocean-canvas'); //通过ID获取画布元素
  var fishLayer = document.getElementById('qiyu-fish-layer'); //通过ID获取用于鱼群动画的图层元素
  // 校验是否存在，后续调用
  if (!shell || !canvas || !QiyuTheme.createConfig || !QiyuTheme.createTrailEffects || !QiyuTheme.createSakuraEffects || !QiyuTheme.createCursorEffects) {
    return;
  } // 三个dom元素和四个方法，拖尾特效，樱花特效，光标特效

  var ctx = canvas.getContext('2d', { alpha: true }); //获取2D渲染上下文，打开透明通道，以便再背景上绘制半透明特效
  if (!ctx) return; 
  //调用createConfig方法，传入主题容器.theme-shell,里面包含颜色，速度等可调参数的配置对象
  var config = QiyuTheme.createConfig(shell); 
  // 检测当前指针设备是否为鼠标bool（比如悬停跟随）
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  // 检查用户系统是否开启了减少动画辅助功能
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  //解析低能耗
  var lowPower = QiyuTheme.utils.resolveLowPower(config.lowPowerMode, reducedMotion);
  // 用于缓存当前画布的逻辑宽度和像素比dpr，后续将再帧循环中动态更新
  var viewport = {
    width: 0,
    height: 0,
    dpr: 1
  };
  // 上一帧时间戳performance.now()，用于计算帧间隔
  var lastFrame = 0;
  // 最后一次触摸交互时间，用于判断空闲状态
  var lastTouchAt = 0;
  // 空闲状态下拖尾效应的最后一次推送时间
  var idleTrailLastPush = 0;
  // 指针状态对象
  var pointer = {
    // 指针当前的坐标，初始设为屏幕中心
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    // 当前是否应该跟踪指针位置，鼠标就true
    active: finePointer,
    // 是否发生过移动，初始化为false
    moved: false,
    // 指针交互模式
    mode: 'normal',
    // 指针运动的方向角，初始设为-135°
    angle: -Math.PI * 0.75,
    // 最后一次移动的时间戳
    lastMoveAt: 0
  };
  // 创建光标特效
  var cursorEffects = QiyuTheme.createCursorEffects({
    ctx: ctx,
    pointer: pointer,
    finePointer: finePointer,
    config: config
  });
  // 创建拖尾特效
  var trailEffects = QiyuTheme.createTrailEffects({
    config: config,
    fishLayer: fishLayer, // 一个dom元素，用于承载鱼群拖尾粒子
    pointer: pointer, 
    lowPower: lowPower, // 低功耗标记
    reducedMotion: reducedMotion // 减少动画标记
  });
  // 创建樱花特效
  var sakuraEffects = QiyuTheme.createSakuraEffects({
    ctx: ctx,
    config: config,
    viewport: viewport,
    lowPower: lowPower,
    reducedMotion: reducedMotion
  });

  initDetailCarousels(reducedMotion);
  initOpeningTransition(reducedMotion);
  initWallpaperCarousels(reducedMotion);
  initMusicBubbles();
  initScrollTopButtons();
  initSakuraLoading(reducedMotion);
  initPaintFrames(reducedMotion);
  initGeneratedToc();
  // 初始化页面中所有带[data-detail-carousel] 属性的轮播组件
  function initDetailCarousels(disableAutoplay) {
    // 获取所有标记[data-detail-carousel] 的元素做轮播容器
    var carousels = document.querySelectorAll('[data-detail-carousel]');
    if (!carousels.length) return;
    // 遍历每个轮播容器
    Array.prototype.forEach.call(carousels, function (carousel) {
      //存放所有幻灯片的容器 通过改变其 transform: translateX 来实现滑动
      var track = carousel.querySelector('.detail-carousel-track');
      // 所有幻灯片元素，用于判断数量，超过两张才能轮播
      var slides = carousel.querySelectorAll('.detail-carousel-slide');
      // 指示器原点，用于显示当前位置并提供跳转
      var dots = carousel.querySelectorAll('.detail-carousel-dot');
      // 起始索引
      var index = 0;
      // 自动播放定时器
      var timer = 0;
      //记录指针按下时的坐标
      var pointerStart = null;
      // 少于两张就跳过轮播
      if (!track || slides.length < 2) return;
      // 切换函数
      function show(nextIndex) {
        // 保证循环切换
        index = (nextIndex + slides.length) % slides.length;
        //移动轨道
        track.style.transform = 'translateX(-' + (index * 100) + '%)';
        // 更新所有原点，
        Array.prototype.forEach.call(dots, function (dot, dotIndex) {
          dot.classList.toggle('is-active', dotIndex === index);
        });
      }
      // 定时器控制函数

      // 清除当前定时器并重新初始换为0
      function stop() {
        if (!timer) return;
        window.clearInterval(timer);
        timer = 0;
      }
      // 如果低能耗就不自动播放直接返回
      function start() {
        if (disableAutoplay) return;
        // 否则先停止旧定时器，然后启动新定时器，2.5秒切换下一张
        stop();
        timer = window.setInterval(function () {
          show(index + 1);
        }, 2500);
      }
      // 重置定时器，常用于交互后重新自动播放
      function restart() {
        stop();
        start();
      }
      //为每个点绑定点击事件，读取data-slide-index属性
      Array.prototype.forEach.call(dots, function (dot) {
        dot.addEventListener('click', function () {
          // 切换到该索引，重启定时器
          show(Number(dot.getAttribute('data-slide-index')) || 0);
          restart();
        });
      });
      // 鼠标悬停与焦点控制
      // 鼠标进入轮播区时自动暂停播放，离开时恢复
      carousel.addEventListener('mouseenter', stop, { passive: true });
      carousel.addEventListener('mouseleave', start, { passive: true });
      // 鼠标换成键盘了
      carousel.addEventListener('focusin', stop);
      carousel.addEventListener('focusout', start);
      // 指针或触摸拖拽滑动
      carousel.addEventListener('pointerdown', function (event) {
        //button !== 0对于鼠标只响应左键
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        //记录按下位置
        pointerStart = { x: event.clientX, y: event.clientY };
      }, { passive: true });
      carousel.addEventListener('pointerup', function (event) {
        if (!pointerStart) return;
        var dx = event.clientX - pointerStart.x;
        var dy = event.clientY - pointerStart.y;
        pointerStart = null;
        // 水平移动必须大于42px
        if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        show(index + (dx < 0 ? 1 : -1));
        restart();
      }, { passive: true });
      carousel.addEventListener('pointercancel', function () {
        pointerStart = null;
      }, { passive: true });

      show(0);
      start();
    });
  }

  function initOpeningTransition(disableMotion) {
    var home = document.querySelector('.qiyu-home');
    var opening = document.querySelector('[data-opening-screen]');
    var scroller = document.querySelector('.page-kind-home .site-main');
    if (!home || !opening || !scroller) return;

    var running = false;
    var completed = false;

    function syncStateFromScroll() {
      if (scroller.scrollTop > opening.offsetHeight * 0.35) {
        completed = true;
        home.classList.add('is-opening-complete');
        return;
      }
      if (scroller.scrollTop > 24) return;
      completed = false;
      running = false;
      home.classList.remove('is-opening-transition');
      home.classList.remove('is-opening-complete');
    }

    function runTransition() {
      if (running) return;
      running = true;
      completed = true;
      home.classList.add('is-opening-transition');

      if (disableMotion) {
        scroller.scrollTop = opening.offsetHeight;
        home.classList.add('is-opening-complete');
        running = false;
        return;
      }

      window.setTimeout(function () {
        scroller.scrollTo({ top: opening.offsetHeight, behavior: 'smooth' });
        home.classList.add('is-opening-complete');
        running = false;
      }, 1280);
    }

    opening.addEventListener('wheel', function (event) {
      if (event.deltaY <= 0 || scroller.scrollTop > 8 || completed) return;
      event.preventDefault();
      runTransition();
    }, { passive: false });

    opening.addEventListener('touchmove', function () {
      if (scroller.scrollTop > 8 || completed) return;
      runTransition();
    }, { passive: true });

    scroller.addEventListener('scroll', syncStateFromScroll, { passive: true });
  }

  function initWallpaperCarousels(disableAutoplay) {
    var carousels = document.querySelectorAll('[data-wallpaper-carousel]');
    if (!carousels.length) return;

    Array.prototype.forEach.call(carousels, function (carousel) {
      var track = carousel.querySelector('[data-carousel-track]');
      var slides = carousel.querySelectorAll('.wallpaper-slide');
      var dots = carousel.querySelectorAll('.wallpaper-dot');
      var index = 0;
      var timer = 0;
      if (!track || slides.length < 2) return;

      function show(nextIndex) {
        index = (nextIndex + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (index * 100) + '%)';
        carousel.classList.remove('is-sliding');
        void carousel.offsetWidth;
        carousel.classList.add('is-sliding');
        Array.prototype.forEach.call(dots, function (dot, dotIndex) {
          dot.classList.toggle('is-active', dotIndex === index);
        });
      }

      function start() {
        if (disableAutoplay) return;
        stop();
        timer = window.setInterval(function () {
          show(index + 1);
        }, 3200);
      }

      function stop() {
        if (!timer) return;
        window.clearInterval(timer);
        timer = 0;
      }

      Array.prototype.forEach.call(dots, function (dot) {
        dot.addEventListener('click', function () {
          show(Number(dot.getAttribute('data-slide-index')) || 0);
          start();
        });
      });

      carousel.addEventListener('mouseenter', stop, { passive: true });
      carousel.addEventListener('mouseleave', start, { passive: true });
      show(0);
      start();
    });
  }

  function initMusicBubbles() {
    var players = document.querySelectorAll('[data-music-player]');
    if (!players.length) return;

    Array.prototype.forEach.call(players, function (player) {
      var tracks = player.querySelectorAll('.music-track');
      var prev = player.querySelector('[data-music-prev]');
      var next = player.querySelector('[data-music-next]');
      var index = 0;
      if (!tracks.length) return;

      function show(nextIndex) {
        index = (nextIndex + tracks.length) % tracks.length;
        Array.prototype.forEach.call(tracks, function (track, trackIndex) {
          track.classList.toggle('is-current', trackIndex === index);
        });
        player.classList.remove('is-popping');
        void player.offsetWidth;
        player.classList.add('is-popping');
      }

      if (prev) {
        prev.addEventListener('click', function () {
          show(index - 1);
        });
      }

      if (next) {
        next.addEventListener('click', function () {
          show(index + 1);
        });
      }
    });
  }

  function initScrollTopButtons() {
    var buttons = document.querySelectorAll('[data-scroll-top]');
    if (!buttons.length) return;

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var homeScroller = document.querySelector('.page-kind-home .site-main');
        if (homeScroller && homeScroller.contains(button)) {
          homeScroller.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function initSakuraLoading(disableMotion) {
    var loaders = document.querySelectorAll('[data-sakura-loading]');
    if (!loaders.length) return;
    Array.prototype.forEach.call(loaders, function (loader) {
      window.setTimeout(function () {
        loader.classList.add('is-hidden');
      }, disableMotion ? 60 : 860);
    });
  }

  function initPaintFrames(disableMotion) {
    var frames = document.querySelectorAll('[data-paint-frame]');
    if (!frames.length) return;

    function reveal(frame) {
      frame.classList.add('is-visible');
      if (disableMotion) return;
      frame.classList.add('is-shaking');
      window.setTimeout(function () {
        frame.classList.remove('is-shaking');
      }, 320);
    }

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(frames, reveal);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      Array.prototype.forEach.call(entries, function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.28, rootMargin: '0px 0px -10% 0px' });

    Array.prototype.forEach.call(frames, function (frame) {
      observer.observe(frame);
    });
  }

  function initGeneratedToc() {
    var toc = document.querySelector('.sakura-toc');
    if (!toc) return;
    var selector = toc.getAttribute('data-toc-target') || '.article-content';
    var target = document.querySelector(selector);
    if (!target) return;
    var headings = target.querySelectorAll('h2, h3');
    if (!headings.length) return;

    toc.textContent = '';
    Array.prototype.forEach.call(headings, function (heading, index) {
      if (!heading.id) {
        heading.id = 'section-' + index;
      }
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent || ('章节 ' + (index + 1));
      link.setAttribute('data-level', heading.tagName.slice(1));
      link.className = heading.tagName === 'H3'
        ? 'pl-[14px] text-[0.92rem] text-[rgba(61,44,40,0.68)]'
        : 'text-[0.92rem] text-[#3D2C28]';
      toc.appendChild(link);
    });
  }

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
    ripple.className = 'qiyu-ripple pointer-events-none fixed z-[3] size-[14px] -translate-x-1/2 -translate-y-1/2 animate-ripple rounded-full border border-pearl/80 shadow-[0_0_18px_rgba(255,183,197,0.66)] motion-reduce:animate-none';
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
