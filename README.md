# Yılmaz Hane Defteri

Yılmaz ailesi için tek sayfalık, telefon tarayıcısından kullanılan bir ev muhasebesi
uygulaması. Gelir/gider kaydı, banka hesabı / kredi kartı / harici ödeme sistemi
takibi ve aylık raporlar içerir.

**Yayındaki uygulama:** https://claude.ai/code/artifact/d54ffd05-8a60-4e04-9d14-78590feb8eac

## Bu depo ile yayındaki uygulama arasındaki fark

Bu depo uygulamanın **kaynak kodunu** tutar. Ailenin gerçek gelir/gider verileri
burada değil, yukarıdaki linkteki **canlı Claude Artifact sayfasında** saklanır —
sayfa kendi kendini güncelleyip her açanın aynı veriyi görmesini sağlar
(Claude'un "artifact" runtime yeteneği ile). Yani:

- **Kod değişikliği** (tasarım, yeni özellik, hata düzeltmesi) → bu depoda yapılır,
  sonra Claude'a "artifact'i güncelle" denerek yayına alınır.
- **Veri** (girilen hareketler, hesaplar) → yalnızca yayındaki sayfada yaşar, bu
  depoya asla yazılmaz/çekilmez. `dist/final.html` her zaman boş/varsayılan
  durumla (`src/initial_state.json`) üretilir.

## Klasör yapısı

```
src/
  app.html            Sayfa iskeleti: <title>, Google Fonts linki, <style>, ve
                       yer tutucular (__STATE_JSON__, __APP_JS__)
  app.js              Uygulamanın tüm mantığı (render, hesaplamalar, olaylar,
                       Claude artifact capability ile kaydetme)
  initial_state.json  İlk yayında sayfaya gömülecek varsayılan veri (kategoriler,
                       kişiler; hesap/hareket yok)
scripts/
  build.js            src/ içindekileri birleştirip dist/final.html üretir
tests/
  app.test.js         Uçtan uca işlevsel testler (Playwright, headless Chromium)
  accounts.test.js    Hesap/kredi kartı/transfer matematiği testleri
  screenshot.js       Açık/koyu tema ekran görüntüleri alır (screenshots/ altına)
dist/                 (git'e girmez) build çıktısı — final.html
```

## Kurulum

```bash
npm install
npx playwright install chromium   # testler için tek seferlik
```

## Komutlar

```bash
npm run build        # src/ -> dist/final.html
npm test             # build + tüm testler
npm run screenshot    # build + açık/koyu tema ekran görüntüleri
```

## Uygulamayı güncelleme akışı

1. `src/app.html`, `src/app.js` veya `src/initial_state.json` üzerinde değişiklik yapın
   (kendiniz, ya da Claude'a bu repo üzerinden değişiklik yaptırarak).
2. `npm test` ile doğrulayın.
3. Claude'a bu depodaki güncel `src/` dosyalarını okuyup yayındaki artifact'i
   (yukarıdaki link) güncellemesini söyleyin. Claude `dist/final.html`'i yeniden
   üretir ve **aynı linki koruyarak** yeni sürümü yayınlar — ailenin o ana kadar
   girdiği veriler kaybolmaz, çünkü yayın yalnızca sayfanın kodunu değiştirir;
   uygulama açılışta o anki veriyi kendi içine gömerek yeniden üretir.

   > Not: `initial_state.json` yalnızca sayfa **ilk kez** yayınlandığında kullanılır.
   > Yayındaki sayfa zaten çalışıyorsa (veri girilmişse), bir sonraki güncelleme
   > ailenin güncel verisini korur — `initial_state.json`'ı tekrar göndermez.

## Nasıl çalışıyor (mimari özet)

- Tek dosyalık HTML/CSS/JS, dış kütüphane yok; grafikler el yapımı SVG/CSS bar'lar.
- Veri, sayfanın içine gömülü JSON olarak tutulur (`<script id="app-state"
  type="application/json">`). Her değişiklikte (hareket ekleme, hesap düzenleme vb.)
  tüm sayfa yeniden üretilip `claude.use('artifact').publish(html)` ile yeni
  sürüm olarak yayınlanır; açık olan tüm görünümler otomatik yenilenir.
- Kredi kartı "bakiyesi" = güncel borç. Harcama borcu artırır; karttan "borç öde"
  transferi hem kaynak hesabı hem kart borcunu doğru yönde günceller.
- Salt okunur görüntüleyiciler (`not_writer` / `not_granted`) otomatik algılanır
  ve arayüz salt okunura geçer.
- Tasarım: sıcak kağıt tonu zemin + koyu gri-mavi vurgu rengi; Fraunces (başlık),
  IBM Plex Sans (gövde), IBM Plex Mono (tutarlar, tabular rakamlar). Kategori
  renkleri CVD-doğrulanmış 8 renkli bir paletten gelir. Açık/koyu tema tam destekli.

## Lisans / gizlilik

Bu depo yalnızca uygulamanın kodunu içerir; hassas aile verisi içermez. Depoyu
özel (private) tutmanız önerilir çünkü kod, ailenin kategorilerini ve hesap
adlandırma alışkanlıklarını yansıtabilir.
