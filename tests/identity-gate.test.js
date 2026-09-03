const { chromium } = require('playwright');
const path = require('path');

/* Not: bu test yerel dosya (file://) üzerinde çalışır, gerçek artifact yayın
   arka ucu yoktur; bu yüzden tek bir sayfa/bağlam içinde ilerler (state,
   sayfa yeniden yüklenene kadar bellekte tutulur). Onaylanan bir kişinin
   BAŞKA bir cihazda otomatik güncellenmesi, yalnızca gerçek yayınlı
   artifact'ta claude.use('artifact') geri çağrısıyla test edilebilir. */

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.route('**://fonts.g*/**', route => route.abort());
  await page.goto('file://' + path.resolve(__dirname, '../dist/final.html'));
  await page.waitForTimeout(200);

  console.log('giriş perdesi görünüyor mu (1):', await page.locator('.gate-screen').count());
  console.log('tabbar görünmüyor mu (0 olmalı):', await page.locator('.tabbar').count());
  console.log('onaylı kişi butonları (Ergin, Eş = 2):', await page.locator('.gate-person-btn').count());

  // ---- "yeni kişiyim" akışı ile erişim iste ----
  await page.click('[data-action="identity-request-toggle"]');
  await page.waitForTimeout(100);
  await page.fill('#modal-first-input', 'Yeni Kişi Test');
  await page.click('form[data-action="identity-request-submit"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('istekten sonra bekleme ekranı göründü mü:', await page.locator('.gate-screen', { hasText: 'onayını bekliyor' }).count());
  console.log('bekleme ekranında tabbar yok mu (0 olmalı):', await page.locator('.tabbar').count());

  // "ben bu değilim" ile geri dön, Ergin (yönetici) olarak gir
  await page.click('[data-action="identity-logout"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);
  console.log('yönetici uygulamayı görüyor mu (tabbar=1):', await page.locator('.tabbar').count());

  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(100);
  console.log('onay bekleyenler bölümü var mı:', await page.locator('.section-title', { hasText: 'Onay Bekleyenler' }).count());
  console.log('bekleyen kişi adı görünüyor mu:', await page.locator('.switch-row', { hasText: 'Yeni Kişi Test' }).count());

  await page.click('.switch-row:has-text("Yeni Kişi Test") [data-action="approve-person"]');
  await page.waitForTimeout(200);
  console.log('onaylandıktan sonra bölüm kayboldu mu (0 olmalı):', await page.locator('.section-title', { hasText: 'Onay Bekleyenler' }).count());
  console.log('onaylanan kişi aile üyeleri listesinde mi:', await page.locator('.switch-row', { hasText: 'Yeni Kişi Test' }).count());

  // ---- yeni onaylanan kişi olarak tekrar giriş yapınca artık tam erişim olmalı ----
  await page.click('[data-action="identity-logout"]');
  await page.waitForTimeout(100);
  console.log('geri dönünce onaylı kişi sayısı (3: Ergin, Eş, Yeni Kişi Test):', await page.locator('.gate-person-btn').count());
  await page.click('.gate-person-btn:has-text("Yeni Kişi Test")');
  await page.waitForTimeout(150);
  console.log('onaylanan kişi artık uygulamayı görüyor mu (tabbar=1):', await page.locator('.tabbar').count());

  // bu kişi yönetici değil, Ayarlar'da yönetim düğmeleri görünmemeli
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(100);
  console.log('yönetici olmayan kişi kişi ekleme formunu görmüyor mu (0 olmalı):', await page.locator('form[data-action="add-person"]').count());

  // ---- son yönetici koruması: Ergin olarak gir, tek yöneticiyi kaldırmayı dene ----
  await page.click('[data-action="identity-logout"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(100);
  await page.click('.switch-row:has-text("Ergin") [data-action="toggle-admin"]');
  await page.waitForTimeout(150);
  console.log('tek yöneticiyi kaldırma engellendi mi (toast görünmeli):', await page.locator('.toast', { hasText: 'yönetici kalmalı' }).count());
  console.log('Ergin hâlâ yönetici mi:', await page.locator('.switch-row:has-text("Ergin") .pill', { hasText: 'Yönetici' }).count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
