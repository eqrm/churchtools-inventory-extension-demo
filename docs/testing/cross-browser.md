# Cross-Browser Smoke Test Log

- Datum: 2025-10-25
- Build: `npm run build` (`dist/` output, Vite 7)
- Testumfang: Start der App, Login-Mock, Dashboard-Render, Buchungsdetail mit Zeitleiste, Wartungsübersicht inkl. `PersonAvatar`

| Browser | Version | Ergebnis | Hinweise |
|---------|---------|----------|----------|
| Chrome (Linux) | 129 | ✅ Bestanden | Keine Rendering-Probleme festgestellt; Timeline und Avatar-Tooltips funktionieren erwartungsgemäß. |
| Firefox (Linux) | 130 | ✅ Bestanden | Flexbox-Layouts und Mantine-Komponenten rendern korrekt; leichte Verzögerung beim Laden der Historie, innerhalb akzeptabler Grenzen. |
| Safari (macOS) | 17.5 | ⚠️ Nicht getestet | Testlauf blockiert, da im Dev-Container kein macOS verfügbar. Empfohlen: Browserstack/Remote QA vor Release. |

_Notiz_: Für Safari sollte vor dem nächsten Release ein Remote-Smoke-Test (Browserstack, Sauce Labs o. Ä.) eingeplant werden, insbesondere zur Prüfung der IndexedDB-Nutzung und Drag-and-Drop-Interaktionen.
