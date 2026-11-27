// One-command backup and restore of CleanTV's preferences on a TV.
//
//   npm run tv:backup  [-- --tv NOME | --host IP]
//   npm run tv:restore [-- ARQUIVO | latest] [--tv NOME | --host IP] [--yes]
//   npm run tv:backups [-- --tv NOME]                 lists saved backups
//
// Preferences live in the app's localStorage on the TV, which sdb cannot read
// directly. The tool starts the installed app in debug mode (`sdb shell 0 debug`, as
// Tizen Studio does), forwards the inspector port and reads/writes localStorage
// through the DevTools protocol. The app restarts on the TV while this runs.
// Backups are private: .local/backups/<tv>/<date>.json (ignored by git).
// Restore first saves the current state as an automatic "antes-de-restaurar" backup.
//
// Test hook: --cdp-port N talks to a local DevTools port instead of a TV.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, Sdb, appIdentity, findSdb, parseArgs, pickTv, prompter, slug, writeJson } from './tv-common.mjs';

export const BACKUP_DIR = join(ROOT, '.local', 'backups');
const KEY_PREFIX = 'cleanframe.';
const PREF_KEYS = ['cleanframe.home.v1', 'cleanframe.shore.v1'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- DevTools protocol over the forwarded inspector port ---------- */
async function pageSocketUrl(port, waitMs = 15000) {
  const end = Date.now() + waitMs;
  let last = 'sem resposta';
  while (Date.now() < end) {
    try {
      const res = await fetch('http://127.0.0.1:' + port + '/json', { signal: AbortSignal.timeout(3000) });
      const pages = await res.json();
      const page = pages.find(p => p.webSocketDebuggerUrl && (p.type === 'page' || !p.type)) || pages.find(p => p.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, 'ws://127.0.0.1:' + port);
      last = pages.length ? 'o inspetor já está aberto em outro lugar (feche o Tizen Studio/DevTools)' : 'nenhuma página';
    } catch (err) { last = err.message; }
    await sleep(500);
  }
  throw new Error('O inspetor do app não respondeu: ' + last + '.');
}

async function cdp(port) {
  const ws = new WebSocket(await pageSocketUrl(port));
  const waiting = new Map();
  let seq = 0;
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = () => fail(new Error('Não consegui conectar ao inspetor.')); });
  ws.onmessage = ev => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    const w = msg.id && waiting.get(msg.id);
    if (w) { waiting.delete(msg.id); msg.error ? w.fail(new Error(msg.error.message)) : w.ok(msg.result); }
  };
  ws.onclose = () => { for (const w of waiting.values()) w.fail(new Error('O inspetor fechou a conexão.')); waiting.clear(); };
  function send(method, params) {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, fail) => {
      waiting.set(id, { ok, fail });
      setTimeout(() => { if (waiting.delete(id)) fail(new Error(method + ': tempo esgotado.')); }, 10000);
    });
  }
  async function evaluate(expression) {
    let lastErr;
    // The page may still be starting right after the debug launch.
    for (let i = 0; i < 10; i++) {
      try {
        const r = await send('Runtime.evaluate', { expression, returnByValue: true });
        if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
        return r.result.value;
      } catch (err) { lastErr = err; await sleep(500); }
    }
    throw lastErr;
  }
  return { evaluate, close: () => ws.close() };
}

/* Debug-launch the app on the TV and forward its inspector port to this computer. */
async function openInspector(sdb, appId) {
  let r = sdb.shell('debug', appId);
  let m = /port\s*:?\s*(\d+)/i.exec(r.out);
  if (!m) { r = sdb.shell('debug', appId, '300'); m = /port\s*:?\s*(\d+)/i.exec(r.out); }
  if (!m) throw new Error('A TV não abriu o app em modo de depuração: ' + (r.out.trim() || 'sem resposta') + '\nO CleanTV está instalado e assinado com o seu certificado?');
  const port = m[1];
  const f = sdb.run(['forward', 'tcp:' + port, 'tcp:' + port]);
  if (f.code !== 0) throw new Error('Não consegui encaminhar a porta do inspetor: ' + f.out.trim());
  return { port, close: () => sdb.run(['forward', '--remove', 'tcp:' + port]) };
}

async function withPage(target, appId, work) {
  if (target.cdpPort) { const s = await cdp(target.cdpPort); try { return await work(s); } finally { s.close(); } }
  const insp = await openInspector(target.sdb, appId);
  try { const s = await cdp(insp.port); try { return await work(s); } finally { s.close(); } }
  finally { insp.close(); }
}

const READ_ALL = '(function(){var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);'
  + 'if(k.indexOf(' + JSON.stringify(KEY_PREFIX) + ')===0)o[k]=localStorage.getItem(k);}return JSON.stringify(o);})()';

function writeAll(items) {
  return '(function(d){var k,ok=true;for(k in d)localStorage.setItem(k,d[k]);'
    + 'for(k in d)if(localStorage.getItem(k)!==d[k])ok=false;'
    + 'if(ok)setTimeout(function(){location.reload();},150);return ok;})(' + JSON.stringify(items) + ')';
}

/* ---------- Backup files ---------- */
function stamp(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
export function listBackups(tvName, dir = BACKUP_DIR) {
  const folders = tvName ? [slug(tvName)] : existsSync(dir) ? readdirSync(dir) : [];
  const out = [];
  for (const f of folders) {
    const d = join(dir, f);
    if (!existsSync(d)) continue;
    for (const name of readdirSync(d)) if (name.endsWith('.json')) out.push(join(d, name));
  }
  return out.sort((a, b) => basename(a).localeCompare(basename(b)));
}
function readBackup(file) {
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new Error('Backup ilegível: ' + file); }
  if (!data || data.format !== 'cleantv-backup' || typeof data.items !== 'object' || !data.items) throw new Error('Arquivo não é um backup do CleanTV: ' + file);
  const items = {};
  for (const [k, v] of Object.entries(data.items)) if (k.startsWith(KEY_PREFIX) && typeof v === 'string' && !/weather/.test(k)) items[k] = v;
  if (!PREF_KEYS.some(k => k in items)) throw new Error('O backup não contém as preferências do app.');
  for (const k of PREF_KEYS) if (k in items) JSON.parse(items[k]); // must still be valid JSON
  return { data, items };
}

/* Reads the app's preferences and saves them; returns the file path. */
export async function backup(target, tv, appId, { label = '', dir = BACKUP_DIR } = {}) {
  const items = JSON.parse(await withPage(target, appId, s => s.evaluate(READ_ALL)));
  if (!Object.keys(items).length) throw new Error('O app não tem preferências salvas nesta TV (nada para guardar).');
  const file = join(dir, slug(tv.name), stamp() + (label ? '-' + label : '') + '.json');
  writeJson(file, { format: 'cleantv-backup', version: 1, created: new Date().toISOString(), tv: { name: tv.name, host: tv.host }, app_id: appId, items });
  return file;
}

export async function restore(target, tv, appId, file, opts = {}) {
  const { items } = readBackup(file);
  const safety = await backup(target, tv, appId, { label: 'antes-de-restaurar', dir: opts.dir }).catch(err => {
    if (/nada para guardar/.test(err.message)) return null;
    throw err;
  });
  const ok = await withPage(target, appId, s => s.evaluate(writeAll(items)));
  if (ok !== true) throw new Error('A TV não confirmou a gravação das preferências.');
  return safety;
}

/* ---------- CLI ---------- */
async function main() {
  const args = parseArgs(process.argv.slice(2), ['yes', 'help']);
  const cmd = args._[0];
  if (args.help || !['backup', 'restore', 'list'].includes(cmd)) {
    console.log('Uso: node scripts/tv-backup.mjs backup|restore [arquivo|latest]|list [--tv NOME | --host IP] [--yes]');
    process.exit(cmd ? 1 : 0);
  }
  const dir = args.dir ? resolve(args.dir) : BACKUP_DIR;
  const ui = prompter(args.yes);
  try {
    if (cmd === 'list') {
      const files = listBackups(args.tv, dir);
      console.log(files.length ? files.map(f => '  ' + f).join('\n') : 'Nenhum backup em ' + dir);
      return;
    }
    const { appId } = appIdentity();
    let tv, target;
    if (args['cdp-port']) { tv = { name: args.tv || 'teste', host: '127.0.0.1' }; target = { cdpPort: args['cdp-port'] }; }
    else {
      tv = await pickTv(args, ui);
      const sdbPath = findSdb();
      if (!sdbPath) throw new Error('Não encontrei o sdb. Instale o Tizen Studio ou informe "sdb" em .local/device.json.');
      const sdb = new Sdb(sdbPath, tv.host);
      console.log('Conectando a ' + tv.name + ' (' + tv.host + ')…');
      const c = sdb.connect();
      if (!c.ok) throw new Error('A TV não respondeu ao sdb: ' + c.out + '\nConfira se ela está ligada e com o Modo Desenvolvedor apontando para este computador.');
      if (!sdb.installed(appId)) throw new Error('O app ' + appId + ' não está instalado nesta TV.');
      target = { sdb };
    }
    if (cmd === 'backup') {
      console.log('Abrindo o CleanTV em modo de depuração na TV (o app reinicia)…');
      const file = await backup(target, tv, appId, { dir });
      console.log('Backup salvo: ' + file);
    } else {
      let file = args._[1];
      if (!file || file === 'latest') {
        const files = listBackups(tv.name, dir).filter(f => !/antes-de-restaurar/.test(f));
        if (!files.length) throw new Error('Nenhum backup de "' + tv.name + '" em ' + dir + '.');
        file = file === 'latest' ? files[files.length - 1] : await ui.choose('Qual backup restaurar?', files.slice(-10).reverse(), f => basename(f));
      }
      file = resolve(file);
      readBackup(file);
      if (!await ui.confirm('Restaurar ' + basename(file) + ' em ' + tv.name + '? As preferências atuais serão substituídas (um backup delas é salvo antes).', false)) { console.log('Cancelado.'); return; }
      console.log('Abrindo o CleanTV em modo de depuração na TV (o app reinicia)…');
      const safety = await restore(target, tv, appId, file, { dir });
      if (safety) console.log('Estado anterior salvo em: ' + safety);
      console.log('Preferências restauradas; o app recarregou na TV. Confira a tela.');
    }
  } catch (err) {
    console.error('Erro: ' + err.message);
    process.exitCode = 1;
  } finally { ui.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
