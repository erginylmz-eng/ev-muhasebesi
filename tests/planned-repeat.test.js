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

  // hesaplar: banka + nakit(zaten var) + kredi kartı
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '5000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '0');
  await page.fill('input[name="limit"]', '1000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  // ---- Nakit eksiye düşemez ----
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.fill('#modal-first-input', '999999');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Nakit (Nakit)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('nakit eksiye düşürme engellendi mi (toast + modal açık kalmalı):', await page.locator('.toast', { hasText: 'eksiye düşemez' }).count());
  console.log('modal hâlâ açık mı (1 olmalı):', await page.locator('.sheet-overlay').count());
  await page.click('[data-action="close-modal"]');

  // ---- Kredi kartı limit aşımı engellenmeli ----
  await page.click('.fab');
  await page.fill('#modal-first-input', '5000');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Bonus Kart (Kredi Kartı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('kart limiti aşımı engellendi mi:', await page.locator('.toast', { hasText: 'limitinin dışında' }).count());
  await page.click('[data-action="close-modal"]');

  // ---- Tekrarlanan gider: 4 kez aylık, bugünden başlasın ----
  await page.click('.fab');
  await page.fill('#modal-first-input', '200');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.check('input[name="isRepeating"]');
  await page.waitForTimeout(100);
  await page.fill('input[name="repeatCount"]', '4');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(200);

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(100);
  console.log('toplam 4 kayıt oluştu mu (tx-row sayısı, en az 4):', await page.locator('.tx-row').count());
  console.log('planlandı etiketi görünen kayıt sayısı (3 olmalı — ilk hariç):', await page.locator('.planned-pill').count());

  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(100);
  const bankBalAfterRepeat = await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-bal .v').innerText();
  console.log('banka bakiyesi (yalnızca ilk tekrar düşmeli, 4800,00 ₺ beklenir):', bankBalAfterRepeat);

  // ---- Kredi hesabı ekle (banka kredisi modeli: amortisman tablosu yapıştırılır) ----
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="loan_account"]');
  await page.fill('#modal-first-input', 'İhtiyaç Kredisi');
  await page.fill('#loan-schedule-textarea', '15.10.2026;500\n15.11.2026;500\n15.12.2026;500');
  await page.click('[data-action="loan-schedule-preview"]');
  await page.waitForTimeout(100);
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('Krediler grubunda görünüyor mu:', await page.locator('.section-title', { hasText: 'Krediler' }).count());
  const loanBal = await page.locator('.acct-card', { hasText: 'İhtiyaç Kredisi' }).locator('.acct-bal .v').innerText();
  console.log('kredi bakiyesi (henüz ödeme yapılmadı, toplam 1500,00 ₺ beklenir):', loanBal);

  // ---- Özet'te planlanan işlemler banner'ı: bugüne tarihli planlı bir kayıt olmalı senaryosu için
  // tekrarlanan kaydın 2. taksitini bugüne çekelim (Ertele akışı yerine doğrudan tarih testini basitleştirmek için)
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
