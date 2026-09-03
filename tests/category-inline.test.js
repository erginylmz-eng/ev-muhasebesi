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

  // yeni hareket formunu aç, gider kategori sayısını say
  await page.click('.fab');
  await page.waitForTimeout(150);
  const catCountBefore = await page.locator('.cat-opt-wrap').count();
  console.log('başlangıç gider kategori sayısı:', catCountBefore);

  // tutarı doldur (kategori ekleme sonrası kaybolmamalı)
  await page.fill('#modal-first-input', '275');

  // "+ Yeni" ile kategori ekle
  await page.click('[data-action="tx-cat-add-toggle"]');
  await page.waitForTimeout(100);
  console.log('ekleme satırı görünüyor mu:', await page.locator('#tx-cat-add-input').count());
  await page.fill('#tx-cat-add-input', 'Evcil Hayvan');
  await page.click('[data-action="tx-cat-add-save"]');
  await page.waitForTimeout(150);

  const catCountAfter = await page.locator('.cat-opt-wrap').count();
  console.log('kategori eklendikten sonra sayı (+1 olmalı):', catCountAfter, '(önce ' + catCountBefore + ')');
  console.log('yeni kategori seçili mi:', await page.locator('.cat-opt[aria-pressed="true"]', { hasText: 'Evcil Hayvan' }).count());
  console.log('tutar korunmuş mu (275 olmalı):', await page.locator('#modal-first-input').inputValue());

  // düzenleme moduna gir, yeni eklenen kategoriyi sil
  await page.click('[data-action="tx-cat-edit-toggle"]');
  await page.waitForTimeout(100);
  console.log('silme butonları görünüyor mu (>=1):', await page.locator('.cat-del').count());
  await page.locator('.cat-opt-wrap', { hasText: 'Evcil Hayvan' }).locator('.cat-del').click();
  await page.waitForTimeout(150);
  console.log('onay diyaloğu açıldı mı:', await page.locator('.confirm-card', { hasText: 'Kategoriyi sil' }).count());
  await page.click('[data-action="confirm-yes"]');
  await page.waitForTimeout(150);

  // hareket formuna geri dönmeli, tutar hâlâ korunmalı
  console.log('hareket formuna geri döndü mü:', await page.locator('.sheet-head h2', { hasText: 'Yeni Hareket' }).count());
  console.log('tutar hâlâ 275 mi (geri dönüşten sonra):', await page.locator('#modal-first-input').inputValue());
  const catCountFinal = await page.locator('.cat-opt-wrap').count();
  console.log('kategori silindikten sonra sayı (başlangıçla aynı olmalı):', catCountFinal, '(başlangıç ' + catCountBefore + ')');
  console.log('silinen kategori artık listede yok mu:', await page.locator('.cat-opt', { hasText: 'Evcil Hayvan' }).count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
