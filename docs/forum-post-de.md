# Vorstellung: ChurchTools Inventory Extension

Hallo zusammen,

wir möchten euch die erste produktionsreife Version der **ChurchTools Inventory Extension** vorstellen. Die Erweiterung bündelt Inventarverwaltung, Buchungsprozesse und Wartungsplanung in einem durchgängigen Modul, das vollständig in ChurchTools eingebettet ist.

## Was ist neu?
- **Nachvollziehbare Buchungen** – Vereinheitlichte Teilnehmer-Avatare in Listen, Formularen und Detailansichten, historisierte Zeitleisten sowie mengenbewusste Verteilung von Kind-Assets.
- **Wartungsplanung aus einem Guss** – Zustandsbasierte Planung, automatische Kalender-Sperren, Wartungsabschluss im Drawer und eine Teamübersicht für Techniker pro Asset.
- **Transparente Nummernkreise** – Dashboard-Hinweise bei fehlenden Präfixen, lokal persistierte Standards sowie Live-Vorschauen in Kategorie- und Assetformularen.
- **Einfacher Kontextwechsel** – Das neue `PersonAvatar`-Modul sorgt für konsistente Initialen/Avatare überall im Modul und greift auf lokale Caches zurück, wenn nur IDs vorliegen.

## Getting Started
1. Repository klonen und `npm install` ausführen.
2. `.env.example` nach `.env` kopieren und `VITE_BASE_URL` sowie `VITE_KEY` setzen.
3. Mit `npm run dev` startet ihr den Vite-Dev-Server (Default: http://localhost:5173).
4. Für VS Code gibt es einen vorgefertigten Dev-Container – einfach „Reopen in Container“ wählen und loslegen.

## Qualitätssicherung
Vor Pull Requests oder Releases bitte immer:
```
npm run lint
npm test
npm run build
```
Optional bietet `npm run analyze:bundle` eine Übersicht über die Bundle-Größe (Ziel: < 200 kB gzip).

## Eure Mithilfe
Wir planen als nächstes feinere Berechtigungen und die Anbindung an die ChurchTools Files API für Asset-Bilder. Feedback, Bugmeldungen oder Feature-Wünsche könnt ihr sehr gerne hier im Forum teilen oder direkt im Repository ein Issue erstellen.

Vielen Dank für eure Unterstützung!

Liebe Grüße

*ChurchTools Inventory Extension Team*
