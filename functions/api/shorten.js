const CODE_LENGTH = 6;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const MAX_URL_LENGTH = 2048;
const TTL_SECONDS = 7 * 24 * 60 * 60; // links are pruned automatically after 7 days
const MAX_CODE_ATTEMPTS = 5;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(token, secret, remoteIp) {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    // Network hiccup or unexpected response from Turnstile - fail closed rather
    // than let an uncaught exception 500 the request or accidentally pass.
    return false;
  }
}

function generateCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

function isValidUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (e) {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.LINKS) {
    return json({ error: "URL shortener is not configured (missing LINKS KV binding)." }, 500);
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    return json({ error: "URL shortener is not configured (missing Turnstile secret key)." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid request body." }, 400);
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";

  if (!url) {
    return json({ error: "A URL is required." }, 400);
  }
  if (url.length > MAX_URL_LENGTH) {
    return json({ error: "That URL is too long." }, 400);
  }
  if (!isValidUrl(url)) {
    return json({ error: "Enter a valid http:// or https:// URL." }, 400);
  }
  if (!turnstileToken) {
    return json({ error: "Verification required." }, 400);
  }

  const remoteIp = request.headers.get("CF-Connecting-IP");
  const verified = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, remoteIp);
  if (!verified) {
    return json({ error: "Verification failed. Please try again." }, 403);
  }

  let code = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateCode();
    const existing = await env.LINKS.get(candidate);
    if (existing === null) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return json({ error: "Couldn't generate a unique short code, try again." }, 500);
  }

  await env.LINKS.put(
    code,
    JSON.stringify({ url, createdAt: Date.now() }),
    { expirationTtl: TTL_SECONDS }
  );

  const shortUrl = `${new URL(request.url).origin}/s/${code}`;
  return json({ code, shortUrl, expiresInDays: 7 }, 201);
}

export async function onRequestGet() {
  return json({ error: "Use POST to shorten a URL." }, 405);
}
