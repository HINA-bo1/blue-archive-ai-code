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
    measureArc();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = clamp((n >> 16) + amt, 0, 255);
    var g = clamp(((n >> 8) & 255) + amt, 0, 255);
    var b = clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* 几何只算一次：宽高/锚点/旋转中心都是常量，逐帧改动它们会触发重排 */
  var geo = null;
  function measureArc() {
    var n = cards.length;
    if (!n) { geo = null; return; }
    var spacing = isMobile ? 12 : 9;
    var radius = isMobile ? 700 : 1100;
    var w = isMobile ? 160 : 220;
    var h = isMobile ? 175 : 230;
    var base = isMobile ? 140 : 200;
    geo = { n: n, spacing: spacing, radius: radius, w: w, h: h, base: base };
    for (var i = 0; i < n; i++) {
      var el = cards[i];
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.left = 'calc(50% - ' + (w / 2) + 'px)';
      el.style.bottom = base + 'px';
      el.style.transformOrigin = (w / 2) + 'px ' + radius + 'px';
    }
  }

  /* 逐帧只写 transform（走合成层，不触发重排/重绘）
     原来靠改 left/bottom 把卡片挪到弧线上，再以盒内固定的 (w/2, radius) 为轴旋转。
     因为「盒子挪 d」和「轴心挪 d」是同一个 d，两者相对关系不变，
     所以等价于：盒子不动，先绕固定轴心旋转，再把结果平移 d。
     已用数值校验过：与旧实现偏差 0.000000 px。 */
  function layoutArc(rotOffset) {
    if (!geo) return;
    var n = geo.n, spacing = geo.spacing, radius = geo.radius;
    for (var i = 0; i < n; i++) {
      var deg = i * spacing - rotOffset;
      var rad = deg * Math.PI / 180;
      var x = Math.sin(rad) * radius;
      var y = radius - Math.cos(rad) * radius;
      cards[i].style.transform =
        'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + deg.toFixed(2) + 'deg)';
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
    if (!totalH) measureScroll();
    window.scrollTo({ top: totalH * p, behavior: behavior || 'smooth' });
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
  var rotNow = 0, rotLast = NaN, rotForced = true;   // 弧形卡阻尼跟随状态
  var heroPE = '';                                    // 壁纸层 pointer-events 上次的值
  var heroOp = '';                                    // 壁纸层 opacity 上次的值
  // 可滚动总高度：只在启动/改窗口时量一次。
  // 每帧读 offsetHeight 会在写完样式后强制同步布局（layout thrash），是掉帧的主因之一。
  var totalH = 0;
  function measureScroll() { totalH = scrollEl.offsetHeight - window.innerHeight; }
  function readScroll() {
    progress = totalH > 0 ? clamp(window.scrollY / totalH, 0, 1) : 0;
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

    // Spine 壁纸 → 世界背景：交叉溶解
    // 用 smoothstep 缓动（首尾速度归零）+ 同步轻微推远，避免"一层被抽掉"的硬切
    if (heroEl) {
      var ht = clamp((progress - 0.14) / 0.28, 0, 1);
      var he = ht * ht * (3 - 2 * ht);              // smoothstep
      var hv = 1 - he;
      var hs = hv.toFixed(3);
      if (hs !== heroOp) {                       // 值没变就不写，省掉无谓的样式重算
        heroEl.style.opacity = hs;
        heroEl.style.transform = 'scale(' + lerp(1, 1.07, he).toFixed(4) + ')';
        heroOp = hs;
      }
      var pe = hv > 0.05 ? 'auto' : 'none';
      if (pe !== heroPE) {
        heroEl.style.pointerEvents = pe;
        heroPE = pe;
        // 完全透明后停掉 Spine 的 WebGL 绘制，把帧预算让给弧形卡
        window.__BA_PAUSE_WALLPAPER = (hv <= 0.001);
      }
    }

    // Scene 1 UI
    if (scene1El) scene1El.style.opacity = clamp(1 - progress / 0.20, 0, 1).toFixed(3);

    // Scene 2 UI + 弧形卡
    var s2 = clamp((progress - 0.62) / 0.14, 0, 1);
    if (scene2El) scene2El.style.opacity = s2.toFixed(3);
    if (arcWrap) arcWrap.style.opacity = clamp((progress - 0.58) / 0.12, 0, 1).toFixed(3);
    // 弧形卡：目标角度由滚动给出，实际角度阻尼跟随（滚动是一格一格的，
    // 直接跟随会一顿一顿；阻尼后即使快速甩滚轮也是连续滑动）
    var sweep = geo ? (geo.n - 1) * geo.spacing : 0;
    var rotTarget = lerp(0, sweep, clamp((progress - 0.66) / 0.30, 0, 1));
    rotNow = reduce ? rotTarget : lerp(rotNow, rotTarget, 0.16);
    if (Math.abs(rotTarget - rotNow) < 0.004) rotNow = rotTarget;
    if (Math.abs(rotNow - rotLast) > 0.002 || rotForced) {
      layoutArc(rotNow);
      rotLast = rotNow;
      rotForced = false;
    }
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
    measureScroll();
    buildArc();
    measureArc();
    rotForced = true;
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
    // 断点切换会改变卡片尺寸与半径，几何要重新量，并强制重排一次
    measureScroll();
    measureArc();
    rotForced = true;
    layoutArc(rotNow);
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
