/* Madde 1: Toplu kayıt girişi (yapıştırarak içe aktarma) + tekrar eden
   harcama için otomatik kategori/kişi önerisi. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = path.join(__dirname, '../dist/final.html');
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !/ERR_TUNNEL/.test(msg.text())) errors.push('CONSOLE: ' + msg.text()); });

  await page.goto('file://' + file);
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  // --- Toplu içe aktarma ---
  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="open-bulk-import"]');
  await page.waitForTimeout(150);
  const pasteText = [
    'Tarih;Tür;Tutar;Kategori;Hesap;Kişi;Not',
    '2026-08-01;Gider;350,00;Market / Gıda;Nakit;Ergin;Haftalık market',
    '2026-08-05;Gelir;5000;Maaş;Nakit;Ergin;Ağustos maaşı',
    '2026-08-10;Gider;100;Olmayan Kategori;Nakit;Ergin;Hatalı satır',
    'geçersiz tarih;Gider;100;Market / Gıda;Nakit;;kötü tarih'
  ].join('\n');
  await page.fill('#bulk-import-textarea', pasteText);
  await page.click('[data-action="bulk-import-preview"]');
  await page.waitForTimeout(150);
  console.log('Önizlemede toplam satır (4 beklenir, başlık atlanır):', await page.locator('table tr').count());
  const commitBtnText = await page.locator('[data-action="bulk-import-commit"]').innerText();
  console.log('İçe aktar butonu metni (2 Kaydı İçe Aktar beklenir):', commitBtnText);
  await page.click('[data-action="bulk-import-commit"]');
  await page.waitForTimeout(200);
  // not: ilk persist() çağrısında bu test dosyasında (window.claude yok) her zaman
  // "kalıcı kayıt kullanılamıyor" uyarısı gösterilir (mevcut/beklenen davranış,
  // bu segmentte eklenmedi); asıl doğrulama aşağıdaki hareket listesi kontrolüdür.
  console.log('İçe aktarım sonrası herhangi bir toast göründü mü:', await page.locator('.toast').count());

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(150);
  console.log('Hareketler listesinde "Haftalık market" var mı:', await page.locator('.tx-row', { hasText: 'Haftalık market' }).count());
  console.log('Hareketler listesinde "Ağustos maaşı" var mı:', await page.locator('.tx-row', { hasText: 'Ağustos maaşı' }).count());
  console.log('Hatalı satırlar eklenmemiş mi (0 beklenir):', await page.locator('.tx-row', { hasText: 'Hatalı satır' }).count());

  // --- Tekrar eden harcama önerisi ---
  await page.click('.fab[data-action="open-tx"]');
  await page.waitForTimeout(150);
  await page.fill('input[name="note"]', 'Haftalık market');
  await page.dispatchEvent('input[name="note"]', 'change');
  await page.waitForTimeout(150);
  console.log('Öneri kutusu göründü mü (1 beklenir):', await page.locator('[data-action="apply-note-suggestion"]').count());
  await page.click('[data-action="apply-note-suggestion"]');
  await page.waitForTimeout(150);
  console.log('Market kategorisi seçili mi:', await page.locator('.cat-opt[data-val]', { hasText: 'Market / Gıda' }).getAttribute('aria-pressed'));
  const personSel = page.locator('select[name="personId"]');
  const personVal = await personSel.inputValue();
  const personText = await personSel.locator('option[value="' + personVal + '"]').innerText();
  console.log('Kişi Ergin seçili mi:', personText);

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
