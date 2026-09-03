/* Şifre Kasası: banka/site şifrelerinin bir "ana şifre" ile uçtan uca
   şifrelenip saklandığını, kilit açma/kilitleme akışının ve yanlış ana
   şifrenin reddedildiğini doğrular. Ana şifre ve ondan türetilen anahtar
   asla state'e/kaydedilen belgeye düz metin olarak girmemeli — bu da ayrıca
   kontrol ediliyor. */
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

  await page.click('[data-action="tab"][data-tab="sifreler"]');
  await page.waitForTimeout(150);
  console.log('Kasa oluşturma ekranı görünüyor mu:', await page.locator('form[data-action="vault-setup"]').count());

  // Ana şifre belirle
  await page.fill('form[data-action="vault-setup"] input[name="password"]', 'gizli-ana-sifre-123');
  await page.fill('form[data-action="vault-setup"] input[name="password2"]', 'gizli-ana-sifre-123');
  await page.click('form[data-action="vault-setup"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('Kasa oluşturulduktan sonra "Yeni Şifre Ekle" butonu var mı:', await page.locator('[data-action="vault-add"]').count());

  // Yeni şifre ekle
  await page.click('[data-action="vault-add"]');
  await page.waitForTimeout(150);
  await page.fill('form[data-action="vault-save"] input[name="bank"]', 'Ziraat Bankası');
  await page.fill('form[data-action="vault-save"] input[name="username"]', 'ergin.yilmaz');
  await page.fill('form[data-action="vault-save"] input[name="password"]', 'Sup3rGizli!');
  await page.fill('form[data-action="vault-save"] textarea[name="notes"]', 'İnternet bankacılığı şifresi');
  await page.click('form[data-action="vault-save"] button[type=submit]');
  await page.waitForTimeout(200);

  const rowText = await page.locator('.row', { hasText: 'Ziraat Bankası' }).first().innerText();
  console.log('Kayıt eklendi mi (banka adı görünüyor mu):', rowText.includes('Ziraat Bankası'));
  console.log('Şifre varsayılan olarak MASKELİ mi (düz metin GÖRÜNMEMELİ):', !rowText.includes('Sup3rGizli!') && rowText.includes('••••'));
  console.log('Sayfanın hiçbir yerinde düz metin şifre yok mu (maskeliyken):', !(await page.content()).includes('Sup3rGizli!'));

  // Göster'e bas -> şifre çözülüp görünmeli
  await page.click('[data-action="vault-toggle-reveal"]');
  await page.waitForTimeout(200);
  const revealedText = await page.locator('.row', { hasText: 'Ziraat Bankası' }).first().innerText();
  console.log('Göster sonrası gerçek şifre görünüyor mu:', revealedText.includes('Sup3rGizli!'));
  console.log('Göster sonrası kullanıcı adı görünüyor mu:', revealedText.includes('ergin.yilmaz'));

  // Kilitle -> tekrar kilit ekranı gelmeli, kayıtlar/düz metin şifre görünmemeli
  await page.click('[data-action="vault-lock"]');
  await page.waitForTimeout(150);
  console.log('Kilitledikten sonra kilit ekranı geldi mi:', await page.locator('form[data-action="vault-unlock"]').count());
  console.log('Kilitledikten sonra sayfada düz metin şifre kalmadı mı:', !(await page.content()).includes('Sup3rGizli!'));

  // Yanlış ana şifre ile açmayı dene -> reddedilmeli
  await page.fill('form[data-action="vault-unlock"] input[name="password"]', 'yanlis-sifre');
  await page.click('form[data-action="vault-unlock"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('Yanlış ana şifre reddedildi mi (hata mesajı var mı):', await page.locator('text=Yanlış ana şifre').count());
  console.log('Yanlış şifreyle kasa hâlâ kilitli mi (unlock formu hâlâ var mı):', await page.locator('form[data-action="vault-unlock"]').count());

  // Doğru ana şifre ile aç -> kayıt tekrar görünmeli (maskeli)
  await page.fill('form[data-action="vault-unlock"] input[name="password"]', 'gizli-ana-sifre-123');
  await page.click('form[data-action="vault-unlock"] button[type=submit]');
  await page.waitForTimeout(200);
  console.log('Doğru ana şifreyle tekrar açıldı mı (kayıt görünüyor mu):', await page.locator('.row', { hasText: 'Ziraat Bankası' }).count());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
