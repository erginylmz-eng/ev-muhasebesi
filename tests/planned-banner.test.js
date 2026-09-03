const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.route('**://fonts.g*/**', route => route.abort());
  await page.goto('file:///tmp/seeded_final.html');
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  console.log('planlanan işlemler banner\'ı görünüyor mu:', await page.locator('.planned-banner', { hasText: 'Planlanan işlemler' }).count());
  console.log('iki planlı kayıt da banner içinde mi (2 olmalı):', await page.locator('.planned-banner .recur-item').count());

  // ---- Ertele (A) ----
  await page.click('.planned-banner .recur-item:has-text("Test planlı gider A") [data-action="postpone-planned"]');
  await page.waitForTimeout(150);
  console.log('ertele formu açıldı mı:', await page.locator('form[data-action="save-postpone"]').count());
  await page.fill('input[name="date"]', '2099-01-01');
  await page.click('form[data-action="save-postpone"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('erteledikten sonra banner\'da 1 kayıt kaldı mı (B):', await page.locator('.planned-banner .recur-item').count());

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(100);
  console.log('ertelenen A hâlâ planlandı etiketiyle görünüyor mu:', await page.locator('.tx-row', { hasText: 'Test planlı gider A' }).locator('.planned-pill').count());
  console.log('ertelenen A yeni tarihi 2099 mu:', (await page.locator('.tx-row', { hasText: 'Test planlı gider A' }).locator('.s').innerText()).includes('2099'));

  // ---- Gerçekleşti (B) ----
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(100);
  await page.click('.planned-banner .recur-item:has-text("Test planlı gider B") [data-action="realize-planned"]');
  await page.waitForTimeout(200);
  console.log('gerçekleştirdikten sonra banner tamamen kayboldu mu (0 olmalı):', await page.locator('.planned-banner').count());

  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(100);
  const bankBal = await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-bal .v').innerText();
  console.log('B gerçekleştikten sonra banka bakiyesi (yalnız B düşmeli, 4925,00 ₺ beklenir):', bankBal);

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(100);
  console.log('B artık planlandı etiketi taşımıyor mu (0 olmalı):', await page.locator('.tx-row', { hasText: 'Test planlı gider B' }).locator('.planned-pill').count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
