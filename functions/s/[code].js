function notFoundPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Link not found &mdash; Toolbox</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 20% -10%, #23264a 0%, #0f1220 45%);
    color: #f1f3fb;
    font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
    text-align: center;
    padding: 1.5rem;
  }
  .card {
    background: #171b30;
    border: 1px solid #2a2f4d;
    border-radius: 16px;
    padding: 2.5rem;
    max-width: 420px;
  }
  h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
  p { color: #9aa1c4; margin: 0 0 1.5rem; }
  a {
    display: inline-block;
    padding: 0.65rem 1.2rem;
    border-radius: 10px;
    background: linear-gradient(135deg, #7c5cff, #22d3ee);
    color: #0b0d1a;
    font-weight: 600;
    text-decoration: none;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>🔗 Link not found</h1>
    <p>This short link doesn't exist, or it expired 7 days after it was created.</p>
    <a href="/shorten.html">Shorten a new URL</a>
  </div>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { params, env } = context;
  const code = params.code;

  if (!env.LINKS || !code) {
    return new Response(notFoundPage(), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const raw = await env.LINKS.get(code);
  if (!raw) {
    return new Response(notFoundPage(), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return new Response(notFoundPage(), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  return Response.redirect(data.url, 302);
}
