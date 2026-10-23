# Endüstriyel kampüs 3D görünümü

Referans görsele göre modellenmiş üretim, depo ve lojistik yerleşkesi. React, Three.js ve React Three Fiber kullanır.

## Çalıştırma

```sh
npm install
npm run dev
```

API anahtarı gerekmez. `npm run lint` TypeScript kontrolünü, `npm run build` üretim derlemesini çalıştırır.

## Gezinme

- Alttaki Kampüs, Tır parkı, Ana fabrika ve Kuzey depo düğmeleri kamerayı ilgili bölgeye taşır.
- Sol tuşla sürükleyerek döndürün, sağ tuşla kaydırın, tekerlekle yakınlaştırın.
- Bir binaya çift tıklamak o binaya odaklanır.
- Kuşbakışı ve Bölge sınırları düğmeleri görünümü değiştirir.
- Yoldaki araçlar düğmesi (veya erişim yolunun kuzeydeki kamu yoluna bağlandığı kavşaktaki etiket) kampüse gelmekte olan, henüz sınır dışındaki tırları listeler. Erişim yolunun site sınırını kestiği noktada plaka tanıma kamerası ve gelen sürücülere sıradaki varışları gösteren mesaj panosu bulunur. Araçlar haritaya yerleştirilmez, çünkü gerçek konumları kilometrelerce uzaktadır. Bunun yerine her araç, kapıya göre gerçek yönüne (pusula açısı) en yakın kamu yolu ucunda sayılır ve o uçtan kavşağa doğru akış okları gösterilir. Her kayıt telematik konumu, hız, rota mesafesi, tahmini varış, kapı randevusu ve gerekiyorsa yük sıcaklığını tutar. Faz (yolda / yaklaşıyor / kapıya yakın) ve uyarılar (gecikme, duran araç, sinyal kaybı, soğuk zincir ihlali) bu verilerden `src/services/inboundTrafficService.ts` içinde türetilir; eşikler aynı dosyadadır. Süreler kullanıcının saatine göre değil, beslemenin `asOf` zamanına göre hesaplanır. Veriler `src/data/inboundTraffic.mock.json` içindeki temsili kayıtlardır; gerçek telematik/TMS entegrasyonu servisteki adaptörün yerine geçer.
- Yükleme rampaları düğmesi tır yanaşma kapılarını gösterir: EK-03 doğusundaki çukur rampa (R1), Batı Depo güney cephesi (R2, 6 kapı) ve GES-02 kuzey cephesi (R3, 6 kapı; R1 avlusunun düz doğu ucunda). Kapı konumları `src/data/dockBanks.ts` içinde bina ölçülerinden türetilir. Kapı durumu (boş, dolu, hizmet dışı), yanaşmış araç ve palet ilerlemesi `src/data/loadingDocks.mock.json` içindeki temsili kayıtlardır; sahnede kapı lambaları, açık/kapalı kapılar ve rampadaki tırlar bu kayıtlardan çizilir. Bekleme/işlemde/hazır aşaması ve çıkış gecikmesi `src/services/loadingDockService.ts` içinde türetilir.
- Tohum depoları düğmesi on soğuk hava deposunun çatısını saydamlaştırır, raf ve kasa düzenini gösterir ve depo panelini açar. Depo verileri `src/data/seedStorage.mock.json` içindeki temsili kayıtlardır.

Sahne yalnızca görüntüleme içindir. Nesne düzenleme, ekleme, silme, yol çizimi veya yerleşim kaydetme işlevi bulunmaz. Önceki sürümlerin tarayıcı kayıtları okunmaz veya değiştirilmez.

Yerleşim verileri `src/data/factoryLayout.ts`, ortak yatay ölçek ve harita sınırları `src/data/siteCoordinates.ts` içindedir. Kantar, güvenlik kulübesi ve araç girişi aynı giriş bölgesinde yer alır. Ölçüler görsel referansa dayalı yaklaşık model ölçüleridir.
