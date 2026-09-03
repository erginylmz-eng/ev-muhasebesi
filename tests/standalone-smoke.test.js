/* Bağımsız barındırma (Firebase) yapısı için duman testi: docs/index.html'in
   Firebase SDK'ları yükleyip sayfa hatası olmadan "Google ile Giriş Yap"
   ekranını gösterdiğini doğrular. Gerçek bir Google OAuth akışı headless
   ortamda tamamlanamayacağı için giriş SONRASI (household/Firestore) akış
   burada test edilmez — o kısım gerçek tarayıcıda elle doğrulanmalıdır. */
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
  console.log('"Google ile Giriş Yap" düğmesi görünüyor mu:', await page.locator('[data-action="fb-sign-in"]').count());
  console.log('window.firebase yüklendi mi:', await page.evaluate(() => typeof window.firebase !== 'undefined'));
  console.log('window.__FIREBASE_CONFIG__ projectId:', await page.evaluate(() => window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__.projectId));
  console.log('sayfa kaynağında gerçek kullanıcı verisi YOK mu (güvenlik kontrolü):', !(await page.content()).includes('acc_mtl'));

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
