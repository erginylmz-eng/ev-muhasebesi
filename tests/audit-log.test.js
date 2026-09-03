/* Madde 7: Kayıt geçmişi (audit log) — kişi bazlı yetkilendirme yerine
   sadece kim-ne-zaman-ne-yaptı bilgisi tutuluyor mu. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = path.join(__dirname, '../dist/final.html');
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !/ERR_TUNNEL/.test(msg.text())) errors.push('CONSOLE: ' + msg.text()); });

  await page.goto('file://' + file);
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(150);
  console.log('Kayıt Geçmişi bölümü var mı:', await page.locator('.section-title', { hasText: 'Kayıt Geçmişi' }).count());
  console.log('Boşken mesaj var mı:', await page.locator('.section-title:has-text("Kayıt Geçmişi") + .card').innerText());

  // Bir işlem yap (gelir ekle) -> günlüğe düşmeli
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  await page.click('.fab[data-action="open-tx"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="tx-type"][data-val="income"]');
  await page.fill('#modal-first-input', '1234');
  await page.click('.cat-opt >> nth=0');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  // Yeni bir aile ferdi ekle -> günlüğe düşmeli
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(150);
  await page.fill('form[data-action="add-person"] input[name="name"]', 'Test Kişi');
  await page.click('form[data-action="add-person"] button[type=submit]');
  await page.waitForTimeout(150);

  const logText = await page.locator('.section-title:has-text("Kayıt Geçmişi") + .card').innerText();
  console.log('Günlük içeriği:\n' + logText);
  console.log('Gelir eklendi kaydı var mı:', logText.includes('Gelir eklendi'));
  console.log('Kişi eklendi kaydı var mı:', logText.includes('Test Kişi eklendi'));
  console.log('Kaydeden kişi (Ergin) görünüyor mu:', logText.includes('Ergin'));

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
