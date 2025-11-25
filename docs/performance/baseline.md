# Bundle Size Baseline

- Datum: 2025-10-25
- Befehl: `npm run build`
- Ziel: Produktionsbundle (Vite 7)

| Chunk | Größe | gzip |
|-------|-------|------|
| `dist/assets/index-BUKaIZrm.js` | 3.03 MB | 887.25 kB |
| `dist/assets/mantine-Cpsf40Md.js` | 443.17 kB | 132.74 kB |
| `dist/assets/scanner-DvAoHRNP.js` | 425.23 kB | 119.78 kB |
| `dist/assets/index-D_jITKOY.js` | 230.40 kB | 67.12 kB |
| `dist/assets/vendor-eVk5PToZ.js` | 139.34 kB | 45.04 kB |
| `dist/assets/AssetsPage-zCvO00Fm.js` | 106.60 kB | 33.20 kB |
| `dist/assets/index-BECI3c3t.css` | 236.42 kB | 33.31 kB |

_Notiz_: Größter gzip-Anteil (`index-BUKaIZrm.js`) liegt aktuell bei ~887 kB. Weitere Chunk-Optimierungen (z. B. Mantine / Scanner Lazy-Loading) sollten für das nächste Performance-Inkrement geprüft werden.
