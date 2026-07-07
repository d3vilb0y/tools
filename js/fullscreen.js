(function () {
  function isFullscreen() {
    return Boolean(document.fullscreenElement);
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }

  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function initFullscreenControls() {
    const wrap = document.createElement("div");
    wrap.className = "fullscreen-controls";

    const enterBtn = document.createElement("button");
    enterBtn.className = "btn";
    enterBtn.type = "button";
    enterBtn.title = "Enter full screen";
    enterBtn.innerHTML = "⛶ Full screen";
    enterBtn.addEventListener("click", enterFullscreen);

    const exitBtn = document.createElement("button");
    exitBtn.className = "btn";
    exitBtn.type = "button";
    exitBtn.title = "Exit full screen";
    exitBtn.innerHTML = "✖ Exit full screen";
    exitBtn.style.display = "none";
    exitBtn.addEventListener("click", exitFullscreen);

    wrap.appendChild(enterBtn);
    wrap.appendChild(exitBtn);
    document.body.appendChild(wrap);

    document.addEventListener("fullscreenchange", () => {
      const fs = isFullscreen();
      enterBtn.style.display = fs ? "none" : "inline-flex";
      exitBtn.style.display = fs ? "inline-flex" : "none";
    });

    if (!document.documentElement.requestFullscreen) {
      wrap.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", initFullscreenControls);
})();
