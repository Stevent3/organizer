# Organizer v8 – Redesign (Start 10.09.2026)

Entscheidung mit Steven (09.09.2026): Redesign mit **Vite + React + TypeScript + Tailwind**, v7 bleibt live bis Feature-Parität.
Neue App liegt in `app/`, wird nach `https://stevent3.github.io/organizer/next/` deployt (parallel zur v7 im Root).
Worker-API + Datenmodell bleiben kompatibel (Sync mit updatedAt-Guard, calOverrides, `organizer_v3`-Import).

## M0 – Tooling & Deploy-Pipeline
- [x] `app/` Scaffold: Vite + React + TS + Tailwind v4 + vitest, PWA-Manifest/SW mit eigenem Scope `/organizer/next/`
- [x] GitHub-Actions-Workflow: baut `app/`, legt Root-v7-Dateien + `next/` zusammen, deployt Pages
- [x] Steven: Repo → Settings → Pages → Source auf „GitHub Actions" stellen (einmalig)
- [x] Sichtbare Versionsnummer (APP_VERSION) + Build-Zeit in der neuen App
- [x] Verifikation: `/organizer/` weiter v7, `/organizer/next/` neue App

## M1 – Design-System & App-Shell
- [x] Tokens: Farben (Light/Dark, iOS-nah aber eigenständig), Typo, Radius, Schatten, Motion
- [x] Shell: Bottom-Tabs **Heute · Kalender · Aufgaben · KI · Mehr**, Safe-Areas, Sheets/Modals, Toasts
- [x] Basis-Komponenten: Card, ListRow, Button, Chip, Segmented, Sheet, Input, EmptyState
- [x] Startseite „Heute": Kopf mit Datum/Energie, „Jetzt dran", Terminliste, offene Aufgaben mit Schnell-Eingabe

## M2 – Kalender (Hauptkritik)
- [x] Datenmodell mit Datum: `events[{id,date,endDate?,time?,end?,allDay,text,sub,color,source,key?}]`
- [x] Migration: v7 `schedule` (nur Uhrzeit) → heutiges Datum; `calendarEvents` + `calOverrides` weiter nutzbar
- [x] Ansichten: **Tag** (Timeline; Drag im 15-Min-Raster noch offen), **Woche** (7 Spalten, Mehrtages-Balken oben), **Monat** (Grid mit Punkten/Balken, Tap → Tag)
- [x] Datumsnavigation: Swipe/Chevrons, „Heute"-Button, Datepicker
- [x] Termin-Editor-Sheet: Titel, Ganztägig, Start/Ende (Datum+Zeit), Mehrtägig, Notiz, Ort, Farbe, Löschen; Apple-Termine via calOverrides
- [x] Worker: Zeilenformat um Datum erweitern (`DD.MM.YYYY | HH:MM | HH:MM | Titel | Ort | Fahrzeit`), Kalender-Key mit Datum; Shortcut-Guide „Zeitraum 14 Tage" → M10

## M3 – Sync, Migration, Einstellungen
Koexistenz-Regel: v8 pusht v8-Felder + v7-kompatible `schedule`/`calendarEvents` (heute) + durchgereichte Extras (dayPlan, mealPlan, …); v7-Stände werden in v8 nur für heute neu aufgebaut, andere Tage bleiben. Schreib-Sync ist per Schalter aus, bis v8 Hauptgerät ist.
- [x] Store (zustand + persist), Sync-Engine: Pull/Push mit updatedAt-Guard, Debounce 3 s
- [x] Import `organizer_v3` aus localStorage (automatisch beim ersten Start, manuell unter Mehr) + JSON-Import/Export
- [x] Einstellungen: Worker-URL/Token (mit v7 geteilt, gleiche localStorage-Keys), Groq-Key; Push nur Status (Umzug in M5)
- [x] Tests (vitest): Migration, Overrides, Sync-Merge, Wire-Format, Kalender-Layout (Überlappung, Mehrtag), Store
- [ ] Offline-Fall: Fehlerzustand freundlich, Retry beim Sichtbarwerden (Basis vorhanden)

## M4 – Feature-Parität
- [x] Aufgaben: 4 Listen (umbenennen, verschieben, löschen, aufräumen), Bring-Einkaufsliste (Katalog-Vorschläge, Kacheln nach Kategorie, Korb, Verlauf, Empfehlungen aus Essensplan + Verlauf)
- [x] KI-Chat als schwebende Sprechblase + Vollbild-Chat, Tool-Calling (Aufgaben, Einkauf, Termine mit Datum/mehrtägig, Termin löschen, abhaken, Energie); open_app folgt
- [x] Planer (M6): KI-Tagesplan („Plan übernehmen" → echte Termine), Essensplaner
- [x] Energie als Pillen-Zeile, Fokus-Karte, Kalender-Widget mit Vollbild-Overlay (Steven-Feedback 10.09.); Shortcut-URLs offen

## M5 – Cutover (10.09.2026, Steven: „direkt umziehen, ich benutze die alte eh nicht")
- [x] v7 nach `legacy/`, neue App auf `/organizer/` (Base geändert), `/next/` leitet um, SW (injectManifest) löscht alte organizer-v*-Caches
- [x] Schreib-Sync standardmäßig an, Push aktivieren/testen/ausschalten unter Mehr (VAPID-Public-Key in `lib/push.ts`)
- [x] APP_VERSION v8.0.0-beta.1
- [ ] Steven-Test auf dem iPhone (beta.2: Planer-Tab – Tagesplan, „Plan übernehmen", Essens-Interview, Wochenplan, Gericht-Sheet): alte Homescreen-App öffnen (lädt jetzt v8 mit den v7-Daten), Push einmal neu aktivieren

## Offene Punkte aus Stevens Feedback (10.09.2026)
- [x] Einkaufsliste wie Bring: Empfehlungen, zuletzt gekauft, Mengen (Stk./kg/…) per Langdruck oder Eingabe „2 kg Kartoffeln"
- [x] KI: Groq-Modellwechsel (gpt-oss-120b) + echte Fehlermeldung
- [x] Dashboard: To-dos direkt sichtbar (vor dem Kalender), Kalender-Widget mit Monatsraster + nächsten 7 Tagen
- [x] Kalender-Overlay schließt animiert nach unten, folgt beim Ziehen dem Finger
- [x] Planer (KI-Tagesplan „Plan übernehmen", Essensplaner) → M6
- [x] Shortcut-URLs (M7), Worker-Kalenderformat mit Datum (M10)

## M6 – Planer-Tab (10.09.2026, Cloud-Sitzung)
Fünfter Tab **Planer** (Heute · Kalender · To-dos · Planer · Mehr) mit Segment 🗺 Tag | 🍽 Essen, wie v7.
Datenhaltung: `dayPlan`, `mealPlan`, `foodProfile` bleiben in `state.extra` (v7-kompatibel: liegen top-level im KV-State, Cron/Legacy lesen sie weiter); typisierte Zugriffe + Validierung in `lib/planner.ts`, Schreiben über neue Store-Aktion `setExtra` (zählt updatedAt hoch → Sync).
- [x] `lib/ai.ts`: Groq-Aufruf um JSON-Modus (`response_format`) + Fehlertext-Helfer erweitern, gemeinsam für Chat, Tagesplan, Essensplan
- [x] `lib/planner.ts`: Typen (DayPlan, MealPlan, FoodProfile), Prompts aus v7 1:1, JSON-Parser (robust gegen Text drumherum), `planToEvents()` (Plan → Termine, feste Termine überspringen, idempotent), Zutaten-Dedup für die Einkaufsliste
- [x] Store: `setExtra(patch)`
- [x] `screens/PlannerScreen.tsx`: Tagesplan (Timeline-Blöcke nach Typ gefärbt, „Plan erstellen"/„Neu planen", **„Plan übernehmen"** → echte Termine mit Bestätigung, „Übernommen"-Zustand)
- [x] Essensplaner: 9-Fragen-Interview mit Chips → foodProfile, Profil-Karte (bearbeiten), 7-Tage-Plan F/M/A per Groq-JSON, pro Gericht: neu würfeln / bearbeiten / Zutaten → Liste (dedupliziert), „Ganze Woche → Liste"
- [x] Tests (vitest): JSON-Parser, planToEvents (Dedup, feste Termine, Datum), Zutaten-Dedup, Profil-Zusammenfassung, Store setExtra + Sync-Durchreichung
- [x] tsc + Tests grün, APP_VERSION → v8.0.0-beta.2, Commit + Push

**Review M6 (10.09.2026):** 49 Tests grün (14 neu: Parser, Tagesplan-Normalisierung, planToEvents-Dedup, Prompts, Essensplan, Zutaten-Dedup, setExtra + Sync-Durchreichung, Screen-Flows), tsc + Build sauber. Bewusste Entscheidungen: Daten bleiben in `extra` (v7/Cron-kompatibel, kein Migrationscode nötig); „Plan übernehmen" lässt `event`/`free` aus und ist idempotent (Uhrzeit+Titel am Plantag); Interview überschreibt das Profil erst nach der letzten Frage (v7 löschte es sofort). Offen: Steven-Test auf dem iPhone, echter Groq-Lauf mit gpt-oss-120b (JSON-Modus) – Chat nutzt dasselbe Modell bereits erfolgreich.

## M7 – Dashboard v2, Erscheinungsbild, Schnell-Eingabe, Kurzbefehle (10.09.2026, autonome Sitzung)
Steven: „tob dich aus" – Design-Varianten vorschlagen, richtig praktische Features, schönes und praktisches Dashboard, einfache Nutzbarkeit.
- [x] **Erscheinungsbild** (Mehr → Erscheinungsbild): System/Hell/Dunkel + 5 Akzentfarben (Indigo, Ozean, Sonne, Wald, Rosé) als Live-Varianten, `data-theme`/`data-accent` am `<html>`, theme-color-Meta folgt mit
- [x] **Schnell-Eingabe** auf dem Dashboard: lokaler NL-Parser (`lib/quickAdd.ts`, Subagent) – „morgen 15 Uhr Zahnarzt" → Termin, „Milch, Brot" → Einkauf, „Thesis Kapitel 3 #arbeit" → To-do; Live-Vorschau vor dem Absenden
- [x] **Wetter** (Open-Meteo, gratis, ohne Key): Chip im Dashboard-Kopf, Sheet mit Heute/Morgen, Standort unter Mehr (Standard Hannover, „Standort verwenden")
- [x] **Dashboard v2**: Kopf mit Wetter, Schnell-Eingabe, Energie, Fokus-Karte mit „laut Plan"-Zeile, Fortschritts-Streifen (To-dos, Termine, Plan), „Heute essen" aus dem Essensplan, To-dos, Kalender-Widget; Abschnitte unter Mehr → Dashboard ein-/ausblendbar
- [x] **Kurzbefehle (URL-Schema)** für Siri/Shortcuts: `?action=quick|add-task|add-shopping|add-event|set-energy|ask` (+ v7-kompatible Parameter), Bestätigungs-Toast, Doku mit kopierbaren URLs unter Mehr
- [x] Navigation als Store (`useUi`), damit Dashboard-Karten in Planer/KI springen können
- [x] Screenshots (Chromium, iPhone-Format) der Varianten an Steven geschickt (Skript im Scratchpad, seedet Beispieldaten)
- [x] Tests für Parser, Wetter-Mapping, Kurzbefehle, Theme; tsc + Build; APP_VERSION → beta.3; Commit + Push

**Review M7 (10.09.2026):** 87 Tests grün (38 neu), tsc/oxlint/Build sauber, Screenshots in Hell/Dunkel × 5 Akzenten geprüft. Entscheidungen: Theme über `light-dark()` + `data-theme`/`data-accent` (kein doppelter Token-Block; braucht iOS ≥ 17.5); Schnell-Eingabe rein lokal (kein Groq-Aufruf, Vorschau vor dem Absenden, „Lieber die KI fragen" als Ausweg); Dashboard-Abschnitte nur lokal gespeichert (Gerätesache, kein Sync); Wetter-Standort lokal, Standard Hannover. Offen: Steven-Test auf dem iPhone (light-dark-Support, Share-Sheet, Kurzbefehl-URL aus der Kurzbefehle-App), echte Groq-Läufe für Rezept/Plan.

## M8 – Review-Fixes + Ideen aus anderen Apps (10.09.2026)
- [x] Code-Review des gesamten Branches (10 Punkte, alle behoben, Regressionstests): Kurzbefehl-Start wartet auf ersten Pull; Plan-Blöcke aus KV validiert; theme-color mit Hex; Parser strenger; add-event prüft Uhrzeit; Rezept ohne stilles Speichern; Würfel-Guard; Termine-Kennzahl
- [x] Recherche (Structured, Sunsama, Things 3, Todoist, Fantastical, Bring, Apple Erinnerungen) → `tasks/ideen.md` mit 18 Vorschlägen
- [x] Gebaut: Gewohnheiten mit Serie (Dashboard-Karte, extra.habits, KI-Kontext), Zurückstellen Morgen/Nächste Woche/Irgendwann (Task.until, Abschnitt „Später"), Tagesabschluss ab 19 Uhr (Offenes auf morgen, Erledigtes aufräumen, extra.dayClosed)
- [x] APP_VERSION → beta.4, 96 Tests grün
- [ ] Steven: Vorschläge in `tasks/ideen.md` durchgehen und Favoriten markieren

## M9 – Worker: Cloud-Deploy, Abend-Review-Push, Wetter im Briefing (10.09.2026, Cloud-Sitzung)
Auftrag Steven: Cloudflare-Deploy aus der Cloud nachholen (CLOUDFLARE_API_TOKEN gesetzt), dann die Worker-Features, die daran hingen.
- [x] `npm install -g wrangler` (4.130), `wrangler deploy --dry-run` sauber (env.KV `2f8eb11cc97f48a9a64ef75b35474126`, VAPID_PUBLIC, VAPID_SUBJECT)
- [x] `wrangler whoami` / `wrangler deploy` – Netzwerk-Policy von Steven angepasst (10.09.2026, dritter Anlauf): `whoami` zeigt „Steven@tenyenhuis.de's Account“, Deploy durch → **Version `75cb2d12`**
- [x] Nach dem Deploy: `wrangler kv key list --remote` → state, calendar, push_sub vorhanden (nichts neu angelegt); Secrets SECRET, VAPID_PRIVATE_JWK, GROQ_KEY erhalten; `curl …/ping` ohne Secret = 401
- [ ] `POST /push/test` mit Secret → Steven prüft den Push auf dem iPhone (Secret-Wert liegt nicht in der Cloud-Umgebung; Steven per curl oder `ORGANIZER_SECRET` als Umgebungsvariable)
- [x] CLAUDE.md-Absatz „Cloud-Sitzung" aktualisiert (Deploy aus der Cloud funktioniert, Version 75cb2d12)
- [x] **Abend-Review-Push 21:00–21:25** (`sent:review:<datum>`): liest `state.tasks.today`; offen = nicht erledigt und nicht zurückgestellt (`until` in der Zukunft zählt nicht); „3/5 geschafft – Rest auf morgen?" mit bis zu 3 offenen Titeln, „alles geschafft"-Variante, kein Push ohne To-dos; entfällt, wenn der Tagesabschluss in der App schon gemacht wurde (`state.dayClosed === heute`)
- [x] **Wetter im Morgen-Briefing** (Open-Meteo, Hannover 52.3759/9.732, ohne Key, 5-s-Timeout, Fehler = ohne Wetter): Zeile „🌦️ Schauer, 12–19 °C, Regen 60 %" in Groq-Prompt und Fallback-Text
- [x] Reine Logik als benannte Exporte (`openTodayTasks`, `buildReviewText`, `weatherLine`, `applyOverrides`, `parseLines`) → vitest `app/src/test/worker.test.ts`; Push-Krypto unangetastet; `node --check worker.js`
- [x] Danach: nächster offener Punkt aus M2 (Worker-Zeilenformat mit Datum) → M10

## M10 – Kalender über mehrere Tage: Zeilenformat mit Datum (10.09.2026, Cloud-Sitzung)
Ziel: Der Kurzbefehl liefert 14 Tage statt nur heute. Altes Format ohne Datum bleibt gültig (= heute).
- [x] Worker `parseLines`: optionales erstes Feld `DD.MM.YYYY` (auch `YYYY-MM-DD`) → `date` (ISO) am Termin, Dedup-Key mit Datum; ohne Datum unverändert (kein `date`-Feld)
- [x] Worker Override-Key: mit Datum `date|time|text`, ohne Datum wie bisher `time|text` (bestehende Overrides bleiben gültig); `applyOverrides` wendet auch `date` aus dem Override an; `calendarForDay(cal, today)` filtert für Cron (Abfahrt, Briefing, Tipps) auf heute
- [x] `worker.d.ts` + `worker.test.ts`: Parser mit Datum, Key/Override mit Datum, Cron pusht nur heutige Termine
- [x] App `lib/worker.ts`: `RawCalEvent.date?`; `lib/sync.ts`: `calKey(time, text, date?)`, `buildCalendarEvents` nimmt pro Termin `e.date ?? day`, `applyCalendar` ersetzt Kalender-Termine ab heute und alle Tage des Snapshots (Vergangenheit bleibt als Verlauf); `toWireState` liest origTime aus dem Key mit Datum
- [x] Mehr → Kurzbefehle: Karte „Kalender-Kurzbefehl (14 Tage)" mit Rezept (Filter „in den nächsten 14 Tagen", Zeilenformat mit Datum, POST an `<Worker>/calendar` mit X-Secret)
- [x] Doku: CLAUDE.md §5 Zeilenformat; APP_VERSION → beta.5; 120 Tests grün (8 neu), tsc + Build sauber; Commit + Push; Worker deployt
- [x] Parser tolerant für unformatierte Datumsvariablen („10.09.2026, 08:00" in einem Feld, 2-stelliges Jahr, „8:00"), nach Stevens Screenshot (10.09.2026); beta.6
- [x] Parser nach echtem Kurzbefehl-Output (Screenshots 10.09.): Zeitstempel in jeder Schreibweise (`parseStamp`), mehrzeilige Adressen an den Termin davor, 00:00–23:59 = ganztägig, Enddatum an späterem Tag → `endDate` (App: EventItem.endDate); `calendar_raw` im KV zum Nachsehen; beta.8
- [ ] Steven: Kurzbefehl auf dem iPhone umstellen (Rezept unter Mehr → Kurzbefehle), dann Kalender-Tab prüfen (Woche/Monat mit Apple-Terminen)
  - Stevens Kurzbefehl (Screenshot 10.09.): Filter „Startdatum ist heute" entfernen → nur „Startdatum innerhalb der nächsten 14 Tage"; Beschränken 25 → aus/100; Token in `?s=` ist veraltet (401) → aktuelles Token als Header X-Secret

## Danach: Backlog aus CLAUDE.md §11 (Inbox, Deep-Links, …)
