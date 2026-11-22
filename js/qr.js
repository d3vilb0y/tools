(function () {
  const canvas = document.getElementById("qrCanvas");
  const ctx = canvas.getContext("2d");
  const qrInput = document.getElementById("qrInput");
  const badgeToggle = document.getElementById("badgeToggle");
  const downloadBtn = document.getElementById("downloadBtn");
  const qrError = document.getElementById("qrError");
  const quickFillBtns = document.querySelectorAll(".quick-fill-btn");

  const QUIET_ZONE = 4;
  const TARGET_SIZE = 560;
  const MODULE_COLOR = "#0d1117";

  function roundRectPath(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawBadge(size) {
    const badgeSize = size * 0.24;
    const x = (size - badgeSize) / 2;
    const y = (size - badgeSize) / 2;
    const pad = badgeSize * 0.16;

    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, x - pad, y - pad, badgeSize + pad * 2, badgeSize + pad * 2, (badgeSize + pad * 2) * 0.22);
    ctx.fill();

    // nsalabb app icon (svg/nsalabb-icon.svg), drawn on a 64-unit grid scaled to the badge.
    const scale = badgeSize / 64;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#0D1117";
    roundRectPath(ctx, 0, 0, 64, 64, 14);
    ctx.fill();
    ctx.strokeStyle = "#F5F3EE";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D("M16 46V22M16 31C16 25 20.5 22 26 22S36 25 36 31V46"));
    ctx.fillStyle = "#F5B342";
    roundRectPath(ctx, 42, 40, 11, 6.5, 1);
    ctx.fill();
    ctx.restore();
  }

  function drawPlaceholder() {
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
    ctx.fillStyle = "#9da3ad";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "20px Space Grotesk, Segoe UI, sans-serif";
    ctx.fillText("Enter content to generate a QR code", TARGET_SIZE / 2, TARGET_SIZE / 2);
  }

  function renderQR(text) {
    qrError.textContent = "";

    if (!text || !text.trim()) {
      drawPlaceholder();
      downloadBtn.disabled = true;
      return;
    }

    let qr;
    try {
      qr = qrcode(0, "H");
      qr.addData(text);
      qr.make();
    } catch (e) {
      drawPlaceholder();
      downloadBtn.disabled = true;
      qrError.textContent = "That content is too long to encode as a QR code.";
      return;
    }

    const moduleCount = qr.getModuleCount();
    const cellSize = Math.max(1, Math.floor(TARGET_SIZE / (moduleCount + QUIET_ZONE * 2)));
    const size = cellSize * (moduleCount + QUIET_ZONE * 2);

    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = MODULE_COLOR;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect((QUIET_ZONE + col) * cellSize, (QUIET_ZONE + row) * cellSize, cellSize, cellSize);
        }
      }
    }

    if (badgeToggle.checked) {
      drawBadge(size);
    }

    downloadBtn.disabled = false;
  }

  let debounceId = null;
  qrInput.addEventListener("input", () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => renderQR(qrInput.value), 250);
  });

  badgeToggle.addEventListener("change", () => renderQR(qrInput.value));

  quickFillBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      qrInput.value = btn.dataset.value;
      renderQR(qrInput.value);
    });
  });

  downloadBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "nsalabb-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  const params = new URLSearchParams(window.location.search);
  const prefill = params.get("text");
  qrInput.value = prefill && prefill.trim() ? prefill : "https://secrets.nsalabb.se";
  renderQR(qrInput.value);
})();
