# Organizer — Projektübergabe & Arbeitsanweisung

> **SETUP-STATUS (09.09.2026, Windows 11):** Wrangler-Setup ist ABGESCHLOSSEN — `wrangler.toml` liegt im Repo (KV-Namespace `2f8eb11cc97f48a9a64ef75b35474126`, Cron, Vars). Der Worker wurde per `wrangler deploy` ausgeliefert (Version `fd3ea3a9`) und verifiziert: `/ping`, `/calendar`, `/state`, `/push/status` liefern die bestehenden Live-Daten, CORS und 401 ohne Secret intakt. Secrets SECRET, VAPID_PRIVATE_JWK, GROQ_KEY sind im Worker gesetzt (07.09.2026) und bleiben bei `wrangler deploy` erhalten.
>
> **Cloud-Sitzung (10.09.2026, dritter Anlauf): Worker-Deploy aus der Cloud FUNKTIONIERT.** Steven hat die Netzwerk-Policy der Umgebung angepasst; `api.cloudflare.com`, `organizer.steven-ec0.workers.dev`, `api.open-meteo.com` und `api.groq.com` sind erreichbar. Ablauf: `npm install -g wrangler` (4.130), `wrangler whoami` (Token aus `CLOUDFLARE_API_TOKEN`, Account „Steven@tenyenhuis.de's Account“), `node --check worker.js`, `wrangler deploy --dry-run`, `wrangler deploy` im Repo-Root. Deployt am 10.09.2026: Version `75cb2d12` (Abend-Review-Push 21:00, Wetter im Morgen-Briefing), danach **Version `995b1356`** (Zeilenformat mit Datum, Cron nur heute). Verifiziert: KV-Keys `state`, `calendar`, `push_sub` unverändert vorhanden (`wrangler kv key list --remote --namespace-id=2f8eb11cc97f48a9a64ef75b35474126`), Secrets `SECRET`, `VAPID_PRIVATE_JWK`, `GROQ_KEY` erhalten (`wrangler secret list`), `/ping` ohne Secret = 401. Der Wert von `SECRET` liegt NICHT in der Cloud-Umgebung (Wrangler zeigt nur Namen) – `POST /push/test` also von Steven oder mit `ORGANIZER_SECRET` als Umgebungsvariable ausführen. Vor jedem Cloud-Deploy kurz prüfen: `curl -o /dev/null -w "%{http_code}" https://api.cloudflare.com/` muss 301 liefern (403 = Netzwerk-Policy).
>
> ⚠️ **Windows-Eigenheiten (dieser Rechner):**
> - Das Repo liegt unter `C:\Users\steve\Projekte\organizer`. Die Kopie unter `C:\Program Files (x86)\Projekte\organizer` ist für den Benutzer schreibgeschützt (kein Commit möglich) und kann gelöscht werden.
> - `wrangler login` hat das OAuth-Token nach `%APPDATA%\xdg.config\.wrangler\config\default.toml` geschrieben. Sobald ein Ordner `C:\Users\steve\.wrangler` existiert (Wrangler legt ihn für Logs/Cache selbst an), bevorzugt Wrangler diesen und meldet "not authenticated". Workaround in Git Bash: `USERPROFILE='C:\Users\steve\AppData\Roaming\xdg.config' wrangler …` — dauerhaft: `C:\Users\steve\.wrangler` löschen (enthält nur Logs/Cache) oder `default.toml` nach `C:\Users\steve\.wrangler\config\` kopieren.
> - `wrangler kv key list/get` liest in Wrangler 4 standardmäßig den LOKALEN Speicher (leer!). Für Live-Daten immer `--remote` anhängen.
> - Die Meldung `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` am Ende von Wrangler-Befehlen ist kosmetisch (libuv/Windows).
>
> **Mac-Eigenheit (MacBook Air Intel, 07.09.2026):** Nodes Zertifikatssuche war defekt — gelöst via `export SSL_CERT_FILE=/etc/ssl/cert.pem` in `~/.zshrc`. Falls je ein Node/npm-Befehl mit `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` scheitert: diese Variable fehlt in der Shell-Umgebung.
>
> **Deploy-Workflow ab jetzt:** Frontend = `git push` (GitHub Pages; Repo heißt jetzt `Stevent3/organizer`); Worker = `wrangler deploy`; Secrets = `wrangler secret put NAME`; Rollback = `wrangler rollback`.
>
> **Push-Test (09.09.2026):** bestanden. Das Token in der App war veraltet, neu eingetragen, Sync läuft wieder.
>
> **v8 IST DIE HAUPT-APP (Umzug 10.09.2026, Stevens Entscheidung):** Die neue App in `app/` (Vite + React + TypeScript + Tailwind v4 + vitest) läuft auf `https://stevent3.github.io/organizer/`. v7 liegt als Rückfallebene unverändert in `legacy/` (deployt unter `/organizer/legacy/`), `/organizer/next/` leitet auf die Hauptadresse um. Der Service Worker ist `app/src/sw.ts` (Workbox + Push-Handler aus v7). Plan und Stand: `tasks/todo.md`. Lokal: `cd app && npm run dev` (läuft unter `http://localhost:5173/organizer/`), Tests `npm test -- --run`. Sync gegen den Live-Worker lokal nur über den Dev-Proxy: `ORGANIZER_SECRET=<SECRET> npm run dev`, dann in der App Worker-URL `http://localhost:5173/__worker` und ein beliebiges Token (CORS des Workers lässt nur die Pages-Origin zu). Jede Auslieferung: `APP_VERSION` in `app/src/lib/version.ts` hochzählen. Groq-Modell seit 10.09.2026: `openai/gpt-oss-120b` (llama-3.3-70b wurde am 16.08.2026 abgeschaltet), in App und Worker.
>
> **Cloud-Sitzungen (claude.ai/code, Handy):** Das Repo enthält alles Nötige. Frontend-Deploy = `git push`. Worker-Deploy braucht dort `CLOUDFLARE_API_TOKEN` (Vorlage „Edit Cloudflare Workers“) als Umgebungsvariable UND eine Netzwerk-Policy, die `api.cloudflare.com` zulässt (seit 10.09.2026 eingerichtet, siehe Cloud-Sitzung oben), dann `wrangler deploy` im Repo-Root. Für `POST /push/test` aus der Cloud zusätzlich `ORGANIZER_SECRET` als Umgebungsvariable setzen.
>
> ⚠️ Bash-Tool auf diesem Rechner: Heredocs mit Template-Literalen oder vielen Anführungszeichen scheitern sporadisch mit „unexpected EOF". Solche Dateien mit dem Write-Tool anlegen.

> Diese Datei ist die vollständige Übergabe aus der bisherigen Entwicklung (Claude Chat, Juni–Juli 2026).
> Sie ist Kontext UND Arbeitsanweisung für Claude Code. Lies sie vollständig, bevor du Änderungen machst.
> Geheimnisse (Secrets, Keys) stehen NICHT hier, sondern in `SECRETS.local.md` (nie committen! Repo ist öffentlich).

---

## 1. Was ist das Projekt?

Ein **persönlicher, KI-gesteuerter Tagesorganizer** für Steven — als PWA auf dem iPhone, komplett kostenlos betrieben (GitHub Pages + Cloudflare Free + Groq Free). Die Vision: eine KI, die **maximalen Einfluss auf alles in der App** hat — sie plant den Tag, verwaltet Aufgaben/Einkäufe/Termine, gibt proaktive Push-Empfehlungen und wächst Richtung "Personal AI OS" (Fremd-App-Anbindung, Experten-Rollen, Smarthome).

**Sprache: Alles auf Deutsch** (UI, Kommentare können deutsch/englisch gemischt sein, Kommunikation mit Steven auf Deutsch).

## 2. WICHTIG: Warum dieser Neustart? (Nutzer-Feedback zum Ist-Stand)

Steven nutzt die v7 aktuell **nicht**, weil:
1. **Zu wenig Features** — v7 fühlt sich unfertig an
2. **Nicht übersichtlich** — Informationsarchitektur/Navigation überzeugen nicht
3. **Zu wenig Kalender** — nur eine Tagesansicht; es fehlen Woche/Monat, Mehrtages-Termine, bessere Termin-Verwaltung
4. **Sieht nicht gut aus** — der handgebaute iOS-Look reicht ihm nicht (mehr Polish, echtes Design-System)

Das ist der Auftrag: **überarbeiten/neu bauen mit deutlich besserem Design, vollwertigem Kalender und mehr Features** — auf Basis der funktionierenden Infrastruktur (Worker, Push, Shortcuts laufen und sind wertvoll!).

## 3. Live-System (funktioniert, nicht kaputt machen)

| Komponente | Wo | Details |
|---|---|---|
| Frontend (PWA) | GitHub Pages, Repo `stevent3/organizer` (öffentlich!) | https://stevent3.github.io/organizer/ — eine `index.html` (~1500 Zeilen Vanilla JS), `sw.js`, `manifest.json`, 4 Icons |
| Backend | Cloudflare Worker "organizer" | https://organizer.steven-ec0.workers.dev — `worker.js`, KV-Namespace gebunden als `KV`, Cron `*/15 * * * *` |
| KI | Groq API | Modell `llama-3.3-70b-versatile`, Key liegt NUR im localStorage des iPhones + als Worker-Secret |
| Kalender-Zulieferung | Apple Shortcut auf Stevens iPhone | Läuft täglich als Automation, POSTet Termine an den Worker |
| Push | Web Push (RFC 8291/8188) an Apples Push-Server | Funktioniert nur in der installierten Homescreen-PWA; VAPID-Keys siehe SECRETS.local.md |

**Deployment bisher (manuell):** index.html/sw.js im GitHub-Web-UI hochladen (überschreiben); worker.js in den Cloudflare-Editor pasten → Deploy. Steven prüft Deploys an der sichtbaren Version im Module-Tab (aktuell "Organizer v7") — **dieses Muster beibehalten: jede Auslieferung zählt APP_VERSION und den SW-Cache-Namen hoch.**

## 4. Architektur & Datenflüsse (Ist)

```
Apple Kalender ──Shortcut (täglich)──► POST /calendar ──► Worker/KV ("calendar")
App (PWA) ◄──GET /calendar, GET /state── Worker/KV
App ──POST /state (debounced 3s nach jeder Änderung)──► Worker/KV ("state")
App ◄──direkt──► Groq (Chat + Tool-Calling, Tagesplan-JSON, Essensplan-JSON)
Worker-Cron (15 Min) ──► liest KV, merged calOverrides ──► Web Push (verschlüsselt+VAPID) ──► Lockscreen
App-URL-Schema: index.html?action=add-task|add-shopping|import-calendar|ask|add-event|set-energy&...
```

**Auth:** Ein gemeinsames Secret. App sendet Header `X-Secret`; Worker akzeptiert auch `?s=` (Legacy — im Shortcut auf Header umgestellt). CORS ist auf `https://stevent3.github.io` festgenagelt.

**Konfliktschutz Sync:** `state.updatedAt` (ms). Pull übernimmt Remote nur, wenn `remote.updatedAt > local.updatedAt`. Ohne diesen Guard gab es Datenverlust (Lesson #2).

## 5. Worker-API-Referenz

Alle Routen erfordern Secret (Header `X-Secret` oder `?s=`). JSON rein/raus.

- `GET /ping` → `{ok,ts}`
- `POST /calendar` → Body `{text:"zeilen..."}` ODER `{events:[...]}`; parst Zeilenformat (s.u.), **dedupliziert** (key: `date|time|end|text`), speichert KV `calendar` (mehrere Tage möglich). → `{ok,count}`
- `GET /calendar` → `{events:[{date?,time,end,text,sub,travel}],meta}` — `date` (YYYY-MM-DD) fehlt bei Zeilen ohne Datum (= heute)
- `POST /state` → speichert kompletten App-State (ohne groqKey) in KV `state`
- `GET /state` → `{state,meta}`
- `POST /push/subscribe` → speichert PushSubscription-JSON in KV `push_sub`
- `GET /push/status` → `{subscribed}`
- `POST /push/unsubscribe`, `POST /push/test`
- **Cron `scheduled()`** → `runChecks()`: (1) Abfahrts-Push (lead = travel+5 min, sonst 30; Fenster ±8/±7 min um departMin; Dedup-Key in KV mit TTL), (2) Morgen-Briefing 06:00–06:25 (optional Groq-formuliert), (3) Smart-Tipps 10:00–10:25 & 14:30–14:55 (Groq entscheidet `{send,title,body}`; auch "kein Tipp" wird als gesendet markiert, max 2/Tag). Vor allen Checks: `calendarForDay(applyOverrides(rawCal, state.calOverrides), today)` — Termin-Verschiebungen/-Löschungen aus der App gelten auch für Push, und nur heutige Termine zählen (Zeilen mit anderem Datum werden ignoriert).

**Kalender-Zeilenformat (Shortcut→Worker), seit 10.09.2026 mit Datum:** `DD.MM.YYYY | HH:MM | HH:MM | Titel | Ort | Fahrzeit` — Feld 1 (Datum, auch `YYYY-MM-DD`; fehlt es, gilt die Zeile als heute = altes Format), Ende, Ort und Fahrzeit (erste Ganzzahl wird geparst, z.B. "23 Min.") sind optional. Override-Key: `date|time|text` bei Zeilen mit Datum, sonst `time|text` (App `calKey` und Worker `calKey` identisch halten!). Rezept für den 14-Tage-Kurzbefehl steht in der App unter Mehr → Kurzbefehle. Fahrzeit-Feature ist gebaut, aber Stevens Shortcut nutzt aktuell 4 Felder (Apple "Wegzeit"-Aktion warf kCLErrorDomain 8 bei nicht geokodierbaren Orten → Wenn-Block wieder entfernt).

## 6. App-Datenmodell (localStorage `organizer_v3`, gespiegelt in KV `state`)

```js
state = {
  updatedAt,                    // ms, Sync-Guard
  energy: {level:'low|good|top', label, pct},
  tasks: {today:[], shopping:[], work:[], health:[]},   // {id,text,done,tag}
  schedule: [...],              // manuelle Termine {id,time,end,text,sub,color,source:'manual'}
  calendarEvents: [...],        // aus Worker {id,key,origTime,time,end,text,sub,travel,color:'ev-cal',source:'calendar'}
  calOverrides: {},             // key `${origTime}|${origText.toLowerCase()}` → {time?,end?,text?,sub?,deleted?}
                                // = lokale Änderungen an Apple-Terminen, überleben jeden Sync
  dayPlan: {generatedAt,date,summary,blocks:[{time,end,title,type,note}]},  // KI-Tagesplan
  shopHistory: {basename:{n,ts}},          // Kaufverlauf für Empfehlungen
  foodProfile: {diet,allergies,dislikes,cuisines,people,time,breakfast,prep,extra,updatedAt},
  mealPlan: {createdAt, days:[{tag,fruehstueck:{name,zutaten[]},mittag,abend}]},
  plannerMode, activeList, lastCalendarSync, chatHistory (nur in-memory)
}
```

Groq-Key + Worker-URL + Worker-Secret liegen separat im localStorage (nicht im state, werden nie gesynct).

## 7. Web Push — Krypto-Details (verifiziert, ROUND-TRIP-GETESTET)

- Verschlüsselung RFC 8291/8188 (aes128gcm): ECDH P-256 ephemeral × p256dh der Subscription, HKDF mit auth-Secret (`"WebPush: info\0"+ua+as`), Salt 16B, CEK 16B, Nonce 12B, Padding-Delimiter 0x02, Body = salt|rs(4096)|idlen|asPublic|ct.
- VAPID: ES256-JWT `{aud:origin(endpoint), exp:+12h, sub:mailto}`, Header `Authorization: vapid t=<jwt>, k=<VAPID_PUBLIC>`, `TTL:86400`, `Content-Encoding:aes128gcm`, `Urgency:high`.
- 404/410 vom Push-Server → Subscription aus KV löschen.
- Der Code dafür steht selfcontained in worker.js (Funktionen `encryptPayload`, `vapidJwt`, `sendPush`) — **funktioniert, nicht neu erfinden, bei Portierung 1:1 übernehmen.**
- Cloudflare-Editor zeigt TypeScript-Warnungen zu CryptoKey — kosmetisch, ignorieren.
- iOS: Push NUR in Homescreen-PWA; Permission-Prompt braucht User-Geste.

## 8. Feature-Inventar v7 (was existiert und funktioniert)

- **Heute:** Fokus-Karte "Jetzt dran", Energie-Frage (3 Buttons, fließt in alle KI-Prompts), Apple-Kalender-artige Tages-Timeline (scrollbares 360px-Fenster, Stundenraster, proportionale Blöcke, Überlappungs-Spalten, Jetzt-Linie, Tap auf Lücke = neuer Termin mit Uhrzeit, **halten+ziehen = verschieben** im 15-Min-Raster, Tap = Sheet mit Start/Ende/Titel/Notiz/Löschen — auch für Apple-Termine via calOverrides)
- **Aufgaben:** 4 Listen; Einkaufsliste im **Bring-Stil** (Kachel-Grid, ~120-Artikel-Katalog mit Emoji+10 Kategorien, Korb, "Einkauf abschließen"→Verlauf, Empfehlungszeile aus Verlauf+Essensplan)
- **KI-Chat:** Groq mit vollem Personen-/Tageskontext + **Tool-Calling** (add_task, add_shopping_item, add_calendar_event, complete_task, set_energy; 2-Step-Flow, UI aktualisiert live)
- **Planer-Tab:** Segment 🗺 Tag (KI-Tagesplan als Timeline-Blöcke) | 🍽 Essen (**Ernährungscoach**: 9-Fragen-Interview mit Chips, Profil, 7-Tage-Plan F/M/A per Groq-JSON, pro Gericht: neu würfeln/bearbeiten/Zutaten→Liste, Wochen-Übertrag dedupliziert)
- **Module:** Groq-Key, Cloud-Sync (URL+Token), Push aktivieren/testen, Shortcut-URLs+Rezepte, Export/Import, sichtbare Versionsnummer
- **Worker-Push:** Abfahrt (mit echter Fahrzeit falls vorhanden), Morgen-Briefing 6:00, Smart-Tipps 2×/Tag

## 9. Bekannte Probleme / technische Schulden

- Kalender ist **nur heute** — keine Woche/Monat, keine Datumsnavigation, keine Mehrtages-/Serientermine (Hauptkritik!)
- 1500-Zeilen-Einzeldatei: kein Framework, keine Komponenten, keine echten Tests (nur node --check + ad-hoc-Logiktests in Node)
- Worker und App verstehen seit 10.09.2026 Zeilen mit Datum (14-Tage-Kurzbefehl, Rezept unter Mehr → Kurzbefehle); Steven muss den Kurzbefehl auf dem iPhone noch umstellen (bis dahin liefert er nur heute, das funktioniert weiter). `legacy/` (v7) zeigt alle Zeilen als heute – bewusst unverändert
- Fahrzeit-Feature ungenutzt (Apple-Geocoding-Fehler), Konzept siehe §5
- Kein Rate-Limit am Worker (Secret ist stark, akzeptiert)
- KV-Daten unverschlüsselt (bewusst akzeptiert)
- iOS-PWA-Update-Trägheit: Force-Quit nötig; deshalb Versions-Marker

## 10. Lessons Learned (aus tasks/lessons.md — beachten!)

1. App-Helfer heißt `timeToMin`, Worker `toMin` — bei Code-Transfer Definitionen prüfen (Kalender war deshalb mal komplett weg)
2. Sync bidirektional denken: Wer schreibt wann, wer liest wann, Konflikt? → updatedAt-Guard
3. Jede Datenebene (calOverrides) überall anwenden, wo entschieden wird (auch im Cron!)
4. Override-Struktur = ALLE editierbaren Felder
5. touch-action:none frisst Scrollen → Long-Press-Drag-Muster
6. Jeder Deploy: APP_VERSION + SW-Cache hochzählen, sichtbar prüfen

## 11. Anforderungen an die nächste Version (aus allen Gesprächen gesammelt)

**Must (Stevens Kritik):**
- Vollwertiger Kalender: Tag/Woche/Monat, Datumsnavigation, Termine über mehrere Tage, schöne Terminverwaltung
- Deutlich besseres visuelles Design (Design-System, Animationen, hochwertiger Look)
- Bessere Übersichtlichkeit/IA (weniger verschachtelt, klarere Startseite)
- Mehr Features gesamt (siehe Backlog)

**Bestätigte Vision (Steven wörtlich):** KI mit so viel Einfluss wie möglich auf ALLES; Verbindungen zu Fremd-Apps (PayPal etc.) — wo APIs nicht gehen: Guides + App per Knopfdruck öffnen (Deep-Links); "Experten"-Rollen in der KI (z.B. Optimierer, der App-Verbesserungen vorschlägt; "Programmierer"-Rolle, die Code-Änderungen NUR nach Stevens Bestätigung macht — in Claude Code jetzt real umsetzbar!)

**Backlog (besprochen & für gut befunden):**
- Abend-Review-Push 21:00 ("3/5 geschafft — Rest auf morgen?")
- "Plan übernehmen": KI-Tagesplan als echte Termine in den Kalender
- Natural-Language-Quick-Add + Inbox (KI sortiert)
- Wetter im Morgen-Briefing (Open-Meteo, gratis)
- `open_app`/`run_scene`-Tool: Deep-Links (paypal://, spotify:, shortcuts://run-shortcut?name=X → HomeKit-Szenen!)
- Interaktive Notifications (Action-Buttons)
- Mail-Assistent (größer, später)
- Smarthome Stufe 2: Home Assistant REST-API via Worker (falls Steven Hardware anschafft)
- Wunsch-Sammler in der App (füttert Entwicklungs-Sessions)

## 12. Arbeitsweise mit Steven

- Deutsch, per Du, direkt und ehrlich; er mag Momentum ("lets go") und lässt gern entscheiden — aber bei UX-Weichenstellungen kurz nachfragen
- Workflow-Präferenzen: Plan zuerst (tasks/todo.md), bei nicht-trivialen Sachen kurz verifizieren lassen, dann autonom bauen; **jede Änderung vor Übergabe verifizieren** (Syntax + Logiktests — jetzt bitte echte Tests, z.B. vitest); nach Korrekturen tasks/lessons.md pflegen; Root-Cause statt Quickfix; minimale, elegante Änderungen
- Budget: alles muss kostenlos bleiben (Free Tiers)
- Er testet auf dem iPhone per Screenshots; Deploy-Hürden klein halten

## 13. Empfehlung für den Start in Claude Code

1. `git clone https://github.com/stevent3/organizer` — das deployte Repo ist die Wahrheit; diese Übergabe-Dateien danebenlegen, `SECRETS.local.md` in `.gitignore`!
2. **Tooling aufsetzen:** `wrangler` (Cloudflare CLI) für Worker-Deploys statt Copy-Paste (`wrangler deploy`, Secrets via `wrangler secret put`); Pages-Deploy per git push
3. **Framework-Entscheidung mit Steven:** Empfehlung Vite + React (oder Svelte) + Tailwind für das Redesign — Komponenten machen Kalenderansichten und das Design-Upgrade erst handhabbar. Alternative: Vanilla behalten und modularisieren. Kurz abstimmen.
4. **Migrationspfad:** v7 bleibt live, bis der Nachbau Feature-Parität + neuen Kalender hat (localStorage-Key und Worker-API kompatibel halten oder Migrationscode schreiben — `organizer_v3`-State importieren!)
5. Push-Krypto und Worker-Logik 1:1 übernehmen (§7) — bewiesen korrekt
6. Erster Meilenstein-Vorschlag: neues Design-System + Kalender Tag/Woche/Monat mit den bestehenden Datenquellen; danach Backlog §11

---
*Übergabe erstellt Juli 2026. Vollständige Chat-Historie der Entwicklung existiert im Claude-Projekt "Organizer".*
