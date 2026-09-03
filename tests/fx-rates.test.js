/* Döviz hesapları için manuel kur girişi (madde 2) doğrulama testi. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = path.join(__dirname, '../dist/final.html');
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  await page.goto('file://' + file);
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  // Dolar cinsinden bir banka hesabı ekle (Özet -> Varlık Durumu -> Banka -> Hesaplar)
  await page.click('[data-action="toggle-asset"][data-key="banka"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="toggle-asset"][data-key="banka_bank"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="quick-add-account"][data-type="bank"]');
  await page.waitForTimeout(100);
  await page.fill('#modal-first-input', 'Dolar Hesabım');
  await page.fill('input[name="opening"]', '1000');
  await page.selectOption('select[name="currency"]', 'USD');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(200);

  // Kur girilmeden: Net Varlık'a dahil değil, uyarı mesajı görünüyor
  console.log('Kur girilmeden dahil edilmedi uyarısı var mı (1 beklenir):', await page.locator('.mute2', { hasText: 'kur girilmediği için' }).count());
  const heroBefore = await page.locator('.hero .figure').first().innerText();
  console.log('Kur girilmeden hero net durum:', heroBefore);

  // Ayarlar'dan USD kurunu gir
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(150);
  await page.fill('input[name="rate_USD"]', '40');
  await page.click('form[data-action="save-fx-rates"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('Kur kaydedildi toast:', await page.locator('.toast', { hasText: 'Döviz kurları güncellendi' }).count());

  // Net Varlık'a dahil oldu mu (1000 USD * 40 = 40.000 TL eklenmiş olmalı)
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  console.log('Kur girildikten sonra dahil edildi mesajı var mı (1 beklenir):', await page.locator('.mute2', { hasText: 'Net Varlık toplamına dahil edildi' }).count());
  const heroAfter = await page.locator('.hero .figure').first().innerText();
  console.log('Kur girildikten sonra hero net durum (40.000 artmış olmalı):', heroAfter);

  // Net Varlık kırılımında "Döviz Hesapları (TL karşılığı)" satırı var mı
  await page.click('[data-action="toggle-asset"][data-key="net"]');
  await page.waitForTimeout(100);
  const netDetailText = await page.locator('.asset-block', { hasText: 'Net varlık' }).locator('.asset-detail').innerText();
  console.log('Net varlık kırılımı:', netDetailText.replace(/\n/g, ' | '));

  // Hesap detayında TL karşılığı gösteriliyor mu
  await page.click('[data-action="toggle-asset"][data-key="doviz"]');
  await page.waitForTimeout(100);
  await page.locator('.mini-acct', { hasText: 'Dolar Hesabım' }).click();
  await page.waitForTimeout(150);
  console.log('Hesap detayında TL karşılığı satırı:', await page.locator('.sheet .mute2').filter({ hasText: '≈' }).first().innerText().catch(() => 'BULUNAMADI'));

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
