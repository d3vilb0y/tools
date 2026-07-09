(function () {
  const STORAGE_KEY = "toolbox-theme";

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // storage unavailable (private mode, disabled cookies, etc.) - ignore
    }
    updateButton();
  }

  let btn = null;

  function updateButton() {
    if (!btn) return;
    const theme = getTheme();
    btn.textContent = theme === "light" ? "🌙" : "☀️";
    btn.title = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
    btn.setAttribute("aria-label", btn.title);
  }

  function init() {
    const header = document.querySelector(".site-header");
    const nav = document.querySelector("nav.site-nav");
    if (!header || !nav) return;

    const wrap = document.createElement("div");
    wrap.className = "header-right";
    nav.parentNode.insertBefore(wrap, nav);
    wrap.appendChild(nav);

    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle-btn";
    wrap.appendChild(btn);

    btn.addEventListener("click", () => {
      setTheme(getTheme() === "light" ? "dark" : "light");
    });

    updateButton();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
