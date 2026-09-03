const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.route('**://fonts.g*/**', route => route.abort());
    await page.goto('file:///home/claude/ev-muhasebesi/dist/final.html');
    await page.waitForTimeout(200);
    await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
    await page.waitForTimeout(150);

    // Banka hesabı ekleme formu: IBAN, vadeli/vadesiz, avans limiti, döviz cinsi
    await page.click('[data-action="tab"][data-tab="hesaplar"]');
    await page.click('button:has-text("Hesap Ekle")');
    await page.waitForTimeout(100);
    await page.fill('#modal-first-input', 'Ziraat Vadesiz');
    await page.fill('input[name="iban"]', 'TR12 0001 0000 0000 0000 0000 01');
    await page.fill('input[name="overdraftLimit"]', '5000');
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f3_bank_form_${scheme}.png` });
    await page.fill('input[name="opening"]', '1000');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(150);

    // Kredi kartı ekleme formu: kart no, banka adı, ağ, kesim/ödeme
    await page.click('button:has-text("Hesap Ekle")');
    await page.click('[data-action="acc-type"][data-val="card"]');
    await page.waitForTimeout(100);
    await page.fill('#modal-first-input', 'Bonus Kart');
    await page.fill('input[name="bankName"]', 'Garanti BBVA');
    await page.fill('input[name="cardNumber"]', '4022123412341234');
    await page.fill('input[name="limit"]', '10000');
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f3_card_form_${scheme}.png` });
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(150);

    // Hesaplar listesi: yeni alanlar (IBAN, vadeli, avans limiti, kart no/banka/ağ/kesim-ödeme)
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f3_hesaplar_liste_${scheme}.png`, fullPage: true });

    // Nakit hesap açılışı: döviz cinsi
    await page.click('button:has-text("Hesap Ekle")');
    await page.click('[data-action="acc-type"][data-val="cash"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f3_cash_form_${scheme}.png` });
    await page.click('[data-action="close-modal"]');

    // Varlık Durumu: Döviz Hesapları bloğu (USD hesap eklendikten sonra)
    await page.click('button:has-text("Hesap Ekle")');
    await page.fill('#modal-first-input', 'Dolar Hesabım');
    await page.fill('input[name="opening"]', '500');
    await page.selectOption('select[name="currency"]', 'USD');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(150);
    await page.click('[data-action="tab"][data-tab="ozet"]');
    await page.waitForTimeout(100);
    await page.click('[data-action="toggle-asset"][data-key="doviz"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f3_doviz_${scheme}.png`, fullPage: true });

    // Ayarlar: Kart Ağları yönetimi
    await page.click('[data-action="tab"][data-tab="ayarlar"]');
    await page.waitForTimeout(100);
    await page.locator('.section-title', { hasText: 'Kart Ağları' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f3_kart_aglari_${scheme}.png` });

    await page.close();
  }

  await browser.close();
})();
