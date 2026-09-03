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

  // yeni hiyerarşi: Nakit / Banka / Net Varlık (henüz borç hesabı yok)
  console.log('üst düzey satırlar (Nakit, Banka, Net Varlık = 3):', await page.locator('.asset-row').count());
  console.log('detail visible before click (expect 0):', await page.locator('.asset-detail').count());

  // Nakit: varsayılan "Nakit" hesabı zaten var; hızlı ekle butonu da görünmeli
  await page.click('[data-action="toggle-asset"][data-key="cash"]');
  await page.waitForTimeout(100);
  console.log('nakit detayında varsayılan hesap görünüyor mu:', await page.locator('.mini-acct', { hasText: 'Nakit' }).count());
  console.log('nakit hızlı ekle butonu var mı (type=cash):', await page.locator('[data-action="quick-add-account"][data-type="cash"]').count());

  // Banka grubunu aç -> 4 alt grup görünmeli
  await page.click('[data-action="toggle-asset"][data-key="banka"]');
  await page.waitForTimeout(100);
  console.log('banka alt grupları (Hesaplar/Kredi Kartları/Krediler/Ödeme Araçları = 4):', await page.locator('.asset-subrow').count());

  // Hesaplar alt grubunu aç, hızlı ekle ile banka hesabı oluştur
  await page.click('[data-action="toggle-asset"][data-key="banka_bank"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="quick-add-account"][data-type="bank"]');
  await page.waitForTimeout(100);
  console.log('account modal opened, type bank preselected:', await page.locator('[data-action="acc-type"][data-val="bank"][aria-pressed="true"]').count());
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(200);

  // Kredi Kartları alt grubunu aç, kart ekle
  await page.click('[data-action="toggle-asset"][data-key="banka_card"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="quick-add-account"][data-type="card"]');
  await page.waitForTimeout(100);
  console.log('account modal type card preselected:', await page.locator('[data-action="acc-type"][data-val="card"][aria-pressed="true"]').count());
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '1500');
  await page.fill('input[name="limit"]', '10000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(200);

  // kırılımda hesaplar görünüyor mu (nakit + banka hesabı + kart, hepsi hâlâ açık)
  console.log('mini-acct rows visible (expect >=3):', await page.locator('.mini-acct').count());

  // net varlık satırını aç
  await page.click('[data-action="toggle-asset"][data-key="net"]');
  await page.waitForTimeout(100);
  const netDetailText = await page.locator('.asset-block', { hasText: 'Net varlık' }).locator('.asset-detail').innerText();
  console.log('net detail breakdown:', netDetailText.replace(/\n/g, ' | '));

  // mini-acct satırına tıklayınca hesap detay (cari hesap) sayfası açılmalı
  await page.locator('.mini-acct', { hasText: 'Ziraat Vadesiz' }).click();
  await page.waitForTimeout(100);
  console.log('detay sheet açıldı mı:', await page.locator('.sheet-head h2', { hasText: 'Ziraat Vadesiz' }).count());
  await page.click('[data-action="edit-account-from-detail"]');
  await page.waitForTimeout(100);
  console.log('edit form opened with existing name:', await page.locator('#modal-first-input').inputValue());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
