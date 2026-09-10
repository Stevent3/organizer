# Ideen aus anderen Apps – Vorschläge für den Organizer (10.09.2026)

Recherche über Structured, Sunsama, Things 3, Todoist, Fantastical, Bring, Apple Erinnerungen. Sortiert nach
Nutzen für Steven ÷ Aufwand. Was schon gebaut ist, steht unten.

## Gebaut in dieser Sitzung (zum Ausprobieren)

1. **Gewohnheiten mit Serie** (Structured, Streaks, Todoist-Karma) – Dashboard-Karte, Routinen an bestimmten
   Wochentagen, 7-Tage-Punkte, Flammen-Zähler; fließt in den KI-Kontext („Gewohnheiten heute: …").
2. **Zurückstellen** (Things „Someday", Apple „Überfällig"-Handling) – To-do auf Morgen / Nächste Woche / Irgendwann,
   Abschnitt „Später" in den To-dos, „Heute"-Knopf holt es zurück. Dashboard und KI sehen nur Aktives.
3. **Tagesabschluss** (Sunsama „Shutdown-Ritual", unser Backlog „Abend-Review") – ab 19 Uhr Bilanz-Karte, Offenes
   einzeln oder komplett auf morgen, Erledigtes aufräumen. Der Push um 21 Uhr aus dem Worker bleibt der nächste Schritt.

## Vorschläge, noch nicht gebaut

| # | Idee | Vorbild | Warum für dich | Aufwand |
|---|------|---------|----------------|---------|
| 4 | **Serientermine** („jeden Di 18:00 Schicht") mit Ausnahmen | Fantastical, Apple Kalender | Hauptlücke im Kalender; Schicht/Uni wiederholen sich | mittel |
| 5 | **Timeline-Drag** im Tag (halten + ziehen, 15-Min-Raster) | Structured | war in v7, fehlt in v8; braucht iPhone-Test | mittel |
| 6 | **Geteilte Einkaufsliste** (Partnerin) | Bring, AnyList | Bring lebt davon; bei uns: zweites Secret/Token, Liste als eigener KV-Key | mittel |
| 7 ✅ | **Rezept-Import per Link** (Zutaten aus Chefkoch & Co. → Liste) | Bring | eine URL, Groq extrahiert Zutaten | klein |
| 8 ✅ | **Saisonale Empfehlungen** in der Einkaufsliste | Bring | gratis, kleine Tabelle Monat → Obst/Gemüse | klein |
| 9 | **Fokus-Timer** auf der Fokus-Karte (25/5) | Structured, Forest | passt zum KI-Tagesplan „Fokus-Block" | klein |
| 10 ✅ (als Wochen-Vorschau So 19:00) | **Wochenrückblick** (So-Abend: erledigt, Serien, Termine) | Sunsama, Todoist | Motivation, Grundlage für die KI-Optimierer-Rolle | klein |
| 11 ✅ (Push) | **Fahrzeit-Anzeige vor Terminen** („losgehen um 08:40") | Fantastical | Worker kann es schon, App zeigt es nicht | klein |
| 12 | **Standort-Erinnerung** („wenn ich am Laden bin") | Apple Erinnerungen | nur über Kurzbefehle-Automation (Ankommen → URL) machbar | klein (Doku) |
| 13 | **Inbox aus Apple Erinnerungen** (Siri „Erinnere mich…" → Organizer) | Structured | Kurzbefehl-Automation liest Erinnerungen und ruft `?action=quick` | klein (Doku) |
| 14 | **Unteraufgaben** (Checkliste in einem To-do) | Structured 2026, Things | Thesis-Kapitel in Schritte | mittel |
| 15 ✅ | **Wetter im Morgen-Briefing** (Push) | Fantastical, Carrot | Open-Meteo im Worker, 10 Zeilen | klein (Worker) |
| 16 ✅ | **Abend-Review-Push 21:00** | Sunsama | Worker-Cron, nutzt den Tagesabschluss | klein (Worker) |
| 17 | **Sprach-Eingabe** („Ramble": lange gesprochen → sauber sortiert) | Todoist 2026 | Diktat im Chat + Tool-Calls gibt es fast schon; ein Mikro-Knopf im Schnell-Eingabe-Feld | klein |
| 18 | **Homescreen-Widget** | Structured, Things | geht als PWA nicht; Alternative: Lockscreen-Push mit Tagesplan | – |

Quellen: Zapier „best time blocking apps 2026", Sunsama-Review (Calmevo), Structured App Store/Review 2026,
Things-3-Reviews (Asian Efficiency, Calmevo), Todoist-Changelog 2026, Fantastical (Flexibits), Bring (App Store),
9to5Mac zu Erinnerungen.

## Finanzen: echte Bank-Anbindung (Stevens Wunsch 10.09.2026, Recherche-Ergebnis, ohne Code)

Steven nutzt Finanzguru und will automatisches Tracking statt Handeingabe. Stand meiner Recherche (bitte die Konditionen vor einer Entscheidung selbst prüfen, sie ändern sich):

| Weg | Wie | Kostenlos? | Haken |
|---|---|---|---|
| **Finanzguru-API** | gibt es nicht öffentlich | – | Finanzguru bietet nur den Export in der App (Plus-Abo), keine Schnittstelle für Fremd-Apps |
| **GoCardless Bank Account Data** (ehemals Nordigen) | PSD2-Kontozugriff über eine lizenzierte Plattform, REST-API, deutsche Banken dabei | Einstiegsstufe kostenlos, aber Registrierung als Unternehmen/Entwickler nötig | Zugriff läuft alle 90 Tage ab (PSD2), dann neu freigeben; Privatperson ohne Gewerbe grenzwertig |
| **finAPI / Tink / Klarna Kosma** | dieselbe Idee, B2B | nein (Sandbox gratis, Produktion kostenpflichtig) | für ein Ein-Personen-Projekt zu teuer |
| **FinTS/HBCI direkt** (z. B. python-fints) | die deutsche Bank-Schnittstelle mit eigenem Online-Banking-Login | ja | braucht einen Rechner, der die Zugangsdaten hält und alle 90 Tage eine TAN durchläuft – nicht im kostenlosen Cloudflare-Worker machbar; ginge als Skript auf dem Windows-PC, das Umsätze an den Worker schickt |
| **CSV-Import** (Bank-Export oder Finanzguru-Export) | Datei in die App laden, Groq kategorisiert, Monatsübersicht gegen Schicht-Verdienst | ja | halbautomatisch: einmal pro Woche/Monat exportieren |

Empfehlung: Stufe 1 **CSV-Import** (klein, sofort, kostenlos, kein Risiko mit Zugangsdaten). Stufe 2, wenn Steven ein FinTS-Skript auf dem PC laufen lassen will: automatischer Upload der Umsätze an den Worker (`POST /transactions`), dann echtes Tracking ohne Handeingabe. GoCardless nur, wenn er ohnehin ein Gewerbe anmeldet. Entscheidung offen.
