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
  await page.waitForTimeout(100);

  // ---- Banka hesabı: IBAN, vadeli/vadesiz, avans limiti, döviz cinsi ----
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '1000');
  await page.fill('input[name="iban"]', 'TR12 0001 0000 0000 0000 0000 01');
  await page.selectOption('select[name="termType"]', 'vadeli');
  await page.fill('input[name="overdraftLimit"]', '5000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('IBAN görünüyor mu:', await page.locator('.acct-card', { hasText: 'TR12' }).count());
  console.log('Vadeli etiketi görünüyor mu:', await page.locator('.acct-card', { hasText: 'Vadeli' }).count());
  console.log('Avans limiti metni görünüyor mu:', await page.locator('.acct-card', { hasText: 'Avans limiti' }).count());

  // avans limiti içinde harcama (izinli): 1000 - 5500 = -4500 (limit -5000 içinde)
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(80);
  await page.click('.fab');
  await page.fill('#modal-first-input', '5500');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('avans limiti içindeki harcama kabul edildi mi (modal kapandı, 0 olmalı):', await page.locator('.sheet-overlay').count());

  // avans limitini aşan harcama (engellenmeli): -4500 - 1000 = -5500 (limit -5000 dışı)
  await page.click('.fab');
  await page.waitForTimeout(80);
  await page.fill('#modal-first-input', '1000');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('avans limitini aşan harcama engellendi mi (modal hâlâ açık, 1 olmalı):', await page.locator('.sheet-overlay').count());
  await page.click('[data-action="close-modal"]');

  // ---- Döviz hesabı: USD banka hesabı, TL toplamlarına karışmamalı ----
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(80);
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Dolar Hesabım');
  await page.fill('input[name="opening"]', '500');
  await page.selectOption('select[name="currency"]', 'USD');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('dolar hesabı $ ile gösteriliyor mu:', await page.locator('.acct-card', { hasText: 'Dolar Hesabım' }).locator('.v.num', { hasText: '$' }).count());

  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="toggle-asset"][data-key="doviz"]');
  await page.waitForTimeout(100);
  console.log('Döviz Hesapları bloğunda dolar hesabı görünüyor mu:', await page.locator('.mini-acct', { hasText: 'Dolar Hesabım' }).count());
  await page.click('[data-action="toggle-asset"][data-key="doviz"]'); // döviz bloğunu kapat, karışıklığı önle
  await page.waitForTimeout(80);
  await page.click('[data-action="toggle-asset"][data-key="banka"]');
  await page.waitForTimeout(80);
  await page.click('[data-action="toggle-asset"][data-key="banka_bank"]');
  await page.waitForTimeout(100);
  console.log('dolar hesabı banka Hesaplar alt grubunda YOK mu (0 olmalı):', await page.locator('.mini-acct', { hasText: 'Dolar Hesabım' }).count());

  // ---- Kart ağları: Ayarlar'dan ekle/sil ----
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(100);
  console.log('varsayılan kart ağları görünüyor mu (Bonus, Axess, World):', await page.locator('.switch-row', { hasText: 'Bonus' }).count(), await page.locator('.switch-row', { hasText: 'Axess' }).count(), await page.locator('.switch-row', { hasText: 'World' }).count());
  await page.fill('form[data-action="add-card-network"] input[name="name"]', 'Wings');
  await page.click('form[data-action="add-card-network"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('yeni kart ağı eklendi mi (Wings):', await page.locator('.switch-row', { hasText: 'Wings' }).count());

  // ---- Kredi kartı: kart no, banka adı, ağ, kesim/ödeme günü ----
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.waitForTimeout(80);
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '0');
  await page.fill('input[name="limit"]', '10000');
  await page.fill('input[name="bankName"]', 'Garanti BBVA');
  await page.fill('input[name="cardNumber"]', '4022123412341234');
  await page.selectOption('select[name="networkId"]', { label: 'Wings' });
  await page.fill('input[name="statementDay"]', '5');
  await page.fill('input[name="paymentDay"]', '10');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('kart maskeli numarayla görünüyor mu (•••• •••• •••• 1234):', await page.locator('.acct-card', { hasText: '1234' }).count());
  console.log('banka adı görünüyor mu (Garanti BBVA):', await page.locator('.acct-card', { hasText: 'Garanti BBVA' }).count());
  console.log('kart ağı görünüyor mu (Wings):', await page.locator('.acct-card', { hasText: 'Wings' }).count());
  console.log('kesim/ödeme günü görünüyor mu:', await page.locator('.acct-card', { hasText: 'Kesim 5. gün' }).count());

  // kart harcaması + dönem bazlı borç ekranı
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(80);
  await page.click('.fab');
  await page.fill('#modal-first-input', '750');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Bonus Kart (Kredi Kartı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(80);
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).click();
  await page.waitForTimeout(100);
  console.log('dönem bazlı borç bölümü görünüyor mu:', await page.locator('.section-title', { hasText: 'Dönem Bazlı Borç' }).count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
