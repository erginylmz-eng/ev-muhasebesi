/* Madde 8: CSV/JSON dışa aktarma. window.claude'u sahte bir downloads
   yeteneğiyle enjekte ederek gerçek indirme akışını ve üretilen içeriği
   doğrular; ayrıca yetenek YOKKEN butonların zarifçe uyarı verdiğini
   (hata fırlatmadığını) de ayrıca kontrol eder. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = path.join(__dirname, '../dist/final.html');
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !/ERR_TUNNEL/.test(msg.text())) errors.push('CONSOLE: ' + msg.text()); });

  // --- 1) downloads yeteneği YOKKEN: buton var, tıklayınca hata değil uyarı ---
  await page.goto('file://' + file);
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.waitForTimeout(150);
  console.log('CSV İndir butonu var mı:', await page.locator('[data-action="export-csv"]').count());
  console.log('JSON İndir butonu var mı:', await page.locator('[data-action="export-json"]').count());
  console.log('.xlsx uyarı notu var mı:', await page.locator('.mute2', { hasText: '.xlsx' }).count());
  await page.click('[data-action="export-csv"]');
  await page.waitForTimeout(150);
  console.log('downloads yeteneği yokken toast (hata fırlatmadan uyarı):', await page.locator('.toast', { hasText: 'kullanılamıyor' }).count());
  console.log('İlk sayfada hata var mı:', errors.length ? errors : 'none');

  // --- 2) downloads yeteneğini sahte olarak enjekte edip gerçek akışı test et ---
  const page2 = await browser.newPage();
  const errors2 = [];
  page2.on('pageerror', e => errors2.push('PAGEERROR: ' + e.message));
  await page2.addInitScript(() => {
    window.__savedFiles = [];
    window.claude = {
      use: function(name) {
        if (name === 'downloads') {
          return Promise.resolve({
            save: function(req) {
              window.__savedFiles.push(req);
              return Promise.resolve({ status: 'saved' });
            }
          });
        }
        return Promise.resolve(null);
      }
    };
  });
  await page2.goto('file://' + file);
  await page2.waitForTimeout(300);
  await page2.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page2.waitForTimeout(150);
  await page2.click('.fab[data-action="open-tx"]');
  await page2.waitForTimeout(150);
  await page2.click('[data-action="tx-type"][data-val="income"]');
  await page2.fill('#modal-first-input', '777');
  await page2.click('.cat-opt >> nth=0');
  await page2.fill('input[name="note"]', 'export-test-note');
  await page2.click('form[data-action="save-tx"] button[type=submit]');
  await page2.waitForTimeout(150);

  await page2.click('[data-action="tab"][data-tab="ayarlar"]');
  await page2.waitForTimeout(150);
  await page2.click('[data-action="export-csv"]');
  await page2.waitForTimeout(150);
  const csvFile = await page2.evaluate(() => window.__savedFiles[0]);
  console.log('CSV dosya adı:', csvFile ? csvFile.filename : 'YOK');
  console.log('CSV içinde test notu var mı:', csvFile ? csvFile.data.includes('export-test-note') : false);
  console.log('CSV içinde 777 tutarı var mı:', csvFile ? csvFile.data.includes('777') : false);
  console.log('İndirildi toast:', await page2.locator('.toast', { hasText: 'İndirildi' }).count());

  await page2.click('[data-action="export-json"]');
  await page2.waitForTimeout(150);
  const jsonFile = await page2.evaluate(() => window.__savedFiles[1]);
  console.log('JSON dosya adı:', jsonFile ? jsonFile.filename : 'YOK');
  let parsedOk = false;
  try { JSON.parse(jsonFile.data); parsedOk = true; } catch (e) {}
  console.log('JSON geçerli mi (parse edilebiliyor mu):', parsedOk);

  console.log('Denetim günlüğünde export kaydı var mı:', await page2.locator('.section-title:has-text("Kayıt Geçmişi") + .card').innerText().then(t => t.includes('dışa aktarıldı')));

  console.log('İkinci sayfada hata var mı:', errors2.length ? errors2 : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
