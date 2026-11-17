import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function webServer(t, dev) {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const directory = mkdtempSync(join(tmpdir(), 'tracker-web-test-'));
  const child = spawn(process.execPath, ['server/index.js', ...(dev ? ['--dev'] : [])], {
    cwd: root, windowsHide: true,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', APP_ORIGIN: `http://127.0.0.1:${port}`, DATA_DIR: directory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && basename(directory).startsWith('tracker-web-test-'));
    rmSync(directory, { recursive: true, force: true });
  });
  let output = '';
  const errors = [];
  child.stderr.on('data', data => errors.push(String(data)));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout: ' + errors.join(''))), 20000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${errors.join('')}`)); });
    child.stdout.on('data', data => {
      output += String(data);
      if (output.includes('Minecraft Tracker listening')) { clearTimeout(timer); resolve(); }
    });
  });
  return { get: path => fetch(`http://127.0.0.1:${port}${path}`), directory };
}

for (const dev of [false, true]) test(`${dev ? 'development' : 'production'} server blocks private files and collection access`, async t => {
  const f = await webServer(t, dev);
  assert.equal((await f.get('/')).status, 200);
  assert.equal((await f.get('/api/auth/session')).status, 200);
  for (const path of ['/api/v1/items', '/api/v1/progress', '/api/keys', '/item-icons/manifest.json']) {
    assert.equal((await f.get(path)).status, 401, path);
  }
  for (const path of ['/public/item-icons/manifest.json', '/dist/item-icons/manifest.json', `/@fs/${root.replaceAll('\\', '/')}/public/item-icons/manifest.json`]) {
    assert.ok((await f.get(path)).status >= 400, path);
  }
  for (const path of ['/.env', '/%2eenv', '/.tracker.local/setup-code.txt', '/.tracker.local/tracker.sqlite', '/server/app.js', '/scripts/extractItemIcons.py', `/@fs/${f.directory.replaceAll('\\', '/')}/setup-code.txt`]) {
    assert.ok((await f.get(path)).status >= 400, path);
  }
  if (dev) {
    const client = await (await f.get('/@vite/client')).text();
    const dependency = client.match(/(?:from|import)\s*["']([^"']+\/env\.mjs)["']/)?.[1];
    assert.ok(dependency, 'Vite runtime dependency must be discoverable');
    assert.equal((await f.get(dependency)).status, 200, 'Do not block .pnpm runtime files');
    for (const path of ['/node_modules/.vite/deps/react.js', '/src/main.jsx']) assert.equal((await f.get(path)).status, 200);
  } else {
    const response = await f.get('/');
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
    const html = await response.text();
    const bundle = html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
    assert.ok(bundle);
    assert.equal((await f.get(bundle)).status, 200);
  }
});
