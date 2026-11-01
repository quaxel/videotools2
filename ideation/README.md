# Ideation

20–60 saniyelik animasyon videoları için fikir, araştırma ve senaryo çalışma alanı.

## Çalıştırma

Node.js 24 ve npm ile:

```bash
cd /Users/muharremdedeoglu/Development/video-tools2/ideation
npm ci
npm run dev
```

Tarayıcı: [http://127.0.0.1:5173](http://127.0.0.1:5173). API 4310 portunda çalışır. İlk açılışta mevcut iki araştırma dokümanından 20 fikir, kaynaklar, hook'lar ve sahne akışları otomatik içe aktarılır. Orijinal Markdown dosyaları değiştirilmez.

Derlenmiş uygulamayı tek sunucuyla çalıştırmak için:

```bash
npm run build
npm start
```

Adres: [http://127.0.0.1:4310](http://127.0.0.1:4310). Geliştirme sunucusu aynı anda açıksa önce kapatın.

## İçerik ve özellikler

- Dashboard, kart/tablo fikir kütüphanesi, Türkçe arama ve URL'de saklanan filtreler.
- Favoriler, öncelik, etiketler ve toplu işlemler.
- Araştırma kaynakları ve iddia düzeyinde destek/çelişki ilişkileri.
- Hook alternatifleri, ilk görüntü notları ve seçili açılış.
- Markdown editörü, otomatik kayıt, yerel taslak kurtarma ve sürüm geçmişi.
- Türkçe/İngilizce senaryolar, tahmini süre ve ayrı ölçülmüş süre alanı.
- Sahne akışı, süre toplamı ve sürükle-bırak/menü ile üretim panosu.
- Markdown/TXT import; PDF ve görsel yükleme/önizleme.
- Geri alınabilir arşiv/çöp kutusu; kapsam dışı hikâyeler için ayrı görünüm.
- Markdown/JSON dışa aktarma, dosyalar dahil ZIP yedeği ve geri yükleme.

Başlangıç durumu: 14 uygun, 1 yeniden yazılması gereken ve 5 kapsam dışı fikir. Kaynakların varlığı iddiaları otomatik doğrulamaz. İddia kartları editoryal inceleme için ayrıca oluşturulur.

## Dokümanlar

- [Ayrıntılı uygulama planı](docs/PLAN.md)
- [Başlangıç içe aktarma envanteri](seed/import-manifest.json)
- [Uygulama notları ve doğrulama](docs/IMPLEMENTATION.md)

## Veriler ve yedekleme

Veritabanı `.data/ideation.sqlite`, orijinal dosyalar `.data/uploads/` içindedir. Bu dizin Git'e dahil edilmez. Tarayıcı verisini temizlemek, sunucudaki araştırmaları silmez; ancak henüz sunucuya kaydedilmemiş tarayıcı taslakları etkilenebilir.

**Ayarlar → Tam yedek indir** ile tutarlı bir veritabanı kopyası ve ek dosyalar alınır. Aynı ekrandan yedek geri yüklenebilir. Geri yükleme öncesinde mevcut çalışma alanı `.data/recovery/` içine otomatik yedeklenir. Uygulama açıkken veritabanını tek başına dosya kopyalayarak yedeklemeyin.

Farklı bir veri dizini veya port için `IDEATION_DATA_DIR` ve `PORT` ortam değişkenleri kullanılabilir. Sunucu yalnızca yerel arayüzde dinler. Tarayıcı fontları uygulamayla birlikte gelir.

## Kontroller

```bash
npm test
npm run build
```

İçe aktarmayı komut satırından tekrar kontrol etmek için `npm run import` kullanılabilir. Var olan kayıtlar çoğaltılmaz; kaynak bölümü değişmişse kullanıcı düzenlemelerinin üstüne yazılmaz. Ayarlar ekranındaki import önizlemesi de bu durumu gösterir.

## Ürün kararları

- İlk sürüm bu bilgisayarda, tek kullanıcı için çalışır.
- Arayüz Türkçedir; İngilizce hook ve senaryo sürümleri de saklanabilir.
- Fikirler, araştırma kaynakları, iddialar ve doküman sürümleri birbirine bağlanır.
- Kalıcı kayıt SQLite'ta; yüklenen orijinal dosyalar uygulamanın veri dizininde saklanır.
- Marka ve şirket merkezli fikirler üretim listesine alınmaz. Eski araştırmaları kaybetmemek için kapsam dışı kayıtlar korunur.
- Kaynak bulunması, iddianın doğrulandığı anlamına gelmez.
- Markdown ve JSON dışa aktarma ile uygulama dışında da kullanılabilir içerik üretilir.

