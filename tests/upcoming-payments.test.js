/* "Gelecek Ödemeler" (Raporlar) — kullanıcının Excel'de tuttuğu tabloya
   benzer şekilde, planlı kayıtlar + düzenli ödemeler + kredi kartı ödeme
   günü + kredi taksitlerini TEK bir kronolojik listede, kümülatif tahmini
   bakiyeyle birlikte gösteren bölümü doğrular.

   Tüm tarihler "bugün"e göre (new Date()) dinamik hesaplanır — testin
   çalıştığı güne bağımlı sabit tarih YOK (bkz. new-features-3.test.js'teki
   aynı prensip). Kredi kartı ödeme günü ve düzenli ödemenin bir sonraki
   ay projeksiyonu, app.js'teki cardPaymentDateForStatement/addMonths ile
   BİREBİR aynı mantıkla burada yeniden hesaplanıp beklenen tarih olarak
   kullanılıyor. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

function pad2(n) { return String(n).length < 2 ? '0' + n : '' + n; }
function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function addMonthsKey(key, n) {
  const parts = key.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1 + n, 1);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
}
function rollWeekendToMondayDate(y, m0, day) {
  const d = new Date(y, m0, day);
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2);
  else if (dow === 0) d.setDate(d.getDate() + 1);
  return d;
}
function cardPaymentDateForStatementKey(statementDay, paymentDay, statementMonthKey) {
  const payMonthKey = paymentDay <= statementDay ? addMonthsKey(statementMonthKey, 1) : statementMonthKey;
  const parts = payMonthKey.split('-').map(Number);
  return rollWeekendToMondayDate(parts[0], parts[1] - 1, clamp(paymentDay, 1, 28));
}
/* app.js'teki addMonthsToDate ile birebir aynı: 3 ay sonraki ufuk tarihi. */
function addMonthsToDate(cur, n) {
  const d = new Date(cur.getFullYear(), cur.getMonth() + n, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(cur.getDate(), lastDay));
  return d;
}
function parseTRYAmount(text) {
  const t = (text || '').replace(/[^0-9.,-]/g, '');
  const neg = t.startsWith('-') || /−/.test(text || '');
  const cleaned = t.replace(/^-/, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return neg ? -n : n;
}

(async () => {
  const cur = new Date();
  const todayIso = isoDate(cur);
  const startMk = cur.getFullYear() + '-' + pad2(cur.getMonth() + 1);
  const horizonIso = isoDate(addMonthsToDate(cur, 3));

  // ---- Kredi kartı: statementDay=1 sabit, paymentDay=28 sabit — hangi ay
  // eşleşeceği (bu ay mı, gelecek ay mı) testin çalıştığı güne göre değişir,
  // bu yüzden app.js'teki BİREBİR AYNI döngüyle beklenen tarihi buluyoruz. */
  const statementDay = 1, paymentDay = 28;
  let cardPayDateIso = null;
  for (let i = 0; i <= 3; i++) {
    const mk = addMonthsKey(startMk, i);
    const d = cardPaymentDateForStatementKey(statementDay, paymentDay, mk);
    const dIso = isoDate(d);
    if (dIso < todayIso || dIso > horizonIso) continue;
    cardPayDateIso = dIso;
    break;
  }
  if (!cardPayDateIso) throw new Error('Test kurulum hatası: kart ödeme tarihi ufuk içinde bulunamadı');

  const recurringDateIso = addMonthsKey(startMk, 1) + '-15';
  const alreadyDoneDay = clamp(cur.getDate(), 1, 28);

  const template = fs.readFileSync(path.join(__dirname, '../src/app.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');

  const seedState = {
    v: 1,
    people: [{ id: 'p_ergin', name: 'Ergin', approved: true, isAdmin: true }],
    categories: {
      expense: [{ id: 'ce1', name: 'Market / Gıda', slot: 0 }],
      income: [{ id: 'ci1', name: 'Diğer Gelir', slot: 0 }]
    },
    accounts: [
      { id: 'acc_nakit', type: 'cash', name: 'Nakit', opening: 500 },
      { id: 'acc_bank', type: 'bank', name: 'Ziraat Vadesiz', opening: 3000 },
      { id: 'acc_card', type: 'card', name: 'Bonus Kart', opening: 0, limit: 20000, statementDay: statementDay, paymentDay: paymentDay },
      {
        // _migratedToSimpleLoan:true — boot sırasında çalışan eski-model
        // kredi geçişinin (a) opening'i yeniden hesaplamasını VE (b) bu
        // hesaba yönelik PLANLI transferleri "eski model artığı" sayıp
        // SİLMESİNİ engellemek için (bkz. migrateState) — testin planlı
        // kredi ödemesi senaryosunu bozmaması için gerekli.
        id: 'acc_loan', type: 'loan_account', name: 'Konut Kredisi', opening: 0, _migratedToSimpleLoan: true,
        schedule: [
          { no: 1, date: isoDate(addDays(cur, -60)), payment: 1000, principal: 900, interest: 100, balance: 9000 },
          { no: 2, date: isoDate(addDays(cur, 15)), payment: 1000, principal: 920, interest: 80, balance: 8080 },
          { no: 3, date: isoDate(addDays(cur, 200)), payment: 1000, principal: 950, interest: 50, balance: 7130 }
        ]
      }
    ],
    // Gerçekleşmiş (planned OLMAYAN) kayıtlar: kart borcu oluşturur, krediye
    // bir taksit öder (#1 "ödendi" sayılsın diye) ve düzenli ödemenin
    // "zaten bu ay için oluşmuş" durumunu simüle eder.
    transactions: [
      { id: 'tx_card_debt', type: 'expense', amount: 1200, date: isoDate(addDays(cur, -5)), accountId: 'acc_card', categoryId: 'ce1', personId: null, note: 'Kart harcaması', tags: [], receipt: null, seriesId: null },
      { id: 'tx_loan_pay1', type: 'transfer', amount: 1000, date: isoDate(addDays(cur, -60)), accountId: 'acc_bank', toAccountId: 'acc_loan', personId: null, note: 'Taksit ödemesi', tags: [], receipt: null, seriesId: null },
      { id: 'tx_rec_rec_already_done_' + startMk, type: 'expense', amount: 99, date: startMk + '-' + pad2(alreadyDoneDay), accountId: 'acc_bank', categoryId: 'ce1', personId: null, note: 'Zaten oluşmuş kayıt', tags: [], receipt: null, seriesId: null },
      { id: 'tx_planned_expense', type: 'expense', amount: 450, date: isoDate(addDays(cur, 10)), accountId: 'acc_bank', categoryId: 'ce1', personId: null, note: 'Test planlı gider', tags: [], receipt: null, status: 'planned', seriesId: 'series_planned1' },
      { id: 'tx_planned_transfer_debt', type: 'transfer', amount: 300, date: isoDate(addDays(cur, 20)), accountId: 'acc_bank', toAccountId: 'acc_loan', personId: null, note: 'Planlı kredi ödemesi', tags: [], receipt: null, status: 'planned', seriesId: 'series_planned2' }
    ],
    budgets: {}, goals: [], templates: [],
    // ÖNEMLİ: totalInstallments/installmentsRemaining KASITLI OLARAK
    // kullanılmıyor — bu ikili birlikte >0 olursa migrateState() bunu "eski
    // taksitli-kart modeli" sanıp şablonu HEMEN planlı kayıtlara çeviriyor
    // ve r.active=false yapıyor (bkz. app.js ~l.400), ki bu bizim test etmek
    // istediğimiz "düzenli ödeme → Gelecek Ödemeler satırı" mantığının
    // (upcomingPaymentsRows kaynak #2) tamamen dışında bir kod yolu. Bunun
    // yerine occurrence sayısını skippedMonths ile ay ay kısıtlıyoruz.
    recurring: [
      // Yalnızca GELECEK ay (startMk+1) için tek bir satır üretsin diye
      // diğer 3 aday ay (bu ay, +2, +3) atlanıyor.
      { id: 'rec_ok', active: true, type: 'expense', amount: 250, name: 'İnternet', accountId: 'acc_bank', day: 15, isSubscription: false, skippedMonths: [startMk, addMonthsKey(startMk, 2), addMonthsKey(startMk, 3)] },
      // Yalnızca BU ay kontrol edilsin diye diğer 3 ay atlanıyor; bu ay için
      // zaten gerçek bir kayıt oluşmuş (yukarıdaki tx ile aynı id) — bu
      // yüzden HİÇ görünmemeli (tekrar sayılmamalı).
      { id: 'rec_already_done', active: true, type: 'expense', amount: 99, name: 'Zaten Oluşmuş Ödeme', accountId: 'acc_bank', day: alreadyDoneDay, isSubscription: false, skippedMonths: [addMonthsKey(startMk, 1), addMonthsKey(startMk, 2), addMonthsKey(startMk, 3)] }
    ]
  };

  const stateJson = JSON.stringify(seedState).replace(/</g, '\\u003c');
  const html = template.replace('__STATE_JSON__', function () { return stateJson; }).replace('__APP_JS__', function () { return appJs; });
  const tmpFile = path.join(__dirname, '_tmp_upcoming_payments.html');
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

  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(150);

  console.log('"Gelecek Ödemeler" başlığı var mı:', await page.locator('.section-title', { hasText: 'Gelecek Ödemeler' }).count() === 1);

  const section = page.locator('.card', { has: page.locator('table') }).filter({ has: page.locator('th', { hasText: 'Tahmini Bakiye' }) });
  const rows = section.locator('tbody tr');
  const rowCount = await rows.count();
  console.log('Toplam satır sayısı 5 mi (2 planlı + 1 düzenli + 1 kart + 1 kredi taksiti):', rowCount, rowCount === 5);

  console.log('Planlı gider satırı var mı:', await rows.filter({ hasText: 'Test planlı gider' }).count() === 1);
  console.log('Planlı kredi transferi satırı var mı (Konut Kredisi ödemesi):', await rows.filter({ hasText: 'Konut Kredisi ödemesi' }).count() === 1);
  console.log('Düzenli ödeme satırı var mı (İnternet):', await rows.filter({ hasText: 'İnternet (Düzenli)' }).count() === 1);
  console.log('Kredi kartı ödeme satırı var mı (Bonus Kart):', await rows.filter({ hasText: 'Bonus Kart' }).count() === 1);
  console.log('Kredi taksiti #2 satırı var mı:', await rows.filter({ hasText: 'taksidi (#2)' }).count() === 1);
  console.log('Ödenmiş taksit #1 GÖRÜNMÜYOR mu (0 olmalı):', await rows.filter({ hasText: 'taksidi (#1)' }).count() === 0);
  console.log('Ufuk (3 ay) dışındaki taksit #3 GÖRÜNMÜYOR mu (0 olmalı):', await rows.filter({ hasText: 'taksidi (#3)' }).count() === 0);
  console.log('"Zaten Oluşmuş Ödeme" (bu ay için zaten kaydı olan düzenli ödeme) GÖRÜNMÜYOR mu (0 olmalı):', await rows.filter({ hasText: 'Zaten Oluşmuş' }).count() === 0);

  // ---- Kart satırının tarihi, app.js'teki mantıkla yeniden hesaplanan
  // tarihle birebir eşleşiyor mu? ----
  const cardRowDateText = await rows.filter({ hasText: 'Bonus Kart' }).locator('td').first().innerText();
  const expectedCardDateObj = new Date(cardPayDateIso + 'T00:00:00');
  const expectedCardDateText = expectedCardDateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  console.log('Kart ödeme tarihi doğru mu (' + expectedCardDateText + '):', cardRowDateText.trim() === expectedCardDateText);

  const recRowDateText = await rows.filter({ hasText: 'İnternet (Düzenli)' }).locator('td').first().innerText();
  const expectedRecDateObj = new Date(recurringDateIso + 'T00:00:00');
  const expectedRecDateText = expectedRecDateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  console.log('Düzenli ödeme tarihi doğru mu (gelecek ayın 15\'i, ' + expectedRecDateText + '):', recRowDateText.trim() === expectedRecDateText);

  // ---- Başlangıç bakiyesi (cashLikeTotal): nakit(500) + banka(3000-1000-99=1901) = 2401 ----
  const subtitleText = await section.locator('p.mute2').innerText();
  console.log('Alt başlık başlangıç bakiyesini doğru gösteriyor mu (2.401,00 ₺ içermeli):', /2\.401,00/.test(subtitleText));

  // ---- Kümülatif bakiye zinciri: her satırın "Tahmini Bakiye" değeri,
  // bir önceki satırın bakiyesi ± bu satırın tutarı olmalı (tüm satırlar
  // "expense" yönünde, yani hepsi düşülüyor); son satırın bakiyesi de
  // başlangıç(2401) - toplam(450+300+250+1200+1000=3200) = -799 olmalı. */
  let prevBalance = 2401;
  let chainOk = true;
  const n = rowCount;
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i);
    const tds = row.locator('td');
    const amountText = await tds.nth(3).innerText();
    const balanceText = await tds.nth(4).innerText();
    const amount = parseTRYAmount(amountText);
    const balance = parseTRYAmount(balanceText);
    const expected = prevBalance - Math.abs(amount);
    if (Math.abs(expected - balance) > 0.01) { chainOk = false; }
    prevBalance = balance;
  }
  console.log('Kümülatif bakiye zinciri tutarlı mı (her satır bir öncekinden tutar kadar düşük):', chainOk);
  console.log('Son satırın bakiyesi beklenen -799,00 mi:', Math.abs(prevBalance - (-799)) < 0.01, prevBalance);

  // ---- mk !== currentMonthKey() olunca bölüm KAYBOLMALI (yalnızca cari ay
  // için anlamlı). Önceki aya geçelim. ----
  await page.click('[data-action="report-month"][data-dir="-1"]');
  await page.waitForTimeout(150);
  console.log('Önceki aya geçince "Gelecek Ödemeler" bölümü kayboluyor mu (0 olmalı):', await page.locator('.section-title', { hasText: 'Gelecek Ödemeler' }).count() === 0);
  await page.click('[data-action="report-month"][data-dir="1"]');
  await page.waitForTimeout(150);
  console.log('Cari aya dönünce bölüm geri geliyor mu:', await page.locator('.section-title', { hasText: 'Gelecek Ödemeler' }).count() === 1);

  console.log('Sayfa hatası var mı (olmamalı):', errors.length === 0, errors);

  await browser.close();
  try { fs.unlinkSync(tmpFile); } catch (e) {}
})();
