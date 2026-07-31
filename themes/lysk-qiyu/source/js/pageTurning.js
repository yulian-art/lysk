(function () {
  'use strict';

  var config = {
    targetUrl: '/artical/',
    scrollerSelector: '.page-kind-home .site-main',
    contentSelector: 'main#content',
    triggerSelector: '#scroll-trigger',
    transitionDuration: 520
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
    overlay.className = 'spa-transition-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<span class="spa-transition-spinner"></span><span class="spa-transition-label">正在驶入深海…</span>';
    document.querySelector('.theme-shell').appendChild(overlay);
    return overlay;
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
    var overlay = createOverlay();
    overlay.classList.add('is-visible');
    document.documentElement.classList.add('is-spa-transitioning');
    Promise.all([transitionOut(), fetchContent()]).then(function (result) {
      var next = result[1];
      content.innerHTML = next.markup;
      if (next.title) document.title = next.title;
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
