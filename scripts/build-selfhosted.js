#!/usr/bin/env node
/*
 * Firebase'siz, tamamen kendi sunucuda (self-hosted) barındırma için tam bir
 * HTML belgesi üretir: docs/index.html.
 *
 * Bu, eski build-standalone.js'in (Firebase Auth + Firestore tabanlı, GitHub
 * Pages için) yerini alır. Kullanıcının kararı: artık tek adres
 * butce.wonsideas.com; eski Firebase tabanlı GitHub Pages sitesi emekliye
 * ayrıldı (bkz. proje notları). docs/index.html buradan itibaren SADECE bu
 * self-hosted build'in çıktısıdır.
 *
 * src/app.html'deki <style id="app-style">...</style> içeriğini (CSS'i ayrıca
 * kopyalamamak için) çıkarır, src/app.js'i src/standalone-selfhosted.html
 * şablonuna yerleştirir. Bu şablon hiçbir Firebase SDK'sı içermez;
 * window.__SELFHOSTED__ = true bayrağıyla src/app.js kendi Node/Express
 * backend'ine (server/server.js) konuşur (/api/... uçları, aynı origin'de,
 * nginx reverse-proxy ile).
 *
 * ÖNEMLİ: Bu script veya bu depo hiçbir zaman gerçek kullanıcı verisi
 * (hesap/IBAN/bakiye vb.) içermemeli — repo public olabileceğinden, veri
 * taşıma her zaman kullanıcının Ayarlar ekranından kendi elleriyle
 * yaptığı bir yedek/OAuth girişi üzerinden yapılır.
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
  const template = fs.readFileSync(path.join(SRC, 'standalone-selfhosted.html'), 'utf8');

  const appStyle = extractAppStyle(appHtml);

  ['__APP_STYLE__', '__APP_JS__'].forEach(function(token){
    if (!template.includes(token)) throw new Error('src/standalone-selfhosted.html şablonunda ' + token + ' yer tutucusu bulunamadı.');
  });

  let html = template;
  /* Not: replace()'e ikinci argüman olarak STRING verilirse "$'", "$&" gibi
     özel değiştirme kalıpları yorumlanır — büyük app.js/CSS içeriğinde
     tesadüfen böyle bir dizi geçerse çıktı sessizce bozulur. Fonksiyon
     replacer kullanmak bunu tamamen devre dışı bırakır (bkz. build.js). */
  html = html.replace('__APP_STYLE__', function(){ return appStyle; });
  html = html.replace('__APP_JS__', function(){ return appJs; });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  // GitHub Pages'in /docs klasörünü Jekyll ile işlemeye çalışmasını engeller
  // (artık GitHub Pages kullanılmıyor olsa da, zararsız/gereksiz bir dosya).
  fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');
  console.log('Yazıldı:', path.relative(ROOT, OUT_FILE), '(' + Buffer.byteLength(html) + ' bayt)');
  console.log('Backend: self-hosted (Firebase yok) — /api/... uçları aynı origin üzerinden beklenir.');
}

build();
