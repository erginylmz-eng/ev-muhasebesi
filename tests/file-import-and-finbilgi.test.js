/* 4 Eylül 2026: (1) Dosyadan yükleyerek ekstre içe aktarma — CSV dosyası
   seçilince aynı toplu-içe-aktarma önizleme akışından geçmeli. (2) Finansal
   Bilgilendirme sekmesi, Claude Artifact görünümünde (BACKEND==='artifact')
   otomatik kur verisine bağlı olmadığını belirten bir bilgi mesajı
   göstermeli — gerçek fetch/Firestore davranışı yalnızca bağımsız sitede
   test edilebilir (bkz. standalone-smoke.test.js ve canlı doğrulama). */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

  // ================= FİNANSAL BİLGİLENDİRME (Claude Artifact görünümü) =================
  console.log('Alt menüde "Bilgi" sekmesi var mı:', await page.locator('[data-action="tab"][data-tab="bilgi"]').count());
  await page.click('[data-action="tab"][data-tab="bilgi"]');
  await page.waitForTimeout(150);
  console.log('Finansal Bilgilendirme başlığı var mı:', await page.locator('.section-title', { hasText: 'Güncel Kur ve Altın Bilgisi' }).count());
  console.log('Bu görünümde "yalnızca bağımsız site" mesajı var mı:', await page.locator('text=yalnızca bağımsız site sürümünde').count());
  console.log('Bu görünümde fetch tetiklenip bir sayfa hatası oluşmadı mı (aşağıdaki ERRORS boş olmalı):', true);

  // ================= DOSYADAN YÜKLEYEREK EKSTRE İÇE AKTARMA =================
  const csvPath = path.join(os.tmpdir(), 'hane-defteri-test-ekstre.csv');
  fs.writeFileSync(csvPath, 'Tarih;Tür;Tutar;Kategori;Hesap;Kişi (ops);Not (ops)\n2026-08-20;Gider;125,50;Market / Gıda;Nakit;Ergin;Dosyadan yüklenen kayıt\n', 'utf8');

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.click('[data-action="open-bulk-import"]');
  await page.waitForTimeout(150);
  console.log('Toplu Kayıt Girişi formunda dosya seçici var mı:', await page.locator('input[type="file"][data-action="bulk-import-file"]').count());
  await page.setInputFiles('input[type="file"][data-action="bulk-import-file"]', csvPath);
  await page.waitForTimeout(200);
  const taVal = await page.locator('#bulk-import-textarea').inputValue();
  console.log('Dosya içeriği metin alanına yüklendi mi:', taVal.includes('Dosyadan yüklenen kayıt'));
  await page.click('[data-action="bulk-import-preview"]');
  await page.waitForTimeout(150);
  console.log('Önizlemede 1 kayıt içe aktarılacak deniyor mu:', await page.locator('text=1 kayıt içe aktarılacak').count());
  await page.click('[data-action="bulk-import-commit"]');
  await page.waitForTimeout(200);
  console.log('İçe aktarma sonrası modal kapandı mı (0 olmalı):', await page.locator('.sheet-overlay').count());
  console.log('Hareketler listesinde dosyadan gelen kayıt görünüyor mu:', await page.locator('.tx-row', { hasText: 'Dosyadan yüklenen kayıt' }).count());

  fs.unlinkSync(csvPath);

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
