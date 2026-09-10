/* Kendi sunucuda (self-hosted, Firebase'siz) barındırma yapısı için duman
   testi: docs/index.html'in (artık YALNIZCA bu self-hosted build'in çıktısı
   — eski Firebase tabanlı GitHub Pages sürümü emekliye ayrıldı, bkz. proje
   notları) hiçbir Firebase SDK'sı yüklemeden, window.__SELFHOSTED__ = true
   bayrağıyla açıldığını ve backend'e (buradan erişilemediği için ağ hatası
   alınması BEKLENEN bir durum) ulaşamayınca düzgün bir hata/giriş ekranı
   gösterdiğini doğrular.

   Gerçek bir Google OAuth akışı ve gerçek Node/Express backend burada test
   EDİLMEZ (headless dosya testinde backend çalışmıyor) — o kısım
   server/server.js'in kendi smoke testiyle (bkz. o dosyanın başındaki not)
   ve gerçek tarayıcıda canlı ortamda elle doğrulanmalıdır. Bu test yalnızca
   istemci tarafının (src/app.js) selfhosted dalının syntaktik olarak
   çalıştığını ve Firebase'e hiçbir referans/bağlantı kalmadığını doğrular. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text()); });

  await page.goto('file://' + path.resolve(__dirname, '../docs/index.html'));
  await page.waitForTimeout(1500);

  console.log('sayfa başlığı:', await page.title());
  console.log('window.__SELFHOSTED__ true mu:', await page.evaluate(() => window.__SELFHOSTED__ === true));
  console.log("window.firebase TANIMSIZ mı (Firebase SDK'si hiç yüklenmedi mi):", await page.evaluate(() => typeof window.firebase === 'undefined'));
  console.log('window.__FIREBASE_CONFIG__ TANIMSIZ mı:', await page.evaluate(() => typeof window.__FIREBASE_CONFIG__ === 'undefined'));
  console.log('sayfa kaynağında "firebasejs" CDN referansı YOK mu:', !(await page.content()).includes('firebasejs'));
  console.log('"Google ile Giriş Yap" düğmesi görünüyor mu (backend\'e ulaşılamadığı için giriş ekranına düşmeli):', await page.locator('[data-action="fb-sign-in"]').count());
  console.log('sayfa kaynağında gerçek kullanıcı verisi YOK mu (güvenlik kontrolü):', !(await page.content()).includes('acc_mtl'));

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
