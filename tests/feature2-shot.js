const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.route('**://fonts.g*/**', route => route.abort());
    await page.goto('file:///tmp/screenshot_final.html');
    await page.waitForTimeout(200);
    await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
    await page.waitForTimeout(150);

    // Özet: planlanan banner + varlık durumu (Nakit/Banka nested)
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f2_ozet_${scheme}.png`, fullPage: true });

    await page.click('[data-action="toggle-asset"][data-key="banka"]');
    await page.waitForTimeout(100);
    await page.click('[data-action="toggle-asset"][data-key="banka_loan_account"]');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f2_varlik_banka_${scheme}.png`, fullPage: true });

    // Raporlar: gider dağılımı + trend (planlanan segmentler)
    await page.click('[data-action="tab"][data-tab="raporlar"]');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f2_raporlar_${scheme}.png`, fullPage: true });

    // Yeni Hareket formu: tekrarlanan gelir/gider seçenekleri
    await page.click('[data-action="tab"][data-tab="ozet"]');
    await page.waitForTimeout(100);
    await page.click('.fab');
    await page.waitForTimeout(100);
    await page.fill('#modal-first-input', '350');
    await page.click('.cat-opt >> nth=0');
    await page.selectOption('select[name="accountId"]', { label: 'Ziraat Vadesiz (Banka Hesabı)' });
    await page.check('input[name="isRepeating"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f2_tekrarlanan_form_${scheme}.png` });
    await page.click('[data-action="close-modal"]');

    // Hesaplar: Kredi ekleme formu
    await page.click('[data-action="tab"][data-tab="hesaplar"]');
    await page.waitForTimeout(100);
    await page.click('button:has-text("Hesap Ekle")');
    await page.click('[data-action="acc-type"][data-val="loan_account"]');
    await page.waitForTimeout(100);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/f2_kredi_form_${scheme}.png` });
    await page.click('[data-action="close-modal"]');

    await page.close();
  }

  await browser.close();
})();
