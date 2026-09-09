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
- [ ] Aufgaben: Listen, Bring-Einkaufsliste (Katalog, Korb, Verlauf, Empfehlungen)
- [ ] KI-Chat mit Tool-Calling (+ neue Tools: Termin mit Datum, open_app)
- [ ] Planer: KI-Tagesplan („Plan übernehmen" → echte Termine), Essensplaner
- [ ] Energie-Karte, Fokus-Karte, Shortcut-URLs

## M5 – Cutover
- [ ] v7 nach `legacy/`, neue App auf `/organizer/` (Base ändern), SW-Cache-Wechsel sauber (alte Caches löschen)
- [ ] APP_VERSION v8, Push-Subscription prüfen, Steven-Test auf dem iPhone

## Danach: Backlog aus CLAUDE.md §11 (Abend-Review-Push, Wetter, Inbox, Deep-Links, …)
