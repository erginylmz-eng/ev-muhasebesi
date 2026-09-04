/* Planlı (gelecek tarihli girilip vadesi gelmiş) işlemler banner'ı: "Ertele"
   ve "Gerçekleşti" akışları doğru çalışıyor mu?

   ÖNEMLİ: Bu test daha önce dosyada bulunmayan, hiçbir script tarafından
   ÜRETİLMEYEN /tmp/seeded_final.html adlı elle oluşturulmuş bir dosyaya
   bağımlıydı — bu yüzden yalnızca o dosyanın zaten var olduğu bir makinede
   (geliştirme sırasında kullanılan bulut sandbox'ı) "geçiyor" görünüyordu;
   GitHub Actions gibi her seferinde temiz bir makinede ise her zaman
   çökme/timeout ile başarısız oluyordu (bu, gerçek CI çalıştırmasında fark
   edildi). Düzeltme: loan-migration.test.js'te olduğu gibi başlangıç
   durumunu doğrudan src/app.html şablonuna (__STATE_JSON__) gömüp kendi
   geçici HTML dosyasını üretiyoruz — hiçbir dış/elle dosyaya bağımlılık yok. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const template = fs.readFileSync(path.join(__dirname, '../src/app.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

  const seedState = {
    v: 1,
    people: [
      { id: 'p_ergin', name: 'Ergin', approved: true, isAdmin: true },
      { id: 'p_es', name: 'Eş', approved: true, isAdmin: false }
    ],
    categories: {
      expense: [{ id: 'ce1', name: 'Market / Gıda', slot: 0 }],
      income: [{ id: 'ci1', name: 'Diğer Gelir', slot: 0 }]
    },
    accounts: [
      { id: 'acc_nakit', type: 'cash', name: 'Nakit', opening: 0 },
      { id: 'acc_bank', type: 'bank', name: 'Ziraat Vadesiz', opening: 5000 }
    ],
    /* İkisi de "planned" (vadesi geçmişte, henüz gerçekleşti/ertelendi denmemiş)
       -- normalde bu durum yalnızca oluşturulduğunda gelecekte olup sonradan
       vadesi gelen bir kayıtta oluşur; burada tarihi kasıtlı olarak geçmişte
       (2020-01-01) sabitleyip status'u doğrudan 'planned' vererek, testi
       çalıştırıldığı güne bağlı olmayan, tamamen deterministik hâle getiriyoruz. */
    transactions: [
      { id: 'tx_due1', type: 'expense', amount: 150, date: '2020-01-01', accountId: 'acc_bank', categoryId: 'ce1', personId: null, note: 'Test planlı gider A', tags: [], receipt: null, status: 'planned', seriesId: 'series_test' },
      { id: 'tx_due2', type: 'expense', amount: 75, date: '2020-01-01', accountId: 'acc_bank', categoryId: 'ce1', personId: null, note: 'Test planlı gider B', tags: [], receipt: null, status: 'planned', seriesId: 'series_test' }
    ],
    budgets: {}, recurring: [], goals: [], templates: []
  };
  const stateJson = JSON.stringify(seedState).replace(/</g, '\\u003c');
  const html = template.replace('__STATE_JSON__', function () { return stateJson; }).replace('__APP_JS__', function () { return appJs; });
  const tmpFile = path.join(__dirname, '_tmp_planned_banner.html');
  fs.writeFileSync(tmpFile, html);

  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.route('**://fonts.g*/**', route => route.abort());
  await page.goto('file://' + tmpFile);
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  console.log('planlanan işlemler banner\'ı görünüyor mu:', await page.locator('.planned-banner', { hasText: 'Planlanan işlemler' }).count());
  console.log('iki planlı kayıt da banner içinde mi (2 olmalı):', await page.locator('.planned-banner .recur-item').count());

  // ---- Ertele (A) ----
  await page.click('.planned-banner .recur-item:has-text("Test planlı gider A") [data-action="postpone-planned"]');
  await page.waitForTimeout(150);
  console.log('ertele formu açıldı mı:', await page.locator('form[data-action="save-postpone"]').count());
  await page.fill('input[name="date"]', '2099-01-01');
  await page.click('form[data-action="save-postpone"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('erteledikten sonra banner\'da 1 kayıt kaldı mı (B):', await page.locator('.planned-banner .recur-item').count());

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(100);
  console.log('ertelenen A hâlâ planlandı etiketiyle görünüyor mu:', await page.locator('.tx-row', { hasText: 'Test planlı gider A' }).locator('.planned-pill').count());
  console.log('ertelenen A yeni tarihi 2099 mu:', (await page.locator('.tx-row', { hasText: 'Test planlı gider A' }).locator('.s').innerText()).includes('2099'));

  // ---- Gerçekleşti (B) ----
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(100);
  await page.click('.planned-banner .recur-item:has-text("Test planlı gider B") [data-action="realize-planned"]');
  await page.waitForTimeout(200);
  console.log('gerçekleştirdikten sonra banner tamamen kayboldu mu (0 olmalı):', await page.locator('.planned-banner').count());

  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(100);
  const bankBal = await page.locator('.acct-card', { hasText: 'Ziraat Vadesiz' }).locator('.acct-bal .v').innerText();
  console.log('B gerçekleştikten sonra banka bakiyesi (yalnız B düşmeli, 4925,00 ₺ beklenir):', bankBal);

  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(100);
  console.log('B artık planlandı etiketi taşımıyor mu (0 olmalı):', await page.locator('.tx-row', { hasText: 'Test planlı gider B' }).locator('.planned-pill').count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
  fs.unlinkSync(tmpFile);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
