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

  // varsayılan Nakit hesabı baştan var olmalı
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  console.log('Nakit grubu var mı:', await page.locator('.section-title', { hasText: 'Nakit' }).count());
  console.log('Nakit hesabı satırı:', await page.locator('.acct-card', { hasText: 'Nakit' }).count());

  // banka + kart ekle
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '5000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '1000');
  await page.fill('input[name="limit"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  // hesap satırına (pencil değil, satırın kendisine) tıklayınca detay açılmalı
  await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('detay sheet açıldı mı:', await page.locator('.sheet-head h2', { hasText: 'Ziraat Vadesiz' }).count());
  console.log('bakiye rakamı görünüyor mu:', await page.locator('.detail-figure').count());
  console.log('hareket yok mesajı (henüz işlem yok):', await page.locator('.sheet .empty').count());
  await page.click('[data-action="close-modal"]');

  // nakit hesabına önce yeterli bakiye ekle (Nakit eksiye düşemez kuralı için), sonra gider gir
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.click('.fab');
  await page.click('[data-action="tx-type"][data-val="income"]');
  await page.fill('#modal-first-input', '1000');
  await page.click('[data-action="tx-cat"]');
  await page.selectOption('select[name="accountId"]', { label: 'Nakit (Nakit)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('.fab');
  await page.fill('#modal-first-input', '150');
  await page.click('[data-action="tx-cat"]');
  await page.selectOption('select[name="accountId"]', { label: 'Nakit (Nakit)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  // Nakit hesabının detayında bu hareketi görmeliyiz
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.locator('.acct-card', { hasText: 'Nakit' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('Nakit detayında hareket satırı sayısı (>=2 olmalı, gelir+gider):', await page.locator('.sheet .tx-row').count());
  console.log('Nakit bakiyesi (850,00 ₺ olmalı, 1000 gelir - 150 gider):', await page.locator('.detail-figure').innerText());
  await page.click('[data-action="close-modal"]');

  // kredi kartı "Ödeme Yap" akışı: kaynak listesinde kartlar OLMAMALI
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('[data-action="pay-card"]').click();
  await page.waitForTimeout(150);
  console.log('sheet başlığı Kart Ödemesi mi:', await page.locator('.sheet-head h2', { hasText: 'Kart Ödemesi' }).count());
  const sourceOptionsText = await page.locator('select[name="accountId"]').innerText();
  console.log('kaynak seçenekleri (Bonus Kart GEÇMEMELİ):', sourceOptionsText.replace(/\n/g, ' | '));
  console.log('hedef alanı salt okunur mu (kilitli):', await page.locator('input[value="Bonus Kart"][disabled]').count());

  await page.fill('#modal-first-input', '400');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  const bankAfter = await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-bal .v').innerText();
  const cardAfter = await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-bal .v').innerText();
  console.log('banka 400 ödeme sonrası (4.600,00 ₺ beklenir):', bankAfter);
  console.log('kart borcu 400 ödeme sonrası (600,00 ₺ beklenir):', cardAfter);

  // kart detayında ödeme hareketi görünmeli ve "Ödeme Yap" butonu olmalı
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('kart detayında Ödeme Yap butonu:', await page.locator('[data-action="pay-card"]').count());
  console.log('kart detayında hareket say (>=1):', await page.locator('.sheet .tx-row').count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
