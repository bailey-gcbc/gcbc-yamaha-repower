# GCBC Yamaha Repower Centre — Netlify + Google Sheets

Customer-facing configurator with one total indicative fitted price. Individual motor, rigging and upgrade prices never appear in the public catalogue or browser bundle. All calculations occur in Netlify Functions.

## Getting started

1. Create a new Google Sheet and **import the supplied `GCBC_Repower_Pricing_Google_Sheets.xlsx`** (File → Import → Upload). Keep the tab names and header rows unchanged.
2. In that Google Sheet, open **Extensions → Apps Script**. Paste `google-apps-script/Code.gs` into the editor. Under **Project Settings → Script properties**, add `GCBC_API_SECRET` with a long random secret.
3. Deploy → New deployment → **Web app** → Execute as **Me** → Who has access **Anyone**. Copy the `/exec` URL. The script requires the secret for data requests; do not put this secret in frontend code.
4. Upload this project to GitHub or deploy the ZIP through Netlify's Git-based workflow. Netlify build command: `npm run build`; publish directory: `dist`. **Netlify Functions must also deploy**; do not use a static-only drag-and-drop upload for production.
5. In Netlify → Site configuration → Environment variables, set `SHEETS_WEBAPP_URL`, `SHEETS_API_SECRET` (same value as Script Properties), `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL` (verified with Resend), `ENQUIRY_TO_EMAIL=info@gcbc.com.au`. Leave `ENABLE_ENQUIRIES=false` until ready. Trigger a deploy after changing environment variables.
6. Test catalog, tiller-only configurations, remote controls/gauges, price calculations and successful email delivery. Set `ENABLE_ENQUIRIES=true` after final review.
7. Local testing: `npm install`, `npx netlify dev` with `.env` based on `.env.example` (never commit secrets).

## Image placeholders

- Motor photos: `public/images/motors/<Model>.webp` e.g. `F90.webp`, `F250XSB.webp`.
- Control/gauge/upgrade photos: `public/images/options/<OptionID>.webp` e.g. `C704.webp`, `G6Y8.webp`.
- Images are optional and cards remain usable without them. For standard 703, 6X9, 6Y5, 6Y8 and CL5 choices, image support can be expanded by assigning a static path in `src.jsx`.

## Critical checks before launch

- The source workbook contains **27 rows**, but the F25 is **not yet present**. Add a verified F25 model and price with `R2025T` before offering F25. The app only lists horsepower choices with a model in the sheet.
- The manual F20 has temporary model ID `F20-MANUAL-TBC`. Replace it with the confirmed Yamaha model code.
- Every outboard currently has `Review before publish` status. Confirm prices and model compatibility before enabling enquiries.
- F20/F25 are tiller-only; no forward controls or gauges for those packages.
- The XCB V6 outboards require **hydraulic steering fitted separately**. The rigging price excludes a new hydraulic steering system. Assess this in the formal quote.
- Level 3 and Level 4 cannot both be selected. Level 3/4 availability and GPSMAP requirements require confirmation per model.
- Source sheet promotions are disabled and **not applied** to indicative estimates until approved and implemented.
- Assessment-only extras (old motor removal, batteries, wiring, steering system etc.) are excluded from the estimator.
- Check actual option availability and control/gauge compatibility against Yamaha specs. The app derives eligible options from the spreadsheet, not arbitrary universal assumptions.
- The website never exposes the pricing table, but the **final total is public** and a visitor can obtain totals for different selections. This is unavoidable for a public estimator and is not a substitute for commercial access control.
- This starter build emails enquiries through Resend. It does not automatically save them to a CRM or customer database.

## Pricing rules

The Netlify server retrieves current pricing from Google Sheets for each estimate, calculates motor + exactly one compatible rigging package + compatible selected options, and returns **only the final total**. The browser receives no individual prices. Server-side validation rejects invalid combinations and mutually exclusive AP3/AP4 selections. Netlify server credentials must never be prefixed `VITE_`.


## Netlify Forms (November 2026 update)
This build uses **Netlify Forms**, not Resend, for enquiries. The hidden HTML form in `index.html` registers the form at build time; the React form posts URL-encoded values to `/`.

After deploying through GitHub, open **Netlify → Forms** and confirm `yamaha-repower-enquiry` is detected. Configure a form submission email notification to `info@gcbc.com.au` in Netlify. Send a test enquiry, confirm it appears in Netlify submissions, and confirm the email notification arrives. Netlify Forms must be enabled for the site; check your plan's form usage limits.

`ENABLE_ENQUIRIES`, `RESEND_API_KEY`, and `ENQUIRY_FROM_EMAIL` are no longer used by the customer enquiry flow. The old `netlify/functions/enquiry.mjs` is removed from this distribution. Keep `SHEETS_WEBAPP_URL` and `SHEETS_API_SECRET` set for pricing. Netlify Forms submission values, including the price, are customer-supplied and must be independently verified before preparing a binding quote.
