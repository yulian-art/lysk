(function () {
  'use strict';

  var config = {
    targetUrl: '/artical/',
    scrollerSelector: '.page-kind-home .site-main',
    contentSelector: 'main#content',
    triggerSelector: '#scroll-trigger',
    transitionDuration: 520,
    videoStartTime: 1.65
  };

  var scroller = document.querySelector(config.scrollerSelector);
  var content = document.querySelector(config.contentSelector);
  var trigger = document.querySelector(config.triggerSelector);
  if (!scroller || !content || !trigger || window.location.pathname.replace(/\/$/, '') === '/artical') return;

  var homeMarkup = content.innerHTML;
  var homeTitle = document.title;
  var busy = false;
  var loaded = false;
  var observer;

  function createOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'spa-transition-overlay pointer-events-none fixed inset-0 z-[80] block overflow-hidden bg-[#061A2E] opacity-0 transition-opacity duration-[320ms] ease-[ease] [&.is-visible]:opacity-100';
    overlay.setAttribute('aria-hidden', 'true');
    var preload = document.querySelector('link[rel="preload"][as="video"]');
    var video = document.createElement('video');
    video.className = 'spa-transition-video block size-full bg-[#061A2E] object-cover';
    video.muted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.preload = 'auto';
    if (preload) video.src = preload.href;
    overlay.appendChild(video);
    document.querySelector('.theme-shell').appendChild(overlay);
    return { overlay: overlay, video: video };
  }

  function wait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function transitionOut() {
    content.classList.add('spa-content-leaving');
    return wait(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : config.transitionDuration);
  }

  function transitionIn() {
    content.classList.remove('spa-content-leaving');
    content.classList.add('spa-content-entering');
    window.setTimeout(function () { content.classList.remove('spa-content-entering'); }, config.transitionDuration);
  }

  function playTransitionVideo(video) {
    return new Promise(function (resolve) {
      var started = false;
      function start() {
        if (started) return;
        started = true;
        try { video.currentTime = config.videoStartTime; } catch (error) { /* metadata pending */ }
        var playback = video.play();
        if (playback && typeof playback.catch === 'function') playback.catch(resolve);
      }
      video.addEventListener('ended', resolve, { once: true });
      video.addEventListener('loadedmetadata', start, { once: true });
      if (video.readyState >= 1) start();
    });
  }

  function fetchContent() {
    return fetch(config.targetUrl, { headers: { Accept: 'text/html' } }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var nextContent = doc.querySelector(config.contentSelector);
      if (!nextContent) throw new Error('目标页面未找到 #content');
      return { markup: nextContent.innerHTML, title: doc.title };
    });
  }

  function loadArtical() {
    if (busy || loaded) return;
    busy = true;
    var transition = createOverlay();
    var overlay = transition.overlay;
    overlay.classList.add('is-visible');
    document.documentElement.classList.add('is-spa-transitioning');
    Promise.all([fetchContent(), playTransitionVideo(transition.video)]).then(function (result) {
      var next = result[0];
      content.innerHTML = next.markup;
      if (next.title) document.title = next.title;
      if (typeof window.initQiyuAPlayers === 'function') window.initQiyuAPlayers();
      window.history.pushState({ spaPage: 'artical' }, '', config.targetUrl);
      scroller.scrollTop = 0;
      loaded = true;
      transitionIn();
      window.setTimeout(function () {
        overlay.classList.remove('is-visible');
        document.documentElement.classList.remove('is-spa-transitioning');
        overlay.remove();
        busy = false;
      }, config.transitionDuration);
    }).catch(function (error) {
      console.error('加载 /artical 失败:', error);
      overlay.remove();
      document.documentElement.classList.remove('is-spa-transitioning');
      content.classList.remove('spa-content-leaving');
      busy = false;
      window.location.assign(config.targetUrl);
    });
  }

  function restoreHome() {
    if (busy || !loaded) return;
    busy = true;
    content.classList.add('spa-content-leaving');
    wait(config.transitionDuration).then(function () {
      content.innerHTML = homeMarkup;
      document.title = homeTitle;
      scroller.scrollTop = 0;
      loaded = false;
      var restoredTrigger = document.querySelector(config.triggerSelector);
      if (restoredTrigger) observer.observe(restoredTrigger);
      transitionIn();
      busy = false;
    });
  }

  observer = new IntersectionObserver(function (entries) {
    if (entries.some(function (entry) { return entry.isIntersecting; })) loadArtical();
  }, { root: scroller, threshold: 0.1 });
  observer.observe(trigger);

  window.addEventListener('popstate', function (event) {
    if (event.state && event.state.spaPage === 'artical') return;
    restoreHome();
  });
}());
