/**
 * Inicio de sesión con Google para app de escritorio.
 * Flujo OAuth 2.0 con PKCE y redirect loopback (http://127.0.0.1:puerto).
 * No requiere puertos fijos ni secretos: usa un puerto efímero que se
 * abre solo durante el login y se cierra al terminar.
 */
const crypto = require('crypto');
const http = require('http');
const { shell } = require('electron');

const err = (code) => Object.assign(new Error(code), { code });
const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function startCallbackServer() {
  return new Promise((resolve, reject) => {
    let settle = null;
    const server = http.createServer((req, res) => {
      const u = new URL(req.url || '/', 'http://127.0.0.1');
      const page = (t, m) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding-top:15vh;background:#0F172A;color:#F3F4F6"><h2>${t}</h2><p>${m}</p></body></html>`);
      };
      if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
      if (u.searchParams.get('error')) {
        page('Acceso cancelado', 'Cierra esta ventana y vuelve a Kalory.');
        if (settle) settle.rej(err('cancelled'));
      } else {
        page('¡Listo!', 'Cierra esta ventana y vuelve a Kalory.');
        if (settle) settle.res({ code: u.searchParams.get('code'), state: u.searchParams.get('state') });
      }
      setTimeout(() => { try { server.close(); } catch { /* ignore */ } }, 500);
    });
    const timer = setTimeout(() => {
      try { server.close(); } catch { /* ignore */ }
      reject(err('timeout'));
    }, 180000);
    timer.unref?.();
    server.on('error', (e) => { clearTimeout(timer); reject(e); });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const promise = new Promise((res, rej) => {
        settle = {
          res: (v) => { clearTimeout(timer); res(v); },
          rej: (e) => { clearTimeout(timer); rej(e); },
        };
      });
      promise.catch(() => { /* el llamador decide; evita warnings */ });
      resolve({ port, promise });
    });
  });
}

async function signInWithGoogle(clientId, clientSecret) {
  if (!clientId) throw err('no_client_id');
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));

  const { port, promise } = await startCallbackServer();
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    prompt: 'select_account',
  }).toString();
  await shell.openExternal(authUrl);

  const { code, state: gotState } = await promise;
  if (!code) throw err('cancelled');
  if (gotState !== state) throw err('bad_state');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      // Los clientes tipo "Web" exigen el secreto; los de "Escritorio" no.
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }).toString(),
  });
  if (!tokenRes.ok) {
    const raw = await tokenRes.text().catch(() => '');
    let code = `HTTP ${tokenRes.status}`;
    try { code = JSON.parse(raw).error || code; } catch { /* no JSON */ }
    try { console.error('[google] token exchange:', tokenRes.status, raw.slice(0, 300)); } catch { /* ignore */ }
    const e = err('token_exchange_failed');
    e.detail = code;
    throw e;
  }
  const tok = await tokenRes.json().catch(() => null);
  if (!tok || !tok.id_token) {
    const e = err('token_exchange_failed');
    e.detail = 'sin id_token';
    throw e;
  }
  const payload = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64').toString('utf8'));
  if (!payload.sub || !payload.email) throw err('bad_profile');
  return { sub: payload.sub, email: payload.email, name: payload.name || payload.email, idToken: tok.id_token };
}

module.exports = { signInWithGoogle };
