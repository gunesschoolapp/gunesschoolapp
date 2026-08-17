# iOS Cihazlarda Test Etme Kılavuzu (Capacitor)

Bu kılavuz, **Güneş English School** Capacitor mobil uygulamasını iOS (iPhone/iPad) cihazlarda test edebilmeniz için kullanabileceğiniz yöntemleri ve gerekli adımları içermektedir.

Uygulamanız bir Capacitor projesi olduğu için, web çıktıları (HTML/JS/CSS) derlenerek native iOS projesine (`ios` klasörü) entegre edilir. Ancak Apple ekosisteminin getirdiği bazı kısıtlamalar nedeniyle, Android'deki gibi doğrudan bir `.ipa` dosyası üretip kurmak için belirli adımların izlenmesi gerekir.

Aşağıda **Mac sahibi olmadan (Windows ile)** ve **Mac kullanarak** test etme yöntemleri açıklanmıştır.

---

## 🚀 1. Yöntem: Aynı Ağ Üzerinden Canlı Önizleme (Mac Gerekmez - En Hızlı Yöntem)
Eğer iPhone cihazınız ve Windows bilgisayarınız **aynı Wi-Fi ağına** bağlıysa, uygulamanın arayüzünü ve genel akışını telefonunuzdan test edebilirsiniz. 

> [!NOTE]
> Bu yöntem native eklentileri (Haptic, kamera, vb. cihaz özelliklerini) test etmek için uygun değildir, ancak arayüz, tasarım, yönlendirmeler ve veri akışını test etmek için mükemmeldir.

### Adımlar:
1. Windows terminalinizde projenin olduğu dizine gidin.
2. Vite geliştirme sunucusunu tüm ağa açacak şekilde başlatın:
   ```bash
   npm run dev -- --host
   ```
3. Terminalde şöyle bir çıktı göreceksiniz:
   ```text
     ➜  Local:   http://localhost:5173/
     ➜  Network: http://192.168.1.50:5173/  <-- Sizin yerel IP adresiniz
   ```
4. iPhone cihazınızda Safari tarayıcısını açın ve `Network` kısmındaki adresi (örneğin `http://192.168.1.50:5173/`) yazarak giriş yapın.
5. Safari'de **"Paylaş"** butonuna tıklayıp **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğini seçerek uygulamayı tıpkı yüklü bir uygulama gibi tam ekran deneyimleyebilirsiniz.

---

## 🛠️ 2. Yöntem: GitHub Actions ile macOS Üzerinde Bulut Derlemesi (Mac Gerekmez)
iOS uygulamalarını derlemek için Apple'ın derleme aracı olan Xcode gereklidir ve Xcode yalnızca macOS işletim sisteminde çalışır. Windows kullanıyorsanız, GitHub Actions kullanarak bulutta ücretsiz bir macOS sunucusunda derleme yapabilir ve test dosyası üretebilirsiniz.

Sizin için `.github/workflows/ios-build.yml` dosyası hazırlandı. Bu workflow sayesinde projenizi GitHub'a yüklediğinizde otomatik olarak iOS derlemesi başlatılacaktır.

### Adgım 1: Apple Geliştirici Hesabı ve Sertifikalar (Gerçek Cihazda Yükleme İçin)
Eğer uygulamayı kablosuz olarak veya AltStore/Sideloadly gibi araçlar dışında normal bir şekilde test etmek istiyorsanız, bir **Apple Geliştirici Hesabına ($99/yıl)** sahip olmanız gerekir.
Gerekli olan bilgiler:
* **P12 Sertifikası:** Apple Developer portalından oluşturulan iOS Dağıtım veya Geliştirme Sertifikası.
* **Provisioning Profile:** Cihazınızın UDID'sini içeren Test/Development profili.

### Adım 2: Alternatif Sideloading (Ücretsiz Geliştirici Hesabı ile)
Eğer yıllık ücret ödemek istemiyorsanız:
1. GitHub Actions ile imzasız (unsigned) olarak derlenen `.app` klasörünü zip formatında indirebilirsiniz.
2. Bu dosyayı **Sideloadly** veya **AltStore** programlarını kullanarak Windows bilgisayarınız üzerinden iPhone'unuza (ücretsiz kendi Apple ID'nizi kullanarak) imzalayıp yükleyebilirsiniz.

---

## 🍏 3. Yöntem: Mac Bilgisayar Kullanarak Derleme ve Test Etme (Önerilen)
Eğer bir Mac bilgisayara erişiminiz varsa veya ekibinizde Mac kullanan biri varsa, en kararlı test yöntemi budur.

### Hazırlık (Mac Üzerinde):
1. **Node.js ve CocoaPods Yükleyin:**
   Mac'te terminali açıp Node.js'in kurulu olduğundan emin olun ve CocoaPods yükleyin:
   ```bash
   sudo gem install cocoapods
   ```
2. **Projeyi Mac'e Klonlayın:**
   Proje dosyalarınızı Mac bilgisayara aktarın.

### Adımlar:
1. Terminalde proje klasörüne gidin ve bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
2. Projeyi derleyin ve iOS klasörüne eşitleyin:
   ```bash
   npm run cap:ios
   ```
   *Bu komut sırasıyla; Vite build alacak, web çıktılarını `ios` klasörüne kopyalayacak ve native eklentileri eşitleyip Xcode'u açacaktır.*
3. Xcode açıldığında:
   * iPhone'unuzu USB kablosuyla Mac'e bağlayın.
   * Xcode sol üst köşesinden bağlı olan **kendi iPhone cihazınızı** seçin.
   * **Signing & Capabilities** sekmesine gelerek Apple ID'nizi ekleyin (ücretsiz Apple ID de geçerlidir) ve "Automatically manage signing" seçeneğini işaretleyin.
   * Sol üstteki **Oynat (Run)** butonuna basarak uygulamayı doğrudan telefonunuza yükleyin.

---

## ☁️ 4. Yöntem: Ionic Appflow veya Codemagic Kullanımı (Profesyonel Bulut Çözümleri)
Capacitor ekosisteminde resmi olarak desteklenen bulut derleme servislerini kullanabilirsiniz:
* **Ionic Appflow:** Capacitor'ın yaratıcıları tarafından sunulan resmi bulut servisidir. Windows üzerinden tek tıkla iOS derlemesi yapıp TestFlight'a göndermenizi sağlar.
* **Codemagic:** Flutter, React Native ve Capacitor projeleri için oldukça popüler olan bir diğer CI/CD aracıdır. Ücretsiz planları mevcuttur.

---

## 📁 Hazırlanan Dosyalar
1. **`IOS_TESTING.md`**: Şu an okumakta olduğunuz bu kılavuz dosyası.
2. **`.github/workflows/ios-build.yml`**: GitHub üzerinden imzasız veya imzalı iOS `.ipa` derlemesi alabilmeniz için hazırlanan CI/CD konfigürasyon dosyası.
