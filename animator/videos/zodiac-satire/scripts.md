# Burç Hicvi: 12 Short Senaryosu

Format: 50–60 sn dikey short, İngilizce seslendirme, kadın anlatıcı, oyuncu kadrosunun çoğu kadın.
Her senaryo `guide/rules.md` altı vuruşunu izler: kanca → küçük hikâye → yükseliş → olay olarak gelen twist
(`(pause)` işaretli satır, `pauseAfter: 0.4`) → "kafasının içi" mekanizması (etiketli fiziksel proplar, BÜYÜK HARF etiket)
→ yeni kurbanla dönüş.

**Ses dağılımı (öneri):** anlatıcı `Serena` (kuru, alaycı), burcun kahramanı `Vivian`, diğer kadın karakterler
`Serena`/`Vivian` farklı `instruct` + `seed` ile. Qwen'de yalnızca iki kadın İngilizce ses var; çeşitlilik instruct'tan gelecek.
Erkek karakterler kısa ve yan rolde (`Ryan`/`Aiden`).

**Sayılar:** hiçbiri gerçek iddia değil, hepsi hikâye sayısı (`plan.json → story_numbers`). Araştırma gerekmez.

## Hook ölçümü (v1 → v2)

Puan 10 üzerinden, beş ölçüt × 0–2:
**Burç ≤3 sn** (burç adı ilk 3 saniyede geçiyor mu; ölçüldü, 200 wpm) ·
**≤3 sn** (ilk satır ≤10 kelime; ölçüldü) ·
**Tuhaf an** (aksiyonun ortasında, garip bir anla mı açılıyor) ·
**Merak** (izleyicide "sonra ne oldu?" sorusu bırakıyor mu) ·
**Tanıdık** (ilk satır burcun klişesini gösterip "bu benim arkadaşım" dedirtiyor mu).
Son üç ölçüt göz kararı.

| Burç | v1 burç adı | v1 puan | v2 açılış | v2 burç adı | v2 puan |
|---|---|---|---|---|---|
| Koç | 6,6 sn | 7 | Your Aries friend quit her job at 7 a.m. | 0,3 sn | 10 |
| Boğa | 5,7 sn | 7 | You just stole a fry from a Taurus. | 2,1 sn | 10 |
| İkizler | 5,4 sn | 2 | You have brunch with your Gemini friend. Both of her. | 1,5 sn | 9 |
| Yengeç | 6,0 sn | 5 | You forgot your Cancer friend's birthday. She says it's fine. | 0,9 sn | 9 |
| Aslan | 5,4 sn | 5 | Your Leo friend wore gold sequins to your wedding. | 0,3 sn | 10 |
| Başak | 4,2 sn | 6 | Your Virgo friend brought a label maker to your party. | 0,3 sn | 9 |
| Terazi | 4,2 sn | 5 | It's minute forty, and your Libra friend still can't choose. | 1,5 sn | 9 |
| Akrep | 5,7 sn | 5 | It's girls' night, and your Scorpio friend just stopped blinking. | 1,5 sn | 9 |
| Yay | 6,3 sn | 6 | Your Sagittarius friend booked a flight to Peru mid-brunch. | 0,3 sn | 9 |
| Oğlak | 5,7 sn | 7 | It's 3:15, and your Capricorn friend's calendar says LAUGH. | 1,2 sn | 10 |
| Kova | 4,5 sn | 3 | Your Aquarius friend replied three days later, from a protest. | 0,3 sn | 8 |
| Balık | 6,0 sn | 3 | Your Pisces friend got one smile and planned the wedding. | 0,3 sn | 10 |

**v1'in ana sorunu:** burç adı hiçbir videoda ilk 3 saniyede geçmiyordu (4,2–6,6 sn).
İlk satırlar izleyicinin tanımadığı isimlerle (Mia, Ella…) açılıyordu.
**v2 kuralı:** ilk satır en fazla 10 kelime, burç adı içinde, "your [burç] friend" diye izleyiciye sesleniyor
(arkadaşını etiketleme refleksi). Karakterin adı ikinci satıra kaydı ("That's Mia.").
**Ekranda:** ilk karede burç adı büyük harfle yazılı olsun (ör. `ARIES`), sesli okunmadan önce de görünsün.

---

## 1. ARIES (Koç): "Your Aries Friend Has One Button"

**Kadro:** Mia (Koç, kırmızı tulum) · Jess (en yakın arkadaş, gözlüklü) · Nora (abla, önlüklü) · müşteriler · ilk öğrenci
**Mekânlar:** duş (beyaz/turkuaz) · ofis (gri-mavi) · koşu pisti (turuncu) · pastane (pembe) · dumanlı mutfak (gri) · kafa içi kontrol odası (kırmızı) · kaldırım kuyruğu (sarı) · kickboks salonu (mor)
**Gag'ler:** fırın kapağı patlar, Mia'nın yüzü isle kaplanır · öğrenci ilk yumrukta yere serilir
**Mekanizma propları:** dev kırmızı buton `GO` (aşınmış) · ambalajında kadran `PATIENCE` · fişi takılmamış şalter `THINK FIRST`

- NARRATOR: Your Aries friend quit her job at 7 a.m.
- NARRATOR: She decided in the shower and emailed from the towel.
- NARRATOR: That's Mia. First, fastest, and loudest.
- NARRATOR: By noon, she signed up for a marathon.
- NARRATOR: By dinner, she opened a bakery.
- JESS: Mia, you have never baked anything!
- MIA: Then I'll learn on opening day!
- NARRATOR: And somehow, it works. The line wraps around the block.
- NARRATOR: Then the oven door bursts open. (pause)
- NARRATOR: Black smoke fills the shop, and the alarm starts singing.
- NARRATOR: Her big sister walks in holding the manual.
- NORA: You were supposed to preheat it, not launch it.
- NARRATOR: So what's going on inside an Aries head?
- NARRATOR: Picture a control room with one giant red button.
- NARRATOR: It says GO, and it's worn completely smooth.
- NARRATOR: Next to it is a dial labelled PATIENCE.
- NARRATOR: It's still in the plastic wrap.
- NARRATOR: The switch marked THINK FIRST was never plugged in.
- NARRATOR: The good news? Her anger burns out in four seconds.
- NARRATOR: The bakery closes on Tuesday, and she's not even sad.
- NARRATOR: On Wednesday, Mia opens a kickboxing gym.
- MIA: How hard can punching be?
- NARRATOR: Her first student is already on the floor.

---

## 2. TAURUS (Boğa): "Never Touch a Taurus's Fries"

**Kadro:** Ella (Boğa, krem triko, halka küpe) · Zoe (patatesi çalan arkadaş) · Priya (plan değiştiren organizatör) · garson · Ella'nın kuzeni
**Mekânlar:** restoran masası (sıcak kırmızı) · Ella'nın kadife koltuğu (yeşil) · banyo dolabı/parfüm (lila) · kız gecesi salonu (turuncu) · sokak kapısı (mavi gece) · kafa içi kasa dairesi (altın) · suşi restoranı (beyaz/neon) · ekmek sepeti yakın çekim (kahverengi)
**Gag'ler:** Zoe, Ella'nın sandalyesini çeker, sandalye kıpırdamaz, Zoe geriye düşer · çatal havada donar, sonra masaya saplanır
**Mekanizma propları:** asma kilit `PLANS` · maksimumda sıkışmış kadran `COMFORT` · yere cıvatalı tabela `NOT MOVING` · sayaç `GRUDGES`

- NARRATOR: You just stole a fry from a Taurus.
- NARRATOR: That was the biggest mistake of your life.
- NARRATOR: Her name is Ella. Calm, loyal, and very comfortable.
- NARRATOR: Her couch is velvet. Her blanket weighs more than you.
- NARRATOR: She's worn the same perfume for twelve years.
- NARRATOR: Tonight is girls' night, and Ella planned it perfectly.
- NARRATOR: Her favorite table, her favorite pasta, her favorite chair.
- NARRATOR: Then Priya bursts through the door. (pause)
- PRIYA: Change of plans, girls! New sushi place!
- NARRATOR: Ella's fork stops in midair, and the room goes cold.
- ELLA: I already pictured the pasta. I'm not leaving.
- NARRATOR: Zoe tries to drag her chair. Zoe falls over.
- NARRATOR: So what's going on inside a Taurus?
- NARRATOR: Picture a bank vault, sealed with a padlock marked PLANS.
- NARRATOR: Inside, a dial labelled COMFORT is stuck on maximum.
- NARRATOR: The floor is bolted down with a sign that says NOT MOVING.
- NARRATOR: And in the corner, a counter labelled GRUDGES.
- NARRATOR: It's on thirty-one, and it never goes down.
- NARRATOR: Number thirty-one is you. You took a fry.
- NARRATOR: Priya goes to sushi alone. Ella orders dessert.
- NARRATOR: Then her cousin reaches for the bread basket.
- NARRATOR: The counter clicks to thirty-two.

---

## 3. GEMINI (İkizler): "Your Gemini Friend Is Two People"

**Kadro:** Lily (İkizler, pembe ceket → twist'te mavi ceket, kostüm değişimi) · Hana (arkadaş) · Grace (üçüncü arkadaş) · garson
**Mekânlar:** brunch kafesi (pastel sarı) · Lily'nin telefon ekranı/odası (mor) · tuvalet koridoru (yeşil) · brunch, yeni ışık (soğuk mavi) · kafa içi iki direksiyonlu araba (pembe/mavi) · santral odası (turuncu) · patika (orman yeşili) · dağ zirvesi (gün batımı)
**Gag'ler:** ikinci Lily oturunca kahve Hana'nın kucağına dökülür · Hana sesli mesajı dinlerken patikada tökezleyip düşer
**Mekanizma propları:** iki direksiyon `MOOD A` / `MOOD B` · santral `GROUP CHATS` (12 kablo) · torpidoda dönüp duran para `DECISIONS`

- NARRATOR: You have brunch with your Gemini friend. Both of her.
- LILY: Hiking at dawn? I'm obsessed!
- NARRATOR: That's Lily. Funny, curious, and very fast.
- NARRATOR: She speaks four languages, badly, and all at once.
- NARRATOR: She has twelve group chats open, and she runs them all.
- NARRATOR: Everyone says she's the best friend they ever had.
- NARRATOR: Then Lily goes to the bathroom.
- NARRATOR: And a different Lily comes back. (pause)
- NARRATOR: Same face, new jacket, totally new opinions.
- LILY: Hiking? Who agreed to hiking? I hate nature.
- HANA: You said obsessed! Four minutes ago!
- NARRATOR: Grace quietly cancels her five a.m. alarm.
- NARRATOR: So what's going on inside a Gemini?
- NARRATOR: Picture a car with two steering wheels.
- NARRATOR: One says MOOD A. The other says MOOD B.
- NARRATOR: Both are driving, and neither one has a map.
- NARRATOR: Up front, a switchboard labelled GROUP CHATS.
- NARRATOR: Twelve cables, all plugged in, all buzzing.
- NARRATOR: And a coin marked DECISIONS spins forever on the dashboard.
- NARRATOR: Lily doesn't come hiking. She sends a voice note instead.
- NARRATOR: It's nine minutes long and covers six topics.
- NARRATOR: Hana is still listening at the top of the mountain.
- HANA: Wait, she's coming tomorrow? Which Lily?

---

## 4. CANCER (Yengeç): "A Cancer Remembers Everything"

**Kadro:** Rose (Yengeç, hırka) · Amy (en yakın arkadaş) · Rose'un annesi (fotoğrafta/telefonda) · çorba alan üzgün arkadaşlar
**Mekânlar:** doğum günü masası (pembe) · TV karşısı, sigorta reklamı (mavi) · takvim duvarı (sarı) · Rose'un sıcak mutfağı (turuncu) · koridor dolabı (kahverengi) · kafa içi yengeç kabuğu (mercan) · DUYGULAR dolabı odası (lacivert) · çorba kâsesi yakın çekim (yeşil)
**Gag'ler:** dolaptan kutu çığı Amy'yi boynuna kadar gömer · Rose mendil yığınında kayar
**Mekanizma propları:** kabuk kapısı tabelası `SAFE PEOPLE ONLY` · çekmeceleri kapanmayan dolap `FEELINGS` · sayaçlı mendil kutusu (41)

- NARRATOR: You forgot your Cancer friend's birthday. She says it's fine.
- NARRATOR: She is smiling, and it is not fine.
- NARRATOR: Her name is Rose. Warm, protective, and a little soggy.
- NARRATOR: She cries at weddings, cat videos, and car insurance ads.
- NARRATOR: She remembers your birthday, your mom's, and your dog's.
- NARRATOR: Her home is the safest place in town.
- NARRATOR: Friends come over sad and leave with soup and a hug.
- AMY: Rose, you're literally the best person alive.
- NARRATOR: Rose smiles. She feels so loved and so needed.
- NARRATOR: Then Amy opens the hallway closet. (pause)
- NARRATOR: An avalanche of boxes buries her to the neck.
- NARRATOR: Every single box has a date on it.
- AMY: Is this my handwriting? From ninth grade?
- NARRATOR: So what's going on inside a Cancer?
- NARRATOR: Picture a crab shell with one tiny door.
- NARRATOR: The sign says SAFE PEOPLE ONLY.
- NARRATOR: Inside is a giant cabinet labelled FEELINGS.
- NARRATOR: Every drawer is full, and none of them close.
- NARRATOR: Next to it, a tissue box with a counter.
- NARRATOR: Today it reads forty-one, and it's only noon.
- NARRATOR: And you, the friend who forgot? Your drawer just opened.
- NARRATOR: Rose still makes you soup. She salts it with tears.

---

## 5. LEO (Aslan): "A Leo Is Never Off Stage"

**Kadro:** Sofia (Aslan, altın pullu elbise, kabarık saç) · Chloe (gelin) · nedimeler · fotoğrafçı (kadın) · trompetçi
**Mekânlar:** düğün girişi (beyaz/altın) · tören sırası (pastel mavi) · trompet yakın çekim (pirinç) · kadeh kaldırma sahnesi (bordo) · karanlık dans pisti (gece moru) · kafa içi tiyatro (kırmızı kadife) · kulis aynaları (sıcak sarı) · pasta masası (pembe)
**Gag'ler:** Sofia saçını trompetin parlaklığında düzeltir · gelinliğin eteğine takılıp pastaya düşer
**Mekanizma propları:** tek yöne dönen projektör `SPOTLIGHT` · alkış ölçer `APPLAUSE` (kırmızıda) · aynalar `MAIN` / `BACKUP` · kalp tabelası `GENEROUS`

- NARRATOR: Your Leo friend wore gold sequins to your wedding.
- NARRATOR: Sofia is not the bride. You are.
- NARRATOR: That's Sofia. Generous, loud, and always glowing.
- NARRATOR: She brought her own ring light to the ceremony.
- NARRATOR: During the vows, she fixed her hair in a trumpet.
- NARRATOR: Then she gives the toast, and it's mostly about her.
- SOFIA: And that's how the bride met her best friend. Me!
- NARRATOR: The crowd loves it. Sofia is winning.
- NARRATOR: Then the lights go down for the first dance. (pause)
- NARRATOR: One spotlight comes on. It lands on the bride.
- NARRATOR: Sofia stands in the dark for the first time ever.
- SOFIA: Excuse me? Is this thing broken?
- NARRATOR: So what's going on inside a Leo?
- NARRATOR: Picture a theater with one switch marked SPOTLIGHT.
- NARRATOR: It only points one way, at her.
- NARRATOR: Backstage, an applause meter must stay in the red.
- NARRATOR: There's a mirror labelled MAIN, and one labelled BACKUP.
- NARRATOR: And a big heart with a sign that says GENEROUS.
- NARRATOR: Because Leos love big, and they pay for everyone's drinks.
- NARRATOR: So Sofia walks into the light to dance with the bride.
- NARRATOR: She trips on the dress and lands in the cake.
- NARRATOR: Somehow, it's the best photo of the night.

---

## 6. VIRGO (Başak): "A Virgo Will Fix Your Life Uninvited"

**Kadro:** Anna (Başak, sıkı topuz, etiket makinesi) · Mel (ev sahibi) · Mel'in erkek arkadaşı (yan rol) · misafirler
**Mekânlar:** kapı önü (yeşil) · baharat rafı yakın çekim (terrakota) · renk kodlu dolap (gökkuşağı/beyaz) · Mel'in mutfağı (sarı) · parti salonu (mor) · eğik çerçeve yakın çekim (soğuk mavi) · kafa içi ofis (gri) · kitaplık/koltuk (bordo)
**Gag'ler:** kitaplık devrilir, Anna koltuğa düşer · erkek arkadaşın alnına `MAYBE` etiketi yapışır
**Mekanizma propları:** hiç yere konmamış kırmızı damga `WRONG` · cetvel `TWO DEGREES` · bitmeyen pano `FIX IT` · çekmecede küçük not `I'M TIRED`

- NARRATOR: Your Virgo friend brought a label maker to your party.
- NARRATOR: That's Anna. Smart, helpful, and terrifyingly organized.
- NARRATOR: Her spice rack is alphabetical. Her closet is color-coded.
- NARRATOR: Even her to-do list has a to-do list.
- NARRATOR: In ten minutes, she has labelled your whole kitchen.
- MEL: Anna, this is actually amazing.
- NARRATOR: Anna glows. Someone finally appreciates the system.
- NARRATOR: Then she sees the picture frame on the wall. (pause)
- NARRATOR: It's tilted two degrees to the left.
- NARRATOR: She can't hear the music or the guests anymore.
- ANNA: Does nobody else see this? Nobody?
- NARRATOR: So what's going on inside a Virgo?
- NARRATOR: Picture an office with a giant red stamp marked WRONG.
- NARRATOR: It has never once been put down.
- NARRATOR: A ruler hangs on the wall labelled TWO DEGREES.
- NARRATOR: A clipboard says FIX IT, and the list never ends.
- NARRATOR: And in a drawer, a tiny note says I'M TIRED.
- NARRATOR: Nobody ever reads that one.
- NARRATOR: Anna climbs the bookshelf to straighten the frame.
- NARRATOR: The bookshelf goes over, and she lands on the couch.
- NARRATOR: The frame is now perfectly straight. Anna is happy.
- NARRATOR: Then she spots Mel's boyfriend, and reaches for the label maker.

---

## 7. LIBRA (Terazi): "A Libra Cannot Pick a Restaurant"

**Kadro:** Nina (Terazi, pastel) · Kate (sabırsız arkadaş) · Tara (anket açan arkadaş) · garson (kadın)
**Mekânlar:** arabanın içi (gri) · telefon/grup sohbeti (yeşil) · üç sütunlu liste defteri (krem) · menüsüz restoran (sıcak turuncu) · mutfak kapısı (beyaz) · kafa içi terazi salonu (lila) · Nina'nın kanepesi (mavi gece) · teslimat kapısı (sarı)
**Gag'ler:** para kenarı üstüne düşer, Kate kafasını masaya vurur · terazi sallanıp menüyü yere fırlatır
**Mekanizma propları:** her zaman dengede dev terazi `DECISIONS` · sonuna kadar açık kadran `PLEASE EVERYONE` · iki yüzü de `YES` olan para

- NARRATOR: It's minute forty, and your Libra friend still can't choose.
- NARRATOR: That's Nina. Charming, fair, and allergic to conflict.
- NARRATOR: She loves everyone's ideas equally. That's the problem.
- KATE: Tacos or pizza, Nina? Just pick one!
- NINA: I love both! What do you love?
- NARRATOR: She makes a pros and cons list with three columns.
- NARRATOR: She polls the group chat. It's a perfect tie.
- NARRATOR: Finally, they find a place with no menu at all.
- NARRATOR: Nina relaxes. No choices, no fights.
- NARRATOR: For the first time tonight, she's winning.
- NARRATOR: Then the waitress walks up with a tray. (pause)
- WAITRESS: Tonight, you pick. Chicken or fish?
- NARRATOR: The whole table freezes.
- NARRATOR: So what's going on inside a Libra?
- NARRATOR: Picture a giant scale labelled DECISIONS.
- NARRATOR: Both sides are always perfectly level.
- NARRATOR: Next to it, a dial marked PLEASE EVERYONE.
- NARRATOR: It's turned all the way up.
- NARRATOR: And a lucky coin with YES on both sides.
- NARRATOR: Nina flips the coin, and it lands on its edge.
- NARRATOR: The waitress waits. The kitchen closes.
- NARRATOR: Nina goes home hungry and orders both, with extra fries.
- NARRATOR: Next week is her birthday. Kate asks where she wants to go.

---

## 8. SCORPIO (Akrep): "A Scorpio Already Knows"

**Kadro:** Vera (Akrep, siyah balıkçı yaka) · Jen (yeni sevgilisi olan arkadaş) · Kim (sevgilinin "diğer" kız arkadaşı) · Tom (sevgili, yan rol) · yeni iş arkadaşı (fotoğrafta)
**Mekânlar:** tanışma barı (bordo) · Vera'nın telefonu (karanlık yeşil) · çiçekli akşam yemeği (pembe) · Jen'in salonu (sıcak sarı) · kapı eşiği (soğuk mavi) · kafa içi karanlık oda (kırmızı ip) · arşiv dolabı (gri) · şarap masası (mor)
**Gag'ler:** Tom kapı yerine dolaba kaçar, montlar üstüne yağar · `EVIDENCE` çekmecesi fırlar, dosyalar havaya saçılır
**Mekanizma propları:** kırmızı ipli mantar pano, fotoğraflarda `SUSPECT` · dosya dolabı `EVIDENCE` · anahtarı olmayan asma kilit `SECRETS` · sayaç `DAYS SINCE I FORGAVE` (0)

- NARRATOR: It's girls' night, and your Scorpio friend just stopped blinking.
- NARRATOR: Jen just introduced her new boyfriend.
- NARRATOR: That's Vera. Loyal, intense, and very quiet.
- NARRATOR: She knows your password. You never told her.
- NARRATOR: She found his ex online in eight minutes.
- JEN: Vera, stop. He's a nice guy!
- NARRATOR: Vera nods slowly and writes something in her notebook.
- NARRATOR: So Jen ignores her, and life is great.
- NARRATOR: Flowers, dinners, weekend trips, and matching sweaters.
- NARRATOR: Then the doorbell rings. (pause)
- NARRATOR: It's his other girlfriend, wearing the same sweater.
- KIM: Hi. I think we need to talk.
- NARRATOR: Tom tries to leave through the closet.
- NARRATOR: Vera is already pouring three glasses of wine. She saw this coming.
- NARRATOR: So what's going on inside a Scorpio?
- NARRATOR: Picture a dark room with a corkboard and red string.
- NARRATOR: Every photo on it is labelled SUSPECT.
- NARRATOR: There's a filing cabinet marked EVIDENCE.
- NARRATOR: A padlock labelled SECRETS, and the key is gone.
- NARRATOR: And a counter marked DAYS SINCE I FORGAVE.
- NARRATOR: It has never, not once, moved past zero.
- NARRATOR: Jen and Kim become best friends. Vera pins a new photo.
- NARRATOR: It's your new coworker, and Vera doesn't blink.

---

## 9. SAGITTARIUS (Yay): "A Sagittarius Is Always Leaving"

**Kadro:** Luna (Yay, sırt çantası, yürüyüş botu) · Bea (kâküllü arkadaş) · Maya (veda partisini düzenleyen) · kapı görevlisi (kadın)
**Mekânlar:** brunch masası (sarı) · Luna'nın yatak odası, toplu bavul (turkuaz) · harita duvarı (kahverengi) · veda partisi (pembe) · havalimanı kapısı (beyaz/mavi) · buzdolabı içi (soğuk mavi) · kafa içi her kapısı EXIT olan oda (yeşil) · otobüs (gece turuncusu)
**Gag'ler:** telefonun üstüne şurup akar · Luna çantayı ters çevirir, kıyafetler patlar gibi saçılır · ok, Bea'nın yanındaki balonu patlatır
**Mekanizma propları:** her kapıda `EXIT` · kuzeyi olmayan pusula · ok ve yay `TRUTH` · bomboş takvim `PLANS`

- NARRATOR: Your Sagittarius friend booked a flight to Peru mid-brunch.
- NARRATOR: She did it mid-sentence, with syrup all over her phone.
- NARRATOR: That's Luna. Fun, free, and dangerously honest.
- LUNA: Your bangs were a mistake, babe. Love you!
- NARRATOR: Bea touches her bangs. Luna is already ordering pancakes.
- NARRATOR: Her suitcase is always packed. She sleeps in hiking boots.
- NARRATOR: She's seen thirty countries and zero dentists.
- NARRATOR: Her friends throw a goodbye party, and everyone cries.
- NARRATOR: Luna waves from the gate. She's never been happier.
- NARRATOR: Then the gate agent holds out her hand. (pause)
- AGENT: Passport, please.
- NARRATOR: Luna checks her pockets, then her bag, then her boots.
- NARRATOR: Her passport is at home, in the freezer, next to the peas.
- NARRATOR: So what's going on inside a Sagittarius?
- NARRATOR: Picture a room where every door says EXIT.
- NARRATOR: There's a compass, but north is missing.
- NARRATOR: A bow and arrow labelled TRUTH, aimed at your bangs.
- NARRATOR: And a calendar marked PLANS, completely blank.
- NARRATOR: Luna takes the bus home. The party is still going.
- MAYA: You're back? We still have cake!
- NARRATOR: Everyone cheers, and Luna eats half the cake.
- NARRATOR: That night, she books a flight to Iceland.

---

## 10. CAPRICORN (Oğlak): "A Capricorn Schedules Her Fun"

**Kadro:** Diana (Oğlak, blazer, ajanda) · Rina, Tess, Paula (sürpriz partiyi kuran arkadaşlar) · asistan
**Mekânlar:** cam ofis (gri-mavi) · ekrandaki takvim (beyaz/kırmızı) · banka gişesi (yeşil) · arkadaş grup sohbeti (pembe) · karanlık toplantı odası (gece) · konfeti partisi (gökkuşağı/sarı) · kafa içi dağ ve merdiven (taş grisi/kar) · ajanda klasörü yakın çekim (krem)
**Gag'ler:** konfeti topu tam yüzüne patlar, Diana sandalyeyle geriye devrilir · merdivende tırmanırken laptopu düşürmez, kendisi kayar
**Mekanizma propları:** tepesi olmayan merdiven `GOALS` · tozlu damga `APPROVED` · 2'de duran kadran `FUN` · hiç kapanmayan laptop · klasör `IMPORTANT`

- NARRATOR: It's 3:15, and your Capricorn friend's calendar says LAUGH.
- NARRATOR: She laughs exactly once, then gets back to work.
- NARRATOR: That's Diana. Ambitious, reliable, and always working.
- NARRATOR: Her five-year plan has its own five-year plan.
- NARRATOR: She's twenty-six, and she already has a retirement fund.
- NARRATOR: Her friends love her. They just never see her.
- NARRATOR: Her last vacation was a work trip with a pool.
- NARRATOR: So they plan a surprise party in a meeting room.
- NARRATOR: Diana walks in with her laptop, ready to present. (pause)
- FRIENDS: Surprise!
- NARRATOR: The confetti cannon hits her right in the face.
- DIANA: This was not in my calendar.
- NARRATOR: So what's going on inside a Capricorn?
- NARRATOR: Picture a mountain with a ladder labelled GOALS.
- NARRATOR: The ladder has no top, and she's still climbing.
- NARRATOR: At the bottom, a stamp marked APPROVED, covered in dust.
- NARRATOR: There's a dial labelled FUN, and it's set to two.
- NARRATOR: And a laptop that never, ever closes.
- NARRATOR: But here's her secret. She keeps every birthday card.
- NARRATOR: They're all in a folder labelled IMPORTANT.
- NARRATOR: Diana stays for exactly one hour.
- NARRATOR: Then she books the next party for October.
- NARRATOR: She sends everyone a calendar invite.

---

## 11. AQUARIUS (Kova): "An Aquarius Quits When It Gets Cool"

**Kadro:** Iris (Kova, gümüş saç, ikinci el kıyafet, sandalet + çorap) · grup üyeleri June ve Ada · influencer Brooke · çamaşırhane seyircileri
**Mekânlar:** protesto alanı (kırmızı pankartlar) · kombuçalı banyo (yeşil-kahve) · çamaşırhane konseri (turkuaz floresan) · telefon ekranı, viral video (pembe) · şehir caddesi, herkes Iris gibi giyinmiş (sarı) · kafa içi laboratuvar (metal mavi) · Iris'in odası (mor) · arı kovanları (bal sarısı/turuncu)
**Gag'ler:** banyodaki kombuça patlar, köpük tavana çıkar · Iris sandaletleri fırlatır, biri influencer'ın telefonuna çarpar
**Mekanizma propları:** insanlardan öteye bakan teleskop · kilitli kutu `FEELINGS`, anahtar etiketi `LATER` · büyük şalter `IF POPULAR, STOP`

- NARRATOR: Your Aquarius friend replied three days later, from a protest.
- NARRATOR: That's Iris. Brilliant, rebellious, and slightly alien.
- NARRATOR: She brews her own kombucha in the bathtub.
- NARRATOR: She wears wool socks with sandals, completely on purpose.
- NARRATOR: She loves humanity. Humans, she's not so sure.
- NARRATOR: Her weird little band plays to five people in a laundromat.
- NARRATOR: Nobody understands her, and Iris is thrilled.
- NARRATOR: Then an influencer walks in and starts filming. (pause)
- NARRATOR: By morning, the video has a million views.
- BROOKE: Socks with sandals are so in right now!
- NARRATOR: Suddenly, the whole city dresses like Iris.
- NARRATOR: Iris looks at them. Then she looks at her socks.
- NARRATOR: So what's going on inside an Aquarius?
- NARRATOR: Picture a lab with a telescope pointed away from people.
- NARRATOR: A box labelled FEELINGS is locked. The key says LATER.
- NARRATOR: And one big switch marked IF POPULAR, STOP.
- NARRATOR: That switch just flipped.
- NARRATOR: Iris throws away her sandals and quits the band.
- NARRATOR: Back home, the bathtub kombucha explodes.
- NARRATOR: By Friday, she's into beekeeping and medieval choir music.
- NARRATOR: Her five fans follow her. So does the influencer.
- NARRATOR: You text Iris. She replies from a beehive.

---

## 12. PISCES (Balık): "A Pisces Already Planned the Wedding"

**Kadro:** Mila (Balık, pastel lila, dalgın) · Sara (gerçekçi arkadaş) · barista Sam (yan rol) · Sam'in karısı · çiçekçi kız (finalde)
**Mekânlar:** kahve dükkânı tezgâhı (sıcak kahverengi) · hayal: düğün salonu (beyaz/pembe, rüya ışığı) · gün batımı balkonu (turuncu) · Mila'nın odası, mobilyaya özür (lila) · kafe, ertesi sabahlar (sarı) · cam kapı (soğuk mavi) · kafa içi akvaryum (deniz mavisi) · çiçekçi dükkânı (yeşil)
**Gag'ler:** Mila cam kapıya yüzüyle çarpar · akvaryum taşar, ayaklarının altı su olur
**Mekanizma propları:** taşan akvaryum `DAYDREAMS` · yere düşmüş kadran `REALITY` · kapanmayan musluk `TEARS` · hoparlör `SAD SONGS`

- NARRATOR: Your Pisces friend got one smile and planned the wedding.
- NARRATOR: It was the barista. She already named their three children.
- NARRATOR: That's Mila. Dreamy, kind, and mostly in her head.
- NARRATOR: She cries at sunsets. She says sorry to furniture.
- NARRATOR: She's picked the wedding dress, the song, and the dog.
- SARA: Mila, you don't even know his name.
- MILA: His name tag says Sam. It's literally fate.
- NARRATOR: Every morning she comes back, and every morning he smiles.
- NARRATOR: Then a woman walks behind the counter. (pause)
- NARRATOR: She kisses the barista, and she's wearing a ring.
- WIFE: Babe, you forgot your lunch again.
- NARRATOR: Mila turns around and walks straight into the glass door.
- NARRATOR: So what's going on inside a Pisces?
- NARRATOR: Picture a fish tank labelled DAYDREAMS.
- NARRATOR: It's huge, and it's always overflowing.
- NARRATOR: Next to it, a dial labelled REALITY. It fell off years ago.
- NARRATOR: A tap marked TEARS that nobody can close.
- NARRATOR: And a speaker playing SAD SONGS on repeat.
- NARRATOR: Mila cries for one evening, then feels completely fine.
- NARRATOR: The next morning, she tries the flower shop instead.
- NARRATOR: The florist hands her a rose and smiles.
- NARRATOR: Mila has already named their dog.
