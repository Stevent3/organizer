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
- [ ] Worker: Zeilenformat um Datum erweitern (`DD.MM.YYYY | HH:MM | HH:MM | Titel | Ort | Fahrzeit`), Kalender-Key mit Datum; Shortcut-Guide „Zeitraum 14 Tage"

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
- [ ] Planer: KI-Tagesplan („Plan übernehmen" → echte Termine), Essensplaner
- [x] Energie als Pillen-Zeile, Fokus-Karte, Kalender-Widget mit Vollbild-Overlay (Steven-Feedback 10.09.); Shortcut-URLs offen

## M5 – Cutover (10.09.2026, Steven: „direkt umziehen, ich benutze die alte eh nicht")
- [x] v7 nach `legacy/`, neue App auf `/organizer/` (Base geändert), `/next/` leitet um, SW (injectManifest) löscht alte organizer-v*-Caches
- [x] Schreib-Sync standardmäßig an, Push aktivieren/testen/ausschalten unter Mehr (VAPID-Public-Key in `lib/push.ts`)
- [x] APP_VERSION v8.0.0-beta.1
- [ ] Steven-Test auf dem iPhone: alte Homescreen-App öffnen (lädt jetzt v8 mit den v7-Daten), Push einmal neu aktivieren

## Offene Punkte aus Stevens Feedback (10.09.2026)
- [x] Einkaufsliste wie Bring: Empfehlungen, zuletzt gekauft, Mengen (Stk./kg/…) per Langdruck oder Eingabe „2 kg Kartoffeln"
- [x] KI: Groq-Modellwechsel (gpt-oss-120b) + echte Fehlermeldung
- [x] Dashboard: To-dos direkt sichtbar (vor dem Kalender), Kalender-Widget mit Monatsraster + nächsten 7 Tagen
- [x] Kalender-Overlay schließt animiert nach unten, folgt beim Ziehen dem Finger
- [ ] Planer (KI-Tagesplan „Plan übernehmen", Essensplaner), Shortcut-URLs, Worker-Kalenderformat mit Datum

## M6 – Planer-Tab (10.09.2026, Cloud-Sitzung)
Fünfter Tab **Planer** (Heute · Kalender · To-dos · Planer · Mehr) mit Segment 🗺 Tag | 🍽 Essen, wie v7.
Datenhaltung: `dayPlan`, `mealPlan`, `foodProfile` bleiben in `state.extra` (v7-kompatibel: liegen top-level im KV-State, Cron/Legacy lesen sie weiter); typisierte Zugriffe + Validierung in `lib/planner.ts`, Schreiben über neue Store-Aktion `setExtra` (zählt updatedAt hoch → Sync).
- [ ] `lib/ai.ts`: Groq-Aufruf um JSON-Modus (`response_format`) + Fehlertext-Helfer erweitern, gemeinsam für Chat, Tagesplan, Essensplan
- [ ] `lib/planner.ts`: Typen (DayPlan, MealPlan, FoodProfile), Prompts aus v7 1:1, JSON-Parser (robust gegen Text drumherum), `planToEvents()` (Plan → Termine, feste Termine überspringen, idempotent), Zutaten-Dedup für die Einkaufsliste
- [ ] Store: `setExtra(patch)`
- [ ] `screens/PlannerScreen.tsx`: Tagesplan (Timeline-Blöcke nach Typ gefärbt, „Plan erstellen"/„Neu planen", **„Plan übernehmen"** → echte Termine mit Bestätigung, „Übernommen"-Zustand)
- [ ] Essensplaner: 9-Fragen-Interview mit Chips → foodProfile, Profil-Karte (bearbeiten), 7-Tage-Plan F/M/A per Groq-JSON, pro Gericht: neu würfeln / bearbeiten / Zutaten → Liste (dedupliziert), „Ganze Woche → Liste"
- [ ] Tests (vitest): JSON-Parser, planToEvents (Dedup, feste Termine, Datum), Zutaten-Dedup, Profil-Zusammenfassung, Store setExtra + Sync-Durchreichung
- [ ] tsc + Tests grün, APP_VERSION → v8.0.0-beta.2, Commit + Push

## Danach: Backlog aus CLAUDE.md §11 (Abend-Review-Push, Wetter, Inbox, Deep-Links, …)
