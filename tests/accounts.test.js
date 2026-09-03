const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.route('**://fonts.g*/**', route => route.abort());
  await page.goto('file://' + path.resolve(__dirname, '../dist/final.html'));
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  // create bank + card accounts
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '5000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '2000');
  await page.fill('input[name="limit"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  const cardBalText = await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-bal .v').innerText();
  console.log('card debt shown:', cardBalText, '(expect 2.000,00 ₺)');

  const limitBarPct = await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.limit-bar > div').getAttribute('style');
  console.log('limit bar style (expect ~20%):', limitBarPct);

  // spend on the card
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.fill('#modal-first-input', '500');
  await page.click('[data-action="tx-cat"]');
  await page.selectOption('select[name="accountId"]', { label: 'Bonus Kart (Kredi Kartı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  const cardBalAfterSpend = await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-bal .v').innerText();
  console.log('card debt after 500 spend (expect 2.500,00 ₺):', cardBalAfterSpend);

  // pay down the card via "Borç öde" (transfer) from bank
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('[data-action="pay-card"]').click();
  await page.waitForTimeout(100);
  const sheetVisible = await page.locator('.sheet').count();
  console.log('pay-card sheet opened:', sheetVisible);
  await page.fill('#modal-first-input', '1000');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  const bankBalAfterPay = await page.locator('.acct-card', { hasText: 'Ziraat' }).locator('.acct-bal .v').innerText();
  const cardBalAfterPay = await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-bal .v').innerText();
  console.log('bank balance after paying 1000 (expect 4.000,00 ₺):', bankBalAfterPay);
  console.log('card debt after paying 1000 (expect 1.500,00 ₺):', cardBalAfterPay);

  // edit an existing transaction and verify category switch preserves amount
  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.click('[data-action="filter-type"][data-val="expense"]');
  await page.locator('.tx-row').first().click();
  await page.waitForTimeout(100);
  const amountBefore = await page.locator('#modal-first-input').inputValue();
  console.log('amount when opening edit:', amountBefore);
  await page.click('[data-action="tx-cat"] >> nth=2'); // switch category
  const amountAfterCatSwitch = await page.locator('#modal-first-input').inputValue();
  console.log('amount preserved after category switch:', amountAfterCatSwitch, amountBefore === amountAfterCatSwitch ? 'OK' : 'MISMATCH');
  await page.click('[data-action="close-modal"]');

  // delete an account that has transactions -> hareketi olan kart/kredi artık hiç silinemiyor (2 Eylül 2026'da eklenen kural), onay ekranı yerine açıklayıcı toast çıkmalı
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  const cardCountBefore = await page.locator('.acct-card').count();
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('[data-action="delete-account"]').click();
  await page.waitForTimeout(150);
  console.log('onay ekranı AÇILMAMALI (0 beklenir):', await page.locator('.confirm-card').count());
  const warnMsg = await page.locator('.toast').innerText().catch(() => 'YOK');
  console.log('delete-account engelleme toast\'ı bağlı hareketten bahsediyor mu:', warnMsg.includes('bağlı hareketlerin'));
  console.log('hesap silinmeden korundu mu (sayı değişmemeli):', await page.locator('.acct-card').count() === cardCountBefore);
  console.log('tx rows değişmemeli:', await page.locator('.tx-row').count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
