# Discharge and Transition Project

Public site: https://dtp.lxportal.space/

This repository owns the discharge information, carer pages and staff call forms. The layout and forms are retained.

Community support has moved to [Community Navigator](https://navigator.lxportal.space/), maintained in [OPlyons/Navigator](https://github.com/OPlyons/Navigator). All Find support links and legacy `#support` bookmarks open that site. Staff area choices can be passed as a public area identifier; form details are never passed.

The directory data, search implementation, downloadable area directories and scheduled source reviews have one owner: Navigator. Older directory asset URLs redirect there. The existing same-origin API proxy remains for cached copies of the old page during the transition; its Worker is maintained in Navigator.

## Development

Use Node 24. Run `npm ci`, `npm run build`, `npm run check` and `npm test`. The browser suite checks discharge navigation, support redirects, call downloads and accessibility on desktop and phone. GitHub Actions runs the checks.

Cloudflare Pages project `cnwl-discharge-project` builds main using `npm run build && npm run check` and publishes `dist`. Preview branch deployments are disabled.

Sentry receives only sanitised technical errors. Search text, form information, replay, sessions and visitor tracking are excluded. Public source files and form downloads must not contain completed care records.
