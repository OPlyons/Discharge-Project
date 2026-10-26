# Discharge and Transition Project

The public website for peer support calls after discharge, service users, carers and community support. It includes 878 directory entries, combined call and feedback forms, accessible browsing, and a Community AI Navigator. The private project-management editor is not part of this repository.

Production: https://dtp.lxportal.space

Find support opens a single dashboard with a compact Support wizard, borough map and coloured support icons. Map and icon choices browse locally and can refine existing AI results without another AI request. Find support explicitly runs AI; Search without AI performs local text search. Start again clears the query and every filter.

## Run and check

Use Node.js 24.

```sh
npm ci
npm run build
npm run check
npx playwright install chromium
npm test
npm run dev
```

The local preview runs on port 4173. AI calls are disabled locally; browser tests use synthetic mocked interpretations. Local directory browsing still works. `npm run test:a11y` runs axe checks, and `npm run test:report` opens the browser report. GitHub Actions checks desktop and phone journeys, accessibility and monitoring privacy on each main-branch push and pull request.

## Publish

Cloudflare Pages project `cnwl-discharge-project` builds the `main` branch with `npm run build && npm run check`, publishes `dist`, and uses Node 24. The Pages Functions service binding `NAVIGATOR_API` points to Worker `discharge-community-navigator`. This makes the Navigator endpoint `/api/navigate` on the same origin as the website.

To update the AI Worker after changing `navigator/worker.mjs` or `navigator/shared.mjs`, authenticate Wrangler to the same Cloudflare account and run:

```sh
npm run deploy:api
```

Deploy the Worker before publishing a frontend contract change. Its configuration defines the AI binding, allowed production origins, request limits, rate limits and disabled request logging. The existing `cnwl-discharge-dev` deployment remains separate.

Edit directory records in `data/directory.json`. New records include source and review dates, access and cost notes; optional `facets` use `yoga`, `wellbeing` (meditation or relaxation activities), `talking-therapies` and `peer-support`. National records need explicit verified `national: true` and `coverage`; regional services must not be marked national. The original 786 records are retained unchanged and checked against a baseline digest.

Edit layout and wording in `site/template.html`, directory behaviour in `site/directory.js`, and Navigator behaviour in `site/navigator-ui.js`. Generated `dist` files are not committed. The original four Word forms, PDF packs, logos and favicon are checked against a baseline hash fixture.

## Sentry and privacy

Sentry organisation `oplyons-up`, project `discharge-project`, monitors technical browser errors. Its client DSN in `config/site.json` is public configuration, not an authentication secret. Release IDs use the deployed Git commit; environment is `production`.

Only fixed error codes, release/environment and approved same-origin file/line/column locations are sent. Original error messages, search text, form values, request details, user identifiers, cookies and breadcrumbs are discarded. Session replay, tracing, sessions, logs and metrics are disabled. Both the event hook and the final envelope transport apply a whitelist. IP inference is explicitly disabled; the network providers still process connections under their own data arrangements.

Application JavaScript and the monitoring bundle are not minified, so line numbers identify readable deployed source without publishing source maps. For a controlled setup check, a maintainer can call `window.DTPMonitoring.captureCode('monitoring_check')` and `window.DTPMonitoring.flush()` from the running site. Never pass personal information to monitoring or the Navigator. No Sentry authentication token or onboarding code belongs in Git.

The AI classifies a short, deliberately submitted, non-identifying query. It cannot invent service records or referral routes: the browser ranks canonical directory records. Queries are not stored by this application. Local browsing needs no AI request, and failed AI requests fall back to a clearly labelled local search.

Automated axe checks are a useful regression check; they do not replace checking real keyboard use, mobile navigation, readable wording and service information with people who use the site.
