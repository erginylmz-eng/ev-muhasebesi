const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.route('**://fonts.g*/**', route => route.abort());
    await page.goto('file://' + path.resolve(__dirname, '../dist/final.html'));
    await page.waitForTimeout(200);
    await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
    await page.waitForTimeout(100);

    // hesaplar: banka + kart + verilen borç + alınan borç
    await page.click('[data-action="tab"][data-tab="hesaplar"]');
    await page.click('button:has-text("Hesap Ekle")');
    await page.fill('#modal-first-input', 'Ziraat Vadesiz');
    await page.fill('input[name="opening"]', '8000');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(100);

    await page.click('button:has-text("Hesap Ekle")');
    await page.click('[data-action="acc-type"][data-val="card"]');
    await page.fill('#modal-first-input', 'Bonus Kart');
    await page.fill('input[name="opening"]', '1500');
    await page.fill('input[name="limit"]', '10000');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(100);

    await page.click('button:has-text("Hesap Ekle")');
    await page.click('[data-action="acc-type"][data-val="loan_given"]');
    await page.fill('#modal-first-input', 'Ahmete Borç');
    await page.fill('input[name="opening"]', '2000');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(100);

    await page.click('button:has-text("Hesap Ekle")');
    await page.click('[data-action="acc-type"][data-val="loan_taken"]');
    await page.fill('#modal-first-input', 'Ayseden Borc');
    await page.fill('input[name="opening"]', '1000');
    await page.click('form[data-action="save-account"] button[type=submit]');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/bb_hesaplar_${scheme}.png`, fullPage: true });

    // düzenli ödeme ekle -> özet banner + forecast
    await page.click('[data-action="tab"][data-tab="ayarlar"]');
    await page.click('button:has-text("Gider Ekle")');
    await page.fill('#modal-first-input', 'Kira');
    await page.fill('input[name="amount"]', '5000');
    await page.fill('input[name="day"]', '1');
    await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
    await page.click('form[data-action="save-recurring"] button[type=submit]');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/bb_ayarlar_recurring_${scheme}.png` });

    await page.click('[data-action="tab"][data-tab="ozet"]');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/bb_ozet_banner_${scheme}.png` });

    // taksitli harcama formu
    await page.click('.fab');
    await page.fill('#modal-first-input', '900');
    await page.click('.cat-opt >> nth=0');
    await page.selectOption('select[name="accountId"]', { label: 'Bonus Kart (Kredi Kartı)' });
    await page.waitForTimeout(100);
    await page.check('input[name="installment"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/bb_installment_${scheme}.png` });
    await page.click('[data-action="close-modal"]');

    // hedefler + kişi raporu
    await page.click('[data-action="tab"][data-tab="raporlar"]');
    await page.click('[data-action="goal-new"]');
    await page.fill('#modal-first-input', 'Tatil');
    await page.fill('input[name="target"]', '20000');
    await page.fill('input[name="current"]', '6500');
    await page.click('form[data-action="save-goal"] button[type=submit]');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/bb_raporlar_goals_${scheme}.png`, fullPage: true });

    // hareketler gelişmiş filtre paneli
    await page.click('[data-action="tab"][data-tab="hareketler"]');
    await page.click('[data-action="toggle-tx-filters"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/bb_filters_${scheme}.png` });

    await page.close();
  }

  await browser.close();
})();
