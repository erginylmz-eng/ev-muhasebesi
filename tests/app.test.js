const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  await page.route('**://fonts.googleapis.com/**', route => route.abort());
  await page.route('**://fonts.gstatic.com/**', route => route.abort());
  await page.goto('file://' + path.resolve(__dirname, '../dist/final.html'));
  await page.waitForTimeout(300);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  const title = await page.title();
  console.log('title:', title);

  // Özet tab renders
  console.log('has hero:', await page.locator('.hero').count());

  // navigate to Hesaplar, add a bank account
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '5000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('accounts after add:', await page.locator('.acct-card').count());

  // add a credit card account
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '1200');
  await page.fill('input[name="limit"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('accounts after 2nd add:', await page.locator('.acct-card').count());

  // go add a transaction (expense) via FAB from Özet
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.fill('#modal-first-input', '350.50');
  await page.click('[data-action="tx-cat"]'); // pick first category
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' }); // Nakit eksiye düşemediği için banka hesabı seçiliyor
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('hero figure after expense:', await page.locator('.hero .figure').innerText());

  // add income transaction
  await page.click('.fab');
  await page.click('[data-action="tx-type"][data-val="income"]');
  await page.fill('#modal-first-input', '20000');
  await page.click('[data-action="tx-cat"]');
  await page.selectOption('select[name="accountId"]', { index: 0 });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('hero figure after income:', await page.locator('.hero .figure').innerText());

  // check reports tab renders without error
  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(200);
  console.log('report bars:', await page.locator('.bar-row').count());
  console.log('trend cols:', await page.locator('.trend-col').count());

  // check hareketler list
  await page.click('[data-action="tab"][data-tab="hareketler"]');
  console.log('tx rows:', await page.locator('.tx-row').count());

  // check ayarlar tab + add person
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.fill('form[data-action="add-person"] input[name="name"]', 'Test Kişi');
  await page.click('form[data-action="add-person"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('people rows:', await page.locator('.switch-row').count());

  // test delete confirm flow for a transaction
  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.click('.tx-row >> nth=0');
  await page.click('[data-action="delete-tx"]');
  await page.waitForTimeout(100);
  console.log('confirm modal visible:', await page.locator('.confirm-card').count());
  await page.click('[data-action="confirm-yes"]');
  await page.waitForTimeout(150);
  console.log('tx rows after delete:', await page.locator('.tx-row').count());

  // test overlay click-outside closes modal, and clicking inside doesn't
  await page.click('.fab');
  console.log('modal open:', await page.locator('.sheet').count());
  await page.click('#modal-first-input');
  console.log('modal still open after inner click:', await page.locator('.sheet').count());
  await page.click('.sheet-overlay', { position: { x: 5, y: 5 } });
  await page.waitForTimeout(100);
  console.log('modal closed after backdrop click:', await page.locator('.sheet').count());

  console.log('ERRORS:', errors.length ? errors : 'none');

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
