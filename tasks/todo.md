# Organizer v6 – Review & Smart Features

## Phase 1: Code-Review (alle 3 Dateien)
- [x] index.html JS komplett lesen, Fehler/Altlasten finden
- [x] worker.js Review (Push-Logik, State-Frische)
- [x] sw.js Review
- [x] Gefundene Bugs dokumentieren & fixen

## Phase 2: Energie-Redesign
- [x] Aktuelle Energie-UI verstehen
- [x] Ersetzen durch klares, selbsterklärendes Konzept

## Phase 3: Smarte KI-Push-Empfehlungen
- [x] Worker: Tages-Analyse-Check (z.B. "viel vor am Nachmittag → jetzt einkaufen")
- [x] Spam-Schutz: max 2 Tipps/Tag, Zeitfenster, Dedup
- [x] State-Frische sicherstellen (App → Worker Sync)

## Phase 4: Verifikation
- [x] node --check alle Dateien
- [x] Logik-Tests für neue Worker-Checks
- [x] Diff-Kontrolle: nichts Bestehendes kaputt

## Phase 5: Brainstorm (Diskussion, kein Code)
- [x] Feature-Vergleich mit Structured/Motion/Fantastical/Todoist
- [x] Smarthome-Konzept (HomeKit via Shortcuts, Home Assistant)

## Review-Ergebnis (v6)
Gefixte Bugs: (1) syncStateToWorker nie aufgerufen → debounced in save(); (2) Blind-Überschreiben beim State-Pull → updatedAt-Merge-Guard; (3) Worker pushte zur alten Zeit bei verschobenen Terminen → applyOverrides im Cron; (4) Titel/Notiz-Änderung an Kalender-Terminen ging verloren → vollständige Overrides; (5) Scroll/Drag-Konflikt → Long-Press-Drag + Scroll-Passthrough. Neu: Energie-Karte selbsterklärend, Smart-Tipps 2×/Tag (KI entscheidet send/skip), Planer zeigt Zeitbereiche. Alle Änderungen node --check + Logik-Tests bestanden.

# Organizer v7 – Bring-Liste, Essensplaner, Security (bestätigt: alle Mahlzeiten, Härtung sofort)
- [x] Security: starkes Secret generieren, CORS auf eigene Origin, UI/Anleitung auf Header umstellen
- [x] Bring-Stil: Artikel-Katalog (~100, Emoji+Kategorie), Kachel-Grid, Korb, Abschluss+Verlauf, Empfehlungen
- [x] Essensplaner: Segment im Planer-Tab, Interview (9 Fragen, Chips+Freitext), Profil, Wochenplan-Generierung (F/M/A), Neu-würfeln/Bearbeiten, Übertrag auf Einkaufsliste (dedupliziert)
- [x] Kontext: heutige Mahlzeiten in KI-Kontext
- [x] v7 + SW-Cache v7, alle Checks + Logik-Tests

## Review v7
Umgesetzt & getestet: Security (CORS auf stevent3.github.io, Header-Auth in UI+Anleitung, neues 40-Zeichen-Secret generiert), Bring-Liste (10 Kategorien, ~120 Katalog-Einträge, Kacheln, Korb, Abschluss+Verlauf, Empfehlungen aus Verlauf+Essensplan), Essensplaner (9-Fragen-Interview, Profil, 7-Tage-Plan F/M/A via Groq JSON, Neu-würfeln pro Gericht, Bearbeiten-Sheet, Zutaten-Übertrag mit Dedupe pro Woche & pro Gericht), heutige Mahlzeiten im KI-Kontext, v7 sichtbar, SW-Cache v7. Alle node --check + 4 Logik-Tests grün (T2-Erwartung war falsch, Code korrekt).
