(function () {
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  const namesInput = document.getElementById("namesInput");
  const spinBtn = document.getElementById("spinBtn");
  const updateWheelBtn = document.getElementById("updateWheelBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const resetNamesBtn = document.getElementById("resetNamesBtn");
  const removeWinnerToggle = document.getElementById("removeWinnerToggle");
  const winnerOverlay = document.getElementById("winnerOverlay");
  const winnerName = document.getElementById("winnerName");
  const closeWinnerBtn = document.getElementById("closeWinnerBtn");
  const confettiLayer = document.getElementById("confettiLayer");

  const DEFAULT_NAMES = ["Alice", "Bob", "Charlie", "Dana", "Evan", "Fiona"];
  const PALETTE = [
    "#7c5cff", "#22d3ee", "#f472b6", "#34d399",
    "#fbbf24", "#f87171", "#60a5fa", "#a78bfa",
  ];

  const NAMES_KEY = "toolbox-wheel-names";
  const REMOVE_KEY = "toolbox-wheel-remove-winner";

  function loadNames() {
    try {
      const raw = localStorage.getItem(NAMES_KEY);
      if (!raw) return DEFAULT_NAMES.slice();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      // ignore malformed/unavailable storage
    }
    return DEFAULT_NAMES.slice();
  }

  function saveNames() {
    try {
      localStorage.setItem(NAMES_KEY, JSON.stringify(names));
    } catch (e) {
      // storage unavailable - ignore
    }
  }

  let names = loadNames();
  let rotation = 0;
  let spinning = false;

  function parseNames() {
    return namesInput.value
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  }

  function syncTextarea() {
    namesInput.value = names.join("\n");
  }

  function drawWheel() {
    const size = canvas.width;
    const radius = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (names.length === 0) {
      ctx.fillStyle = "#1a1e33";
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#9aa1c4";
      ctx.font = "20px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add names to begin", radius, radius);
      return;
    }

    const sliceAngle = (Math.PI * 2) / names.length;

    names.forEach((name, i) => {
      const start = i * sliceAngle;
      const end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius - 4, start, end);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();

      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
      ctx.font = "600 18px Segoe UI, sans-serif";
      const maxWidth = radius - 30;
      ctx.fillText(truncate(name, ctx, maxWidth), radius - 20, 0, maxWidth);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(radius, radius, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#0f1220";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2a2f4d";
    ctx.stroke();
  }

  function truncate(text, context, maxWidth) {
    if (context.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && context.measureText(t + "…").width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + "…";
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function spin() {
    if (spinning) return;
    if (names.length < 2) {
      alert("Add at least two names to spin the wheel.");
      return;
    }

    spinning = true;
    spinBtn.disabled = true;

    const duration = 4200 + Math.random() * 800;
    const extraTurns = 6 + Math.floor(Math.random() * 3);
    const randomOffset = Math.random() * 360;
    const startRotation = rotation;
    const targetRotation = startRotation + extraTurns * 360 + randomOffset;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      rotation = startRotation + (targetRotation - startRotation) * eased;
      canvas.style.transform = `rotate(${rotation}deg)`;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = targetRotation % 360;
        canvas.style.transform = `rotate(${rotation}deg)`;
        finishSpin();
      }
    }

    requestAnimationFrame(frame);
  }

  function finishSpin() {
    const sliceDeg = 360 / names.length;
    let pointerAngle = (-90 - rotation) % 360;
    if (pointerAngle < 0) pointerAngle += 360;
    const winnerIndex = Math.floor(pointerAngle / sliceDeg) % names.length;
    const winner = names[winnerIndex];

    showWinner(winner);
    spinning = false;
    spinBtn.disabled = false;

    if (removeWinnerToggle.checked) {
      names.splice(winnerIndex, 1);
      syncTextarea();
      saveNames();
      rotation = 0;
      canvas.style.transition = "none";
      canvas.style.transform = "rotate(0deg)";
      drawWheel();
      requestAnimationFrame(() => {
        canvas.style.transition = "";
      });
    }
  }

  function showWinner(name) {
    winnerName.textContent = name;
    winnerOverlay.classList.add("show");
    launchConfetti();
  }

  function hideWinner() {
    winnerOverlay.classList.remove("show");
    confettiLayer.innerHTML = "";
  }

  function launchConfetti() {
    confettiLayer.innerHTML = "";
    const count = 60;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.backgroundColor = PALETTE[i % PALETTE.length];
      piece.style.animationDuration = 2.2 + Math.random() * 1.6 + "s";
      piece.style.animationDelay = Math.random() * 0.4 + "s";
      confettiLayer.appendChild(piece);
    }
  }

  spinBtn.addEventListener("click", spin);

  updateWheelBtn.addEventListener("click", () => {
    names = parseNames();
    saveNames();
    drawWheel();
  });

  shuffleBtn.addEventListener("click", () => {
    names = parseNames();
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    syncTextarea();
    saveNames();
    drawWheel();
  });

  resetNamesBtn.addEventListener("click", () => {
    names = DEFAULT_NAMES.slice();
    syncTextarea();
    saveNames();
    drawWheel();
  });

  removeWinnerToggle.addEventListener("change", () => {
    try {
      localStorage.setItem(REMOVE_KEY, removeWinnerToggle.checked ? "1" : "0");
    } catch (e) {
      // storage unavailable - ignore
    }
  });

  closeWinnerBtn.addEventListener("click", hideWinner);
  winnerOverlay.addEventListener("click", (e) => {
    if (e.target === winnerOverlay) hideWinner();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "BUTTON") return;
    if (winnerOverlay.classList.contains("show")) return;
    e.preventDefault();
    spin();
  });

  try {
    removeWinnerToggle.checked = localStorage.getItem(REMOVE_KEY) === "1";
  } catch (e) {
    // storage unavailable - ignore
  }

  syncTextarea();
  drawWheel();
})();
