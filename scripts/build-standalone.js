#!/usr/bin/env node
/*
 * Bağımsız barındırma (Claude hesabına bağımlı olmayan, ör. GitHub Pages)
 * için tam bir HTML belgesi üretir: docs/index.html.
 *
 * src/app.html'deki <style id="app-style">...</style> içeriğini (CSS'i
 * ayrıca kopyalamamak için) çıkarır, src/app.js'i ve firebase.config.json'u
 * src/standalone.html şablonuna yerleştirir. app.js'in KENDİSİNE hiçbir yer
 * tutucu eklenmez — bu build scripts/build.js ve scripts/build-publish.js'in
 * (Claude Artifact yolu) çalışma şeklini etkilemez.
 *
 * ÖNEMLİ: Bu script veya bu depo hiçbir zaman gerçek kullanıcı verisi
 * (hesap/IBAN/bakiye vb.) içermemeli — repo public olabileceğinden, veri
 * taşıma her zaman kullanıcının Ayarlar ekranından kendi elleriyle
 * yapıştırdığı bir yedek üzerinden yapılır (bkz. app.js: fb-restore-import).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'docs');
const OUT_FILE = path.join(OUT_DIR, 'index.html');

function extractAppStyle(appHtml) {
  const m = appHtml.match(/<style id="app-style">([\s\S]*?)<\/style>/);
  if (!m) throw new Error('src/app.html içinde <style id="app-style"> bulunamadı.');
  return m[1];
}

function build() {
  const appHtml = fs.readFileSync(path.join(SRC, 'app.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
  const template = fs.readFileSync(path.join(SRC, 'standalone.html'), 'utf8');
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.config.json'), 'utf8'));

  const appStyle = extractAppStyle(appHtml);
  const firebaseConfigJson = JSON.stringify(firebaseConfig).replace(/</g, '\\u003c');

  ['__APP_STYLE__', '__FIREBASE_CONFIG_JSON__', '__APP_JS__'].forEach(function(token){
    if (!template.includes(token)) throw new Error('src/standalone.html şablonunda ' + token + ' yer tutucusu bulunamadı.');
  });

  let html = template;
  /* Not: replace()'e ikinci argüman olarak STRING verilirse "$'", "$&" gibi
     özel değiştirme kalıpları yorumlanır — büyük app.js/CSS içeriğinde
     tesadüfen böyle bir dizi geçerse çıktı sessizce bozulur. Fonksiyon
     replacer kullanmak bunu tamamen devre dışı bırakır (bkz. build.js). */
  html = html.replace('__APP_STYLE__', function(){ return appStyle; });
  html = html.replace('__FIREBASE_CONFIG_JSON__', function(){ return firebaseConfigJson; });
  html = html.replace('__APP_JS__', function(){ return appJs; });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  // GitHub Pages'in /docs klasörünü Jekyll ile işlemeye çalışmasını engeller.
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');
  console.log('Yazıldı:', path.relative(ROOT, OUT_FILE), '(' + Buffer.byteLength(html) + ' bayt)');
  console.log('Firebase projesi:', firebaseConfig.projectId);
}

build();
