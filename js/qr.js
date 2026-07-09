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
  const MODULE_COLOR = "#0b0d1a";
  const BADGE_TEXT = "NSALABB";

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

    const grad = ctx.createLinearGradient(x, y, x + badgeSize, y + badgeSize);
    grad.addColorStop(0, "#7c5cff");
    grad.addColorStop(1, "#22d3ee");
    ctx.fillStyle = grad;
    roundRectPath(ctx, x, y, badgeSize, badgeSize, badgeSize * 0.22);
    ctx.fill();

    ctx.fillStyle = "#0b0d1a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const maxTextWidth = badgeSize * 0.84;
    let fontSize = badgeSize * 0.22;
    ctx.font = `700 ${fontSize}px Segoe UI, sans-serif`;
    while (fontSize > badgeSize * 0.08 && ctx.measureText(BADGE_TEXT).width > maxTextWidth) {
      fontSize -= 1;
      ctx.font = `700 ${fontSize}px Segoe UI, sans-serif`;
    }
    ctx.fillText(BADGE_TEXT, x + badgeSize / 2, y + badgeSize / 2 + fontSize * 0.02);
  }

  function drawPlaceholder() {
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
    ctx.fillStyle = "#9aa1c4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "20px Segoe UI, sans-serif";
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

  qrInput.value = "https://secrets.nsalabb.se";
  renderQR(qrInput.value);
})();
