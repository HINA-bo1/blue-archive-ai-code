/* 导航栏滚动效果 */
const header = document.querySelector(".site-header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

/* 移动端菜单 */
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open);
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* 滚动显现动画 */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* 数字滚动动画 */
const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.target);
      const duration = 1200;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
      statObserver.unobserve(el);
    });
  },
  { threshold: 0.4 }
);

document.querySelectorAll(".stat-num").forEach((el) => statObserver.observe(el));

/* 联系表单：提交到 FormSubmit，真实发送到指定邮箱 */
const form = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");

if (form && formNote) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {};
    new FormData(form).forEach((value, key) => {
      payload[key] = value;
    });
    formNote.hidden = false;
    formNote.style.color = "#16a34a";
    formNote.textContent = "正在发送……";
    try {
      const res = await fetch("https://formsubmit.co/ajax/wsh260622@outlook.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success === "true" || res.ok) {
        formNote.textContent = "✓ 消息已发送，我们会尽快回复你！";
        form.reset();
      } else {
        formNote.style.color = "#dc2626";
        formNote.textContent = "发送失败，请稍后再试。";
      }
    } catch (err) {
      formNote.style.color = "#dc2626";
      formNote.textContent = "网络异常，发送失败，请稍后再试。";
    }
    setTimeout(() => {
      formNote.hidden = true;
    }, 6000);
  });
}

/* 页脚年份 */
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}


/* ============================================================
   使用协议：首次访问强制勾选，之后可从页脚随时查阅
   - 门禁模式 gate：自动弹出，必须勾选才能进入，无关闭按钮
   - 查阅模式 view：点页脚「使用协议」打开，可直接关闭
   同意状态按「协议版本号」存入 localStorage，改版本号即会重新征求同意
   ============================================================ */
(() => {
  const TERMS_KEY = "baac.terms.accepted";
  const TERMS_VER = "2026-10-08f";         // 协议内容有更新时改这里，会自动重新弹一次

  const mask = document.getElementById("termsMask");
  if (!mask) return;
  const closeBtn = document.getElementById("termsClose");
  const check = document.getElementById("termsAgree");
  const checkRow = document.getElementById("termsCheckRow");
  const acceptBtn = document.getElementById("termsAccept");
  const body = document.getElementById("termsBody");
  const link = document.getElementById("termsLink");
  const guideLink = document.getElementById("guideLink");

  /* 把正文滚动到指定小节标题处（页脚「使用者须知」直达第七节） */
  function scrollToHeading(keyword) {
    if (!body) return;
    const hs = body.querySelectorAll("h3");
    for (const h of hs) {
      if (h.textContent.indexOf(keyword) >= 0) {
        body.scrollTop += h.getBoundingClientRect().top - body.getBoundingClientRect().top - 12;
        return;
      }
    }
  }

  const isGate = () => checkRow && !checkRow.hidden;

  const accepted = () => {
    try { return localStorage.getItem(TERMS_KEY) === TERMS_VER; } catch (e) { return false; }
  };
  const saveAccepted = () => {
    try { localStorage.setItem(TERMS_KEY, TERMS_VER); } catch (e) { /* 隐私模式下忽略 */ }
  };

  function open(mode, focus) {
    const gate = mode === "gate";
    if (checkRow) checkRow.hidden = !gate;
    if (closeBtn) closeBtn.hidden = gate;              // 门禁模式下不给关闭按钮
    if (check) check.checked = false;
    if (acceptBtn) {
      acceptBtn.textContent = gate ? "同意并进入" : "我知道了";
      acceptBtn.disabled = gate;                       // 门禁模式需先勾选
    }
    // 注意：必须先取消 hidden 再重置/跳转滚动 —— 元素还是 display:none 时
    // 容器没有布局，给 scrollTop 赋值不会生效，浏览器会恢复上次的滚动位置。
    mask.hidden = false;
    document.body.classList.add("terms-locked");
    if (body) body.scrollTop = 0;
    if (focus) scrollToHeading(focus);
  }

  function close() {
    mask.hidden = true;
    document.body.classList.remove("terms-locked");
  }

  /* 首次访问或协议改版 → 门禁 */
  if (!accepted()) open("gate");

  if (check && acceptBtn) {
    check.addEventListener("change", () => {
      if (isGate()) acceptBtn.disabled = !check.checked;
    });
    acceptBtn.addEventListener("click", () => {
      if (isGate()) {
        if (!check.checked) return;                    // 未勾选不放行
        saveAccepted();
      }
      close();
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      open("view", "terms");
    });
  }
  if (guideLink) {
    guideLink.addEventListener("click", (e) => {
      e.preventDefault();
      open("view", "使用者须知");   // 直接定位到第七节
    });
  }

  /* 非门禁模式下：点遮罩空白处 / 按 Esc 关闭；门禁模式下均无效 */
  mask.addEventListener("click", (e) => {
    if (e.target === mask && !isGate()) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !mask.hidden && !isGate()) close();
  });
})();
