// ═══════════════════════════════════════════════════════════
//  Organizer – Cloudflare Worker v2
//  Sync-Backend  +  Web Push (proaktive KI-Hinweise)
//
//  Bindings:   KV  (KV Namespace, Name: "KV")
//  Variables/Secrets:
//    SECRET              – beliebiger langer String (App-Auth)
//    VAPID_PUBLIC        – aus der Schlüssel-Generierung
//    VAPID_PRIVATE_JWK   – JWK-String (Secret!)
//    VAPID_SUBJECT       – z.B. mailto:du@example.com
//    GROQ_KEY            – optional, für KI-formulierte Hinweise
//
//  Cron Trigger:  */15 * * * *   (alle 15 Minuten)
// ═══════════════════════════════════════════════════════════

// Nur die eigene App-Domain darf per Browser zugreifen (Shortcuts sind davon unberührt)
const ALLOWED_ORIGIN = 'https://stevent3.github.io';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Secret',
};

export default {
  // ── HTTP ────────────────────────────────────────────────
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const secret = request.headers.get('X-Secret') || url.searchParams.get('s') || '';
    if (!env.SECRET || secret !== env.SECRET) return res({ error: 'Unauthorized' }, 401);

    if (path === '/ping') return res({ ok: true, ts: Date.now() });

    // ── Calendar ──
    if (path === '/calendar' && request.method === 'POST') {
      let body; try { body = await request.json(); } catch { body = {}; }
      const lines = typeof body === 'string' ? body : (body.text || '');
      const events = lines ? parseLines(lines)
                   : Array.isArray(body) ? body
                   : Array.isArray(body.events) ? body.events : [];
      await env.KV.put('calendar', JSON.stringify(events), { metadata: { updated: Date.now() } });
      return res({ ok: true, count: events.length });
    }
    if (path === '/calendar' && request.method === 'GET') {
      const { value, metadata } = await env.KV.getWithMetadata('calendar', 'json');
      return res({ events: value || [], meta: metadata });
    }

    // ── App state ──
    if (path === '/state' && request.method === 'POST') {
      let body; try { body = await request.json(); } catch { return res({ error: 'bad json' }, 400); }
      const safe = { ...body }; delete safe.groqKey;
      await env.KV.put('state', JSON.stringify(safe), { metadata: { updated: Date.now() } });
      return res({ ok: true });
    }
    if (path === '/state' && request.method === 'GET') {
      const { value, metadata } = await env.KV.getWithMetadata('state', 'json');
      return res({ state: value, meta: metadata });
    }

    // ── Push ──
    if (path === '/push/subscribe' && request.method === 'POST') {
      const sub = await request.json();
      if (!sub || !sub.endpoint) return res({ error: 'invalid subscription' }, 400);
      await env.KV.put('push_sub', JSON.stringify(sub));
      return res({ ok: true });
    }
    if (path === '/push/status' && request.method === 'GET') {
      const sub = await env.KV.get('push_sub');
      return res({ subscribed: !!sub });
    }
    if (path === '/push/unsubscribe' && request.method === 'POST') {
      await env.KV.delete('push_sub');
      return res({ ok: true });
    }
    if (path === '/push/test' && request.method === 'POST') {
      const sub = await env.KV.get('push_sub', 'json');
      if (!sub) return res({ error: 'no subscription' }, 404);
      const r = await sendPush(sub, {
        title: 'Organizer ✓',
        body: 'Push funktioniert! Du bekommst ab jetzt smarte Hinweise.',
        tag: 'test'
      }, env);
      return res({ ok: r.ok, status: r.status });
    }

    return res({ error: 'not found', path }, 404);
  },

  // ── CRON (proaktive Hinweise) ───────────────────────────
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runChecks(env));
  }
};

// ═══════════════════════════════════════════════════════════
//  Proaktive Logik
// ═══════════════════════════════════════════════════════════
async function runChecks(env) {
  const sub = await env.KV.get('push_sub', 'json');
  if (!sub) return;

  const rawCal = (await env.KV.get('calendar', 'json')) || [];
  const state = (await env.KV.get('state', 'json')) || {};
  const cal = applyOverrides(rawCal, state.calOverrides || {});
  const now = berlinNow();
  const today = now.date;

  // 1) Abfahrts-Erinnerung: nutzt echte Fahrzeit, sonst 30 Min Standard
  for (const ev of cal) {
    if (!ev.time) continue;
    const evMin = toMin(ev.time);
    const lead = ev.travel ? (ev.travel + 5) : 30;
    const departMin = evMin - lead;
    if (now.min >= departMin - 8 && now.min <= departMin + 7) {
      const key = `sent:dep:${today}:${ev.time}:${(ev.text||'').slice(0,20)}`;
      if (await env.KV.get(key)) continue;
      const where = ev.sub ? ` (${ev.sub})` : '';
      const body = ev.travel
        ? `${ev.text}${where} um ${ev.time}. Fahrt ~${ev.travel} Min – jetzt losgehen!`
        : `${ev.text}${where} startet um ${ev.time} – mach dich startklar.`;
      await sendPush(sub, { title: '🚶 Zeit loszugehen', body, tag: 'departure' }, env);
      await env.KV.put(key, '1', { expirationTtl: 6 * 3600 });
    }
  }

  // 2) Morgen-Briefing zwischen 06:00 und 06:25
  if (now.min >= 360 && now.min <= 385) {
    const key = `sent:brief:${today}`;
    if (!(await env.KV.get(key))) {
      const todays = cal.filter(e => e.time).sort((a, b) => a.time.localeCompare(b.time));
      const openTasks = ((state.tasks && state.tasks.today) || []).filter(t => !t.done);
      const body = await buildBriefing(todays, openTasks, env);
      await sendPush(sub, { title: '☀️ Dein Tag', body, tag: 'briefing' }, env);
      await env.KV.put(key, '1', { expirationTtl: 22 * 3600 });
    }
  }

  // 3) Smarte KI-Tipps: 10:00–10:25 und 14:30–14:55 – nur wenn wirklich nützlich
  const tipSlot = (now.min >= 600 && now.min <= 625) ? 'vormittag'
                : (now.min >= 870 && now.min <= 895) ? 'nachmittag' : null;
  if (tipSlot && env.GROQ_KEY) {
    const key = `sent:tip:${today}:${tipSlot}`;
    if (!(await env.KV.get(key))) {
      // Auch bei "kein Tipp" markieren – sonst fragt jeder Cron-Lauf erneut
      await env.KV.put(key, '1', { expirationTtl: 20 * 3600 });
      const tip = await buildSmartTip(cal, state, now, tipSlot, env);
      if (tip) await sendPush(sub, { title: tip.title || '💡 Tipp', body: tip.body, tag: 'tip' }, env);
    }
  }
}

// Overrides aus der App (verschobene/gelöschte/umbenannte Termine) anwenden
function applyOverrides(rawCal, overrides) {
  const out = [];
  for (const e of rawCal) {
    if (!e || !e.time) continue;
    const key = e.time + '|' + (e.text || '').toLowerCase();
    const o = overrides[key];
    if (o && o.deleted) continue;
    out.push({
      ...e,
      time: (o && o.time) || e.time,
      end: (o && o.end !== undefined) ? o.end : (e.end || ''),
      text: (o && o.text) || e.text,
      sub: (o && o.sub !== undefined) ? o.sub : (e.sub || '')
    });
  }
  return out;
}

// KI entscheidet selbst, OB ein Tipp sinnvoll ist – und pusht nur dann
async function buildSmartTip(cal, state, now, slot, env) {
  try {
    const evs = cal.filter(e => e.time).sort((a,b) => a.time.localeCompare(b.time));
    const evText = evs.length ? evs.map(e => e.time + (e.end ? '–' + e.end : '') + ' ' + e.text + (e.sub ? ' @' + e.sub : '')).join('; ') : 'keine Termine';
    const t = state.tasks || {};
    const open = l => ((t[l]) || []).filter(x => !x.done).map(x => x.text);
    const shopping = open('shopping'), todayT = open('today'), work = open('work');
    const energy = (state.energy && state.energy.label) || 'unbekannt';
    const hh = String(Math.floor(now.min/60)).padStart(2,'0'), mm = String(now.min%60).padStart(2,'0');

    // Ohne nennenswerte Daten gar nicht erst fragen
    if (!evs.length && !shopping.length && !todayT.length && !work.length) return null;

    const sys = 'Du bist der proaktive Assistent in Stevens Tagesorganizer. Prüfe, ob es JETZT einen wirklich nützlichen, konkreten Hinweis gibt – z.B. Erledigungen clever vorziehen wenn später viel ansteht, eine große freie Lücke sinnvoll nutzen, oder rechtzeitige Vorbereitung auf einen dichten Abschnitt. '+
      'Sei streng: Nur senden, wenn der Tipp konkret und zeitbezogen ist. Kein Motivations-Blabla, nichts Offensichtliches. '+
      'Antworte NUR mit JSON: {"send":true/false,"title":"max 25 Zeichen mit Emoji","body":"max 140 Zeichen, Deutsch, konkret"}';
    const usr = `Jetzt: ${hh}:${mm} (${slot}). Energie: ${energy}. Termine heute: ${evText}. Offene Aufgaben: ${todayT.join(', ') || 'keine'}. Einkaufsliste: ${shopping.join(', ') || 'leer'}. Arbeit/Thesis: ${work.join(', ') || 'keine'}.`;

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.GROQ_KEY },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
        max_tokens: 160, temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });
    if (!r.ok) return null;
    const d = await r.json();
    const parsed = JSON.parse(d.choices?.[0]?.message?.content || '{}');
    if (parsed && parsed.send && parsed.body) {
      return { title: String(parsed.title || '💡 Tipp').slice(0, 40), body: String(parsed.body).slice(0, 220) };
    }
  } catch (_) {}
  return null;
}

async function buildBriefing(events, openTasks, env) {
  const evText = events.length
    ? events.map(e => `${e.time} ${e.text}`).join(', ')
    : 'keine Termine';
  const taskText = openTasks.length
    ? openTasks.map(t => t.text).join(', ')
    : 'keine offenen Aufgaben';

  // Optional: KI-formulierte, wärmere Variante
  if (env.GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.GROQ_KEY },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Formuliere ein kurzes, freundliches Morgen-Briefing (max 2 Sätze, Deutsch) für Steven. Termine: ${evText}. Offene Aufgaben: ${taskText}. Kein Gruß-Overkill, konkret und motivierend.`
          }],
          max_tokens: 120, temperature: 0.7
        })
      });
      if (r.ok) {
        const d = await r.json();
        const msg = d.choices?.[0]?.message?.content?.trim();
        if (msg) return msg.slice(0, 300);
      }
    } catch (_) {}
  }
  return `Heute: ${evText}. Offen: ${taskText}.`;
}

// ═══════════════════════════════════════════════════════════
//  Web Push (RFC 8291 / 8188) – geprüfter Code
// ═══════════════════════════════════════════════════════════
async function sendPush(sub, payloadObj, env) {
  try {
    const endpoint = sub.endpoint;
    const audience = new URL(endpoint).origin;
    const jwt = await vapidJwt(audience, env.VAPID_SUBJECT || 'mailto:admin@example.com', JSON.parse(env.VAPID_PRIVATE_JWK));
    const body = await encryptPayload(JSON.stringify(payloadObj), sub.keys.p256dh, sub.keys.auth);
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'TTL': '86400',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'Urgency': 'high',
        'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`
      },
      body
    });
    // 410/404 = subscription expired → clean up
    if (r.status === 404 || r.status === 410) await env.KV.delete('push_sub');
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

const _enc = new TextEncoder();
function _b64urlToBytes(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; const bin=atob(s); const b=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i); return b; }
function _bytesToB64url(b){ let s=''; const a=new Uint8Array(b); for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function _concat(...arrs){ let len=0; for(const a of arrs)len+=a.length; const out=new Uint8Array(len); let o=0; for(const a of arrs){out.set(a,o);o+=a.length;} return out; }
async function _hmac(keyBytes,dataBytes){ const k=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-256'},false,['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC',k,dataBytes)); }
async function _hkdf(salt,ikm,info,length){ const prk=await _hmac(salt,ikm); const t=await _hmac(prk,_concat(info,new Uint8Array([1]))); return t.slice(0,length); }

async function encryptPayload(payloadStr, p256dhB64, authB64) {
  const uaPublic = _b64urlToBytes(p256dhB64);
  const authSecret = _b64urlToBytes(authB64);
  const plaintext = _enc.encode(payloadStr);
  const asKeys = await crypto.subtle.generateKey({ name:'ECDH', namedCurve:'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name:'ECDH', namedCurve:'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name:'ECDH', public:uaKey }, asKeys.privateKey, 256));
  const keyInfo = _concat(_enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await _hkdf(authSecret, ecdh, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await _hkdf(salt, ikm, _enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await _hkdf(salt, ikm, _enc.encode('Content-Encoding: nonce\0'), 12);
  const padded = _concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name:'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv:nonce, tagLength:128 }, aesKey, padded));
  const rs = new Uint8Array([0,0,0x10,0x00]);
  const header = _concat(salt, rs, new Uint8Array([asPublic.length]), asPublic);
  return _concat(header, ct);
}

async function vapidJwt(audience, subject, jwkPrivate) {
  const header = _bytesToB64url(_enc.encode(JSON.stringify({ typ:'JWT', alg:'ES256' })));
  const exp = Math.floor(Date.now()/1000) + 12*3600;
  const payload = _bytesToB64url(_enc.encode(JSON.stringify({ aud:audience, exp, sub:subject })));
  const signingInput = header + '.' + payload;
  const key = await crypto.subtle.importKey('jwk', jwkPrivate, { name:'ECDSA', namedCurve:'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name:'ECDSA', hash:'SHA-256' }, key, _enc.encode(signingInput)));
  return signingInput + '.' + _bytesToB64url(sig);
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════
function res(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); }
function berlinNow() {
  const fmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', year:'numeric', month:'2-digit', day:'2-digit', hour12:false });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return { min: (+parts.hour)*60 + (+parts.minute), date: `${parts.year}-${parts.month}-${parts.day}` };
}
function parseLines(text) {
  const seen = new Set(); const out = [];
  for (let line of (text || '').split(/\r?\n+/)) {
    line = line.trim(); if (!line) continue;
    let time = '', end = '', t = 'Termin', sub = '', travel = 0;
    if (line.includes('|')) {
      const p = line.split('|').map(s => s.trim());
      time = (p[0] || '').slice(0, 5);
      let idx = 1;
      if (/^\d{1,2}:\d{2}/.test(p[1] || '')) { end = p[1].slice(0, 5); idx = 2; }
      t = p[idx] || 'Termin'; sub = p[idx + 1] || '';
      const tm = (p[idx + 2] || '').match(/\d+/);
      travel = tm ? parseInt(tm[0], 10) : 0;
    } else {
      const m = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/); if (!m) continue;
      time = m[1]; t = m[2];
    }
    if (!time) continue;
    const key = time + '|' + end + '|' + t.toLowerCase();
    if (seen.has(key)) continue; seen.add(key);
    out.push({ time, end, text: t, sub, travel });
  }
  return out;
}
