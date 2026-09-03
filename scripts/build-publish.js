#!/usr/bin/env node
/*
 * dist/final.html'den farklı olarak, CANLI (yayınlanmış) artifact'taki
 * GERÇEK kullanıcı verisini koruyarak yeni kodu (src/app.js + src/app.html)
 * yayına hazırlar. Çıktı: dist/publish.html.
 *
 * Neden gerekli: Claude Artifact'a her yayında sayfa TAMAMEN yeniden
 * üretiliyor. Eğer build.js'in ürettiği dist/final.html (src/initial_state.json
 * ile, yani BOŞ/varsayılan veriyle) doğrudan yayınlanırsa, kullanıcının
 * canlıdaki gerçek hesapları/hareketleri kaybolur. Bu script, önceden ayrı
 * bir adımda okunmuş canlı HTML'in içine gömülü gerçek state'i çıkarıp
 * yeni koda enjekte ederek bu riski ortadan kaldırıyor — artık her yayında
 * elle/geçici bir `node -e` betiği yazmaya gerek yok.
 *
 * Kullanım:
 *   node scripts/build-publish.js --live-html <canlıdan-okunan-tam-html-dosyası>
 *   node scripts/build-publish.js --state-json <ham-state-json-dosyası>
 *   node scripts/build-publish.js --fresh   (yalnızca ilk yayın / bilerek sıfırlama için: src/initial_state.json kullanılır)
 *
 * "Canlı HTML" nasıl elde edilir: Artifact aracının `action: "read"` çağrısı
 * canlı sayfanın tam HTML'ini bir dosyaya kaydeder (büyük sayfalarda);
 * o dosya yolu buraya --live-html olarak verilir. Bu script canlı HTML
 * içindeki `<script id="app-state" type="application/json">...</script>`
 * etiketinin içeriğini gerçek state olarak çıkarır.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'publish.html');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--live-html') { out.liveHtml = argv[++i]; }
    else if (argv[i] === '--state-json') { out.stateJson = argv[++i]; }
    else if (argv[i] === '--fresh') { out.fresh = true; }
    else if (argv[i] === '--out') { out.out = argv[++i]; }
  }
  return out;
}

function extractStateFromHtml(html) {
  const m = html.match(/<script id="app-state" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) {
    throw new Error('Verilen HTML içinde <script id="app-state" type="application/json"> etiketi bulunamadı — bu dosya beklenen yayın formatında değil.');
  }
  let raw = m[1];
  // build.js tarafından üretilirken '<' karakterleri '<' olarak escape ediliyordu; JSON.parse bunu zaten çözer.
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error('Çıkarılan app-state JSON olarak ayrıştırılamadı: ' + e.message);
  }
}

function build() {
  const args = parseArgs(process.argv.slice(2));
  const outFile = args.out ? path.resolve(ROOT, args.out) : OUT_FILE;

  let state;
  let source;
  if (args.fresh) {
    state = JSON.parse(fs.readFileSync(path.join(SRC, 'initial_state.json'), 'utf8'));
    source = 'src/initial_state.json (--fresh: BİLEREK varsayılan/boş veriyle yayınlanıyor)';
  } else if (args.stateJson) {
    state = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.stateJson), 'utf8'));
    source = args.stateJson;
  } else if (args.liveHtml) {
    const html = fs.readFileSync(path.resolve(ROOT, args.liveHtml), 'utf8');
    state = extractStateFromHtml(html);
    source = args.liveHtml + ' içindeki canlı state';
  } else {
    console.error('HATA: --live-html <dosya>, --state-json <dosya> veya bilerek boş veriyle yayınlamak için --fresh belirtilmeli.');
    console.error('Örnek: node scripts/build-publish.js --live-html /tmp/canli-artifact.html');
    process.exit(1);
  }

  const template = fs.readFileSync(path.join(SRC, 'app.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
  const stateJson = JSON.stringify(state).replace(/</g, '\\u003c');

  let html = template;
  if (!html.includes('__STATE_JSON__') || !html.includes('__APP_JS__')) {
    throw new Error('src/app.html şablonunda __STATE_JSON__ veya __APP_JS__ yer tutucusu bulunamadı.');
  }
  // build.js'teki notla aynı sebepten fonksiyon replacer kullanılıyor (bkz. build.js).
  html = html.replace('__STATE_JSON__', function(){ return stateJson; });
  html = html.replace('__APP_JS__', function(){ return appJs; });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  console.log('Yazıldı:', path.relative(ROOT, outFile), '(' + Buffer.byteLength(html) + ' bayt)');
  console.log('Kaynak state:', source);
  console.log('Hesap sayısı:', (state.accounts || []).length, '· Hareket sayısı:', (state.transactions || []).length, '· Kişi sayısı:', (state.people || []).length);
}

build();
