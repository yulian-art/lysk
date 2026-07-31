(function () {
  'use strict';

  var players = [];

  function initAPlayers() {
    if (typeof window.APlayer !== 'function') return;
    var nodes = document.querySelectorAll('[data-qiyu-aplayer]');

    Array.prototype.forEach.call(nodes, function (node) {
      if (node.__qiyuAPlayer) return;
      var raw = node.getAttribute('data-aplayer-config');
      if (!raw) return;

      var config;
      try {
        config = JSON.parse(raw);
      } catch (error) {
        console.error('APlayer 配置解析失败:', error);
        return;
      }
      if (!config.audio || !config.audio.length) return;

      var player = new window.APlayer({
        container: node,
        audio: config.audio,
        autoplay: Boolean(config.autoplay),
        loop: config.loop || 'all',
        order: config.order || 'list',
        volume: typeof config.volume === 'number' ? config.volume : 0.7,
        mutex: true,
        preload: 'metadata'
      });
      node.__qiyuAPlayer = player;
      players.push(player);
    });
  }

  window.initQiyuAPlayers = initAPlayers;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAPlayers, { once: true });
  } else {
    initAPlayers();
  }
}());
