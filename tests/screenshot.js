const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT_DIR = path.resolve(__dirname, '../screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  for (const scheme of ['light','dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.route('**://fonts.g*/**', route => route.abort());
    await page.goto('file://' + path.resolve(__dirname, '../dist/final.html'));
    await page.waitForTimeout(200);
    // seed a bit of data for a realistic look
    await page.click('[data-action="tab"][data-tab="hesaplar"]');
    await page.click('button:has-text("Hesap Ekle")');
    await page.fill('#modal-first-input', 'Ziraat Vadesiz');
    await page.fill('input[name="opening"]', '8250');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(150);
    await page.click('button:has-text("Hesap Ekle")');
    await page.click('[data-action="acc-type"][data-val="card"]');
    await page.fill('#modal-first-input', 'Bonus Kart');
    await page.fill('input[name="opening"]', '3400');
    await page.fill('input[name="limit"]', '10000');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(150);
    await page.click('[data-action="tab"][data-tab="ozet"]');
    await page.click('.fab');
    await page.fill('#modal-first-input', '1250');
    await page.click('[data-action="tx-cat"]');
    await page.selectOption('select[name="accountId"]', { index: 0 });
    await page.click('form[data-action="save-tx"] button[type=submit]');
    await page.waitForTimeout(150);
    await page.click('.fab');
    await page.click('[data-action="tx-type"][data-val="income"]');
    await page.fill('#modal-first-input', '32000');
    await page.click('[data-action="tx-cat"]');
    await page.selectOption('select[name="accountId"]', { index: 0 });
    await page.click('form[data-action="save-tx"] button[type=submit]');
    await page.waitForTimeout(150);

    await page.screenshot({ path: path.join(OUT_DIR, `shot_ozet_${scheme}.png`) });
    await page.click('[data-action="tab"][data-tab="raporlar"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(OUT_DIR, `shot_raporlar_${scheme}.png`) });
    await page.click('[data-action="tab"][data-tab="hesaplar"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(OUT_DIR, `shot_hesaplar_${scheme}.png`) });
    await page.click('[data-action="tab"][data-tab="ozet"]');
    await page.click('.fab');
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(OUT_DIR, `shot_form_${scheme}.png`) });
    await page.close();
  }
  await browser.close();
})();
