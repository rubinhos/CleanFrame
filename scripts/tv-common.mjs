// Shared helpers for the host-side TV tools (tv-setup.mjs, tv-backup.mjs).
// They run with Node on the computer that talks to the TV (Windows, macOS or Linux) and
// call the Tizen SDK's sdb directly. Private settings stay in ignored .local/ files:
//
//   .local/device.json  {"host": "<default TV IP>",
//                        "tvs": [{"name": "Sala", "host": "<IP>"}, ...],   optional
//                        "sdb": "<path to sdb>", "wsl": "<WSL distro>"}    optional
//
// "host" keeps working for scripts/tv.py; "tvs" adds named TVs for the guided tools.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const DEVICE_FILE = join(ROOT, '.local', 'device.json');
export const SDB_PORT = 26101;

export function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}
export function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

export function deviceConfig() {
  const cfg = readJson(DEVICE_FILE, {});
  return cfg && typeof cfg === 'object' && !Array.isArray(cfg) ? cfg : {};
}
/* Named TVs from device.json; the legacy single "host" becomes one unnamed entry. */
export function knownTvs(cfg = deviceConfig()) {
  const list = Array.isArray(cfg.tvs) ? cfg.tvs.filter(t => t && isIP(String(t.host)) && t.name) : [];
  if (cfg.host && isIP(String(cfg.host)) && !list.some(t => t.host === cfg.host)) list.unshift({ name: 'TV', host: cfg.host });
  return list;
}
export function rememberTv(tv, makeDefault) {
  const cfg = deviceConfig();
  const tvs = Array.isArray(cfg.tvs) ? cfg.tvs.filter(t => t && t.host !== tv.host && t.name !== tv.name) : [];
  tvs.push({ name: tv.name, host: tv.host });
  cfg.tvs = tvs;
  if (makeDefault || !cfg.host) cfg.host = tv.host;
  writeJson(DEVICE_FILE, cfg);
}
export function slug(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'tv';
}

/* App identity: .local/signing.json when set, otherwise the source manifest. */
export function appIdentity() {
  const signing = readJson(join(ROOT, '.local', 'signing.json'), {}) || {};
  if (signing.app_id && signing.package_id) return { appId: signing.app_id, packageId: signing.package_id, profile: signing.profile || '' };
  const xml = readFileSync(join(ROOT, 'app', 'config.xml'), 'utf8');
  const tag = (/<tizen:application\b[^>]*>/.exec(xml) || [''])[0];
  const appId = (/\sid="([^"]+)"/.exec(tag) || [])[1], packageId = (/\spackage="([^"]+)"/.exec(tag) || [])[1];
  if (!appId || !packageId) throw new Error('Não encontrei a identidade do app em app/config.xml.');
  return { appId, packageId, profile: signing.profile || '' };
}

/* sdb from device.json, then common Tizen Studio locations, then PATH. */
export function findSdb(cfg = deviceConfig()) {
  const exe = process.platform === 'win32' ? 'sdb.exe' : 'sdb';
  const candidates = [cfg.sdb,
    process.env.TIZEN_SDK && join(process.env.TIZEN_SDK, 'tools', exe),
    ...(process.platform === 'win32' ? ['C:\\tizen-studio', 'C:\\dev\\tizen-studio', join(homedir(), 'tizen-studio')] : [join(homedir(), 'tizen-studio')]).map(d => join(d, 'tools', exe))];
  for (const c of candidates) if (c && existsSync(c)) return c;
  const probe = spawnSync(exe, ['version'], { encoding: 'utf8' });
  return probe.status === 0 ? exe : null;
}
/* Tizen Studio data folder (profiles.xml lives in <data>/profile/), from sdk.info. */
export function sdkDataPath(sdbPath) {
  if (!sdbPath || !existsSync(sdbPath)) return null;
  const info = join(dirname(dirname(sdbPath)), 'sdk.info');
  const m = existsSync(info) && /TIZEN_SDK_DATA_PATH=(.+)/.exec(readFileSync(info, 'utf8'));
  return m ? m[1].trim() : null;
}
/* Folder holding author/distributor .p12 + .pwd for a Certificate Manager profile. */
export function profileCertDir(sdbPath, profile) {
  const data = sdkDataPath(sdbPath);
  const file = data && join(data, 'profile', 'profiles.xml');
  if (!file || !existsSync(file)) return null;
  const xml = readFileSync(file, 'utf8');
  const block = new RegExp('<profile name="' + profile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '">([\\s\\S]*?)</profile>').exec(xml);
  const key = block && /distributor="0" key="([^"]+)"/.exec(block[1]);
  return key ? dirname(key[1]) : null;
}

export class Sdb {
  constructor(path, host) { this.path = path; this.host = host; this.serial = host + ':' + SDB_PORT; }
  run(args, { timeout = 60000, target = true } = {}) {
    const r = spawnSync(this.path, target ? ['-s', this.serial, ...args] : args, { encoding: 'utf8', timeout, windowsHide: true });
    return { code: r.status ?? -1, out: (r.stdout || '') + (r.stderr || '') + (r.error ? String(r.error.message) : '') };
  }
  connect() {
    const r = this.run(['connect', this.serial], { target: false, timeout: 20000 });
    const ok = /connected to|already connected/i.test(r.out);
    return { ok, out: r.out.trim() };
  }
  shell(...cmd) { return this.run(['shell', '0', ...cmd]); }
  installed(appId) { return this.shell('applist').out.includes(appId); }
}

/* Terminal prompts; --yes answers every question with its default. */
export function prompter(assumeYes) {
  let rl = null;
  const io = () => rl || (rl = createInterface({ input: process.stdin, output: process.stdout }));
  return {
    assumeYes: !!assumeYes,
    async ask(question, fallback = '') {
      if (assumeYes) { console.log(question + (fallback ? ' ' + fallback : '')); return fallback; }
      const a = (await io().question(question + (fallback ? ' [' + fallback + '] ' : ' '))).trim();
      return a || fallback;
    },
    async confirm(question, yes = true) {
      if (assumeYes) { console.log(question + ' s (--yes)'); return true; }
      const a = (await io().question(question + (yes ? ' [S/n] ' : ' [s/N] '))).trim().toLowerCase();
      return a ? /^(s|sim|y|yes)$/.test(a) : yes;
    },
    /* Hidden input (nothing echoed); never logged or written to disk. */
    async secret(question) {
      if (!process.stdin.isTTY) throw new Error('Para digitar a senha, rode num terminal interativo.');
      if (rl) { rl.close(); rl = null; }
      process.stdout.write(question + ' ');
      const stdin = process.stdin;
      return new Promise(done => {
        let value = '';
        const onData = chunk => {
          for (const ch of chunk) {
            if (ch === '\r' || ch === '\n') { stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); process.stdout.write('\n'); done(value); return; }
            if (ch === '\u0003') { stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130); }
            if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1); else value += ch;
          }
        };
        stdin.setRawMode(true); stdin.setEncoding('utf8'); stdin.resume(); stdin.on('data', onData);
      });
    },
    async choose(question, items, label, fallbackIndex = 0) {
      items.forEach((it, i) => console.log('  ' + (i + 1) + ') ' + label(it)));
      for (;;) {
        const a = await this.ask(question, String(fallbackIndex + 1));
        const n = Number(a);
        if (Number.isInteger(n) && n >= 1 && n <= items.length) return items[n - 1];
        if (assumeYes) throw new Error('Opção inválida: ' + a);
        console.log('  Digite um número de 1 a ' + items.length + '.');
      }
    },
    close() { if (rl) rl.close(); }
  };
}

/* --name value / --flag parsing shared by the tools. */
export function parseArgs(argv, flags) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    if (flags.includes(key)) out[key] = true;
    else if (i + 1 < argv.length) out[key] = argv[++i];
    else throw new Error('Falta o valor de ' + a);
  }
  return out;
}

/* TV choice: --host / --tv, else ask from the known list (or for a new IP). */
export async function pickTv(args, ui) {
  const tvs = knownTvs();
  if (args.host) {
    if (!isIP(args.host)) throw new Error('IP inválido: ' + args.host);
    return tvs.find(t => t.host === args.host) || { name: args.tv || args.host, host: args.host, fresh: true };
  }
  if (args.tv) {
    const hit = tvs.find(t => t.name.toLowerCase() === String(args.tv).toLowerCase());
    if (!hit) throw new Error('TV "' + args.tv + '" não está em .local/device.json. Use --host IP.');
    return hit;
  }
  const NEW = { name: '(outra TV: digitar o IP)', host: '' };
  const items = [...tvs, NEW];
  const choice = tvs.length ? await ui.choose('Qual TV?', items, t => t.host ? t.name + ' — ' + t.host : t.name) : NEW;
  if (choice !== NEW) return choice;
  for (;;) {
    const host = await ui.ask('IP da TV (Modo Desenvolvedor ligado, apontando para este computador):');
    if (isIP(host)) return { name: await ui.ask('Nome para esta TV:', 'TV ' + host), host, fresh: true };
    if (!host || ui.assumeYes) throw new Error('IP inválido.');
    console.log('  IP inválido.');
  }
}
