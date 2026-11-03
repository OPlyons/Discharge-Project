# Discharge and Transition Project

Public site: https://dtp.lxportal.space/

This repository owns the discharge information, carer pages and staff call forms. The layout and forms are retained.

Community support has moved to [Community Navigator](https://navigator.lxportal.space/), maintained in [OPlyons/Navigator](https://github.com/OPlyons/Navigator). All Find support links and legacy `#support` bookmarks open that site. Staff area choices can be passed as a public area identifier; form details are never passed.

The directory data, search implementation, downloadable area directories and scheduled source reviews have one owner: Navigator. Older directory asset URLs redirect there. The existing same-origin API proxy remains for cached copies of the old page during the transition; its Worker is maintained in Navigator.

## Development

Use Node 24. Run `npm ci`, `npm run build`, `npm run check` and `npm test`. The browser suite checks discharge navigation, support redirects, call downloads and accessibility on desktop and phone. GitHub Actions runs the checks.

Cloudflare Pages project `cnwl-discharge-project` builds main using `npm run build && npm run check` and publishes `dist`. Preview branch deployments are disabled.

Sentry receives only sanitised technical errors. Search text, form information, replay, sessions and visitor tracking are excluded. Public source files and form downloads must not contain completed care records.

## Workbook forms

The four staff forms use large numbered headings, a pale page background and white answer boxes. Multiline Word controls sit in rows with minimum heights and may continue across pages, so longer notes are not clipped. The call forms keep feedback and recording together. Original asset URLs remain stable.

Frutiger is specified in the editable documents. The supplied font files permit preview/print embedding only; they are not embedded in the editable forms or distributed by the website. Install the licensed Frutiger Light and Bold fonts locally for authoring and accurate visual checks. Word substitutes an available font when Frutiger is absent.

To regenerate the forms, use Python with `python-docx`:

```sh
python scripts/build-person-call-form.py
python scripts/build-support-workbooks.py
python scripts/rebuild-word-packs.py
npm run build
npm run check
```

Render and inspect every form after layout changes, including a long-answer copy to check page flow. `word-packs.json` is generated from the same four blank DOCX files; its Area and Team placeholders support the existing customised download. Update the asset checksum fixture after checking intentional document changes. Keep completed forms and font binaries out of the repository.

## Safety and borough crisis guidance

The offer form records relevant risks, agreed safety steps and the service safeguarding lead. The coordinator confirms these with the caller. Staff enter personal details in Word and the agreed NHS record, never in the website.

`config/crisis-pathways.json` holds sourced borough crisis routes and the actual source-check date. The same data builds the urgent-help page and the local crisis appendix in each customised Word download. Selecting a borough is visible in the staff workspace; generic downloads retain emergency and NHS 111 guidance. Service access rules remain explicit: walk-in alternatives are distinct from A&E-referred Lighthouse support. Check provider notices and current access before use.

After editing the forms or generic crisis appendix, regenerate all four DOCX files and `word-packs.json`, render the blank and customised forms, inspect their page flow, and update only the intentionally changed asset checksums. Borough route text is inserted from the crisis configuration when a customised form is downloaded. For changes confined to that text, rebuild the site and verify the downloaded forms; the generic blank assets do not need regeneration.

Navigator owns the shared crisis wording. This project's `config/crisis-pathways.json` must match its reviewed copy in full. See the [3 November 2026 source review](maintenance/crisis-guidance-review-2026-11-03.md) for the eligibility decisions and supporting sources.

The read-only `Shared crisis guidance` workflow compares every field against Navigator. PR checks use the exact Navigator commit in `config/crisis-source.json` to support paired changes. Main pushes, daily runs and manual runs always compare with Navigator's current main, so an old pin cannot hide later drift. A missing source, invalid JSON or a difference fails the check; the workflow cannot edit, merge or deploy. It checks consistency rather than clinical correctness, and scheduled checks detect changes after they occur.

To update shared guidance, verify NHS/provider sources, change Navigator, copy the reviewed JSON here and record its exact Navigator commit in `config/crisis-source.json`. Open paired PRs and run the comparison locally with `node scripts/check-crisis-consistency.mjs ../navigator/config/crisis-pathways.json`. After approval, merge Navigator first, then this project, and confirm the main-branch comparison passes.
