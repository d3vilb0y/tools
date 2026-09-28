(function () {
  const form = document.getElementById("shortenForm");
  const urlInput = document.getElementById("urlInput");
  const shortenBtn = document.getElementById("shortenBtn");
  const shortenError = document.getElementById("shortenError");
  const resultCard = document.getElementById("resultCard");
  const resultLink = document.getElementById("resultLink");
  const resultExpiry = document.getElementById("resultExpiry");
  const resultQrLink = document.getElementById("resultQrLink");
  const copyBtn = document.getElementById("copyBtn");
  const recentList = document.getElementById("recentList");
  const clearRecentBtn = document.getElementById("clearRecentBtn");

  const RECENT_KEY = "toolbox-shortener-recent";
  const MAX_RECENT = 20;
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;

  let recent = loadRecent();
  let currentShortUrl = "";
  let turnstileToken = "";

  window.onTurnstileVerified = function (token) {
    turnstileToken = token;
    shortenBtn.disabled = false;
  };

  window.onTurnstileReset = function () {
    turnstileToken = "";
    shortenBtn.disabled = true;
  };

  function resetTurnstile() {
    turnstileToken = "";
    shortenBtn.disabled = true;
    if (window.turnstile) {
      window.turnstile.reset("#turnstileWidget");
    }
  }

  function loadRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveRecent() {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (e) {
      // storage unavailable - ignore
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  function flashButtonLabel(btn, label, revertTo, duration) {
    const original = revertTo !== undefined ? revertTo : btn.textContent;
    btn.textContent = label;
    setTimeout(() => {
      btn.textContent = original;
    }, duration || 1500);
  }

  function expiryLabel(createdAt) {
    const msLeft = createdAt + TTL_MS - Date.now();
    if (msLeft <= 0) return "Expired";
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    return `Expires in ${daysLeft}d`;
  }

  function renderRecentList() {
    recentList.innerHTML = "";

    if (recent.length === 0) {
      const li = document.createElement("li");
      li.className = "recent-empty";
      li.textContent = "No links yet — shorten one above.";
      recentList.appendChild(li);
      return;
    }

    recent.forEach((entry) => {
      const li = document.createElement("li");

      const main = document.createElement("div");
      main.className = "recent-item-main";

      const shortEl = document.createElement("a");
      shortEl.className = "recent-item-short";
      shortEl.href = entry.shortUrl;
      shortEl.target = "_blank";
      shortEl.rel = "noopener noreferrer";
      shortEl.textContent = entry.shortUrl.replace(/^https?:\/\//, "");

      const originalEl = document.createElement("span");
      originalEl.className = "recent-item-original";
      originalEl.title = entry.originalUrl;
      originalEl.textContent = entry.originalUrl;

      main.appendChild(shortEl);
      main.appendChild(originalEl);

      const actions = document.createElement("div");
      actions.className = "recent-item-actions";

      const expiryEl = document.createElement("span");
      expiryEl.className = "recent-item-expiry";
      expiryEl.textContent = expiryLabel(entry.createdAt);

      const copyRowBtn = document.createElement("button");
      copyRowBtn.type = "button";
      copyRowBtn.className = "btn btn-ghost";
      copyRowBtn.textContent = "📋 Copy";
      copyRowBtn.addEventListener("click", () => {
        copyText(entry.shortUrl).then(() => {
          flashButtonLabel(copyRowBtn, "✅ Copied", "📋 Copy");
        });
      });

      actions.appendChild(expiryEl);
      actions.appendChild(copyRowBtn);

      li.appendChild(main);
      li.appendChild(actions);
      recentList.appendChild(li);
    });
  }

  function addToRecent(entry) {
    recent.unshift(entry);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    saveRecent();
    renderRecentList();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    shortenError.textContent = "";

    if (!url) return;

    if (!turnstileToken) {
      shortenError.textContent = "Please complete the verification challenge.";
      return;
    }

    shortenBtn.disabled = true;
    shortenBtn.textContent = "Shortening…";

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, turnstileToken }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }

      if (!res.ok || !data || !data.shortUrl) {
        shortenError.textContent = (data && data.error) || "Something went wrong. Try again.";
        resultCard.hidden = true;
        return;
      }

      currentShortUrl = data.shortUrl;
      resultLink.href = data.shortUrl;
      resultLink.textContent = data.shortUrl;
      resultExpiry.textContent = `Expires in ${data.expiresInDays || 7} days`;
      resultQrLink.href = `qr.html?text=${encodeURIComponent(data.shortUrl)}`;
      resultCard.hidden = false;

      addToRecent({
        code: data.code,
        shortUrl: data.shortUrl,
        originalUrl: url,
        createdAt: Date.now(),
      });

      urlInput.value = "";
    } catch (err) {
      shortenError.textContent = "Couldn't reach the server. Check your connection and try again.";
      resultCard.hidden = true;
    } finally {
      shortenBtn.textContent = "✂️ Shorten";
      // Turnstile tokens are single-use - get a fresh one for the next attempt.
      resetTurnstile();
    }
  });

  copyBtn.addEventListener("click", () => {
    if (!currentShortUrl) return;
    copyText(currentShortUrl).then(() => {
      flashButtonLabel(copyBtn, "✅ Copied", "📋 Copy");
    });
  });

  clearRecentBtn.addEventListener("click", () => {
    recent = [];
    saveRecent();
    renderRecentList();
  });

  renderRecentList();
})();
