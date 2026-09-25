/* ============================================================
   home-scene.js —— 首页滚动叙事引擎（纯原生，无依赖）
   幕布开场 → Scene 1 → 穿越门放大 → Scene 2 弧形卡 → 详情弹出层
   ============================================================ */
(function () {
  'use strict';

  var scrollEl = document.getElementById('baScroll');
  var stageEl = document.getElementById('baStage');
  var scene1El = document.getElementById('scene1');
  var scene2El = document.getElementById('scene2');
  var heroEl = document.getElementById('baHeroWallpaper');
  var portalEl = document.getElementById('lyPortal');
  var worldEl = document.getElementById('lyWorld');
  var cloudsEl = document.getElementById('lyClouds');
  var curtainL = document.getElementById('lyCurtainL');
  var curtainR = document.getElementById('lyCurtainR');
  var arcWrap = document.getElementById('arcWrap');
  var panel = document.getElementById('baPanel');
  var panelTitle = document.getElementById('baPanelTitle');
  var panelSub = document.getElementById('baPanelSub');
  var panelBody = document.getElementById('baPanelBody');
  var panelClose = document.getElementById('baPanelClose');
  var contactHost = document.getElementById('contactHost');
  var contactForm = document.getElementById('contactForm');

  var MODULES = window.BA_MODULES || [];
  if (!scrollEl || !stageEl) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 767px)').matches;

  /* ---------- 数学工具 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  /* ---------- 弧形卡构建 ---------- */
  var cards = [];
  function buildArc() {
    if (!arcWrap || !MODULES.length) return;
    arcWrap.innerHTML = '';
    cards = MODULES.map(function (m, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'arc-card';
      el.style.setProperty('--tint', m.color); /* 液态玻璃：色调交给 CSS 做半透明磨砂 */
      el.innerHTML =
        '<span class="arc-num">' + m.num + '</span>' +
        '<span class="arc-title">' + m.title + '</span>' +
        '<span class="arc-desc">' + m.desc + '</span>' +
        '<span class="arc-cta">点击展开 ›</span>';
      el.addEventListener('click', function () { openPanel(i); });
      arcWrap.appendChild(el);
      return el;
    });
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = clamp((n >> 16) + amt, 0, 255);
    var g = clamp(((n >> 8) & 255) + amt, 0, 255);
    var b = clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function layoutArc(rotOffset) {
    var n = cards.length;
    if (!n) return;
    var spacing = isMobile ? 12 : 9;
    var radius = isMobile ? 700 : 1100;
    var w = isMobile ? 160 : 220;
    var h = isMobile ? 175 : 230;
    var base = isMobile ? 140 : 200;
    var center = Math.floor(n / 2);

    for (var i = 0; i < n; i++) {
      var deg = (i - center) * spacing - rotOffset + center * spacing;
      var rad = deg * Math.PI / 180;
      var x = Math.sin(rad) * radius;
      var y = radius - Math.cos(rad) * radius;
      var el = cards[i];
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.left = 'calc(50% + ' + x.toFixed(1) + 'px - ' + (w / 2) + 'px)';
      el.style.bottom = (-y + base) + 'px';
      el.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';
      el.style.transformOrigin = (w / 2) + 'px ' + radius + 'px';
    }
    var active = clamp(Math.round(rotOffset / spacing), 0, n - 1);
    for (var j = 0; j < n; j++) {
      cards[j].classList.toggle('is-active', j === active);
    }
  }

  /* ---------- 详情弹出层 ---------- */
  var lastOpened = -1;
  function openPanel(i) {
    var m = MODULES[i];
    if (!m) return;
    lastOpened = i;
    panelTitle.textContent = m.title;
    panelSub.textContent = m.desc;
    panelBody.innerHTML = '';

    if (m.form && contactForm) {
      // 把常驻 DOM 的表单搬进弹出层（保留 script.js 已绑定的提交逻辑）
      panelBody.appendChild(contactForm);
    } else if (m.placeholder) {
      var ph = document.createElement('div');
      ph.className = 'ba-placeholder';
      ph.innerHTML = '<strong>内容整理中 · 敬请期待</strong>' +
        '交互模型的完整设定正在编排，开放后会第一时间放进来。';
      panelBody.appendChild(ph);
    } else {
      var chips = document.createElement('div');
      chips.className = 'ba-chips';
      (m.entries || []).forEach(function (e, k) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'ba-chip' + (k === 0 ? ' is-on' : '');
        c.textContent = e.name;
        c.addEventListener('click', function () {
          Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove('is-on'); });
          c.classList.add('is-on');
          var target = panelBody.querySelector('#be-' + m.id + '-' + k);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        chips.appendChild(c);
      });
      panelBody.appendChild(chips);

      (m.entries || []).forEach(function (e, k) {
        var sec = document.createElement('section');
        sec.className = 'ba-entry';
        sec.id = 'be-' + m.id + '-' + k;
        var h = document.createElement('h4');
        h.textContent = '◆ ' + e.name;
        var pre = document.createElement('pre');
        pre.textContent = e.body;
        sec.appendChild(h);
        sec.appendChild(pre);
        panelBody.appendChild(sec);
      });
    }
    panel.classList.add('is-open');
    panelBody.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function closePanel() {
    panel.classList.remove('is-open');
    document.body.style.overflow = '';
    // 表单搬回隐藏容器，下次打开还是同一个实例
    if (contactForm && contactHost && contactForm.parentNode === panelBody) {
      contactHost.appendChild(contactForm);
    }
    lastOpened = -1;
  }
  if (panelClose) panelClose.addEventListener('click', closePanel);
  if (panel) panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lastOpened >= 0) closePanel(); });

  /* ---------- 导航：滚动到指定进度 ---------- */
  function gotoProgress(p, behavior) {
    var total = scrollEl.offsetHeight - window.innerHeight;
    window.scrollTo({ top: total * p, behavior: behavior || 'smooth' });
  }
  // 全局生效：导航栏与页脚的 data-goto 链接都能滚动到对应模块
  document.querySelectorAll('a[data-goto]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      gotoProgress(parseFloat(a.getAttribute('data-goto')) || 0);
      var links = document.getElementById('navLinks');
      if (links) links.classList.remove('open');
    });
  });

  /* ---------- URL 直达：?goto=0.70（供 404 兜底页把旧链接送到对应模块） ---------- */
  (function () {
    var m = /[?&]goto=([0-9.]+)/.exec(location.search);
    if (!m) return;
    var p = parseFloat(m[1]);
    if (isNaN(p) || p <= 0) return;
    // 密码门未解锁时 body 禁止滚动，必须等它移除后再跳
    (function waitUnlocked(waited) {
      if (!document.getElementById('lockScreen') || waited > 8000) {
        // 站外直达用 'instant' 强制瞬间定位：
        // 注意不能用 'auto' —— styles.css 里 html{scroll-behavior:smooth} 会让它退化成平滑动画
        setTimeout(function () { gotoProgress(p, 'instant'); }, 260);
        return;
      }
      setTimeout(function () { waitUnlocked(waited + 250); }, 250);
    })(0);
  })();

  /* ---------- 鼠标视差 ---------- */
  var MAG = { world: 6, clouds: 9, portal: 7, curtainL: 14, curtainR: 14 };
  var target = { x: 0, y: 0 };
  var smooth = { x: 0, y: 0 };

  window.addEventListener('mousemove', function (e) {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ---------- 滚动驱动 ---------- */
  var progress = 0;
  function readScroll() {
    var total = scrollEl.offsetHeight - window.innerHeight;
    progress = total > 0 ? clamp(window.scrollY / total, 0, 1) : 0;
  }

  function render() {
    var ep = easeInOut(progress);

    // 图层：世界背景 / 云
    if (worldEl) worldEl.style.transform = 'scale(' + lerp(1, 1.18, ep).toFixed(4) + ')';
    if (cloudsEl) {
      cloudsEl.style.transform = 'scale(' + lerp(1, 1.4, ep).toFixed(4) + ')';
      cloudsEl.style.opacity = lerp(0.7, 1, clamp(progress / 0.05, 0, 1)).toFixed(3);
    }

    // 穿越门：放大 7.5 倍 + 后段淡出
    if (portalEl) {
      portalEl.style.transform = 'scale(' + lerp(1, 7.5, ep).toFixed(4) + ')';
      portalEl.style.opacity = (1 - clamp((progress - 0.55) / 0.17, 0, 1)).toFixed(3);
    }

    // 幕布：开场后随滚动继续外移
    if (curtainL) curtainL.style.transform = 'translateX(' + (-62 - lerp(0, 150, ep)).toFixed(2) + '%) scale(' + lerp(1, 1.3, ep).toFixed(3) + ')';
    if (curtainR) curtainR.style.transform = 'translateX(' + (62 + lerp(0, 150, ep)).toFixed(2) + '%) scale(' + lerp(1, 1.3, ep).toFixed(3) + ')';

    // Spine 壁纸：Scene 1 主视觉，滚动后交棒给世界背景
    if (heroEl) {
      var hv = 1 - clamp((progress - 0.18) / 0.16, 0, 1);
      heroEl.style.opacity = hv.toFixed(3);
      heroEl.style.pointerEvents = hv > 0.05 ? 'auto' : 'none';
    }

    // Scene 1 UI
    if (scene1El) scene1El.style.opacity = clamp(1 - progress / 0.20, 0, 1).toFixed(3);

    // Scene 2 UI + 弧形卡
    var s2 = clamp((progress - 0.62) / 0.14, 0, 1);
    if (scene2El) scene2El.style.opacity = s2.toFixed(3);
    if (arcWrap) arcWrap.style.opacity = clamp((progress - 0.58) / 0.12, 0, 1).toFixed(3);
    var sweep = (MODULES.length - 1) * 10;
    var rot = lerp(0, sweep, clamp((progress - 0.66) / 0.30, 0, 1));
    layoutArc(rot);
  }

  function loop() {
    // 鼠标平滑
    if (!reduce) {
      smooth.x = lerp(smooth.x, target.x, 0.07);
      smooth.y = lerp(smooth.y, target.y, 0.07);
      var ox = (-smooth.x).toFixed(2), oy = (-smooth.y).toFixed(2);
      if (worldEl) worldEl.style.translate = ox + 'px ' + oy + 'px';
      if (cloudsEl) cloudsEl.style.translate = (ox * (MAG.clouds / MAG.world)).toString() + 'px ' + (oy * 0.4).toFixed(2) + 'px';
      if (portalEl) portalEl.style.translate = (ox * (MAG.portal / MAG.world)).toString() + 'px ' + oy + 'px';
      if (curtainL) curtainL.style.translate = (ox * 2).toFixed(2) + 'px ' + (oy * 0.3).toFixed(2) + 'px';
      if (curtainR) curtainR.style.translate = (ox * 2).toFixed(2) + 'px ' + (oy * 0.3).toFixed(2) + 'px';
    }
    readScroll();
    render();
    requestAnimationFrame(loop);
  }

  /* ---------- 开场序列 ---------- */
  function boot() {
    buildArc();
    layoutArc(0);
    setTimeout(function () {
      if (curtainL) curtainL.classList.add('is-open');
      if (curtainR) curtainR.classList.add('is-open');
      if (curtainL) curtainL.style.transform = 'translateX(-62%)';
      if (curtainR) curtainR.style.transform = 'translateX(62%)';
    }, 100);
    setTimeout(function () { document.body.classList.add('ui-visible'); }, 600);
    setTimeout(function () {
      if (curtainL) curtainL.classList.remove('is-open');
      if (curtainR) curtainR.classList.remove('is-open');
    }, 2200);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', function () {
    isMobile = window.matchMedia('(max-width: 767px)').matches;
    layoutArc(lerp(0, (MODULES.length - 1) * 10, clamp((progress - 0.66) / 0.30, 0, 1)));
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ---------- 背景音乐（BGM） ---------- */
/* 浏览器自动播放策略：页面加载后不允许直接出声，
   需要用户第一次点击/滚动/按键后才能播放。因此策略为：
   1) 首次任意交互自动开始播放并淡入；
   2) 右上角提供音乐开关，可随时暂停/恢复。 */
(function () {
  var audio = document.getElementById('baBgm');
  if (!audio) return;
  audio.volume = 0;

  var started = false;   // 是否已开始过播放
  var wantPlay = true;   // 用户意图：开

  /* 按钮状态外观 */
  function render() {
    var btn = document.getElementById('bgmToggle');
    if (!btn) return;
    btn.classList.toggle('is-playing', started && wantPlay && !audio.paused);
    btn.title = (started && wantPlay && !audio.paused) ? '暂停音乐' : '播放音乐';
  }

  function fadeIn() {
    var target = 0.55;
    var step = function () {
      if (audio.volume < target) {
        audio.volume = Math.min(target, audio.volume + 0.05);
        setTimeout(step, 100);
      }
    };
    step();
  }

  function tryPlay() {
    var p = audio.play();
    if (p && p.catch) {
      p.then(function () { fadeIn(); render(); }).catch(function () { /* 等下一次交互 */ });
    } else {
      fadeIn(); render();
    }
  }

  /* 首次交互：点击 / 滚轮 / 触摸 / 按键，任一即触发 */
  function onFirstGesture(e) {
    if (started) return;
    /* 若首次手势来自音乐开关本身，交给按钮自己的点击逻辑处理，
       否则会「先自动播放、紧接着被 toggle 判定为暂停」 */
    if (e && e.target && e.target.closest && e.target.closest('#bgmToggle')) return;
    started = true;
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      window.removeEventListener(ev, onFirstGesture);
    });
    if (wantPlay) tryPlay();
  }
  ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, onFirstGesture, { passive: true });
  });

  /* 开关按钮 */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.createElement('button');
    btn.id = 'bgmToggle';
    btn.className = 'bgm-toggle';
    btn.setAttribute('aria-label', '音乐开关');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
      '<span class="bgm-bars"><i></i><i></i><i></i></span>';
    document.body.appendChild(btn);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!started) { started = true; }
      if (audio.paused) { wantPlay = true; tryPlay(); }
      else { wantPlay = false; audio.pause(); }
      render();
    });

    audio.addEventListener('play', render);
    audio.addEventListener('pause', render);
    render();
  });
})();
