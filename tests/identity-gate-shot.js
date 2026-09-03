const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.route('**://fonts.g*/**', route => route.abort());
    await page.goto('file://' + path.resolve(__dirname, '../dist/final.html'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/gate_pick_${scheme}.png` });

    await page.click('[data-action="identity-request-toggle"]');
    await page.waitForTimeout(100);
    await page.fill('#modal-first-input', 'Yeni Kişi Test');
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/gate_request_form_${scheme}.png` });
    await page.click('form[data-action="identity-request-submit"] button[type=submit]');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/gate_waiting_${scheme}.png` });

    await page.click('[data-action="identity-logout"]');
    await page.waitForTimeout(100);
    await page.click('[data-action="identity-pick"][data-id="p_ergin"]');
    await page.waitForTimeout(150);
    await page.click('[data-action="tab"][data-tab="ayarlar"]');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/home/claude/ev-muhasebesi/screenshots/gate_admin_ayarlar_${scheme}.png`, fullPage: true });

    await page.close();
  }

  await browser.close();
})();
