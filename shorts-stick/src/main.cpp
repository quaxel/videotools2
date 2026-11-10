// Shorts view counter for M5StickC Plus.
// Wi-Fi -> refresh the uploader's OAuth token -> list the channel's Shorts (the "UUSH" playlist)
// -> show every Short's view count, plus how many views each gained today.
//
// Buttons:  A (big front)  short = next screen, long = auto-cycle on/off
//           B (side)       short = battery screen (5 s), long = refresh now
// The screen turns off 2 minutes after the last press; the first press only wakes it.
// Counts keep refreshing in the background while it is off.
#include <M5Unified.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <LittleFS.h>
#include <vector>
#include <time.h>
#include "secrets.h"

static const int MAX_SHORTS = 100;
static const uint32_t REFRESH_MS = REFRESH_MINUTES * 60000UL;
static const uint32_t CYCLE_MS = 6000;
static const uint32_t SCREEN_OFF_MS = 2 * 60000UL;
static const uint8_t BRIGHTNESS = 110;

struct Short {
  char id[12];
  String title;
  uint32_t views;
  uint32_t base;  // views at local midnight (or when first seen today)
};

struct Baseline {
  char id[12];
  uint32_t views;
};

Short shorts[MAX_SHORTS];
int nShorts = 0;
Baseline bases[MAX_SHORTS];
int nBases = 0;
uint32_t baseDay = 0;

String accessToken;
uint32_t tokenUntil = 0;  // millis
String channelId;
uint32_t totalViews = 0, lastGain = 0;
bool haveData = false;
String status = "Baslatiliyor";
time_t lastOk = 0;
uint32_t lastFetch = 0;
bool fetchNow = true;

int screen = 0;  // 0 = overview, 1..nShorts = one Short
bool autoCycle = false;
uint32_t lastCycle = 0;

Preferences prefs;
M5Canvas canvas(&M5.Display);
bool fsOk = false;
void clearThumbCache();

// ---------- helpers ----------

String fmtNum(uint32_t n) {
  String s = String(n), out;
  int c = 0;
  for (int i = s.length() - 1; i >= 0; i--) {
    out = s[i] + out;
    if (++c % 3 == 0 && i > 0) out = "." + out;
  }
  return out;
}

// Titles may contain curly quotes and dashes; the GFX fonts only have ASCII.
String asciiTitle(const char* in) {
  String out;
  const uint8_t* p = (const uint8_t*)in;
  while (*p) {
    if (*p < 0x80) { out += (char)*p++; continue; }
    if (p[0] == 0xE2 && p[1] == 0x80) {
      uint8_t c = p[2];
      if (c == 0x98 || c == 0x99) out += '\'';
      else if (c == 0x9C || c == 0x9D) out += '"';
      else if (c == 0x93 || c == 0x94) out += '-';
      else if (c == 0xA6) out += "...";
      p += 3;
      continue;
    }
    // skip any other multi-byte character
    int len = (*p >= 0xF0) ? 4 : (*p >= 0xE0) ? 3 : 2;
    while (len-- && *p) p++;
  }
  return out;
}

uint32_t today() {
  struct tm t;
  if (!getLocalTime(&t, 10) || t.tm_year < 120) return 0;
  return (t.tm_year + 1900) * 10000 + (t.tm_mon + 1) * 100 + t.tm_mday;
}

String hhmm(time_t ts) {
  if (!ts) return "--:--";
  struct tm t;
  localtime_r(&ts, &t);
  char b[6];
  snprintf(b, sizeof b, "%02d:%02d", t.tm_hour, t.tm_min);
  return b;
}

void loadBaselines() {
  prefs.begin("shorts", true);
  baseDay = prefs.getUInt("day", 0);
  size_t len = prefs.getBytesLength("bases");
  nBases = 0;
  if (len && len <= sizeof bases) {
    prefs.getBytes("bases", bases, len);
    nBases = len / sizeof(Baseline);
  }
  prefs.end();
}

void saveBaselines() {
  prefs.begin("shorts", false);
  prefs.putUInt("day", baseDay);
  prefs.putBytes("bases", bases, nBases * sizeof(Baseline));
  prefs.end();
}

// New day: today's baseline is what each Short had at the first refresh after midnight.
void applyBaselines() {
  uint32_t d = today();
  bool changed = false;
  if (d && d != baseDay) {
    if (baseDay && fsOk) clearThumbCache();  // re-fetch once a day in case a thumbnail changed
    baseDay = d;
    nBases = 0;
    changed = true;
  }
  for (int i = 0; i < nShorts; i++) {
    int j = 0;
    while (j < nBases && strcmp(bases[j].id, shorts[i].id) != 0) j++;
    if (j == nBases && nBases < MAX_SHORTS) {
      // A Short not seen yet today (new day, or just published): count today's gain from now.
      strcpy(bases[nBases].id, shorts[i].id);
      bases[nBases].views = shorts[i].views;
      nBases++;
      changed = true;
    }
    shorts[i].base = (j < nBases) ? bases[j].views : shorts[i].views;
  }
  if (changed && d) saveBaselines();
}

// ---------- YouTube ----------

bool refreshAccessToken() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, "https://oauth2.googleapis.com/token");
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  String body = String("client_id=") + YT_CLIENT_ID + "&client_secret=" + YT_CLIENT_SECRET +
                "&refresh_token=" + YT_REFRESH_TOKEN + "&grant_type=refresh_token";
  int code = http.POST(body);
  String resp = http.getString();
  http.end();
  if (code != 200) {
    status = "Token hata " + String(code);
    Serial.println(resp);
    return false;
  }
  JsonDocument doc;
  deserializeJson(doc, resp);
  accessToken = doc["access_token"].as<String>();
  uint32_t exp = doc["expires_in"] | 3600;
  tokenUntil = millis() + (exp - 120) * 1000UL;
  return accessToken.length() > 0;
}

// GET a YouTube Data API URL into doc. Returns HTTP code (or -1 on parse error).
int ytGet(const String& url, JsonDocument& doc, JsonDocument& filter) {
  for (int attempt = 0; attempt < 2; attempt++) {
    if (!accessToken.length() || (int32_t)(millis() - tokenUntil) > 0) {
      if (!refreshAccessToken()) return 0;
    }
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, url);
    http.addHeader("Authorization", "Bearer " + accessToken);
    int code = http.GET();
    if (code == 401 && attempt == 0) {
      http.end();
      accessToken = "";
      continue;
    }
    if (code != 200) {
      Serial.printf("HTTP %d %s\n%s\n", code, url.c_str(), http.getString().c_str());
      http.end();
      return code;
    }
    String body = http.getString();  // handles chunked replies; bodies are small thanks to fields=
    http.end();
    DeserializationError e = deserializeJson(doc, body, DeserializationOption::Filter(filter));
    if (e) {
      Serial.printf("JSON %s\n", e.c_str());
      return -1;
    }
    return 200;
  }
  return 401;
}

uint32_t gainToday();
bool fetchAll() {
  const String api = "https://www.googleapis.com/youtube/v3/";

  if (!channelId.length()) {
    JsonDocument f, doc;
    f["items"][0]["id"] = true;
    int c = ytGet(api + "channels?part=id&mine=true", doc, f);
    if (c != 200) { status = "Kanal hata " + String(c); return false; }
    channelId = doc["items"][0]["id"].as<String>();
    if (channelId.length() < 3) { status = "Kanal yok"; return false; }
  }

  // Every channel has a hidden Shorts-only uploads playlist: UC... -> UUSH...
  String playlist = "UUSH" + channelId.substring(2);
  static char ids[MAX_SHORTS][12];
  int n = 0;
  String page;
  do {
    JsonDocument f, doc;
    f["nextPageToken"] = true;
    f["items"][0]["contentDetails"]["videoId"] = true;
    String url = api + "playlistItems?part=contentDetails&maxResults=50&playlistId=" + playlist +
                 "&fields=nextPageToken,items/contentDetails/videoId";
    if (page.length()) url += "&pageToken=" + page;
    int c = ytGet(url, doc, f);
    if (c == 404) break;  // no Shorts yet
    if (c != 200) { status = "Liste hata " + String(c); return false; }
    for (JsonVariant it : doc["items"].as<JsonArray>()) {
      if (n >= MAX_SHORTS) break;
      strlcpy(ids[n++], it["contentDetails"]["videoId"] | "", 12);
    }
    page = doc["nextPageToken"] | "";
  } while (page.length() && n < MAX_SHORTS);

  static Short fresh[MAX_SHORTS];
  int got = 0;
  for (int start = 0; start < n; start += 50) {
    String idList;
    for (int i = start; i < n && i < start + 50; i++) {
      if (idList.length()) idList += ",";
      idList += ids[i];
    }
    JsonDocument f, doc;
    f["items"][0]["id"] = true;
    f["items"][0]["snippet"]["title"] = true;
    f["items"][0]["statistics"]["viewCount"] = true;
    String url = api + "videos?part=snippet,statistics&fields=items(id,snippet/title,statistics/viewCount)&id=" + idList;
    int c = ytGet(url, doc, f);
    if (c != 200) { status = "Video hata " + String(c); return false; }
    // videos.list may return items in any order; keep the playlist (newest first) order.
    JsonArray items = doc["items"].as<JsonArray>();
    for (int i = start; i < n && i < start + 50; i++) {
      for (JsonVariant it : items) {
        if (strcmp(it["id"] | "", ids[i]) != 0) continue;
        Short& s = fresh[got++];
        strlcpy(s.id, ids[i], 12);
        s.title = asciiTitle(it["snippet"]["title"] | "");
        s.views = strtoul(it["statistics"]["viewCount"] | "0", nullptr, 10);
        break;
      }
    }
  }

  uint32_t total = 0;
  for (int i = 0; i < got; i++) {
    shorts[i] = fresh[i];
    total += fresh[i].views;
  }
  nShorts = got;
  lastGain = (haveData && total > totalViews) ? total - totalViews : 0;
  totalViews = total;
  applyBaselines();
  haveData = true;
  Serial.printf("OK %d shorts, %u views, +%u today\n", nShorts, totalViews, gainToday());
  time(&lastOk);
  status = "";
  if (screen > nShorts) screen = 0;
  return true;
}

uint32_t gainToday() {
  uint32_t g = 0;
  for (int i = 0; i < nShorts; i++)
    if (shorts[i].views > shorts[i].base) g += shorts[i].views - shorts[i].base;
  return g;
}

// ---------- thumbnails ----------
// hqdefault.jpg is 480x360 with the vertical Short in the centre; it is cached in flash
// as /t/<id>.jpg (~10 KB each) and fetched again once a day to pick up changed thumbnails.

static const int THUMB_W = 76, THUMB_H = 135;  // 9:16 at full screen height
M5Canvas thumb(&canvas);
char thumbShown[12] = "";  // id currently decoded in `thumb`

String thumbPath(const char* id) { return String("/t/") + id + ".jpg"; }

void clearThumbCache() {
  File dir = LittleFS.open("/t");
  if (!dir) return;
  std::vector<String> names;
  for (File f = dir.openNextFile(); f; f = dir.openNextFile()) names.push_back(String("/t/") + f.name());
  dir.close();
  for (auto& n : names) LittleFS.remove(n);
  thumbShown[0] = 0;
}

// Downloads one missing thumbnail. Returns true if it did any network work.
bool fetchOneThumb() {
  if (!fsOk || WiFi.status() != WL_CONNECTED) return false;
  for (int i = 0; i < nShorts; i++) {
    String path = thumbPath(shorts[i].id);
    if (LittleFS.exists(path)) continue;
    if (LittleFS.totalBytes() - LittleFS.usedBytes() < 40000) clearThumbCache();
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, String("https://i.ytimg.com/vi/") + shorts[i].id + "/hqdefault.jpg");
    int code = http.GET();
    if (code == 200) {
      String tmp = path + ".part";
      File f = LittleFS.open(tmp, "w");
      int n = f ? http.writeToStream(&f) : -1;
      if (f) f.close();
      Serial.printf("thumb %s %d bytes\n", shorts[i].id, n);
      if (n > 1000) LittleFS.rename(tmp, path);
      else LittleFS.remove(tmp);
    } else {
      Serial.printf("thumb %s HTTP %d\n", shorts[i].id, code);
    }
    http.end();
    return true;
  }
  return false;
}

// Decodes the cached JPEG into `thumb` (centre crop). Returns false if not cached yet.
bool loadThumb(const char* id) {
  if (strcmp(thumbShown, id) == 0) return true;
  if (!fsOk) return false;
  File f = LittleFS.open(thumbPath(id), "r");
  if (!f) return false;
  size_t len = f.size();
  uint8_t* buf = (uint8_t*)malloc(len);
  bool ok = buf && f.read(buf, len) == len;
  f.close();
  if (ok) {
    thumb.fillSprite(0x0000);
    // 360 px tall -> 135: scale 0.375; middle_center crops the 180 px wide result to the centre 76 px.
    ok = thumb.drawJpg(buf, len, 0, 0, THUMB_W, THUMB_H, 0, 0, 0.375f, 0.375f, datum_t::middle_center);
  }
  free(buf);
  if (ok) strlcpy(thumbShown, id, sizeof thumbShown);
  return ok;
}

// ---------- drawing (240 x 135) ----------

const uint16_t C_BG = 0x0000, C_FG = 0xFFFF, C_DIM = 0x8410, C_RED = 0xF800, C_GREEN = 0x37E0;

void wrapText(const String& text, int x, int y, int w, int maxLines, int lineH) {
  String line, word;
  int lines = 0;
  String rest = text + " ";
  for (unsigned i = 0; i < rest.length() && lines < maxLines; i++) {
    char ch = rest[i];
    if (ch != ' ') { word += ch; continue; }
    String trial = line.length() ? line + " " + word : word;
    if (canvas.textWidth(trial) <= w) {
      line = trial;
    } else {
      if (lines == maxLines - 1) {  // last line: ellipsize
        while (line.length() && canvas.textWidth(line + "...") > w) line.remove(line.length() - 1);
        line += "...";
        word = "";
        break;
      }
      canvas.drawString(line, x, y + lines * lineH);
      lines++;
      line = word;
    }
    word = "";
  }
  if (line.length() && lines < maxLines) canvas.drawString(line, x, y + lines * lineH);
}

void drawHeader(const String& left) {
  canvas.fillRect(0, 0, 240, 20, C_RED);
  // little white "play" triangle
  canvas.fillTriangle(7, 5, 7, 15, 15, 10, C_FG);
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextColor(C_FG);
  canvas.setTextDatum(middle_left);
  canvas.drawString(left, 21, 10);
  canvas.setFont(&fonts::Font2);
  canvas.setTextDatum(middle_right);
  time_t now;
  time(&now);
  canvas.drawString(now > 1700000000 ? hhmm(now) : String(""), 234, 10);
  // Wi-Fi dot
  canvas.fillCircle(194, 10, 3, WiFi.status() == WL_CONNECTED ? C_FG : 0x4208);
}

void drawFooter() {
  canvas.setFont(&fonts::Font0);
  canvas.setTextDatum(bottom_left);
  canvas.setTextColor(status.length() ? C_RED : C_DIM);
  String s = status.length() ? status : ("son guncelleme " + hhmm(lastOk));
  canvas.drawString(s, 4, 133);
  canvas.setTextDatum(bottom_right);
  canvas.setTextColor(C_DIM);
  canvas.drawString(autoCycle ? "oto" : "", 236, 133);
  // refresh progress line
  if (haveData) {
    uint32_t el = millis() - lastFetch;
    int w = el >= REFRESH_MS ? 240 : (int)(240UL * el / REFRESH_MS);
    canvas.drawFastHLine(0, 134, w, 0x4208);
  }
}

void drawOverview() {
  drawHeader("SHORTS");
  if (!haveData) {
    canvas.setFont(&fonts::FreeSans9pt7b);
    canvas.setTextColor(C_FG);
    canvas.setTextDatum(middle_center);
    canvas.drawString(status.length() ? status : "Yukleniyor...", 120, 70);
    drawFooter();
    return;
  }
  canvas.setFont(&fonts::Font0);
  canvas.setTextColor(C_DIM);
  canvas.setTextDatum(top_left);
  canvas.drawString("TOPLAM IZLENME  -  " + String(nShorts) + " short", 6, 26);

  canvas.setFont(&fonts::FreeSansBold24pt7b);
  canvas.setTextColor(C_FG);
  canvas.setTextDatum(top_left);
  String big = fmtNum(totalViews);
  if (canvas.textWidth(big) > 228) canvas.setFont(&fonts::FreeSansBold18pt7b);
  canvas.drawString(big, 4, 40);

  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextColor(C_GREEN);
  canvas.drawString("+" + fmtNum(gainToday()) + " bugun", 6, 92);
  if (lastGain) {
    canvas.setFont(&fonts::Font2);
    canvas.setTextColor(C_DIM);
    canvas.setTextDatum(top_right);
    canvas.drawString("+" + fmtNum(lastGain) + " son", 234, 94);
  }
  drawFooter();
}

void drawShort(int i) {
  const Short& s = shorts[i];
  const int X = THUMB_W + 7, W = 236 - X;  // right-hand text panel

  if (loadThumb(s.id)) {
    thumb.pushSprite(0, 0);
  } else {  // not downloaded yet: placeholder
    canvas.fillRect(0, 0, THUMB_W, THUMB_H, 0x2104);
    canvas.fillRoundRect(THUMB_W / 2 - 14, THUMB_H / 2 - 10, 28, 20, 5, C_RED);
    canvas.fillTriangle(THUMB_W / 2 - 4, THUMB_H / 2 - 5, THUMB_W / 2 - 4, THUMB_H / 2 + 5, THUMB_W / 2 + 6, THUMB_H / 2, C_FG);
  }

  // top line: position, Wi-Fi dot, clock
  canvas.setFont(&fonts::Font2);
  canvas.setTextColor(C_DIM);
  canvas.setTextDatum(top_left);
  canvas.drawString(String(i + 1) + "/" + String(nShorts), X, 2);
  time_t now;
  time(&now);
  canvas.setTextDatum(top_right);
  canvas.drawString(now > 1700000000 ? hhmm(now) : String(""), 236, 2);
  canvas.fillCircle(196, 10, 2, WiFi.status() == WL_CONNECTED ? C_DIM : 0x4208);

  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.setTextColor(C_FG);
  canvas.setTextDatum(top_left);
  wrapText(s.title, X, 22, W, 3, 18);

  canvas.setFont(&fonts::FreeSansBold18pt7b);
  canvas.setTextColor(C_FG);
  canvas.drawString(fmtNum(s.views), X - 1, 80);

  uint32_t g = s.views > s.base ? s.views - s.base : 0;
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextColor(g ? C_GREEN : C_DIM);
  canvas.drawString("+" + fmtNum(g) + " bugun", X, 113);

  canvas.setFont(&fonts::Font0);
  canvas.setTextDatum(bottom_right);
  if (status.length()) {
    canvas.setTextColor(C_RED);
    canvas.drawString(status, 236, 133);
  } else if (autoCycle) {
    canvas.setTextColor(C_DIM);
    canvas.drawString("oto", 236, 133);
  }
}

// Battery screen, shown for a few seconds after a short B press.
uint32_t batteryUntil = 0;

void drawBattery() {
  int level = M5.Power.getBatteryLevel();  // 0..100
  int mv = M5.Power.getBatteryVoltage();
  auto charging = M5.Power.isCharging();
  level = constrain(level, 0, 100);
  uint16_t col = level > 50 ? C_GREEN : level > 20 ? 0xFE60 : C_RED;

  // battery outline with fill
  const int bx = 18, by = 38, bw = 96, bh = 56;
  canvas.drawRoundRect(bx, by, bw, bh, 8, C_FG);
  canvas.drawRoundRect(bx + 1, by + 1, bw - 2, bh - 2, 7, C_FG);
  canvas.fillRoundRect(bx + bw + 2, by + bh / 2 - 10, 7, 20, 3, C_FG);
  int fw = (bw - 10) * level / 100;
  if (fw > 0) canvas.fillRoundRect(bx + 5, by + 5, fw, bh - 10, 4, col);
  if (charging == m5::Power_Class::is_charging) {  // lightning bolt
    int cx = bx + bw / 2, cy = by + bh / 2;
    canvas.fillTriangle(cx + 4, cy - 20, cx - 9, cy + 3, cx + 1, cy + 3, C_FG);
    canvas.fillTriangle(cx - 4, cy + 20, cx + 9, cy - 3, cx - 1, cy - 3, C_FG);
  }

  canvas.setTextColor(C_FG);
  canvas.setTextDatum(top_left);
  canvas.setFont(&fonts::FreeSansBold24pt7b);
  canvas.drawString(String(level) + "%", 132, 36);
  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.setTextColor(C_DIM);
  canvas.drawString(String(mv / 1000.0f, 2) + " V", 134, 80);

  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextDatum(top_center);
  String state = charging == m5::Power_Class::is_charging      ? "Sarj oluyor"
                 : charging == m5::Power_Class::is_discharging ? "Pilde"
                                                               : "Sarj durumu bilinmiyor";
  canvas.setTextColor(charging == m5::Power_Class::is_charging ? C_GREEN : C_FG);
  canvas.drawString(state, 120, 108);

  canvas.setFont(&fonts::Font2);
  canvas.setTextColor(C_DIM);
  canvas.setTextDatum(top_left);
  canvas.drawString("PIL", 8, 6);
}

void render() {
  canvas.fillSprite(C_BG);
  if ((int32_t)(batteryUntil - millis()) > 0) drawBattery();
  else if (screen == 0 || !haveData) drawOverview();
  else drawShort(screen - 1);
  canvas.pushSprite(0, 0);
}

// ---------- main ----------

bool tryWifi(const char* ssid, const char* pass) {
  status = String("Wi-Fi: ") + ssid;
  render();
  WiFi.disconnect(true);
  delay(100);
  WiFi.begin(ssid, pass);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    M5.update();
    delay(200);
  }
  Serial.printf("WiFi %s: %s\n", ssid, WiFi.status() == WL_CONNECTED ? "OK" : "fail");
  return WiFi.status() == WL_CONNECTED;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  bool ok = tryWifi(WIFI_SSID, WIFI_PASS);
#ifdef WIFI_SSID2
  if (!ok) ok = tryWifi(WIFI_SSID2, WIFI_PASS2);
#endif
  status = ok ? "" : "Wi-Fi yok";
}

void setup() {
  auto cfg = M5.config();
  M5.begin(cfg);
  Serial.begin(115200);
  M5.Display.setRotation(1);
  M5.Display.setBrightness(BRIGHTNESS);
  canvas.setColorDepth(16);
  canvas.createSprite(240, 135);
  thumb.setColorDepth(16);
  thumb.createSprite(THUMB_W, THUMB_H);
  fsOk = LittleFS.begin(true);
  if (fsOk) LittleFS.mkdir("/t");
  loadBaselines();
  render();
  connectWifi();
  configTzTime(TIMEZONE, "pool.ntp.org", "time.google.com");
  // wait briefly for NTP so the daily baseline lands on the right date
  for (int i = 0; i < 30 && !today(); i++) delay(200);
}

void loop() {
  M5.update();
  int pages = haveData ? nShorts + 1 : 1;
  bool dirty = false;

  // screen timeout: any press resets it; a press while the screen is off only wakes it
  static uint32_t lastInput = 0;
  static bool screenOn = true, swallow = false;
  bool anyPress = M5.BtnA.wasPressed() || M5.BtnB.wasPressed() || M5.BtnPWR.wasClicked();
  if (anyPress) {
    lastInput = millis();
    if (!screenOn) {
      M5.Display.wakeup();
      M5.Display.setBrightness(BRIGHTNESS);
      screenOn = true;
      swallow = true;  // ignore the rest of this press (its click / long-press release)
      dirty = true;
    }
  }
  if (screenOn && millis() - lastInput > SCREEN_OFF_MS) {
    M5.Display.setBrightness(0);
    M5.Display.sleep();
    screenOn = false;
    autoCycle = false;
    batteryUntil = millis();
  }
  if (swallow && M5.BtnA.isReleased() && M5.BtnB.isReleased() && !M5.BtnA.wasReleased() && !M5.BtnB.wasReleased())
    swallow = false;

  if (!swallow) {
    if (M5.BtnA.wasReleaseFor(700)) { autoCycle = !autoCycle; lastCycle = millis(); dirty = true; }
    else if (M5.BtnA.wasClicked()) { screen = (screen + 1) % pages; lastCycle = millis(); dirty = true; }
    if (M5.BtnB.wasReleaseFor(700)) { fetchNow = true; status = "Yenileniyor..."; dirty = true; }
    else if (M5.BtnB.wasClicked()) {
      bool showing = (int32_t)(batteryUntil - millis()) > 0;
      batteryUntil = showing ? millis() : millis() + 5000;  // second press closes it
      dirty = true;
    }
    if (M5.BtnA.wasClicked()) batteryUntil = millis();  // A always goes back to the stats
  }

  // serial debug: n = next screen, s = dump the screen as raw RGB565 (240x135)
  while (Serial.available()) {
    int c = Serial.read();
    if (!screenOn) { M5.Display.wakeup(); M5.Display.setBrightness(BRIGHTNESS); screenOn = true; }
    lastInput = millis();
    if (c == 'n') { screen = (screen + 1) % pages; dirty = true; }
    if (c == 'b') { batteryUntil = millis() + 5000; dirty = true; }
    if (c == 's') {
      render();
      Serial.print("SHOT\n");
      for (int y = 0; y < 135; y++)
        for (int x = 0; x < 240; x++) {
          uint16_t px = canvas.readPixel(x, y);
          Serial.write(px >> 8);
          Serial.write(px & 0xFF);
        }
    }
  }

  if (autoCycle && millis() - lastCycle > CYCLE_MS) {
    screen = (screen + 1) % pages;
    lastCycle = millis();
    dirty = true;
  }

  if (fetchNow || millis() - lastFetch > (haveData ? REFRESH_MS : 60000UL)) {
    fetchNow = false;
    render();
    connectWifi();
    if (WiFi.status() == WL_CONNECTED) fetchAll();
    lastFetch = millis();
    dirty = true;
  }

  // one missing thumbnail per pass so buttons stay responsive
  if (haveData && !dirty) {
    static uint32_t lastThumb = 0;
    if (millis() - lastThumb > 300 && fetchOneThumb()) {
      lastThumb = millis();
      dirty = true;
    }
  }

  static uint32_t lastDraw = 0;
  if (screenOn && (dirty || millis() - lastDraw > 1000)) {
    render();
    lastDraw = millis();
  }
  delay(20);
}
