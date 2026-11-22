// The NSALABB starfield: a few dim stars that twinkle and drift slowly behind the page.
// Ported as is from d3vilb0y/servicerr (src/shared/starfield.ts for the maths,
// src/web/Starfield.tsx for drawing), so every nsalabb.se page shows the same sky.
// Draws once and stops under prefers-reduced-motion, and pauses while the tab is hidden.
// Purely decorative: without JavaScript the page is the same, minus the stars.
// Tools site change: tints are re-read when data-theme changes (light/dark toggle).
(() => {
  const FPS = 24; // twinkles are slow; this keeps phones cool
  const TINTS = {};
  // Re-read on theme change (tools site addition), so stars stay visible in both themes.
  function readTints() {
    const css = getComputedStyle(document.documentElement);
    const tint = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    TINTS.ink = tint("--nl-text", "#f1efe8");
    TINTS.accent = tint("--nl-accent", "#e4002b");
    TINTS.support = tint("--nl-support", "#8a9a52");
  }
  readTints();

  /** Small deterministic PRNG (mulberry32) so the sky is the same on every load. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** About one star per 9,000 px², between 40 and 220. */
  const starCount = (w, h) => Math.max(40, Math.min(220, Math.round((w * h) / 9000)));

  function makeStars(count, seed = 0x6e5a1abb) {
    const rand = rng(seed);
    const stars = [];
    for (let i = 0; i < count; i++) {
      const roll = rand();
      stars.push({
        x: rand(),
        y: rand(),
        r: 0.35 + rand() ** 2 * 0.95,
        base: 0.12 + rand() * 0.38,
        period: 3 + rand() * 6,
        phase: rand() * Math.PI * 2,
        drift: (rand() - 0.5) * 0.0016,
        tint: roll < 0.03 ? "support" : roll < 0.06 ? "accent" : "ink",
      });
    }
    return stars;
  }

  /** Opacity at time t seconds: rests near base, swells gently, never fully out. */
  function twinkle(s, t) {
    const wave = 0.5 + 0.5 * Math.sin((t / s.period) * Math.PI * 2 + s.phase);
    return s.base * (0.35 + 0.65 * wave * wave);
  }

  /** Horizontal position at time t, wrapping around the edges. */
  function driftX(s, t) {
    const x = (s.x + s.drift * t) % 1;
    return x < 0 ? x + 1 : x;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.className = "starfield";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const start = performance.now();
  let stars = [];
  let w = 0, h = 0, raf = 0, last = 0;

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      ctx.globalAlpha = twinkle(s, t);
      ctx.fillStyle = TINTS[s.tint];
      ctx.beginPath();
      ctx.arc(driftX(s, t) * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars(starCount(w, h));
    draw((performance.now() - start) / 1000);
  }
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / FPS) return;
    last = now;
    draw((now - start) / 1000);
  }
  function run() {
    cancelAnimationFrame(raf);
    if (!still.matches && document.visibilityState === "visible") raf = requestAnimationFrame(tick);
  }

  size(); run();
  addEventListener("resize", size);
  document.addEventListener("visibilitychange", run);
  still.addEventListener("change", run);
  new MutationObserver(() => {
    readTints();
    draw((performance.now() - start) / 1000);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
