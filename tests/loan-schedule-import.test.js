/* Kredi hesabının YENİ modelini (banka kredisi mantığı, amortisman tablosunun
   Excel'den kopyala-yapıştır ile toplu içe aktarılması — 3 Eylül 2026 akşamında
   eklendi) uçtan uca test eder: hatalı satırların önizlemede ayıklanması,
   Kredi Tutarı'nın elle girilebilmesi (aksi halde tablo toplamı kullanılır),
   amortisman tablosunun hesap detayında Anapara/Faiz/Kalan Bakiye sütunlarıyla
   gösterilmesi, ödeme sonrası "Ödendi" işaretlenen satırlar, ve mevcut bir
   krediyi düzenlerken tabloyu yeniden içe aktarma (Kalan Borç'un otomatik
   güncellenmesi). */
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

  // önce ödemenin yapılacağı bir banka hesabı ekleyelim
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '100000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  // ---- Anapara/Faiz/Kalan Bakiye sütunlarıyla, bazı satırları bilerek hatalı bir tablo yapıştır ----
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="loan_account"]');
  await page.fill('#modal-first-input', 'Konut Kredisi');
  await page.fill('input[name="principalOverride"]', '500000');
  const scheduleWithBreakdown = [
    'Ödeme Tarihi;Taksit Tutarı;Anapara;Faiz;Kalan Bakiye',
    '15.10.2026;12500,00;10200,00;2300,00;489800,00',
    'geçersiz tarih;12500,00;10285,00;2215,00;479515,00',
    '15.12.2026;12500,00;10370,00;2130,00;469145,00',
    '15.01.2027;abc;10456,00;2044,00;458689,00'
  ].join('\n');
  await page.fill('#loan-schedule-textarea', scheduleWithBreakdown);
  await page.click('[data-action="loan-schedule-preview"]');
  await page.waitForTimeout(150);
  console.log('önizlemede toplam satır sayısı (4 beklenir, başlık atlanmış):', await page.locator('.sheet table tr').count());
  console.log('hatalı satır sayısı (2 beklenir -- geçersiz tarih ve "abc" tutar):', await page.locator('.sheet table tr').filter({ hasText: 'anlaşılamadı' }).count());
  console.log('geçerli satır özet metni (2 taksit satırı bulundu beklenir):', await page.locator('.sheet .mute2', { hasText: 'taksit satırı bulundu' }).innerText());

  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('kredi eklendikten sonra hata var mı (ERRORS bölümünde görünecek)');

  await page.locator('.acct-card', { hasText: 'Konut Kredisi' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('Kredi Tutarı elle girilen değeri mi gösteriyor (500.000,00 ₺ beklenir, tablo toplamı 25.000 değil):', await page.locator('.mute2', { hasText: 'Kredi Tutarı' }).innerText());
  console.log('Kalan Borç figürü (yalnızca 2 GEÇERLİ satırın toplamı: 25.000,00 ₺ beklenir):', await page.locator('.detail-figure').innerText());
  console.log('amortisman tablosunda Anapara sütunu başlığı var mı:', await page.locator('.sheet th', { hasText: 'Anapara' }).count());
  console.log('amortisman tablosunda 2 taksit satırı var mı:', await page.locator('.sheet table tbody tr').count());
  console.log('henüz ödeme yapılmadığı için "Ödendi" etiketi YOK mu (0 beklenir):', await page.locator('.sheet table tbody tr', { hasText: 'Ödendi' }).count());

  // ---- Ödeme yap, bir taksidin "Ödendi" işaretlendiğini doğrula ----
  await page.locator('.sheet [data-action="pay-card"]').click();
  await page.waitForTimeout(150);
  await page.fill('#modal-first-input', '12500');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('ödeme sonrası kalan borç (12.500,00 ₺ beklenir):', await page.locator('.acct-card', { hasText: 'Konut Kredisi' }).locator('.acct-bal .v').innerText());

  await page.locator('.acct-card', { hasText: 'Konut Kredisi' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('bir ödeme sonrası "Ödendi" işaretli satır sayısı (1 beklenir):', await page.locator('.sheet table tbody tr', { hasText: 'Ödendi' }).count());

  // ---- Düzenlerken tabloyu yeniden içe aktar: Kalan Borç yeni tabloya göre güncellenmeli ----
  await page.click('[data-action="edit-account-from-detail"]');
  await page.waitForTimeout(150);
  console.log('düzenleme formunda "Yeniden İçe Aktar" düğmesi var mı:', await page.locator('[data-action="loan-schedule-toggle"]').count());
  await page.click('[data-action="loan-schedule-toggle"]');
  await page.waitForTimeout(100);
  // Kredi Tutarı alanını bilerek boşaltıyoruz: bu turda tablo toplamının kullanılacağını test ediyoruz
  await page.fill('input[name="principalOverride"]', '');
  await page.fill('#loan-schedule-textarea', '15.02.2027;20000\n15.03.2027;20000');
  await page.click('[data-action="loan-schedule-preview"]');
  await page.waitForTimeout(100);
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('yeniden içe aktarma sonrası Kalan Borç (40.000,00 ₺ beklenir -- yeni tablo 2x20.000):', await page.locator('.acct-card', { hasText: 'Konut Kredisi' }).locator('.acct-bal .v').innerText());

  await page.locator('.acct-card', { hasText: 'Konut Kredisi' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('yeni tabloda Kredi Tutarı da güncellendi mi (40.000,00 ₺ beklenir -- principalOverride verilmedi, tablo toplamı kullanılmalı):', await page.locator('.mute2', { hasText: 'Kredi Tutarı' }).innerText());
  console.log('yeni tabloda 2 satır var mı:', await page.locator('.sheet table tbody tr').count());

  // ---- Kredi hesabına doğrudan gider/gelir girişi hâlâ engelleniyor mu? ----
  await page.click('[data-action="close-modal"]');
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.waitForTimeout(150);
  const accOptions = await page.locator('select[name="accountId"]').innerText();
  console.log('gider formu hesap seçenekleri (Konut Kredisi GEÇMEMELİ):', accOptions.replace(/\n/g, ' | '));
  await page.click('[data-action="close-modal"]');

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
