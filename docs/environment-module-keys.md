# Module Key Configuration

## Overview
The inventory extension now expects the exact ChurchTools custom module key through the `VITE_KEY` environment variable. The application no longer derives dev/prod/test prefixes automatically—set the desired module key explicitly for each environment.

## Configure `.env`
```properties
# Module key (ChurchTools → Administration → Modules)
VITE_KEY=fkoinventorymanagement

# Optional: document intent for the environment (used only for diagnostics)
VITE_ENVIRONMENT=development
```

If you maintain separate modules per environment, provide the full shorty for each one:

| Environment | Example `VITE_KEY` |
|-------------|--------------------|
| Local development | `devfkoinventorymanagement` |
| Automated tests   | `testfkoinventorymanagement` |
| Production        | `prodfkoinventorymanagement` |

> ℹ️ The application lowercases and trims the configured key but does **not** add or remove prefixes.

## Creating Modules in ChurchTools
1. Log in as an administrator.
2. Navigate to **Settings → Custom Modules**.
3. Create (or note) the module with the precise shorty you will place in `VITE_KEY`.
4. Repeat for each environment you want to isolate (e.g., `dev…`, `test…`, `prod…`).

## Verifying the Active Module Key
During startup the app prints warnings in the browser console if the key needs normalisation (for example, uppercase letters). When fetching data, the API route will include the exact value from `VITE_KEY`, so a 404 indicates the module shorty does not exist in ChurchTools.

## Troubleshooting
- **404 when fetching module** → Confirm the module shorty exists in ChurchTools and matches `VITE_KEY` exactly.
- **Reset utilities refuse to run** → The destructive test helpers require keys beginning with `test`; update `VITE_KEY` accordingly when running automated tests.

## Related Files
- `src/utils/extensionKey.ts` — centralises module key sanitisation.
- `src/utils/envValidation.ts` — validates that `VITE_KEY` is present and well-formed.
- `src/tests/utils/reset-test-data.ts` — enforces `test` prefix for destructive operations.

---

**Last Updated**: 2025-10-24
**Feature**: Explicit module key configuration
