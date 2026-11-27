// Guided build-and-install of CleanTV on a Samsung TV.
//
//   npm run tv:setup [-- opções]
//
//   --builder wsl|docker|native  where the Python build tools run (default: wsl on
//                                Windows when the distro exists, otherwise docker;
//                                native python3 on macOS/Linux)
//   --distro NOME                WSL distro (default: "wsl" in .local/device.json,
//                                then clean-tizen-home)
//   --certs PASTA                Docker: certificate profile folder (default: read
//                                from Tizen Studio's profiles.xml)
//   --tv NOME | --host IP        TV to install on (default: ask)
//   --skip-checks                skip lint/tests/check.py
//   --no-package                 install the existing dist/CleanFrame.wgt
//   --no-backup                  skip the preferences backup before installing
//   --no-launch                  do not open the app at the end
//   --build-only                 only checks + package/sign; no TV needed
//   --yes                       accept every default (non-interactive)
//
// Steps: environment → TV → checks → package/sign → backup → install → open.
// Installing uses a fixed temporary path on the TV and empties it afterwards, so
// repeated installs do not fill the TV's temporary partition (download failed[116]).
// Home/startup settings are never changed.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, Sdb, appIdentity, deviceConfig, findSdb, parseArgs, pickTv, profileCertDir, prompter, rememberTv, writeJson } from './tv-common.mjs';
import { backup } from './tv-backup.mjs';

const WIDGET = join(ROOT, 'dist', 'CleanFrame.wgt');
const REMOTE = '/home/owner/share/tmp/sdk_tools/CleanTV.wgt';
const IMAGE = 'cleantv-tizen-cli';
const DEFAULT_DISTRO = 'clean-tizen-home';
const TOTAL = 7;
const isWin = process.platform === 'win32';

function step(n, title) { console.log('\n[' + n + '/' + TOTAL + '] ' + title); }
function info(text) { console.log('  ' + text); }
function quiet(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, env: { ...process.env, WSL_UTF8: '1' } });
  return { code: r.status ?? -1, out: (r.stdout || '') + (r.stderr || '') };
}
function loud(cmd, args, env) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', windowsHide: true, env: { ...process.env, WSL_UTF8: '1', ...env } });
  return r.status ?? -1;
}
function wslPath(p) { return p.replace(/^([A-Za-z]):/, (_, d) => '/mnt/' + d.toLowerCase()).replace(/\\/g, '/'); }

/* ---------- Builders: where scripts/check.py and scripts/package.py run ---------- */
function wslDistros() { return quiet('wsl.exe', ['-l', '-q']).out.split(/\r?\n/).map(s => s.replace(/\0/g, '').trim()).filter(Boolean); }
function dockerReady() { return quiet('docker', ['version', '--format', '{{.Server.Version}}']).code === 0; }

async function makeBuilder(args, ui, identity, sdbPath) {
  const cfg = deviceConfig();
  let kind = args.builder;
  const distro = args.distro || cfg.wsl || DEFAULT_DISTRO;
  if (!kind) kind = isWin ? (wslDistros().includes(distro) ? 'wsl' : 'docker') : 'native';
  if (kind === 'wsl') {
    if (!isWin) throw new Error('--builder wsl só existe no Windows.');
    if (!wslDistros().includes(distro)) throw new Error('A distro WSL "' + distro + '" não existe. Crie com: wsl --install Ubuntu-24.04 --name ' + distro + '  (ou use --builder docker).');
    const cd = wslPath(ROOT);
    info('Ferramentas Python: WSL "' + distro + '"');
    return { kind, run: script => loud('wsl.exe', ['-d', distro, '--cd', cd, '--', 'python3', 'scripts/' + script]) };
  }
  if (kind === 'native') {
    if (quiet('python3', ['--version']).code !== 0) throw new Error('python3 não encontrado.');
    info('Ferramentas Python: python3 local');
    return { kind, run: script => loud('python3', ['scripts/' + script]) };
  }
  if (kind !== 'docker') throw new Error('--builder deve ser wsl, docker ou native.');
  if (!dockerReady()) throw new Error('O Docker não está rodando. Abra o Docker Desktop e tente de novo.');
  if (quiet('docker', ['image', 'inspect', IMAGE]).code !== 0) {
    info('A imagem ' + IMAGE + ' ainda não existe (baixa o Tizen CLI, ~1 GB).');
    if (!await ui.confirm('  Construir agora?')) throw new Error('Sem a imagem Docker não há como empacotar.');
    if (loud('docker', ['build', '-t', IMAGE, join(ROOT, 'docker', 'tizen-cli')]) !== 0) throw new Error('Falha ao construir a imagem Docker.');
  }
  const certs = args.certs ? resolve(args.certs) : identity.profile && profileCertDir(sdbPath, identity.profile);
  if (!certs || !existsSync(join(certs, 'author.p12')) || !existsSync(join(certs, 'distributor.p12'))) {
    throw new Error('Não achei author.p12/distributor.p12 do perfil "' + identity.profile + '". Informe a pasta com --certs.');
  }
  // The container signs with its own SDK path and reads the password from a file the
  // entrypoint writes in the container's /tmp (Windows .pwd files are machine-bound).
  const signing = join(ROOT, '.local', 'docker', 'signing.json');
  writeJson(signing, { sdk_path: '/home/tizen/tizen-studio', profile: identity.profile, package_id: identity.packageId, app_id: identity.appId, password_file: '/tmp/cleantv-cert-password' });
  info('Ferramentas Python: Docker (' + IMAGE + '); certificados de ' + certs);
  let password = null;
  const base = ['run', '--rm', '-v', ROOT + ':/work'];
  return {
    kind,
    run: async script => {
      if (script !== 'package.py') return loud('docker', [...base, IMAGE, 'python3', 'scripts/' + script]);
      if (password === null) password = process.env.CLEANTV_CERT_PASSWORD || await ui.secret('  Senha do certificado "' + identity.profile + '" (não aparece na tela):');
      return loud('docker', [...base, '-v', signing + ':/work/.local/signing.json:ro', '-v', certs + ':/certs:ro',
        '-e', 'CLEANTV_PROFILE=' + identity.profile, '-e', 'CLEANTV_CERT_PASSWORD', IMAGE, 'python3', 'scripts/' + script], { CLEANTV_CERT_PASSWORD: password });
    }
  };
}

/* ---------- Install on the TV through one fixed temporary path ---------- */
function installHint(out) {
  if (/download failed\[116\]|No space/i.test(out)) return 'O espaço temporário da TV está cheio. Veja "install space issue" em .local/setup-record.md.';
  if (/signature|author|certificate|cert/i.test(out)) {
    return 'A versão instalada foi assinada com outro certificado de autor. Atualizar exige desinstalar antes '
      + '(o que apaga as preferências): faça npm run tv:backup, desinstale, instale de novo e use npm run tv:restore.';
  }
  return 'Veja a saída acima.';
}
function install(sdb, appId) {
  const empty = join(tmpdir(), 'cleantv-empty.wgt');
  writeFileSync(empty, '');
  try {
    info('Enviando o pacote (' + Math.round(statSync(WIDGET).size / 1e6) + ' MB)…');
    const pushed = sdb.run(['push', WIDGET, REMOTE], { timeout: 300000 });
    if (!/1 file\(s\) pushed/.test(pushed.out) || /failed/i.test(pushed.out)) throw new Error('A TV não confirmou o envio: ' + pushed.out.trim());
    info('Instalando…');
    const out = sdb.shell('vd_appinstall', appId, REMOTE).out;
    if (!/install completed/i.test(out) || /install failed/i.test(out)) {
      throw new Error('A instalação falhou:\n' + out.trim().split(/\r?\n/).slice(-6).join('\n') + '\n' + installHint(out));
    }
  } finally {
    // sdb cannot delete there; an empty file at the same path frees the space.
    sdb.run(['push', empty, REMOTE], { timeout: 60000 });
  }
  if (!sdb.installed(appId)) throw new Error('O app não apareceu na lista de apps instalados da TV.');
}

async function checks(args, builder) {
  if (args['skip-checks']) { info('Puladas (--skip-checks).'); return; }
  const eslint = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
  if (!existsSync(eslint)) throw new Error('Dependências ausentes: rode npm ci.');
  if (loud(process.execPath, [eslint, 'app']) !== 0) throw new Error('O lint encontrou problemas.');
  if (loud(process.execPath, ['--test', '--test-reporter=dot', 'scripts/test-device.mjs']) !== 0) throw new Error('Os testes do adaptador falharam.');
  if (await builder.run('check.py') !== 0) throw new Error('scripts/check.py falhou.');
  info('Tudo certo.');
}
async function packageWidget(args, builder, started) {
  if (args['no-package']) {
    if (!existsSync(WIDGET)) throw new Error('dist/CleanFrame.wgt não existe; rode sem --no-package.');
    info('Usando o pacote existente de ' + statSync(WIDGET).mtime.toLocaleString() + '.');
    return;
  }
  if (await builder.run('package.py') !== 0) throw new Error('O empacotamento falhou (veja a mensagem acima).');
  if (!existsSync(WIDGET) || statSync(WIDGET).mtimeMs < started) throw new Error('dist/CleanFrame.wgt não foi atualizado.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2), ['yes', 'help', 'skip-checks', 'no-package', 'no-backup', 'no-launch', 'build-only']);
  if (args.help) { console.log(readHelp()); return; }
  const ui = prompter(args.yes);
  const started = Date.now();
  try {
    console.log('CleanTV — instalação guiada');

    step(1, 'Ambiente');
    const identity = appIdentity();
    info('App: ' + identity.appId + (identity.profile ? '  ·  perfil de assinatura: ' + identity.profile : ''));
    const sdbPath = findSdb();
    if (!sdbPath) throw new Error('Não encontrei o sdb do Tizen Studio. Instale o Tizen Studio ou informe "sdb" em .local/device.json.');
    info('sdb: ' + sdbPath);
    const builder = args['no-package'] && args['skip-checks'] ? null : await makeBuilder(args, ui, identity, sdbPath);

    if (args['build-only']) {
      step(3, 'Verificações');
      await checks(args, builder);
      step(4, 'Empacotar e assinar');
      await packageWidget(args, builder, started);
      console.log('\nPacote pronto em dist/CleanFrame.wgt (--build-only: nada foi enviado à TV).');
      return;
    }

    step(2, 'TV');
    const tv = await pickTv(args, ui);
    if (tv.fresh && await ui.confirm('  Guardar "' + tv.name + '" (' + tv.host + ') em .local/device.json?')) rememberTv(tv, false);
    const sdb = new Sdb(sdbPath, tv.host);
    info('Conectando a ' + tv.name + ' (' + tv.host + ')…');
    const c = sdb.connect();
    if (!c.ok) {
      throw new Error('A TV não respondeu: ' + c.out + '\nConfira: TV ligada, mesma rede, Modo Desenvolvedor ativo '
        + '(Apps → digite 12345) com o IP deste computador. Se acabou de ativar, reinicie a TV.');
    }
    const wasInstalled = sdb.installed(identity.appId);
    info(wasInstalled ? 'O CleanTV já está instalado: será atualizado no lugar.' : 'O CleanTV ainda não está instalado nesta TV.');

    step(3, 'Verificações');
    await checks(args, builder);

    step(4, 'Empacotar e assinar');
    await packageWidget(args, builder, started);

    step(5, 'Backup das preferências');
    if (!wasInstalled) info('Nada a guardar: o app não está instalado.');
    else if (args['no-backup']) info('Pulado (--no-backup).');
    else if (await ui.confirm('  Guardar as preferências atuais antes de instalar? (o app reinicia na TV)')) {
      try { info('Backup salvo: ' + await backup({ sdb }, tv, identity.appId, { label: 'antes-de-instalar' })); }
      catch (err) {
        info('O backup falhou: ' + err.message);
        if (!await ui.confirm('  Continuar a instalação mesmo assim?', false)) throw new Error('Instalação cancelada.');
      }
    }

    step(6, 'Instalar');
    if (!await ui.confirm('  Instalar o CleanTV em ' + tv.name + ' agora?')) throw new Error('Instalação cancelada.');
    install(sdb, identity.appId);
    info('Instalação confirmada. As configurações de Home/inicialização da TV não foram alteradas.');

    step(7, 'Abrir');
    if (args['no-launch']) info('Pulado (--no-launch).');
    else if (await ui.confirm('  Abrir o CleanTV na TV agora?')) {
      const out = sdb.shell('execute', identity.appId).out;
      info(/successfully launched/i.test(out) ? 'App aberto.' : 'A TV não confirmou a abertura: ' + out.trim());
    }
    console.log('\nPronto. Confira o resultado na tela da TV.');
  } catch (err) {
    console.error('\nErro: ' + err.message);
    process.exitCode = 1;
  } finally { ui.close(); }
}

function readHelp() {
  return 'Uso: npm run tv:setup [-- --builder wsl|docker|native] [--tv NOME | --host IP] [--yes]\n'
    + '     [--distro NOME] [--certs PASTA] [--skip-checks] [--no-package] [--no-backup] [--no-launch] [--build-only]\n'
    + 'Detalhes no topo de scripts/tv-setup.mjs.';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
