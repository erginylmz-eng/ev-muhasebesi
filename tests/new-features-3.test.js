/* 4 Eylül 2026 istekleri: Abonelik paneli (+ bütçeye yansıma), harcama
   alışkanlığı içgörüleri, tarih bazlı genel hatırlatıcılar + kredi kartı
   ödeme günü hatırlatıcısı (3/2/1 gün kala). Finansal Bilgilendirme ve
   otomatik yedekleme yalnızca bağımsız sitede (Firestore) anlamlı olduğu
   için burada kapsanmıyor — bkz. standalone-smoke.test.js ve canlı doğrulama. */
const { chromium } = require('playwright');
const path = require('path');

/* app.js'teki rollWeekendToMonday/cardPaymentDateForStatement ile BİREBİR aynı
   mantık — "bugün"e göre kredi kartı ödeme tarihini önceden, testin çalıştığı
   günden bağımsız doğru şekilde hesaplamak için. */
function pad2(n) { return String(n).length < 2 ? '0' + n : '' + n; }
function isoDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function rollWeekendToMonday(d) {
  const r = new Date(d);
  const dow = r.getDay();
  if (dow === 6) r.setDate(r.getDate() + 2);
  else if (dow === 0) r.setDate(r.getDate() + 1);
  return r;
}
function daysBetween(a, b) {
  const oneDay = 24 * 60 * 60 * 1000;
  const na = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const nb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((nb - na) / oneDay);
}

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

  // ---- Banka hesabı ekle (abonelik/gider kaydı için) ----
  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.fill('#modal-first-input', 'Ziraat Vadesiz');
  await page.fill('input[name="opening"]', '20000');
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  // ================= ABONELİK PANELİ =================
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.click('[data-action="recurring-new"][data-type="expense"]');
  await page.waitForTimeout(100);
  console.log('Düzenli ödeme formunda "Bu bir abonelik" kutusu var mı:', await page.locator('input[name="isSubscription"]').count());
  await page.fill('#modal-first-input', 'Netflix');
  await page.fill('input[name="amount"]', '250');
  await page.fill('input[name="day"]', '1');
  await page.check('input[name="isSubscription"]');
  await page.click('form[data-action="save-recurring"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('Düzenli Ödemeler listesinde "Abonelik" etiketi var mı:', await page.locator('.pill', { hasText: 'Abonelik' }).count());

  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(150);
  console.log('Raporlar\'da "Aktif Abonelikleriniz" başlığı var mı:', await page.locator('.section-title', { hasText: 'Aktif Abonelikleriniz' }).count());
  console.log('Netflix abonelik listesinde görünüyor mu:', await page.locator('.card', { hasText: 'Netflix' }).count() >= 1);
  console.log('Toplam Aylık Abonelik Maliyeti satırı var mı:', await page.locator('text=Toplam Aylık Abonelik Maliyeti').count());

  // ---- bütçeye yansıma: Netflix'in kategorisine bir limit koy, henüz "Ekle"
  // denmediği için bu ayki abonelik tutarı "beklenen" olarak bütçe satırında görünmeli ----
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  const firstExpenseInput = page.locator('form[data-action="save-budgets"] input.amount-input').first();
  await firstExpenseInput.fill('100');
  await page.click('form[data-action="save-budgets"] button[type=submit]');
  await page.waitForTimeout(150);
  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(150);
  console.log('Bütçe satırında "henüz eklenmedi" (beklenen abonelik) notu var mı:', await page.locator('text=henüz eklenmedi').count());

  // ================= HARCAMA ALIŞKANLIĞI İÇGÖRÜLERİ =================
  // geçen ay aynı kategoriye küçük bir harcama, bu ay aynı kategoriye çok daha büyük bir harcama
  const cur = new Date();
  const prevMonthDate = new Date(cur.getFullYear(), cur.getMonth() - 1, 10);
  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(100);
  await page.click('.fab');
  await page.fill('#modal-first-input', '100');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.fill('input[name="date"]', isoDate(prevMonthDate));
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('.fab');
  await page.fill('#modal-first-input', '900');
  await page.click('.cat-opt >> nth=0');
  await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);

  await page.click('[data-action="tab"][data-tab="raporlar"]');
  await page.waitForTimeout(150);
  console.log('"Harcama Alışkanlığı İçgörüleri" başlığı var mı:', await page.locator('.section-title', { hasText: 'Harcama Alışkanlığı İçgörüleri' }).count());
  console.log('"daha fazla harcadınız" içgörüsü var mı:', await page.locator('text=daha fazla harcadınız').count() >= 1);

  // ================= TARİH BAZLI GENEL HATIRLATICILAR =================
  const remindIn3Days = isoDate(addDays(cur, 3));
  await page.click('[data-action="tab"][data-tab="ayarlar"]');
  await page.click('[data-action="reminder-new"]');
  await page.waitForTimeout(100);
  await page.fill('#modal-first-input', 'Kasko Yenileme');
  await page.fill('input[name="date"]', remindIn3Days);
  await page.click('form[data-action="save-reminder"] button[type=submit]');
  await page.waitForTimeout(150);
  console.log('Ayarlar\'da hatırlatıcı listede görünüyor mu (>=1, ayrıca denetim günlüğünde de görünebileceği için toplam 2 olabilir):', await page.locator('.switch-row', { hasText: 'Kasko Yenileme' }).count());

  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  console.log('Özet\'te "Hatırlatıcılar" banner\'ı var mı:', await page.locator('.reminder-banner', { hasText: 'Kasko Yenileme' }).count());
  await page.click('[data-action="dismiss-reminder"]');
  await page.waitForTimeout(150);
  console.log('"Gördüm" sonrası banner\'dan kalktı mı (0 olmalı):', await page.locator('.reminder-banner', { hasText: 'Kasko Yenileme' }).count());

  // ================= KREDİ KARTI ÖDEME GÜNÜ HATIRLATICISI =================
  // statementDay=1 sabit; paymentDay, ödeme tarihinin "bugünden 2 gün sonrası"na
  // (hafta sonuna denk gelirse Pazartesi'ye kayarak) denk gelecek şekilde
  // hesaplanıyor — testin hangi gün çalıştığından bağımsız kesin doğrulama için.
  let targetRaw = addDays(cur, 2);
  if (targetRaw.getMonth() !== cur.getMonth() || targetRaw.getDate() > 28) targetRaw = new Date(cur);
  const statementDay = 1;
  let paymentDayNum = targetRaw.getDate();
  if (paymentDayNum <= statementDay) paymentDayNum = statementDay + 1;
  const rolledPayDate = rollWeekendToMonday(new Date(cur.getFullYear(), cur.getMonth(), paymentDayNum));
  const expectedDays = daysBetween(cur, rolledPayDate);

  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.click('button:has-text("Hesap Ekle")');
  await page.click('[data-action="acc-type"][data-val="card"]');
  await page.fill('#modal-first-input', 'Bonus Kart');
  await page.fill('input[name="opening"]', '0');
  await page.fill('input[name="limit"]', '20000');
  await page.fill('input[name="statementDay"]', String(statementDay));
  await page.fill('input[name="paymentDay"]', String(paymentDayNum));
  await page.click('form[data-action="save-account"] button[type=submit]');
  await page.waitForTimeout(150);

  // karta borç oluştur ki ödenmemiş bakiyesi olsun
  await page.locator('.acct-card', { hasText: 'Bonus Kart' }).locator('.acct-clickable').click();
  await page.waitForTimeout(150);
  await page.click('[data-action="quick-add-tx"]');
  await page.waitForTimeout(150);
  await page.fill('#modal-first-input', '500');
  await page.click('.cat-opt >> nth=0');
  await page.click('form[data-action="save-tx"] button[type=submit]');
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  await page.click('[data-action="tab"][data-tab="ozet"]');
  await page.waitForTimeout(150);
  if (expectedDays >= 0 && expectedDays <= 3) {
    console.log('Beklenen gün farkı (0-3 aralığında olmalı):', expectedDays);
    console.log('Kredi kartı ödeme hatırlatıcısı banner\'da görünüyor mu:', await page.locator('.reminder-banner', { hasText: 'Bonus Kart ödemesi' }).count());
  } else {
    console.log('Bu çalıştırmada hedef ödeme tarihi 3 günlük pencerenin dışına düştü (beklenen), banner testi atlandı. expectedDays=', expectedDays);
  }

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
