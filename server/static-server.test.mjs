import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let child;
let base;

before(async () => {
  const script = fileURLToPath(new URL('./static-server.js', import.meta.url));
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  child = spawn(process.execPath, [script, '0', dist], { stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for test server')), 5000);
    child.on('error', reject);
    child.on('exit', code => reject(new Error('Test server exited early: ' + code)));
    child.stdout.on('data', data => {
      output += data.toString();
      const match = output.match(/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
  });
  base = 'http://127.0.0.1:' + port;
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
});

test('home and deep SPA route return HTML with secure headers', async () => {
  for (const path of ['/', '/trips/abc/expenses']) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(await res.text(), /<div id="root">/);
  }
});

test('missing assets are real 404s rather than HTML masquerading as JS', async () => {
  const res = await fetch(base + '/assets/does-not-exist.js');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /text\/plain/);
});

test('malformed URL returns 400 without bringing down the server', async () => {
  const bad = await fetch(base + '/%E0%A4%A');
  assert.equal(bad.status, 400);
  const alive = await fetch(base + '/');
  assert.equal(alive.status, 200);
});

test('dataset conditional requests avoid a second 6 MB download', async () => {
  const path = '/data/thailand-places.json';
  const first = await fetch(base + path);
  assert.equal(first.status, 200);
  assert.match(first.headers.get('content-type'), /application\/json/);
  assert.ok(Number(first.headers.get('content-length')) > 6_000_000);
  const etag = first.headers.get('etag');
  assert.ok(etag);
  await first.arrayBuffer();
  const second = await fetch(base + path, { headers: { 'If-None-Match': etag } });
  assert.equal(second.status, 304);
  assert.equal((await second.arrayBuffer()).byteLength, 0);
});

test('HEAD and method restrictions behave correctly', async () => {
  const html = await (await fetch(base + '/')).text();
  const cssPath = html.match(/href="(\/assets\/[^\"]+\.css)"/)?.[1];
  assert.ok(cssPath, 'Built HTML must reference a CSS asset');
  const head = await fetch(base + cssPath, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.ok(Number(head.headers.get('content-length')) > 0);
  const post = await fetch(base + '/', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
});

test('Google-only build has no legacy Leaflet CDN tags', async () => {
  const response = await fetch(base + '/');
  const html = await response.text();
  assert.doesNotMatch(html, /leaflet\.(?:css|js)|tile\.openstreetmap\.org/i);
  assert.match(html, /<script[^>]+src="\/assets\/[^\"]+\.js"/);
});

test('favicon serves as SVG, not the HTML shell', async () => {
  const res = await fetch(base + '/favicon.svg');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await res.text(), /<svg/);
});

test('embedded Discover permits same-origin framing and keeps its module executable', async () => {
  const catalog = await fetch(base + '/catalog/index.html?embedded=1');
  assert.equal(catalog.status, 200);
  assert.equal(catalog.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(await catalog.text(), /catalog-app\.mjs/);
  const cached = await fetch(base + '/catalog/index.html', { headers: { 'If-None-Match': catalog.headers.get('etag') } });
  assert.equal(cached.status, 304);
  assert.equal(cached.headers.get('x-frame-options'), 'SAMEORIGIN');
  const module = await fetch(base + '/catalog/catalog-navigation.mjs');
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type'), /javascript/);
  assert.equal(module.headers.get('x-frame-options'), 'DENY');
  assert.match(await module.text(), /filtersFromSearch/);
});
