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

  // ---- Net Varlık Grafiği Özet'te görünmeli ----
  console.log('Net Varlık Grafiği başlığı var mı:', await page.locator('.section-title', { hasText: 'Net Varlık Grafiği' }).count());
  console.log('en az bir nw-col var mı:', await page.locator('.nw-col').count());

  // ---- Banka hesabı ekle, detayına gir, Gider/Gelir Ekle butonlarını dene ----
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('Banka detayında Gider Ekle butonu:', await page.locator('[data-action="quick-add-tx"][data-type="expense"]').count());
  console.log('Banka detayında Gelir Ekle butonu:', await page.locator('[data-action="quick-add-tx"][data-type="income"]').count());

  // ---- Esc ile hesap detayı kapanmalı ----
  console.log('Esc öncesi sheet açık mı:', await page.locator('.sheet-overlay').count());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  console.log('Esc sonrası sheet açık mı (0 olmalı):', await page.locator('.sheet-overlay').count());

  // ---- Gider Ekle ile ön-doldurulmuş forma gir, kaydet ----
  await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  await page.click('[data-action="quick-add-tx"][data-type="expense"]');
  await page.waitForTimeout(150);
  console.log('hızlı gider formunda hesap ön-seçili mi:', await page.locator('select[name="accountId"]').inputValue());
  await page.fill('#modal-first-input', '250');
  await page.click('[data-action="tx-cat"]');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('gider sonrası kaydedilip modal kapandı mı (sheet 0 olmalı):', await page.locator('.sheet-overlay').count());
  console.log('gider sonrası banka bakiyesi (9.750,00 ₺ beklenir):', await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-bal .v').innerText());

  // ---- Kredi kartı ekle, detayında sadece "Harcama Gir" olmalı ----
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '0');
  await page.fill('input[name="limit"]', '20000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('Kart detayında "Harcama Gir" butonu:', await page.locator('[data-action="quick-add-tx"]', { hasText: 'Harcama Gir' }).count());
  console.log('Kart detayında Gelir Ekle YOK mu (0 olmalı):', await page.locator('[data-action="quick-add-tx"][data-type="income"]').count());
  await page.click('[data-action="close-modal"]');

  // ---- Yeni Kredi (loan_account) ekleme akışı: banka kredisi mantığı, amortisman
  // tablosu Excel'den kopyala-yapıştır ile toplu içe aktarılmalı (3 Eylül 2026 akşamında
  // eklenen yeniden tasarım) ----
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="loan_account"]');
  console.log('Yeni kredi formunda "opening" alanı YOK mu (0 olmalı):', await page.locator('input[name="opening"]').count());
  console.log('Yeni kredi formunda "sourceAccountId" alanı YOK mu (0 olmalı):', await page.locator('select[name="sourceAccountId"]').count());
  console.log('Yeni kredi formunda "nextDueDate" alanı YOK mu (0 olmalı):', await page.locator('input[name="nextDueDate"]').count());
  console.log('Yeni kredi formunda monthlyPayment/totalInstallments alanları YOK mu (0 olmalı):', await page.locator('input[name="monthlyPayment"], input[name="totalInstallments"]').count());
  console.log('Yeni kredi formunda amortisman tablosu yapıştırma alanı VAR mı:', await page.locator('#loan-schedule-textarea').count());
  await page.fill('#modal-first-input', 'İhtiyaç Kredisi');
  const loanScheduleText = [
    'Ödeme Tarihi;Taksit Tutarı',
    '15.10.2026;5000',
    '15.11.2026;5000',
    '15.12.2026;5000',
    '15.01.2027;5000',
    '15.02.2027;5000',
    '15.03.2027;5000',
    '15.04.2027;5000',
    '15.05.2027;5000',
    '15.06.2027;5000',
    '15.07.2027;5000'
  ].join('\n');
  await page.fill('#loan-schedule-textarea', loanScheduleText);
  await page.click('[data-action="loan-schedule-preview"]');
  await page.waitForTimeout(150);
  console.log('önizlemede bulunan taksit satırı sayısı (10 beklenir, başlık satırı atlanmış olmalı):', await page.locator('.sheet table tr').count());
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('kredi eklendikten sonra hata var mı (ERRORS bölümünde görünecek)');

  await page.locator('.acct-card', { hasText: 'İhtiyaç Kredisi' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('Kredi detayında Kredi Tutarı (50.000,00 ₺ beklenir -- 10 taksit x 5.000):', await page.locator('.mute2', { hasText: 'Kredi Tutarı' }).innerText());
  console.log('Kredi detayında Kalan Borç figürü (50.000,00 ₺ beklenir):', await page.locator('.detail-figure').innerText());
  console.log('Kredi detayında amortisman tablosu satır sayısı (10 beklenir):', await page.locator('.sheet table tbody tr').count());
  console.log('Kredi detayında "Harcama Gir"/"Gider Ekle" YOK mu (0 olmalı):', await page.locator('[data-action="quick-add-tx"]').count());
  console.log('Kredi detayında Ödeme Yap butonu VAR mı:', await page.locator('[data-action="pay-card"]').count());
  console.log('Kredi detayında hareket yok mesajı (henüz ödeme yapılmadı):', await page.locator('.sheet .empty').count());
  await page.click('[data-action="close-modal"]');

  // ---- Kredi ödemesi yap: kaynak hesap burada seçilmeli ----
  await page.locator('.acct-card', { hasText: 'İhtiyaç Kredisi' }).locator('[data-action="pay-card"]').click();
  await page.waitForTimeout(150);
  console.log('sheet başlığı Kredi Ödemesi mi:', await page.locator('.sheet-head h2', { hasText: 'Kredi Ödemesi' }).count());
  await page.fill('#modal-first-input', '5000');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  const loanAfter = await page.locator('.acct-card', { hasText: 'İhtiyaç Kredisi' }).locator('.acct-bal .v').innerText();
  console.log('kredi bakiyesi 5000 ödeme sonrası (45.000,00 ₺ beklenir):', loanAfter);

  // ---- Gider/Gelir formunda Krediler seçilebilir OLMAMALI ----
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.waitForTimeout(150);
  const expAccOptions = await page.locator('select[name="accountId"]').innerText();
  console.log('gider formu hesap seçenekleri (İhtiyaç Kredisi GEÇMEMELİ):', expAccOptions.replace(/\n/g, ' | '));
  await page.click('[data-action="close-modal"]');

  // ---- Kredi kartı dönem (ekstre) kırılımı: harcama gir, dönem satırı açılıp kapanmalı ----
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(150);
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  await page.click('[data-action="quick-add-tx"][data-type="expense"]');
  await page.waitForTimeout(150);
  await page.fill('#modal-first-input', '333');
  await page.click('[data-action="tx-cat"]');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  // save-tx modalı tamamen kapatır; dönem kırılımını görmek için detay ekranını tekrar açıyoruz
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('Dönem Bazlı Borç (Ekstreler) başlığı var mı:', await page.locator('.section-title', { hasText: 'Dönem Bazlı Borç' }).count());
  const periodRow = page.locator('[data-action="toggle-card-period"]').first();
  console.log('en az bir dönem satırı var mı:', await page.locator('[data-action="toggle-card-period"]').count());
  await periodRow.click();
  await page.waitForTimeout(150);
  console.log('dönem açıldıktan sonra tx-row görünüyor mu:', await page.locator('.sheet .asset-detail .tx-row').count());
  await periodRow.click();
  await page.waitForTimeout(150);
  console.log('dönem tekrar kapatılınca tx-row kayboluyor mu (0 olmalı):', await page.locator('.sheet .asset-detail .tx-row').count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
