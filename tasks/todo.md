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
- [x] Offline-Fall: Fehlerzustand freundlich, Retry beim Sichtbarwerden und bei „online" (M13)

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
- [x] Steven: Kurzbefehl umgestellt (10.09.2026 abends): Suche vor der Schleife, Filter „Startdatum innerhalb der nächsten 2 Wochen" („Mindestens eine" liefert nichts, Apple-Fehler), Chips aus „Objekt wiederholen" + „Ist ganztägig"; 19 Termine über 12 Tage korrekt im KV (ganztägig, mehrtägig, mehrzeilige Adresse). Automation auf 23:55, weil Apple „nächste 2 Wochen" ab jetzt rechnet (06:00 = ganztägige von heute fehlen). Abgesagte Outlook-Termine („Abgesagt:") werden verworfen; beta.10
- [x] Steven: Kalender-Tab geprüft („App passt"), Automation auf 23:55 gestellt, Schreib-Sync an → Worker hat v8-Stand (37 Termine, 19 aus Apple)

## M11 – Stevens Wünsche aus der App (10.09.2026 abends, `extra.wishes` im KV)
- [x] **Knöpfe im Menü reparieren:** Schalter-Knopf ohne `left-0` startete mittig und ragte rechts über die Fläche (Toggle + Kopie im Termin-Editor → gemeinsame Komponente); KI-Blase verdeckte die Schalter rechts auf der Mehr-Seite → dort ausgeblendet. Playwright-Screenshot geprüft; beta.11
- [x] Smarter Essensplan: `weekCalendarText` (Mo–So, heute/vorbei markiert) geht in den Wochenplan-Prompt; Regel: Termin über 12–14 bzw. 18–20 Uhr oder ganztägig weg → Slot `{name:'Unterwegs', unterwegs:true}`; UI zeigt 🚌 „laut Kalender unterwegs, nichts geplant"; `normMeal` erkennt auch Namen „Unterwegs …"
- [x] Mengen bei automatischer Einkaufsliste: Prompt verlangt „500 g Kartoffeln"-Form für die Personenzahl; `parseIngredient` (auch „Paprika (2 Stk)"), `newIngredients` fasst gleiche Zutaten der Woche zusammen und addiert Mengen gleicher Einheit (`mergeQty`), Einkaufsliste bekommt `qty`; Empfehlungen zeigen den Namen ohne Menge; beta.12
- [~] Widget auf dem iPhone: Steven: „nicht so wichtig" – als PWA nicht möglich, Alternative Lockscreen-Push

  - Stevens Kurzbefehl (Screenshot 10.09.): Filter „Startdatum ist heute" entfernen → nur „Startdatum innerhalb der nächsten 14 Tage"; Beschränken 25 → aus/100; Token in `?s=` ist veraltet (401) → aktuelles Token als Header X-Secret

## Danach: Backlog aus CLAUDE.md §11 (Inbox, Deep-Links, …)

## Vorschläge für echten Mehrwert (10.09.2026, Steven: „bisher eine Spielerei", Auswahl offen)
Leitgedanke: Die App kennt Stevens echtes Leben schon (Apple-Kalender mit Schichten, Uni, Geburtstagen; Einkauf; To-dos). Mehrwert entsteht, wenn sie daraus Arbeit abnimmt – erinnern, zusammenfassen, entscheiden – statt neue Eingaben zu verlangen.
- [x] A **Schichten & Verdienst:** Kalender-Termine mit „Samowar" (konfigurierbares Stichwort) → Stunden diese Woche/Monat, Verdienst-Schätzung mit Stundenlohn, Karte im Dashboard + Zeile im Morgen-Briefing (klein)
- [x] B **Geburtstags-Assistent:** Morgen-Push nennt Geburtstage des Tages; in der App „Glückwunsch schreiben" → KI-Text im Share-Sheet / WhatsApp-Link; 1-Tages-Vorwarnung für Geschenk (klein)
- [ ] C **Wochen-Vorschau Sonntag 19:00 (Push):** Schichten, Uni, Geburtstage, freie Abende der nächsten Woche; Vorschlag für 2–3 Thesis-Blöcke, „übernehmen" legt Termine an (mittel)
- [ ] D **Thesis/Deadline-Tracker:** Projekt mit Abgabedatum, Countdown, Tagesziel aus Restumfang; Fokus-Timer auf der Fokus-Karte; Fortschritt im Abend-Review (mittel)
- [ ] E **Route öffnen:** Termin mit Ort → Apple Karten/Google Maps per Deep-Link, Abfahrts-Push mit echter Fahrzeit über OSRM (gratis) statt Apple-Wegzeit (klein/mittel)
- [ ] F **Ausgaben-Logbuch:** Schnell-Eingabe „-12,50 Döner" → Monatsübersicht gegen Schicht-Verdienst (mittel, nur wenn Steven es füttern will)
- [ ] Offline-Fall (M3, klein) nebenbei erledigen

## M12 – Heute-Seite „Auf einen Blick" (10.09.2026, Stevens Feedback: „alles direkt sichtbar, nicht scrollen")
- [x] Neues Layout `glance` (Standard) neben `classic`, umschaltbar unter Mehr → Dashboard: Kopf mit Energie-Pille (tippen schaltet Wenig→Gut→Top→aus) + Wetter, Schnell-Eingabe (Funken-Knopf öffnet den KI-Chat, die schwebende Blase ist auf dieser Seite aus), kompakte „Jetzt dran"-Karte mit Countdown + Plan-Zeile, Kennzahlen, 2×2-Kacheln Heute | To-dos, Routinen | Essen; darunter „Mehr": Monatskalender + 7 Tage, volle To-do-Liste mit Eingabe und Erledigtem, Tagesabschluss
- [x] Erste Seite endet bei 690 px (iPhone 393×852, Tab-Leiste ab ~760) – per Playwright mit Beispieldaten gemessen, Screenshots hell/dunkel an Steven; `Stat`/`TaskLine`/`fmtMin` nach `screens/today/bits.tsx`, Daten als `TodayData` für beide Layouts; beta.14
- [ ] Steven-Feedback zum Glance-Layout einarbeiten

## M13 – Autonome Sitzung (10./11.09.2026, Steven ~7 h weg: „so viele coole Sachen wie möglich, Fokus Qualität")
Stevens Antworten: A–C, E „alle cool"; D entfällt (Thesis fertig); F: will echte Bank-Anbindung wie Finanzguru, kein manuelles Logbuch → recherchieren, nicht bauen; Geburtstage mit einstellbarem Ton („so wie ich es formulieren würde"); Samowar = Mindestlohn + 1 € (2026: 13,90 + 1 = 14,90 €/h); neuer Job ab 15.09. (Schnittstellen später).
Reihenfolge nach Nutzen ÷ Aufwand, nach jedem Punkt Tests + Commit + Push auf main, Worker-Deploy bei Worker-Änderungen:
- [x] A **Schichten & Verdienst:** `extra.work` = { keyword, rate } (synchronisiert, Standard „Samowar" / 14,90); `lib/work.ts` zählt Kalender-Termine mit Stichwort → Stunden Woche/Monat/nächste Woche, Verdienst; Karte unter „Mehr" auf der Heute-Seite mit Einstellungs-Sheet; Worker nutzt es in der Wochen-Vorschau
- [x] B **Geburtstags-Assistent:** ganztägige Termine mit „Geburtstag" (auch „gebby", „bday") → Karte auf der Heute-Seite (heute + morgen als Vorwarnung), „Glückwunsch schreiben" per Groq mit Ton-Profil (`extra.greetingStyle`: Freitext + Beispiel unter Mehr → Geburtstage), Ergebnis bearbeiten → Teilen/WhatsApp; Worker: Morgen-Briefing nennt Geburtstage, Abend-Review nennt morgige
- [x] C **Wochen-Vorschau Sonntag 19:00 (Worker-Push):** Schichten mit Stunden/Verdienst, Termine je Tag, Geburtstage, freie Abende der nächsten Woche
- [x] E1 **Route öffnen:** Termin mit Ort → Apple Karten (`maps://`) im Termin-Sheet und in den Heute-Kacheln
- [x] E2 **Echte Fahrzeit im Abfahrts-Push:** Worker geocodiert Ort (Nominatim) + Route ab Zuhause (OSRM, gratis), Cache je Adresse in KV, Zuhause aus `extra.home` (App: Standort unter Mehr); Fallback bleibt 30 Min
- [x] Offline-Fall (M3): Fehlerzustand freundlich, Retry beim Sichtbarwerden
- [x] Kleinigkeiten mit Mehrwert: mehrtägiger Termin „16:00 →" / „bis 01:30" / „ganztägig" je Tag (Widget, Woche, Monat); Rezept-Import per Link (Worker `GET /fetch` liest schema.org/Recipe, sonst Groq aus dem Seitentext; Sheet mit Checkliste und Mengen); „Saison im Monat"-Kacheln in der Einkaufsliste
- [x] F **Finanzen:** Recherche in ideen.md (Finanzguru ohne API; GoCardless nur mit Firmenregistrierung; FinTS braucht einen PC mit TAN alle 90 Tage; Empfehlung CSV-Import als Stufe 1) → Entscheidung bei Steven

**Review M13 (11.09.2026, autonom):** 150 Tests grün (23 neu), tsc/Build sauber, Worker-Version `880bc044` deployt, App beta.18 auf main. Gebaut: Schichten & Verdienst, Geburtstags-Assistent mit Ton-Profil, Wochen-Vorschau So 19:00, Route öffnen, echte Fahrzeit im Abfahrts-Push (Nominatim + OSRM, Live-Test: Hannover→Lüneburg 101 Min), Offline-Meldungen, mehrtägige Termine je Tag, Rezept-Import per Link, Saison-Kacheln, Finanz-Recherche. Bewusst nicht gebaut: D (Thesis fertig), F (Bank-Anbindung nicht kostenlos/legal ohne Firma – Entscheidung bei Steven), Timeline-Drag (braucht iPhone-Test). Offen für Steven: Stundenlohn/Stichwort prüfen (Mehr → Heute → Schichten ⚙), Ton + Beispiel unter Mehr → Geburtstage eintragen, Standort unter Mehr → Wetter & Zuhause einmal speichern (sonst kein Fahrzeit-Push), Push-Test.
- [x] Code-Review (Skill, hoch) über 2b7f399..beta.19: 8 Funde, alle behoben mit Regressionstests – Geocoding-Fehler werden nicht mehr 30 Tage als „nicht gefunden" gecacht; leerer Kalender-Snapshot löscht nichts mehr; exklusives Apple-Ende (00:00 am Folgetag) → Vortag; Fahrzeit bis 6 h vorher berechnet; kaputte HTML-Entities stürzen nicht ab; laufende Nachtschicht bleibt „nächste Schicht"; „Losgehen um" nimmt die Fahrzeit aus der Kurzbefehl-Zeile vor dem Worker; Müllzeilen werden nicht mehr an Titel angehängt. 156 Tests grün; beta.20
