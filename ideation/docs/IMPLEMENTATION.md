# Ideation — Uygulama Notları

## Teslim edilen sürüm

Yerel tek kullanıcılı React/TypeScript arayüzü, Fastify API ve kalıcı SQLite kaydı uygulanmıştır. İlk açılışta mevcut iki Markdown araştırması 20 fikir ve 22 doküman olarak aktarılır. Kaynaklar URL üzerinden tekilleştirilir. Asıl araştırma dosyaları değiştirilmez.

Kapsam, üretim aşaması ve arşiv birbirinden bağımsız alanlardır. Marka merkezli beş hikâye aktif üretim listesinde görünmez. Bir fikir kapsam dışındayken üretime hazır, üretimde veya yayımlandı aşamasına geçirilemez.

## Veri yapısı

- Fikirler, kaynaklar, dokümanlar, sürümler, dosya bilgileri, ayarlar, import kayıtları ve hareketler ayrı SQLite tablolarında tutulur.
- İlk sürümde hook, sahne ve iddialar fikrin doğrulanan JSON içeriğindedir. Kaynak ilişkileri kimlikle tutulur ve yazma sırasında doğrulanır.
- Tam metin indeksi FTS5 ile oluşturulur. Türkçe harflerin normalize edilmiş kopyası kullanılır; orijinal metin değiştirilmez.
- Yazma işlemleri sürüm numarasıyla kontrol edilir. İki sekmeden gelen eski bir kayıt yeni metni sessizce ezmez.
- Toplu işlemler tek veritabanı işlemi içinde uygulanır. Bir kayıtta sürüm çakışırsa bütün toplu işlem geri alınır.
- Dokümanlar otomatik kaydedilir. Başarısız kayıtta taslak ekranda ve tarayıcıda korunur; yeniden deneme veya ayrı doküman olarak kurtarma mümkündür.

## Veri taşıma

Markdown ve TXT dosyaları düzenlenebilir dokümana dönüşür. PDF, PNG, JPG ve WebP dosyaları orijinal dosya olarak saklanır. Kaynak URL'leri uygulama tarafından otomatik ziyaret edilmez.

Tam yedek, SQLite'ın canlı yedekleme yöntemiyle alınır. ZIP içindeki veritabanı ve dosyalar SHA-256 özetleriyle doğrulanır. Bozuk veya uyumsuz yedek, mevcut verinin yerine geçirilmez. Geri yükleme öncesi kurtarma yedeği tutulur; geri yükleme sürerken yeni yazma istekleri durdurulur.

## Kontrol kapsamı

Otomatik testler şu davranışları kapsar:

1. Gerçek kaynaklardan 20 fikrin ayrıştırılması, 14/1/5 kapsam dağılımı ve tekrar importun kayıt çoğaltmaması.
2. Kaynak bölümü değiştiğinde çatışmanın bildirilmesi ve yerel düzenlemenin korunması.
3. Türkçe tam metin arama ve doğru fikir eşleşmesi.
4. Süre, kapsam, kaynak ilişkisi, desteklenmiş iddia ve eski sürümden kayıt kuralları.
5. Doküman sürüm geçmişi ve SQLite yeniden açıldığında kayıtların korunması.
6. API istek doğrulaması, dosya yükleme, dosya sunumu ve export.
7. Veritabanı ve ek dosyaların tam yedekten geri yüklenmesi; bozuk yedeğin reddedilmesi.
8. Toplu işlemde atomik kayıt ve sürüm çakışmasında geri alma.

Tarayıcı kontrolü ayrı test veritabanında yapılır. Yeni fikir oluşturma, başlık/aşama değişikliği, senaryo oluşturma, otomatik kayıttan sonra yeniden açma ve eski sürümlerin görünmesi kontrol edilmiştir. Masaüstü ve 390 piksel mobil ekran görüntüleri alınmıştır; mobil kütüphanede sayfa taşması görülmemiştir.

## Sınırlar ve sonraki işler

- PDF/görsellerin içeriğinde OCR yapılmaz; başlık ve notlar aranır.
- JSON dışa aktarma veri taşıma ve inceleme içindir. Tam geri yükleme, ZIP yedeğiyle yapılır.
- Depodaki araştırma bölümü değiştiğinde import bunu bildirir; otomatik birleştirme yapmaz. Güncel dosya ayrıca doküman olarak yüklenebilir.
- Eski üretilmiş videoların ve Remotion render işlemlerinin otomatik bağlantısı bu sürümde bulunmaz.
- Yapay zekâ araştırması, YouTube Analytics ve bulut/çok kullanıcılı erişim bağlı değildir.
- Yükleme ve sıkıştırılmış yedek sınırı 50 MB'dır; açılmış yedek en fazla 150 MB olabilir. Uygulama, geri yükleyemeyeceği büyüklükte bir yedeği indirmeye sunmaz.
- Dışa aktarılan Markdown/JSON dosyaları anlık kopyalardır; bunları düzenlemek veritabanını kendiliğinden değiştirmez.
