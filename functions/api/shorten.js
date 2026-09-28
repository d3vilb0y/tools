const CODE_LENGTH = 6;
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const MAX_URL_LENGTH = 2048;
const TTL_SECONDS = 7 * 24 * 60 * 60; // links are pruned automatically after 7 days
const MAX_CODE_ATTEMPTS = 5;

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

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid request body." }, 400);
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) {
    return json({ error: "A URL is required." }, 400);
  }
  if (url.length > MAX_URL_LENGTH) {
    return json({ error: "That URL is too long." }, 400);
  }
  if (!isValidUrl(url)) {
    return json({ error: "Enter a valid http:// or https:// URL." }, 400);
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
