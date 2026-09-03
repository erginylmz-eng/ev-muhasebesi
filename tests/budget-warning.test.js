/* Madde 4: Bütçe aşımı karşılaştırması ve uyarısı. */
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

  // Market / Gıda kategorisine 1000 TL bütçe koy
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(150);
  const budgetInputs = page.locator('form[data-action="save-budgets"] input');
  await budgetInputs.first().fill('1000');
  await page.click('form[data-action="save-budgets"] button[type=submit]');
  await page.waitForTimeout(200);
  await page.waitForSelector('.toast', { state: 'hidden', timeout: 4000 }).catch(function(){});

  console.log('Bütçe koymadan önce Özette uyarı var mı (0 beklenir):', await page.locator('.budget-warning-banner').count());

  // Nakit hesabına önce yeterli bakiye ekle (gider eksiye düşüremez kuralı için)
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  await page.click('.fab[data-action="open-tx"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="tx-type"][data-val="income"]');
  await page.fill('#modal-first-input', '5000');
  await page.click('.cat-opt >> nth=0');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);

  // 850 TL'lik market harcaması ekle (bütçenin %85'i -> "warn")
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  await page.click('.fab[data-action="open-tx"]');
  await page.waitForTimeout(150);
  await page.fill('#modal-first-input', '850');
  await page.click('.cat-opt >> nth=0'); // Market / Gıda ilk kategori
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);

  console.log('Özette bütçe uyarı banner\'ı göründü mü (1 beklenir):', await page.locator('.budget-warning-banner').count());
  console.log('Banner içeriği:', await page.locator('.budget-warning-banner').innerText().catch(() => 'YOK'));

  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(150);
  console.log('Raporlar\'da bütçe satırı görünüyor mu:', await page.locator('.budget-line').first().innerText().catch(() => 'YOK'));

  // 200 TL daha ekle -> toplam 1050, bütçe aşıldı
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  await page.click('.fab[data-action="open-tx"]');
  await page.waitForTimeout(150);
  await page.fill('#modal-first-input', '200');
  await page.click('.cat-opt >> nth=0');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('Aşım sonrası banner metni:', await page.locator('.budget-warning-banner').innerText().catch(() => 'YOK'));

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
