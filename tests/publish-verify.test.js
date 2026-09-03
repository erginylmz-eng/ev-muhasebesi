/* dist/publish.html içindeki GERÇEK canlı veriye karşı yayın ÖNCESİ genel bir
   duman testi (smoke test): sayfa hatasız açılıyor mu, giriş perdesi çalışıyor
   mu, temel sekmeler hatasız render oluyor mu, canlıdaki hesap/hareket sayısı
   ne kadar. Belirli hesap adlarına (ör. eski "ev"/"araba" kredi senaryosu)
   bağlı sabit beklentiler KASITLI OLARAK içermiyor — canlı veri zamanla
   değişir (kullanıcı hesap ekler/siler/sıfırlar), bu yüzden bu test her
   yayından önce çalıştırılacak genel bir sağlık kontrolü olarak tasarlandı.
   Regresyon suite'inin (scripts/run-tests.js) parçası DEĞİLDİR — orada
   dist/final.html (sabit/varsayılan veri) kullanılır; bu test yalnızca
   yayın öncesi elle çalıştırılır. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const file = path.join(__dirname, '../dist/publish.html');
  const browser = await chromium.launch({ args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !/ERR_TUNNEL|ERR_FAILED/.test(msg.text())) errors.push('CONSOLE: ' + msg.text()); });

  await page.goto('file://' + file);
  await page.waitForTimeout(200);

  console.log('Giriş perdesi görünüyor mu (>=1 beklenir):', await page.locator('.gate-card').count());
  const peopleButtons = await page.locator('[data-action="identity-pick"]').count();
  console.log('Onaylı kişi sayısı (giriş perdesinde):', peopleButtons);
  if (peopleButtons > 0) {
    await page.locator('[data-action="identity-pick"]').first().click();
    await page.waitForTimeout(150);
  }

  console.log('Hero (Özet) görünüyor mu:', await page.locator('.hero').count());
  const heroTxt = await page.locator('.hero .figure').first().innerText().catch(() => 'BULUNAMADI');
  console.log('Özet üst net durum figürü:', heroTxt);

  for (const tab of ['hareketler', 'hesaplar', 'raporlar', 'ayarlar', 'ozet']) {
    await page.click('[data-action="tab"][data-tab="' + tab + '"]');
    await page.waitForTimeout(150);
  }
  console.log('Tüm sekmeler hatasız gezildi mi (yukarıdaki ERRORS satırına bakın)');

  await page.click('[data-action="tab"][data-tab="hesaplar"]');
  await page.waitForTimeout(150);
  console.log('Canlıdaki hesap sayısı:', await page.locator('.acct-card').count());
  await page.click('[data-action="tab"][data-tab="hareketler"]');
  await page.waitForTimeout(150);
  console.log('Canlıdaki hareket satırı sayısı (bu ekranda, filtre "Hepsi" iken):', await page.locator('.tx-row').count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
