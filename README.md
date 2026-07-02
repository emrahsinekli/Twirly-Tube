# Twirly Tube 🎋

Ağır, spiral sarımlı beyaz bir tüpü, sonsuz ve giderek kıvrımlaşan bir bambu
direk boyunca parmak flick'leriyle yukarı fırlat. Tek parmak, sonsuz tırmanış,
paylaşılabilir skor. Güney Asya köy oyunundan esinlenildi.

**Stack:** Phaser 3 · TypeScript · Vite · Vitest · Capacitor (iOS + Android)

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 46 birim + game-feel testi
npm run build      # typecheck + prod bundle (dist/)
```

### Mobil (Capacitor)

```bash
npm run cap:sync       # build + native projelere kopyala
npm run cap:android    # Android cihazda çalıştır (Android SDK gerekir)
npm run cap:ios        # iOS cihazda çalıştır (macOS + Xcode gerekir)
```

`android/` ve `ios/` projeleri repodadır; `cap sync` çıktıları (kopyalanan web
asset'leri) gitignore'dadır ve her sync'te yeniden üretilir.

## Nasıl oynanır

- **Yukarı doğru hızla sürükle (flick)** → tüpe yukarı ivme + spin.
- Tek flick yetmez: yerçekimi ve sürtünme tüpü sürekli aşağı çeker; **ritmi koru**.
- Direk yükseldikçe kıvrımlaşır. Kıvrıma **hızlı ve spin'siz** girersen savrulursun:
  önce yavaşlarsın (wobble, combo sıfırlanır), dengesizlik kritikse **direkten
  çıkar, oyun biter**. Yavaş süzülerek geçmek her zaman güvenlidir → gaz/fren
  kararı beceri katmanıdır.
- Zemine geri düşmek de oyunu bitirir.
- **Skor = ulaşılan maksimum yükseklik (metre).** Her 50 m'de milestone.
- **Günlük Direk:** seed = günün tarihi → herkes aynı direği tırmanır; skor
  kartını paylaş (Wordle etkisi). **Sonsuz:** her denemede rastgele direk.

## Mimari

```
src/
  config/tuning.ts      ← TÜM ayarlanabilir sayılar (tek dosya)
  systems/              ← Phaser'dan bağımsız, headless test edilebilir çekirdek
    Physics.ts          tüp durumu: h, vy, spin; flick, yerçekimi, sürtünme,
                        kıvrım checkpoint denge kontrolü, fail koşulları
    PoleGenerator.ts    seed'li sonsuz direk: offset(h)=amp(h)·sin(θ(h)),
                        checkpoint'ler kapalı formda (θ=kπ kökleri)
    Score.ts            metre skoru, combo, milestone, localStorage rekorları
    DailySeed.ts        YYYY-MM-DD → deterministik seed
    Rng.ts              xmur3 + mulberry32 (Math.random yasak: günlük mod)
    CameraRig.ts        sadece dikey lerp takip (tüp alttan %38'de)
    Audio.ts            WebAudio sentez (asset yok), Haptics.ts, Share.ts
  objects/              Pole (görünür dilim çizimi), Tube (spin görseli), Background (parallax)
  scenes/               Boot → Menu → Game+UI → GameOver → (retry) → Game
tests/                  birim testler + sim.ts oyna-test simülatörü
```

**Temel kararlar**

- Fizik motoru yok (Arcade/Matter gereksiz): tüp direğe kısıtlı tek boyutlu
  bir cisim; `h`, `vy`, `spin` üçlüsü + kapalı form checkpoint'ler hem hızlı
  hem deterministik (günlük mod adaleti + headless test).
- Kıvrım kontrolü sürekli değil, **checkpoint tabanlı**: eğimin maksimum olduğu
  noktalar (sin'in sıfır geçişleri) ikinci derece denklemle çözülür → frame
  hızından bağımsız, büyük dt'de bile checkpoint atlanmaz.
- `stability = spin / (severity · vy)` (spec 5.5). Eşik altı hızda (süzülme)
  kontrol yok → "kıvrımdan önce yavaşla" taktiği her zaman mümkün.
- **Wobble spin de yakar** (spec'e ek): savrulma dengeyi bozar; bu olmadan
  spam'leyen oyuncu hiç ölmüyordu (simülasyonla bulundu).
- Direk çizimi: her karede yalnızca kameranın gördüğü dilim örneklenip çizilir;
  ekran dışı geometri hiç var olmaz (havuzlama yerine daha da ucuz).
- Tüm görseller kodla üretilir (doku/asset dosyası yok) → bundle küçük, boot anlık.
- `window.__GAME__` e2e testler için dışa açık.

## Kalibrasyon (oyna-test notları)

Sayılar spec'in başlangıç tablosundan `tests/sim.ts` simülatörüyle kalibre
edildi; hedefler `tests/gamefeel.test.ts`'te kilitli — tuning değişip hedefler
bozulursa test kırılır.

Spec başlangıç değerleriyle ölçülen sorunlar ve yapılan değişiklikler:

| Parametre | Spec | Final | Neden |
|---|---|---|---|
| GRAVITY | 900 | **1500** | Tek flick 10.3 m / 1.4 sn havada süzülüyordu → "ağırlık" yok. Şimdi ~3.2 m / 0.8 sn. |
| IMPULSE_MAX | 700 | **640** | Aynı ağırlık hedefi. |
| FRICTION | 0.6 | **0.9** | Spam'de terminal hız 1800+ px/s'ye şişiyordu. |
| FLICK_COOLDOWN | 0.15 | **0.2** | Spam tavanını kısar, ritmi ödüllendirir. |
| METERS_PER_PX | 0.05 | **0.03** | Skor bandını 100–1000 m aralığına oturtur. |
| SPIN_MAX | – | **700** (yeni) | Spin tavanı olmadan stability sonsuz büyüyebiliyordu. |
| WOBBLE_SPIN_KEEP | – | **0.35** (yeni) | Spec'te wobble sadece hız yakıyordu; spam'ci 320 wobble yiyip 7600 m'ye çıkıyordu. Spin kaybı ölümü mümkün kılar. |
| BEND_FREQ_GROWTH | – | **1.2e-7** (yeni) | Zorluk rampası: kıvrım sıklığı yükseklikle artar (spec 5.4 "frequency(y)"). |
| STABILITY_MIN / CRIT | 0.8 / 0.3 | **1.1 / 0.5** | Yeni hız/spin bandına göre eşikler. |
| BEND_AMP_MAX | – | **190** (yeni) | Direk 480 px'lik ekranda kalsın. |
| GROUND_FAIL_MIN_PEAK | – | **160** (yeni) | Tek zayıf flick sonrası anında "DÜŞTÜN!" frustrasyonunu önler (sim: 1 sn'de ölüm). |

Kilitlenen game-feel hedefleri (4 seed'de doğrulanır):

- Tek max flick: 2.5–5 m tepe, <1.1 sn havada (ağır his).
- İlk 30 sn kolay: ritmik oyuncu ölmeden 100 m+ çıkar.
- Pervasız spam **her zaman** savrularak ölür (150–800 m bandı).
- Kıvrım öncesi yavaşlayan dikkatli oyuncu, dikkatsizden ileri gider (beceri ödülü).
- Aynı seed + aynı girdi → birebir aynı sonuç (günlük mod adaleti).

Simülasyondaki temsili sonuçlar: spam ~200–600 m'de ölür, hızlı-dikkatsiz
~700–1000 m, dikkatli oyun 1200 m+; kıvrım aralığı ~500 m'de 12 m'ye düşer →
doğal beceri tavanı.

## Kapsam dışı (v1)

Online leaderboard, hesap, mağaza/skin, gerçek 3D — spec bölüm 16 gereği yok.

## Doğrulama

- `npm test`: 46 test (fizik, direk üretimi, skor, seed, game-feel sözleşmesi).
- Playwright ile gerçek Chromium'da tam tur doğrulandı: menü → tırmanış →
  her iki fail türü → game over → <0.5 sn retry → günlük direk determinizmi →
  skor kartı üretimi ve paylaşım zinciri (pano fallback'i).
