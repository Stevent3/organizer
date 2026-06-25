# Organizer — Setup & Integration

Eine einzelne installierbare PWA. Keine Build-Tools, kein Backend nötig.

## Dateien (alle in dasselbe Repo hochladen)

| Datei | Zweck |
|---|---|
| `index.html` | Die App |
| `manifest.json` | PWA-Manifest (Homescreen, Share-Target) |
| `sw.js` | Service Worker (Offline-Modus) |
| `icon-180.png` | Apple-Touch-Icon |
| `icon-192.png` / `icon-512.png` | App-Icons |
| `icon-maskable-512.png` | Android maskable Icon |

---

## 1. Auf GitHub Pages hochladen (privat)

1. github.com → **New repository** → Name z.B. `organizer` → **Private** → Create
2. **Add file → Upload files** → alle obigen Dateien reinziehen → Commit
3. **Settings → Pages** → Source: *Deploy from branch* → Branch `main` / Ordner `/root` → Save
4. Nach ~2 Min läuft die App unter `https://DEINNAME.github.io/organizer/`

> Privates Repo = Code bleibt unsichtbar. Deine Daten liegen sowieso nur lokal im Browser deines iPhones, nie auf GitHub.

## 2. Auf dem iPhone installieren

1. URL in **Safari** öffnen
2. Teilen-Symbol → **Zum Home-Bildschirm**
3. Icon erscheint wie eine echte App, öffnet im Vollbild

## 3. KI aktivieren

App → Tab **KI** → Groq Key (`gsk_...`) eingeben → Verbinden.
Key von console.groq.com → API Keys → Create Key. Liegt nur lokal.

---

## 4. Apple Shortcuts anbinden

Die App reagiert auf URL-Befehle. Ein Shortcut öffnet eine URL, die App führt die Aktion aus.
Basis: `https://DEINNAME.github.io/organizer/`

### URL-Befehle (API)

| Aktion | URL |
|---|---|
| Aufgabe heute | `?action=add-task&text=TEXT&list=today` |
| Auf Einkaufsliste | `?action=add-shopping&text=TEXT` |
| Termin anlegen | `?action=add-event&time=14:00&text=TEXT&sub=NOTIZ` |
| Energie setzen | `?action=set-energy&level=low\|good\|top` |
| Gewohnheit abhaken | `?action=log-habit&name=Wasser` |
| Kalender importieren | `?action=import-calendar&data=JSON` |
| KI fragen | `?action=ask&q=FRAGE` |

Text muss URL-kodiert sein — Shortcuts macht das automatisch via *„URL kodieren"*.

### Rezept A — „Aufgabe per Siri"

1. Kurzbefehle → **+** → Aktion **Text** *(„Frage nach Eingabe")* oder **Eingabe anfordern**
2. Aktion **URL** → `https://DEINNAME.github.io/organizer/?action=add-task&list=today&text=`
3. Aktion **Text kodieren** auf die Eingabe (Format: *Für URL*)
4. URL zusammensetzen: Basis-URL + kodierter Text
5. Aktion **URLs öffnen**
6. Shortcut benennen: „Aufgabe hinzufügen" → Siri: *„Hey Siri, Aufgabe hinzufügen"*

### Rezept B — „Apple Kalender → Organizer"

1. Aktion **Kalendereinträge suchen** → Filter: *Startdatum ist heute*
2. Aktion **Wiederhole mit jedem** → darin **Wörterbuch** bauen:
   - `time` = Startzeit (formatiert `HH:mm`)
   - `text` = Titel
   - `sub` = Ort
3. Nach der Schleife: **Wörterbücher** → in **JSON / Text** umwandeln (Liste)
4. **Text kodieren** (Für URL)
5. **URL**: `https://DEINNAME.github.io/organizer/?action=import-calendar&data=` + kodiertes JSON
6. **URLs öffnen**
7. Als **Automation** täglich morgens laufen lassen → Tagesplan ist immer synchron

JSON-Format das die App erwartet:
```json
[{"time":"14:00","text":"Zahnarzt","sub":"Praxis Müller"}]
```

### Rezept C — „KI-Frage per Siri"

1. **Eingabe anfordern** (Text)
2. **Text kodieren** (Für URL)
3. **URL**: Basis + `?action=ask&q=` + kodierte Eingabe
4. **URLs öffnen** → App öffnet KI-Tab und stellt die Frage automatisch

---

## 5. Updates einspielen

App weiterentwickelt? Einfach die neue `index.html` im Repo hochladen (überschreiben) → GitHub Pages deployed automatisch → beim nächsten Öffnen ist die App aktuell. Deine Daten bleiben erhalten (liegen lokal).

## 6. Backup

App → Module → **Daten exportieren** (lädt JSON) bzw. **importieren**. Sinnvoll vor größeren Updates oder Gerätewechsel.

---

## Roadmap (nächste Stufen)

- **Push-Benachrichtigungen** mit Antwort-Buttons (braucht kleinen kostenlosen Worker, z.B. Cloudflare)
- **Proaktive KI** („du solltest bald Shampoo kaufen") — Worker + Web Push
- **Mail-Assistent**, **FinanzGuru**, **Smarthome** als weitere Module
