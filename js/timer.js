(function () {
  // ---------- Tabs ----------
  const tabStopwatch = document.getElementById("tabStopwatch");
  const tabCountdown = document.getElementById("tabCountdown");
  const stopwatchPanel = document.getElementById("stopwatchPanel");
  const countdownPanel = document.getElementById("countdownPanel");

  tabStopwatch.addEventListener("click", () => {
    tabStopwatch.classList.add("active");
    tabCountdown.classList.remove("active");
    stopwatchPanel.style.display = "flex";
    countdownPanel.style.display = "none";
  });

  tabCountdown.addEventListener("click", () => {
    tabCountdown.classList.add("active");
    tabStopwatch.classList.remove("active");
    countdownPanel.style.display = "flex";
    stopwatchPanel.style.display = "none";
  });

  // ---------- Stopwatch ----------
  const stopwatchDisplay = document.getElementById("stopwatchDisplay");
  const swStartBtn = document.getElementById("swStartBtn");
  const swPauseBtn = document.getElementById("swPauseBtn");
  const swLapBtn = document.getElementById("swLapBtn");
  const swResetBtn = document.getElementById("swResetBtn");
  const lapList = document.getElementById("lapList");

  let swElapsed = 0;
  let swRunning = false;
  let swStartTime = 0;
  let swRafId = null;
  let lapCount = 0;

  function formatStopwatch(ms) {
    const centis = Math.floor((ms % 1000) / 10);
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
  }

  function swTick() {
    const now = performance.now();
    const current = swElapsed + (now - swStartTime);
    stopwatchDisplay.textContent = formatStopwatch(current);
    swRafId = requestAnimationFrame(swTick);
  }

  swStartBtn.addEventListener("click", () => {
    if (swRunning) return;
    swRunning = true;
    swStartTime = performance.now();
    swRafId = requestAnimationFrame(swTick);
    swStartBtn.disabled = true;
    swPauseBtn.disabled = false;
    swLapBtn.disabled = false;
  });

  swPauseBtn.addEventListener("click", () => {
    if (!swRunning) return;
    swRunning = false;
    swElapsed += performance.now() - swStartTime;
    cancelAnimationFrame(swRafId);
    swStartBtn.disabled = false;
    swPauseBtn.disabled = true;
    swLapBtn.disabled = true;
  });

  swResetBtn.addEventListener("click", () => {
    swRunning = false;
    cancelAnimationFrame(swRafId);
    swElapsed = 0;
    lapCount = 0;
    stopwatchDisplay.textContent = formatStopwatch(0);
    lapList.innerHTML = "";
    swStartBtn.disabled = false;
    swPauseBtn.disabled = true;
    swLapBtn.disabled = true;
  });

  swLapBtn.addEventListener("click", () => {
    if (!swRunning) return;
    lapCount += 1;
    const now = performance.now();
    const current = swElapsed + (now - swStartTime);
    const li = document.createElement("li");
    li.innerHTML = `<span>Lap ${lapCount}</span><span>${formatStopwatch(current)}</span>`;
    lapList.prepend(li);
  });

  // ---------- Countdown ----------
  const hoursInput = document.getElementById("hoursInput");
  const minutesInput = document.getElementById("minutesInput");
  const secondsInput = document.getElementById("secondsInput");
  const countdownDisplay = document.getElementById("countdownDisplay");
  const countdownStatus = document.getElementById("countdownStatus");
  const ringProgress = document.getElementById("ringProgress");
  const cdStartBtn = document.getElementById("cdStartBtn");
  const cdPauseBtn = document.getElementById("cdPauseBtn");
  const cdResetBtn = document.getElementById("cdResetBtn");
  const presetBtns = document.querySelectorAll(".preset-btn");

  const RING_CIRCUMFERENCE = 2 * Math.PI * 90;

  let cdTotalMs = 5 * 60 * 1000;
  let cdRemainingMs = cdTotalMs;
  let cdRunning = false;
  let cdStartTime = 0;
  let cdStartRemaining = 0;
  let cdRafId = null;

  function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);
    const pad = (n) => String(n).padStart(2, "0");
    return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  }

  function updateRing() {
    const ratio = cdTotalMs > 0 ? cdRemainingMs / cdTotalMs : 0;
    const offset = RING_CIRCUMFERENCE * (1 - ratio);
    ringProgress.style.strokeDashoffset = offset;
    ringProgress.classList.remove("warning", "danger");
    if (ratio <= 0.15) {
      ringProgress.classList.add("danger");
    } else if (ratio <= 0.4) {
      ringProgress.classList.add("warning");
    }
  }

  function renderCountdown() {
    countdownDisplay.textContent = formatCountdown(cdRemainingMs);
    updateRing();
  }

  function readDurationInputs() {
    const h = Math.max(0, parseInt(hoursInput.value, 10) || 0);
    const m = Math.max(0, parseInt(minutesInput.value, 10) || 0);
    const s = Math.max(0, parseInt(secondsInput.value, 10) || 0);
    return (h * 3600 + m * 60 + s) * 1000;
  }

  function setDurationFromInputs() {
    if (cdRunning) return;
    cdTotalMs = readDurationInputs();
    cdRemainingMs = cdTotalMs;
    countdownStatus.textContent = "Ready";
    countdownStatus.classList.remove("done");
    renderCountdown();
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let time = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
        time += 0.35;
      }
    } catch (e) {
      // ignore if audio isn't available
    }
  }

  function cdTick() {
    const now = performance.now();
    const elapsed = now - cdStartTime;
    cdRemainingMs = Math.max(0, cdStartRemaining - elapsed);
    renderCountdown();

    if (cdRemainingMs <= 0) {
      cdRunning = false;
      cancelAnimationFrame(cdRafId);
      countdownStatus.textContent = "Time's up!";
      countdownStatus.classList.add("done");
      countdownPanel.classList.add("time-up");
      setTimeout(() => countdownPanel.classList.remove("time-up"), 2600);
      playBeep();
      cdStartBtn.disabled = false;
      cdPauseBtn.disabled = true;
      return;
    }

    cdRafId = requestAnimationFrame(cdTick);
  }

  cdStartBtn.addEventListener("click", () => {
    if (cdRunning) return;
    if (cdRemainingMs <= 0) {
      cdTotalMs = readDurationInputs();
      cdRemainingMs = cdTotalMs;
    }
    if (cdRemainingMs <= 0) return;

    cdRunning = true;
    cdStartTime = performance.now();
    cdStartRemaining = cdRemainingMs;
    countdownStatus.textContent = "Running";
    countdownStatus.classList.remove("done");
    cdStartBtn.disabled = true;
    cdPauseBtn.disabled = false;
    cdRafId = requestAnimationFrame(cdTick);
  });

  cdPauseBtn.addEventListener("click", () => {
    if (!cdRunning) return;
    cdRunning = false;
    cancelAnimationFrame(cdRafId);
    countdownStatus.textContent = "Paused";
    cdStartBtn.disabled = false;
    cdPauseBtn.disabled = true;
  });

  cdResetBtn.addEventListener("click", () => {
    cdRunning = false;
    cancelAnimationFrame(cdRafId);
    cdTotalMs = readDurationInputs();
    cdRemainingMs = cdTotalMs;
    countdownStatus.textContent = "Ready";
    countdownStatus.classList.remove("done");
    cdStartBtn.disabled = false;
    cdPauseBtn.disabled = true;
    renderCountdown();
  });

  [hoursInput, minutesInput, secondsInput].forEach((input) => {
    input.addEventListener("change", setDurationFromInputs);
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (cdRunning) return;
      const totalSeconds = parseInt(btn.dataset.seconds, 10);
      hoursInput.value = Math.floor(totalSeconds / 3600);
      minutesInput.value = Math.floor((totalSeconds % 3600) / 60);
      secondsInput.value = totalSeconds % 60;
      setDurationFromInputs();
    });
  });

  renderCountdown();
})();
