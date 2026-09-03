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

  // banka hesabı ve kredi kartı ekle
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '0');
  await page.fill('input[name="limit"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  // ---- Verilen borç hesabı (loan_given) ----
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="loan_given"]');
  await page.fill('#modal-first-input', 'Ahmete Borç');
  await page.fill('input[name="opening"]', '2000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('Verilen Borçlar grubu göründü mü:', await page.locator('.section-title', { hasText: 'Verilen Borçlar' }).count());

  // ---- Taksitli kart harcaması ----
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.fill('#modal-first-input', '1200');
  await page.click('[data-action="tx-cat"]');
  await page.selectOption('select[name="accountId"]', { label: 'Bonus Kart (Kredi Kartı)' });
  await page.waitForTimeout(150);
  console.log('taksitli checkbox görünüyor mu:', await page.locator('input[name="installment"]').count());
  await page.check('input[name="installment"]');
  await page.waitForTimeout(150);
  await page.fill('input[name="installmentCount"]', '3');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(100);
  const cardAfterInstallment = await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-bal .v').innerText();
  /* Taksit tarihleri artık kartın kesim/ödeme günü döngüsüne göre hesaplanıyor
     (satın alma tarihine göre değil); varsayılan kesim 5 / ödeme 10 ile bu ayki
     ödeme günü henüz gelmediği için ilk taksit de "planlandı" kalır, kart
     borcu henüz 0 görünür. */
  console.log('kart borcu ilk taksit sonrası (0,00 ₺ beklenir — ödeme günü henüz gelmedi):', cardAfterInstallment);
  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(100);
  console.log('Hareketler\'de 3 taksitin tümü görünüyor mu (3 olmalı):', await page.locator('.tx-row', { hasText: 'taksit' }).count());
  console.log('taksitlerin tümü Planlandı etiketiyle görünüyor mu (3 olmalı — ödeme günlerinin tümü ileride):', await page.locator('.tx-row', { hasText: 'taksit' }).locator('.planned-pill').count());
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(80);

  // ---- Düzenli ödeme ekle (geçmiş bir gün ile hemen "vadesi gelmiş" olsun) ----
  await page.click('button:has-text("Gider Ekle")');
  await page.fill('#modal-first-input', 'Kira');
  await page.fill('input[name="amount"]', '5000');
  await page.fill('input[name="day"]', '1');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-recurring"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('düzenli ödeme listeye eklendi mi:', await page.locator('.switch-row', { hasText: 'Kira' }).count());

  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  console.log('Özette hatırlatma banner\'ı göründü mü:', await page.locator('.recur-banner', { hasText: 'Kira' }).count());
  console.log('ay sonu tahmini kartı göründü mü:', await page.locator('.forecast-tile').count());
  console.log('banner öğeleri (önce):', await page.locator('.recur-item-main .n').allInnerTexts());
  await page.click('.recur-item:has-text("Kira") [data-action="recurring-add-now"]');
  await page.waitForTimeout(150);
  console.log('banner öğeleri (sonra):', await page.locator('.recur-item-main .n').allInnerTexts());
  console.log('kira eklendikten sonra banner kayboldu mu (0 olmalı):', await page.evaluate(() => document.querySelectorAll('.recur-banner').length));

  // ---- Bütçe ----
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(100);
  const budgetInputs = page.locator('form[data-action="save-budgets"] input');
  const firstBudgetInput = budgetInputs.first();
  await firstBudgetInput.fill('1000');
  await page.click('form[data-action="save-budgets"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('bütçe kaydedildi toast:', await page.locator('.toast').count());
  /* toast ~3.2sn görünür kalıyor; sayfa uzunluğuna göre alttaki formların
     üzerine denk gelip tıklamaları yanlışlıkla üstüne alabiliyor (flaky) —
     devam etmeden kaybolmasını bekle. */
  await page.waitForSelector('.toast', { state: 'hidden', timeout: 4000 }).catch(function(){});

  // ---- Hedefler ----
  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="goal-new"]');
  await page.fill('#modal-first-input', 'Tatil');
  await page.fill('input[name="target"]', '20000');
  await page.fill('input[name="current"]', '5000');
  await page.click('form[data-action="save-goal"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('hedef eklendi mi:', await page.locator('.goal-card', { hasText: 'Tatil' }).count());
  console.log('kişiye göre harcama bölümü var mı:', await page.locator('.section-title', { hasText: 'Kişiye Göre Harcama' }).count());

  // ---- Şablon ----
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.fill('#modal-first-input', '250');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('[data-action="save-template-toggle"]');
  await page.fill('#template-name-input', 'Market Şablonu');
  await page.click('[data-action="save-template-confirm"]');
  await page.waitForTimeout(150);
  console.log('şablon kaydından sonra tutar hâlâ 250 mi:', await page.locator('#modal-first-input').inputValue());
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('kayıttan sonra modal kapandı mı (0 olmalı):', await page.locator('.sheet-overlay').count());

  await page.click('.fab');
  await page.waitForTimeout(100);
  console.log('şablon çipi görünüyor mu:', await page.locator('.tmpl-chip', { hasText: 'Market Şablonu' }).count());
  await page.click('[data-action="apply-template"]');
  await page.waitForTimeout(100);
  console.log('şablon tutarı doldurdu mu (250):', await page.locator('#modal-first-input').inputValue());
  await page.click('[data-action="close-modal"]');

  // ---- Etiket + arama filtresi ----
  await page.click('.fab');
  await page.fill('#modal-first-input', '99');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.fill('input[name="tags"]', 'test-etiket');
  await page.fill('input[name="note"]', 'ozel-not-arama');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.click('[data-action="toggle-tx-filters"]');
  await page.waitForTimeout(100);
  await page.fill('[data-action="filter-q"]', 'ozel-not-arama');
  await page.locator('[data-action="filter-q"]').blur();
  await page.waitForTimeout(150);
  console.log('arama sonrası satır sayısı (1 olmalı):', await page.locator('.tx-row').count());
  console.log('etiket çipi görünüyor mu:', await page.locator('.tag-chip', { hasText: 'test-etiket' }).count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
