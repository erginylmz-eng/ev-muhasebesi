/* Madde 5: Yıllık özet, YoY karşılaştırma, nakit akışı projeksiyonu,
   kişi bazlı planlı kırılım. */
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

  // Nakit'e para ekle, market harcaması yap (kişi atanmış, gerçekleşen)
  await page.click('.fab[data-action="open-tx"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="tx-type"][data-val="income"]');
  await page.fill('#modal-first-input', '5000');
  await page.click('.cat-opt >> nth=0');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('.fab[data-action="open-tx"]');
  await page.waitForTimeout(150);
  await page.fill('#modal-first-input', '300');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="personId"]', { label: 'Ergin' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  // Süresiz düzenli ödeme ekle (nakit akışı projeksiyonuna yansımalı)
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(150);
  await page.click('button:has-text("Gider Ekle")');
  await page.waitForTimeout(100);
  await page.fill('#modal-first-input', 'İnternet');
  await page.fill('input[name="amount"]', '400');
  await page.fill('input[name="day"]', '15');
  await page.click('form[data-action="save-recurring"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(150);

  console.log('Nakit Akışı Projeksiyonu bölümü var mı:', await page.locator('.section-title', { hasText: 'Nakit Akışı Projeksiyonu' }).count());
  const projCols = await page.locator('.trend-col').count();
  console.log('Projeksiyon ay sütun sayısı (>=6 olmalı, trend grafiğiyle karışabilir, en az 6 olmalı):', projCols >= 6);

  console.log('Yıllık Özet bölümü var mı:', await page.locator('.section-title', { hasText: 'Yıllık Özet' }).count());
  const yearlyTable = await page.locator('.card table.kv-table').last();
  console.log('Yıllık özet tablosu içeriği:', (await yearlyTable.innerText()).replace(/\n/g, ' | '));

  console.log('Kişiye Göre Harcama satırında Ergin var mı:', await page.locator('.bhead', { hasText: 'Ergin' }).count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
