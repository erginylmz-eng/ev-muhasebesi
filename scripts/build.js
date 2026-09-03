#!/usr/bin/env node
/*
 * src/app.html + src/app.js + src/initial_state.json dosyalarını tek bir
 * yayına hazır HTML dosyasında birleştirir (dist/final.html).
 *
 * Çıktı dosyası Claude Artifact aracına verilecek "fragment" formatındadır:
 * <!doctype html>/<html>/<head>/<body> sarmalayıcıları YOKTUR — bunlar
 * Artifact tarafından ilk yayında otomatik eklenir. Sayfa daha sonra kendi
 * kendini güncellerken (kullanıcı bir hareket/hesap kaydettiğinde) tam bir
 * HTML belgesi src/app.js içindeki buildFullDocument() tarafından ayrıca
 * ve dinamik olarak üretilir.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'final.html');

function build() {
  const template = fs.readFileSync(path.join(SRC, 'app.html'), 'utf8');
  const initialState = JSON.parse(fs.readFileSync(path.join(SRC, 'initial_state.json'), 'utf8'));
  const appJs = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');

  const stateJson = JSON.stringify(initialState).replace(/</g, '\\u003c');

  let html = template;
  if (!html.includes('__STATE_JSON__') || !html.includes('__APP_JS__')) {
    throw new Error('src/app.html şablonunda __STATE_JSON__ veya __APP_JS__ yer tutucusu bulunamadı.');
  }
  /* Not: replace()'e ikinci argüman olarak STRING verilirse "$'", "$&", "$1" gibi
     özel değiştirme kalıpları yorumlanır — appJs veya stateJson içinde tesadüfen
     böyle bir dizi geçerse (ör. bir para birimi sembolü tek tırnakla bitip "$'"
     oluşursa) çıktı sessizce bozulur. Fonksiyon replacer kullanmak bunu tamamen
     devre dışı bırakır. */
  html = html.replace('__STATE_JSON__', function(){ return stateJson; });
  html = html.replace('__APP_JS__', function(){ return appJs; });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  console.log('Yazıldı:', path.relative(ROOT, OUT_FILE), '(' + Buffer.byteLength(html) + ' bayt)');
}

build();
