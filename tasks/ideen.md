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
| 7 | **Rezept-Import per Link** (Zutaten aus Chefkoch & Co. → Liste) | Bring | eine URL, Groq extrahiert Zutaten | klein |
| 8 | **Saisonale Empfehlungen** in der Einkaufsliste | Bring | gratis, kleine Tabelle Monat → Obst/Gemüse | klein |
| 9 | **Fokus-Timer** auf der Fokus-Karte (25/5) | Structured, Forest | passt zum KI-Tagesplan „Fokus-Block" | klein |
| 10 | **Wochenrückblick** (So-Abend: erledigt, Serien, Termine) | Sunsama, Todoist | Motivation, Grundlage für die KI-Optimierer-Rolle | klein |
| 11 | **Fahrzeit-Anzeige vor Terminen** („losgehen um 08:40") | Fantastical | Worker kann es schon, App zeigt es nicht | klein |
| 12 | **Standort-Erinnerung** („wenn ich am Laden bin") | Apple Erinnerungen | nur über Kurzbefehle-Automation (Ankommen → URL) machbar | klein (Doku) |
| 13 | **Inbox aus Apple Erinnerungen** (Siri „Erinnere mich…" → Organizer) | Structured | Kurzbefehl-Automation liest Erinnerungen und ruft `?action=quick` | klein (Doku) |
| 14 | **Unteraufgaben** (Checkliste in einem To-do) | Structured 2026, Things | Thesis-Kapitel in Schritte | mittel |
| 15 | **Wetter im Morgen-Briefing** (Push) | Fantastical, Carrot | Open-Meteo im Worker, 10 Zeilen | klein (Worker) |
| 16 | **Abend-Review-Push 21:00** | Sunsama | Worker-Cron, nutzt den Tagesabschluss | klein (Worker) |
| 17 | **Sprach-Eingabe** („Ramble": lange gesprochen → sauber sortiert) | Todoist 2026 | Diktat im Chat + Tool-Calls gibt es fast schon; ein Mikro-Knopf im Schnell-Eingabe-Feld | klein |
| 18 | **Homescreen-Widget** | Structured, Things | geht als PWA nicht; Alternative: Lockscreen-Push mit Tagesplan | – |

Quellen: Zapier „best time blocking apps 2026", Sunsama-Review (Calmevo), Structured App Store/Review 2026,
Things-3-Reviews (Asian Efficiency, Calmevo), Todoist-Changelog 2026, Fantastical (Flexibits), Bring (App Store),
9to5Mac zu Erinnerungen.
