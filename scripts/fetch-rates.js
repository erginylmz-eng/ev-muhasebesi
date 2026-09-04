#!/usr/bin/env node
/*
 * Finansal Bilgilendirme sayfası için günlük kur/altın verisini çeker ve
 * docs/rates.json'a yazar. Bu script GitHub Actions tarafından her gün
 * otomatik çalıştırılır (.github/workflows/fetch-rates.yml) — Claude'a veya
 * herhangi bir manuel işleme bağlı DEĞİLDİR, tamamen GitHub'ın kendi
 * altyapısında (ücretsiz) çalışır.
 *
 * Kaynaklar (ikisi de ücretsiz, API anahtarı gerektirmez, kullanım limiti
 * yoktur):
 *  - https://api.frankfurter.dev — Avrupa Merkez Bankası (ECB) referans
 *    kurları. USD/TRY ve EUR/TRY için kullanılıyor.
 *  - https://api.gold-api.com — ons altın (XAU) fiyatı USD cinsinden.
 *    Gram altın TRY karşılığı buradan (ons_usd / 31.1034768) * usdTry ile
 *    hesaplanıyor (Türkiye'ye özel ayrı bir "gram altın" servisi yerine, dünya
 *    spot fiyatından türetiliyor — daha güvenilir/kararlı bir kaynak).
 *
 * ÖNEMLİ: Bu script gerçek kullanıcı verisi İÇERMEZ, yalnızca herkese açık
 * piyasa verisi çeker. Bir kaynak başarısız olursa script hata ile çıkar ve
 * docs/rates.json'u OLDUĞU GİBİ bırakır (yanlış/eksik veriyle asla üzerine
 * yazmaz) — workflow bir sonraki güne kadar eski (ama doğru) veriyi korur.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'docs', 'rates.json');
const GRAMS_PER_OUNCE = 31.1034768;

function fetchJson(url) {
  return fetch(url, { headers: { 'User-Agent': 'ev-muhasebesi-rates-fetcher/1.0' } }).then(function (r) {
    if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
    return r.json();
  });
}

async function main() {
  const [usdData, eurData, goldData] = await Promise.all([
    fetchJson('https://api.frankfurter.dev/v1/latest?from=USD&to=TRY'),
    fetchJson('https://api.frankfurter.dev/v1/latest?from=EUR&to=TRY'),
    fetchJson('https://api.gold-api.com/price/XAU'),
  ]);

  const usdTry = usdData && usdData.rates && usdData.rates.TRY;
  const eurTry = eurData && eurData.rates && eurData.rates.TRY;
  const onsAltinUsd = goldData && goldData.price;

  if (!usdTry || !eurTry || !onsAltinUsd) {
    throw new Error('Beklenen alanlardan biri eksik geldi: ' + JSON.stringify({ usdTry, eurTry, onsAltinUsd }));
  }

  const gramAltinTry = (onsAltinUsd / GRAMS_PER_OUNCE) * usdTry;

  const payload = {
    usdTry: usdTry,
    eurTry: eurTry,
    onsAltinUsd: onsAltinUsd,
    gramAltinTry: gramAltinTry,
    updatedAt: new Date().toISOString(),
    sources: {
      fx: 'https://api.frankfurter.dev (ECB referans kurları)',
      gold: 'https://api.gold-api.com (dünya spot ons altın, USD)',
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log('Yazıldı:', path.relative(ROOT, OUT_FILE));
  console.log(payload);
}

main().catch(function (err) {
  console.error('Kur/altın verisi çekilemedi, docs/rates.json değiştirilmedi:', err && err.message ? err.message : err);
  process.exit(1);
});
