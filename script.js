/* 密码锁屏 */
const ACCESS_KEY = "Hina";
const SESSION_FLAG = "ba_access";

(function lockInit() {
  const lock = document.getElementById("lockScreen");
  if (!lock) return;
  if (sessionStorage.getItem(SESSION_FLAG) === ACCESS_KEY) {
    lock.remove();
    return;
  }
  document.body.classList.add("locked");
  const input = document.getElementById("lockPassword");
  const btn = document.getElementById("lockEnter");
  const err = document.getElementById("lockError");

  const tryEnter = () => {
    if (input.value.trim() === ACCESS_KEY) {
      sessionStorage.setItem(SESSION_FLAG, ACCESS_KEY);
      lock.remove();
      document.body.classList.remove("locked");
    } else {
      err.textContent = "密码错误，请重试";
      input.value = "";
      input.focus();
    }
  };

  btn.addEventListener("click", tryEnter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryEnter();
  });
  input.focus();
})();

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
