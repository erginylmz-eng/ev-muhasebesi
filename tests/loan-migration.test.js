/* Eski model kredi (sourceAccountId + önceden üretilmiş planlı taksit
   transferleri ile) yeni modele (sadece taksit tutarı × sayısı, opening
   otomatik hesaplanmış) doğru geçiyor mu? "araba" senaryosunu taklit eder:
   opening:0 + bir gerçekleşmiş ödeme -> migration sonrası opening=monthly*count
   olmalı ve kalan borç mantıklı (negatif olmayan) bir değer vermeli. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const template = fs.readFileSync(path.join(__dirname, '../src/app.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

  const oldModelState = {
    v: 1,
    people: [{ id:'p_ergin', name:'Ergin', approved:true, isAdmin:true }],
    categories: { expense:[{id:'ce1',name:'Diğer Gider',slot:0}], income:[{id:'ci1',name:'Diğer Gelir',slot:0}] },
    accounts: [
      { id:'acc_nakit', type:'cash', name:'Nakit', opening:0, currency:'TRY' },
      { id:'acc_banka', type:'bank', name:'Ziraat', opening:100000, currency:'TRY' },
      { id:'acc_araba', type:'loan_account', name:'araba', opening:0, monthlyPayment:15000, totalInstallments:12, sourceAccountId:'acc_banka', nextDueDate:'2026-01-15' }
    ],
    transactions: [
      /* gerçekleşmiş (planned olmayan) bir ödeme -- geçmişte yapılmış */
      { id:'tx1', type:'transfer', amount:15000, date:'2026-02-15', accountId:'acc_banka', toAccountId:'acc_araba', note:'araba taksit ödemesi (1/12)', tags:[], receipt:null },
      /* hâlâ planlı (gelecek), migration bunları SİLMELİ */
      { id:'tx2', type:'transfer', amount:15000, date:'2026-10-15', accountId:'acc_banka', toAccountId:'acc_araba', note:'araba taksit ödemesi (2/12)', tags:[], receipt:null, status:'planned' },
      { id:'tx3', type:'transfer', amount:15000, date:'2026-11-15', accountId:'acc_banka', toAccountId:'acc_araba', note:'araba taksit ödemesi (3/12)', tags:[], receipt:null, status:'planned' }
    ],
    budgets:{}, recurring:[], goals:[], templates:[],
    cardNetworks:[{id:'net_bonus',name:'Bonus'}]
  };
  const stateJson = JSON.stringify(oldModelState).replace(/</g, '\\u003c');
  let html = template.replace('__STATE_JSON__', function(){ return stateJson; }).replace('__APP_JS__', function(){ return appJs; });
  const tmpFile = path.join(__dirname, '_tmp_loan_migration.html');
  fs.writeFileSync(tmpFile, html);

  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('file://' + tmpFile);
  await page.waitForTimeout(200);
  await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
  await page.waitForTimeout(150);

  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(150);
  console.log('araba kredisi listede mi:', await page.locator('.acct-card', { hasText: 'araba' }).count());
  console.log('araba kalan borcu (165.000,00 ₺ beklenir -- 180.000 toplam - 15.000 ödenen):',
    await page.locator('.acct-card', { hasText: 'araba' }).locator('.acct-bal .v').innerText());

  await page.locator('.acct-card', { hasText: 'araba' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  console.log('Kredi Tutarı (180.000,00 ₺ beklenir):', await page.locator('.mute2', { hasText: 'Kredi Tutarı' }).innerText());
  console.log('hareket sayısı (sadece 1 gerçekleşmiş ödeme kalmalı, planlı olanlar silinmeli):', await page.locator('.sheet .tx-row').count());
  console.log('sourceAccountId/nextDueDate ile ilgili herhangi bir alan formda YOK mu (yeni modelde olmamalı):', await page.locator('select[name="sourceAccountId"]').count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
  fs.unlinkSync(tmpFile);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
