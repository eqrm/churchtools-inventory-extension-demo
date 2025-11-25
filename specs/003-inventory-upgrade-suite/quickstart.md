# Demo Quickstart Validation

- Datum: 2025-10-25
- Build: `npm run dev` (Vite Hot Reload)
- Ziel: Verifizieren, dass Demo-Daten-Onboarding (US4) wie dokumentiert funktioniert.

## Schritte
1. Repository klonen und `npm install` ausführen.
2. `.env.example` nach `.env` kopieren und `VITE_BASE_URL` / `VITE_KEY` setzen.
3. `npm run dev` starten.
4. App im Browser unter `http://localhost:5173` öffnen.
5. Erststart-Dialog akzeptieren, um Demo-Daten zu seeden.
6. Dashboard prüfen: Demo-Assets/-Kategorien sichtbar, Wartungsplan-Tile aktiv.
7. Entwickler-Einstellungen öffnen und Demo-Reset ausführen.
8. App neuladen und bestätigen, dass Demo-Daten entfernt wurden (Leeres Inventar).

## Beobachtungen
- ✅ Erststart-Modal erscheint zuverlässig bei leerer Dexie-Datenbank.
- ✅ Seeding erstellt Kategorien, Assets, Buchungen und Personen mit deterministischen IDs.
- ✅ Demo-Tagging erlaubt Reset ohne Auswirkungen auf reale Einträge.
- ⚠️ Hinweis: Nach Reset muss Seite neu geladen werden, um gelochte State Stores zu aktualisieren.

## Fazit
Die Quickstart-Anleitung ist valide. Notwendige Ergänzung: Dokumentation verweist jetzt explizit auf Seiten-Reload nach Demo-Reset (ergänzt in `README.md`).
