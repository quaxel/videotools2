#!/usr/bin/env node
// Voice style arithmetic for Supertonic 3: out = sum(w_i * style_i), per tensor.
//   node tts/araclar/stilkaristir.js <cikti.json> "A.json:w,B.json:w,..." [ttl|dp|both]
// ttl (1x50x256) carries timbre and intonation, dp (1x8x16) the duration predictor (tempo). With ttl or dp only,
// the other tensor is copied from the first style in the list.
// Example (war cry style used for the savas_* voices: 15% preset + 85% scream clone, timbre only):
//   node tts/araclar/stilkaristir.js tts/model/voice_styles/savas_M3.json \
//     "tts/model/voice_styles/M3.json:0.15,tts/araclar/ciglik_klonu.json:0.85" ttl
const fs = require('fs');
const [out, spec, which = 'both'] = process.argv.slice(2);
if (!out || !spec) {
  console.error('kullanım: stilkaristir.js <cikti.json> "A.json:agirlik,B.json:agirlik,..." [ttl|dp|both]');
  process.exit(1);
}
const parts = spec.split(',').map(s => { const i = s.lastIndexOf(':'); return [JSON.parse(fs.readFileSync(s.slice(0, i))), +s.slice(i + 1)]; });
const flat = a => (Array.isArray(a) ? a.flat(Infinity) : a);
const shape = (f, dims) => { const [, r, c] = dims; const o = []; for (let i = 0; i < r; i++) o.push(f.slice(i * c, (i + 1) * c)); return [o]; };
const res = JSON.parse(JSON.stringify(parts[0][0]));
for (const key of ['style_ttl', 'style_dp']) {
  if (which !== 'both' && !key.endsWith(which)) continue;
  const n = flat(parts[0][0][key].data).length, acc = new Float64Array(n);
  for (const [st, w] of parts) { const f = flat(st[key].data); for (let i = 0; i < n; i++) acc[i] += w * f[i]; }
  res[key].data = shape(Array.from(acc, v => Math.fround(v)), res[key].dims);
}
res.metadata = { mix: spec, which };
fs.writeFileSync(out, JSON.stringify(res));
