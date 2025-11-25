# Accessibility Sweep – 2025-10-25

Fokus: Neue Komponenten und Screens aus US5 (`PersonAvatar`, `BookingParticipants`, `AssetAssignmentList`, `MaintenanceTeamList`).

## Prüfmatrix
- Werkzeug: Storybook-A11y-Checkliste (manuell), Axe DevTools (Chrome)
- Seiten: Buchungsübersicht, Buchungsdetail, Asset-Detail, Wartungs-Dashboard

| Bereich | Ergebnis | Hinweise |
|---------|----------|----------|
| `PersonAvatar` Tooltip | ✅ | Tooltip erhält `aria-label` aus Namen; Initialen haben ausreichenden Kontrast (> 4.5:1). |
| Booking Participants Card | ✅ | Überschriften als `<h3>` korrigiert; Tab-Reihenfolge folgt DOM. |
| Asset Assignment List | ⚠️ | Zeitstempel nicht als `<time>` markiert – empfehlenswert für Screenreader. |
| Maintenance Team List | ✅ | Listenpunkte verwenden `<li>` mit beschreibendem Text. |
| Global Avatare | ⚠️ | Placeholder-Avatar ohne Bild benötigt `role="img"` + `aria-label` (aktuell nur Textknoten). |

## Empfehlung / Next Steps
1. Zeitstempel-Komponente (`BookingTimestamp`) auf `<time>`-Element mit `dateTime`-Attribut umstellen.
2. `PersonAvatar`-Fallback um `role="img"` und `aria-label` ergänzen.
3. Nach Umsetzung erneute Axe-Prüfung durchführen.
