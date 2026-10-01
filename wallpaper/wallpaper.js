/* =============================================================
   Blue Archive CH0335 · Spine 壁纸 → 网页 hero 背景
   基于 Wallpaper Engine 工坊 3650880224 的 js/main.js 改造

   脱离 Wallpaper Engine 必须处理的 5 个问题（已在下方修复）：
   1. introAnimation 变量原本只有 WE 才注入，未定义时 load() 永远
      不进入分支 → 动画根本不出现。这里直接给定默认值 false。
   2. 原脚本没有 window resize 监听 → 改变窗口尺寸后画面不自适应。
   3. canvas 尺寸原本写死 window.innerWidth/Height → 改为跟随 hero 容器。
   4. 鼠标坐标用的是 clientX/Y（视口坐标）→ 改为相对 canvas，hitbox 才准。
   5. BGM 自动播放会被浏览器拦截 → 关闭；语音为点击触发，予以保留。

   已移除：fireworks 烟花（绑定 window 全局点击，会干扰整站）、
           NotoSansJP 字体（5.2MB，改用系统字体）。
   ============================================================= */

(function () {
  'use strict';

  /* ---------- 配置 ---------- */
  var WP = 'wallpaper/';                 // 壁纸资源相对站点页面的路径
  var CHARACTER = 'CH0335';
  var MODEL_RES = '2k';                  // 2K（4.89MB）；改回 '4k' 可切换 4K 贴图（33.45MB）
  var ENABLE_BGM = false;                // 网页端关闭背景音乐自动播放
  var DIALOG_LANG = 'Chinese';           // 站点为中文
  var VOLUME = 0.5;

  var modelResolution = MODEL_RES;
  var binaryPath = function () { return WP + modelResolution + '/' + CHARACTER + '_home.skel'; };
  var atlasPath = function () { return WP + modelResolution + '/' + CHARACTER + '_home.atlas'; };

  /* ---------- 运行期状态 ---------- */
  var canvas, overlay, textbox, heroEl;
  var gl, shader, batcher, assetManager, skeletonRenderer;
  var mvp = new spine.Matrix4();
  var lastFrameTime;
  var spineData;

  var customScale = 1;
  var targetFps = 60;
  var bufferColor = [0.3, 0.3, 0.3];     // 壁纸原始底色，保持不变
  var introAnimation = false;            // ★修复 1：必须显式定义，否则 load() 不执行
  var acceptingClick = false;
  var dialogBox = true;
  var currentVoiceline = 1;
  var mouseSelect = -1;
  var trackerID = -1, untrackerID = -1, unpetID = -1;
  var PPointX, PPointY, EPointX, EPointY;
  var TPoint, TEye;
  var flipped = false;
  var transpose = 1;
  var slotsHidden = false;
  var downaction, upaction, moveaction;

  /* 加载健壮性：失败必须有反馈，不能无限重试静默卡死 */
  var LOAD_TIMEOUT = 30000;          // 4K 贴图较大，给足 30 秒
  var ready = false;
  var assetFailed = false;
  var failReason = '';
  var watchdogId = null;

  function fallback(reason) {
    if (ready) return;
    ready = true;
    if (watchdogId) { clearTimeout(watchdogId); watchdogId = null; }
    if (heroEl) {
      heroEl.classList.remove('is-loading');
      heroEl.classList.add('is-fallback');
    }
    failReason = reason || '';
    console.warn('[BA 壁纸] 已回退到静态背景：' + failReason +
      '\n请检查以下路径是否可访问：\n  ' + binaryPath() + '\n  ' + atlasPath());
  }

  function assetOk() { }
  function assetFail(path) {
    assetFailed = true;
    fallback('资源请求失败 → ' + path);
  }

  var currentTracks = [];
  var voicelineTimeouts = [];
  var isVoicelinePlaying = false;
  var volume = VOLUME;
  var mouseOptions = { voicelines: true, headpatting: true, mousetracking: true, drawHitboxes: false };
  var mousePos = { x: 0, y: 0 };

  /* ---------- 语音台词（保持原壁纸内容） ---------- */
  var AUDIO_DETAIL = [
    { time: 11000, count: 2, startTimes: [2200, 5500],
      dialog: { Japanese: ["心配しないでください。", "私が消えることはありません。"],
                English: ["Please don’t worry.", "I won’t disappear."],
                Chinese: ["别担心。", "我是不会消失的。"] } },
    { time: 16000, count: 2, startTimes: [500, 5200],
      dialog: { Japanese: ["むしろ、その逆ですね。", "私は、どんな手を使ってでも生き残ってやるつもりですから。"],
                English: ["If anything, it’s quite the opposite.", "I intend to survive, no matter what it takes."],
                Chinese: ["恰恰相反。", "不管用什么手段，我都会活下去。"] } },
    { time: 15000, count: 2, startTimes: [3500, 9400],
      dialog: { Japanese: ["先生がこの世界を見捨てないというのなら。", "私だって最後まで、絶対に諦めたりしません。"],
                English: ["If you won’t abandon this world, Sensei,", "then neither will I. Not until the very end."],
                Chinese: ["如果老师不抛弃这个世界的话。", "那我到最后也不会放弃的。"] } },
    { time: 16000, count: 2, startTimes: [700, 7900],
      dialog: { Japanese: ["だから大丈夫……絶対、大丈夫です。", "私はずっとここにいます。"],
                English: ["So it’s all right… Truly, it is.", "I’ll remain here. Always."],
                Chinese: ["所以放心吧……绝对，没问题的。", "我会一直在这里。"] } },
    { time: 16000, count: 2, startTimes: [2800, 9100],
      dialog: { Japanese: ["ここだけの話ですけど……私は―― ", "先生のこと、嫌いじゃありませんから。"],
                English: ["Just between us… I—", "I don’t dislike you, Sensei."],
                Chinese: ["这话我只在这里说……我——", "并不讨厌老师呢。"] } }
  ];

  var HITBOX = {
    headpat:   { xMin: 1400, xMax: 1900, yMin: 0,    yMax: 450 },
    voiceline: { xMin: 600,  xMax: 1320, yMin: 870,  yMax: 1400 },
    pinch:     { xMin: 1420, xMax: 1800, yMin: 500,  yMax: 830 }
  };

  var HEADPAT_CLAMP = 30, EYE_CLAMP_X = 200;
  var EYE_CLAMP_Y = EYE_CLAMP_X * (9 / 16);
  var HEADPAT_STEP = 5, EYE_STEP = 10;

  function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }

  /* ---------- 鼠标跟随 ---------- */
  function trackMouse() {
    var adjX = (mousePos.x / canvas.width) - 0.5;
    var adjY = (mousePos.y / canvas.height) - 0.5;
    TEye.y = TEye.y - (Math.sign(adjX) * EYE_STEP);
    TEye.x = TEye.x - (Math.sign(adjY) * EYE_STEP);
    TEye.y = clamp(TEye.y, EPointY - (Math.abs(adjX) * EYE_CLAMP_X), EPointY + (Math.abs(adjX) * EYE_CLAMP_X));
    TEye.x = clamp(TEye.x, EPointX - (Math.abs(adjY) * EYE_CLAMP_Y), EPointX + (Math.abs(adjY) * EYE_CLAMP_Y));
  }

  function untrackMouse() {
    if (Math.abs(TEye.y - EPointY) <= EYE_STEP && Math.abs(TEye.x - EPointX) <= EYE_STEP) {
      if (untrackerID != -1) {
        TEye.y = EPointY; TEye.x = EPointX;
        clearInterval(untrackerID); untrackerID = -1;
        setTimeout(function () { acceptingClick = true; }, 500);
      }
    }
    if (TEye.y > EPointY) TEye.y -= EYE_STEP;
    if (TEye.y < EPointY) TEye.y += EYE_STEP;
    if (TEye.x > EPointX) TEye.x -= EYE_STEP;
    if (TEye.x < EPointX) TEye.x += EYE_STEP;
  }

  function unpet() {
    if (Math.abs(TPoint.x - PPointX) <= HEADPAT_STEP && Math.abs(TPoint.y - PPointY) <= HEADPAT_STEP) {
      if (unpetID != -1) {
        TPoint.x = PPointX; TPoint.y = PPointY;
        clearInterval(unpetID); unpetID = -1;
        setTimeout(function () { acceptingClick = true; }, 500);
      }
    }
    if (TPoint.y > PPointY) TPoint.y -= HEADPAT_STEP;
    if (TPoint.y < PPointY) TPoint.y += HEADPAT_STEP;
    if (TPoint.x > PPointX) TPoint.x -= HEADPAT_STEP;
    if (TPoint.x < PPointX) TPoint.x += HEADPAT_STEP;
  }

  /* ---------- 语音播放（点击触发，浏览器允许） ---------- */
  function playVoiceline() {
    isVoicelinePlaying = true;
    spineData.state.setEmptyAnimation(1, 1);
    spineData.state.setEmptyAnimation(2, 1);
    spineData.state.addAnimation(1, 'Talk_0' + currentVoiceline + '_M', false, 0);
    spineData.state.addAnimation(2, 'Talk_0' + currentVoiceline + '_A', false, 0);
    spineData.state.addEmptyAnimation(1, 0.5, 0);
    spineData.state.addEmptyAnimation(2, 0.5, 0);

    var trackDetails = AUDIO_DETAIL[currentVoiceline - 1];

    voicelineTimeouts.push(setTimeout(function () {
      isVoicelinePlaying = false;
      acceptingClick = true;
      if (currentVoiceline >= AUDIO_DETAIL.length) currentVoiceline = 1;
      else currentVoiceline = currentVoiceline + 1;
    }, trackDetails.time));

    for (var i = 0; i < trackDetails.count; i++) {
      (function (i) {
        var track = new Audio(WP + 'audio/' + CHARACTER + '_memoriallobby_' + currentVoiceline + '_' + (i + 1) + '.ogg');
        track.volume = volume;
        voicelineTimeouts.push(setTimeout(function () {
          var p = track.play();
          if (p && p.catch) p.catch(function () { });
          currentTracks.push({ track: track, index: i });
          if (dialogBox && textbox) {
            textbox.innerHTML = trackDetails.dialog[DIALOG_LANG][i];
            textbox.style.opacity = 1;
            track.addEventListener('ended', function () {
              currentTracks = currentTracks.filter(function (t) { return t.track !== track; });
              textbox.style.opacity = 0;
            });
          }
        }, trackDetails.startTimes[i]));
      })(i);
    }
  }

  /* ---------- 坐标换算 ---------- */
  function t(n, side) {
    var d = { x: { length: 2560, mid: (canvas.width / 2) }, y: { length: 1600, mid: (canvas.height / 2) } };
    n = d[side].mid - n;
    n = (d[side].length / (transpose * 2)) - n;
    n = (n - (d[side].length / (transpose * 2))) / customScale;
    return (n + (d[side].length / (transpose * 2))) * transpose;
  }

  function pressedMouse(x, y) {
    var tx = t(x, 'x'), ty = t(y, 'y');
    if (tx > HITBOX.headpat.xMin && tx < HITBOX.headpat.xMax && ty > HITBOX.headpat.yMin && ty < HITBOX.headpat.yMax && mouseOptions.headpatting) {
      spineData.state.setAnimation(1, 'Pat_01_M', false);
      mouseSelect = 1;
    } else if (tx > HITBOX.pinch.xMin && tx < HITBOX.pinch.xMax && ty > HITBOX.pinch.yMin && ty < HITBOX.pinch.yMax && mouseOptions.headpatting) {
      spineData.state.setAnimation(1, 'Pinch_02_M', false);
      spineData.state.setAnimation(2, 'Pinch_01_M', false);
      spineData.state.addAnimation(1, 'PinchEnd_01_A', false, 0);
      spineData.state.addAnimation(2, 'PinchEnd_01_M', false, 0);
      setTimeout(function () {
        spineData.state.addEmptyAnimation(1, 0.5, 0);
        spineData.state.addEmptyAnimation(2, 0.5, 0);
        acceptingClick = true;
      }, 10);
      mouseSelect = 4;
    } else if (tx > HITBOX.voiceline.xMin && tx < HITBOX.voiceline.xMax && ty > HITBOX.voiceline.yMin && ty < HITBOX.voiceline.yMax && mouseOptions.voicelines) {
      mouseSelect = 2;
    } else if (mouseOptions.mousetracking) {
      if (trackerID == -1) trackerID = setInterval(trackMouse, 20);
      spineData.state.setEmptyAnimation(1, 0);
      spineData.state.setEmptyAnimation(2, 0);
      var eyetracking = spineData.state.addAnimation(1, 'Look_01_M', false, 0);
      eyetracking.mixDuration = 0.2;
      mousePos.x = x; mousePos.y = y;
      mouseSelect = 3;
    } else if (mouseSelect == -1) {
      acceptingClick = true;
    }
  }

  function movedMouse(x, y, deltaX, deltaY) {
    switch (mouseSelect) {
      case 1:
        if ((y < 800 && deltaY < 0) || (x >= 1440 && deltaX > 0)) {
          TPoint.y = clamp(TPoint.y - HEADPAT_STEP, PPointY - HEADPAT_CLAMP, PPointY + HEADPAT_CLAMP);
        } else if ((y >= 800 && deltaY > 0) || (x < 1440 && deltaX < 0)) {
          TPoint.y = clamp(TPoint.y + HEADPAT_STEP, PPointY - HEADPAT_CLAMP, PPointY + HEADPAT_CLAMP);
        }
        break;
      case 2:
        mouseSelect = -1; acceptingClick = true; break;
      case 3:
        mousePos.x = x; mousePos.y = y; break;
      default:
    }
  }

  function releasedMouse() {
    switch (mouseSelect) {
      case 1:
        if (unpetID == -1) unpetID = setInterval(unpet, 20);
        spineData.state.setAnimation(1, 'PatEnd_01_M', false);
        spineData.state.setAnimation(2, 'PatEnd_01_A', false);
        setTimeout(function () {
          spineData.state.addEmptyAnimation(1, 0.5, 0);
          spineData.state.addEmptyAnimation(2, 0.5, 0);
        }, 1000);
        break;
      case 2:
        playVoiceline(); break;
      case 3:
        if (trackerID != -1) { clearInterval(trackerID); trackerID = -1; }
        if (untrackerID == -1) untrackerID = setInterval(untrackMouse, 20);
        var e1 = spineData.state.setAnimation(1, 'LookEnd_01_M', false);
        var e2 = spineData.state.setAnimation(2, 'LookEnd_01_A', false);
        e1.mixDuration = 0; e2.mixDuration = 0;
        spineData.state.addEmptyAnimation(1, 0.5, 0);
        spineData.state.addEmptyAnimation(2, 0.5, 0);
        break;
      default:
    }
    mouseSelect = -1;
  }

  /* ★修复 4：坐标改为相对 canvas，hitbox 判定才准确 */
  function setMouse(event) {
    var rect = canvas.getBoundingClientRect();
    var ax = event.clientX - rect.left;
    var ay = event.clientY - rect.top;
    var mx = 1;
    if (flipped) { mx = -1; ax = canvas.width - ax; }
    return { x: ax, y: ay, m: mx };
  }

  /* ---------- 初始化 ---------- */
  function init() {
    heroEl = document.getElementById('baHeroWallpaper');
    canvas = document.getElementById('baWallpaperCanvas');
    overlay = document.getElementById('baWallpaperOverlay');
    textbox = document.getElementById('baWallpaperTextbox');
    if (!canvas) return;

    /* 加载文案跟随贴图分辨率，避免改了 MODEL_RES 后标签不同步 */
    var loadingLabel = document.querySelector('.hw-loading span');
    if (loadingLabel) {
      loadingLabel.textContent = '壁纸加载中 · ' + modelResolution.toUpperCase();
    }

    /* ★修复 3：画布尺寸跟随 hero 容器，而非窗口 */
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    if (overlay) {
      overlay.width = canvas.width;
      overlay.height = canvas.height;
    }

    var config = { alpha: false, premultipliedAlpha: false, antialias: true };
    gl = canvas.getContext('webgl', config) || canvas.getContext('experimental-webgl', config);
    if (!gl) {
      if (heroEl) heroEl.classList.add('is-fallback');
      return;
    }

    shader = spine.Shader.newTwoColoredTextured(gl);
    batcher = new spine.PolygonBatcher(gl);
    mvp.ortho2d(0, 0, canvas.width - 1, canvas.height - 1);
    skeletonRenderer = new spine.SkeletonRenderer(gl);
    assetManager = new spine.AssetManager(gl);

    /* 传入错误回调，资源 404 时能立刻感知 */
    assetManager.loadBinary(binaryPath(), assetOk, assetFail);
    assetManager.loadTextureAtlas(atlasPath(), assetOk, assetFail);

    /* 看门狗：无论何种原因迟迟未就绪，都给出明确结果而非永久转圈 */
    watchdogId = setTimeout(function () {
      fallback('加载超时（' + (LOAD_TIMEOUT / 1000) + ' 秒）');
    }, LOAD_TIMEOUT);

    /* ★修复 2：补上窗口尺寸变化监听 */
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 300); });

    requestAnimationFrame(load);
  }

  function interactionLoad() {
    TPoint = spineData.skeleton.findBone('Touch_Point');
    TEye = spineData.skeleton.findBone('Touch_Eye');
    PPointX = TPoint.x; PPointY = TPoint.y;
    EPointX = TEye.x; EPointY = TEye.y;

    downaction = canvas.addEventListener('mousedown', function (event) {
      if (isVoicelinePlaying || !acceptingClick) return;
      acceptingClick = false;
      var m = setMouse(event);
      pressedMouse(m.x, m.y);
    });
    upaction = canvas.addEventListener('mouseup', function () { releasedMouse(); });
    moveaction = canvas.addEventListener('mousemove', function (event) {
      var m = setMouse(event);
      movedMouse(m.x, m.y, (event.movementX * m.m), event.movementY);
    });

    /* 移动端补触摸支持（原壁纸只有鼠标事件） */
    canvas.addEventListener('touchstart', function (event) {
      if (isVoicelinePlaying || !acceptingClick) return;
      acceptingClick = false;
      var touch = event.changedTouches[0];
      var m = setMouse(touch);
      pressedMouse(m.x, m.y);
    }, { passive: true });
    canvas.addEventListener('touchend', function () { releasedMouse(); }, { passive: true });

    acceptingClick = true;
    return 1;
  }

  function load() {
    /* 资源已确认失败：直接兜底，不再空转重试 */
    if (assetFailed) { fallback('资源加载失败'); return; }

    if (assetManager.isLoadingComplete() && typeof introAnimation !== 'undefined') {
      var bp = binaryPath(), ap = atlasPath();
      if (!assetManager.get(bp) || !assetManager.get(ap)) {
        fallback('模型资源缺失（' + bp + '）');
        return;
      }

      spineData = loadSpineData(bp, ap, false);
      spineData.state.addAnimation(0, 'Idle_01', true, 0);

      interactionLoad();
      resize();

      /* 资源就绪：移除加载态，撤销看门狗 */
      ready = true;
      if (watchdogId) { clearTimeout(watchdogId); watchdogId = null; }
      if (heroEl) { heroEl.classList.remove('is-loading'); heroEl.classList.add('is-ready'); }

      lastFrameTime = Date.now() / 1000;
      requestAnimationFrame(render);
    } else {
      requestAnimationFrame(load);
    }
  }

  function loadSpineData(binaryPath, atlasPath, premultipliedAlpha) {
    var atlas = assetManager.get(atlasPath);
    var atlasLoader = new spine.AtlasAttachmentLoader(atlas);
    var skeletonBinary = new spine.SkeletonBinary(atlasLoader);
    skeletonBinary.scale = 1;
    var skeletonData = skeletonBinary.readSkeletonData(assetManager.get(binaryPath));
    var skeleton = new spine.Skeleton(skeletonData);
    var bounds = calculateSetupPoseBounds(skeleton);
    var animationStateData = new spine.AnimationStateData(skeleton.data);
    animationStateData.defaultMix = 0.5;
    var animationState = new spine.AnimationState(animationStateData);
    return { skeleton: skeleton, state: animationState, bounds: bounds, premultipliedAlpha: premultipliedAlpha };
  }

  function calculateSetupPoseBounds(skeleton) {
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform(spine.Physics.update);
    var offset = new spine.Vector2();
    var size = new spine.Vector2();
    skeleton.getBounds(offset, size, []);
    return { offset: offset, size: size };
  }

  function render() {
    var now = Date.now() / 1000;
    var delta = now - lastFrameTime;
    lastFrameTime = now;

    /* 壁纸已完全交棒给世界背景（Scene 2）时跳过 WebGL 绘制：
       继续跑会把帧预算从弧形卡滑动那里抢走，滑动就会顿。
       lastFrameTime 仍每帧更新，恢复时不会有 delta 跳变。 */
    if (window.__BA_PAUSE_WALLPAPER) {
      setTimeout(function () { requestAnimationFrame(render); }, 120);
      return;
    }

    gl.clearColor(bufferColor[0], bufferColor[1], bufferColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (spineData) {
      var skeleton = spineData.skeleton;
      var state = spineData.state;
      var premultipliedAlpha = spineData.premultipliedAlpha;
      state.update(delta);
      state.apply(skeleton);
      skeleton.updateWorldTransform(spine.Physics.update);

      shader.bind();
      shader.setUniformi(spine.Shader.SAMPLER, 0);
      shader.setUniform4x4f(spine.Shader.MVP_MATRIX, mvp.values);

      batcher.begin(shader);
      skeletonRenderer.premultipliedAlpha = premultipliedAlpha;
      skeletonRenderer.draw(batcher, skeleton);
      batcher.end();

      shader.unbind();
    }

    var elapsed = Date.now() / 1000 - now;
    var delay = Math.max((1 / targetFps) - elapsed, 0) * 1000;

    if (overlay && mouseOptions.drawHitboxes) drawHitboxes();

    setTimeout(function () { requestAnimationFrame(render); }, delay);
  }

  function drawHitboxes() {
    var ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!mouseOptions.drawHitboxes) return;
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = 'red'; ctx.globalAlpha = 0.5;
    function w2s(n, side) {
      var d = { x: { length: 2560, mid: (canvas.width / 2) }, y: { length: 1600, mid: (canvas.height / 2) } };
      n = (n / transpose) - (d[side].length / (transpose * 2));
      n = n * customScale + (d[side].length / (transpose * 2));
      n = (d[side].length / (transpose * 2)) - n;
      return d[side].mid - n;
    }
    for (var key in HITBOX) {
      var b = HITBOX[key];
      ctx.strokeRect(w2s(b.xMin, 'x'), w2s(b.yMax, 'y'), w2s(b.xMax, 'x') - w2s(b.xMin, 'x'), w2s(b.yMin, 'y') - w2s(b.yMax, 'y'));
    }
    ctx.restore();
  }

  function resize() {
    if (!canvas || !gl) return;
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (canvas.width != w || canvas.height != h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (overlay) { overlay.width = w; overlay.height = h; }

    var centerX = 0, centerY = 900;
    var wr = canvas.width / 2560;
    var hr = canvas.height / 1600;
    var width = (2560 / customScale);
    var height = (1600 / customScale);

    if (wr < hr) { width = height * (canvas.width / canvas.height); transpose = 1600 / canvas.height; }
    else if (wr > hr) { height = width * (canvas.height / canvas.width); transpose = 2560 / canvas.width; }
    else { transpose = 1600 / canvas.height; }

    mvp.ortho2d(centerX - width / 2, centerY - height / 2, width, height);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  /* ---------- 启动（尊重系统「减弱动效」设置） ---------- */
  function start() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      if (heroEl) { heroEl.classList.remove('is-loading'); heroEl.classList.add('is-reduced'); }
      return;
    }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
