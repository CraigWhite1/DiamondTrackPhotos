# DiamondTrackPhotos

Updated to use FastAPI + GIA for certificate retrieval with blob fallback and optional local mocks.

## Setup
- Copy `.env.example` to `.env` and fill FastAPI/GIA auth values. Leave `USE_SQL_FALLBACK=false` unless you intentionally want the old SQL flow.
- For local/offline tests, keep `USE_MOCKS=true`; edit `mocks/certs.sample.json` as needed.
- Install dependencies: `npm install`
- Run: `npm start`

## Certificate flow
1. Call FastAPI for cert number and lab.
2. If lab is GIA, call the GIA endpoint first; otherwise use FastAPI data.
3. If both fail, fall back to blob certificate URL.

## Key files
- [app.js](app.js) — FastAPI/GIA client, blob fallback, mock + SQL fallbacks.
- [views/show.ejs](views/show.ejs) and [views/jewelry.ejs](views/jewelry.ejs) — render media and cert info from the new flow.
- [mocks/certs.sample.json](mocks/certs.sample.json) — sample mock data for offline dev.
- [data.json](data.json) — legacy sample data, currently unused.

## Environment variables
See `.env.example` for the full list. Key ones to set in Azure App Service:
 - `GIA_BASE_URL` (use `https://api.reportresults.gia.edu/` for direct GraphQL), `GIA_API_KEY`, `GIA_AUTH_HEADER=Authorization`
- `BLOB_*` containers for media/cert fallback
- `USE_MOCKS` false in production
- `USE_SQL_FALLBACK` false unless intentionally keeping legacy SQL
