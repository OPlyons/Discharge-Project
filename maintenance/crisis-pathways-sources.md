# Crisis pathways source check

Checked on 3 November 2026. This records the public NHS and provider information used in `config/crisis-pathways.json`. Opening times and access can change; staff should check the linked service page and the person's current crisis plan before arranging support.

## Sources and decisions

| Area or route | Official source | Verified information used |
| --- | --- | --- |
| Emergency and urgent help | [NHS urgent mental health help](https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/) | Immediate danger, serious injury or overdose needs 999/A&E. NHS 111's mental health option provides urgent advice. Community support must not delay emergency care. |
| Brent, Harrow, Hillingdon, Kensington and Chelsea, Westminster | [CNWL MHCAS](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/st-charles-hospital/mental-health-crisis-assessment-service-mhcas) | Adult walk-in access at St Charles Hospital is available around the clock, without a referral, for residents of these five boroughs who have no urgent physical health need. The five shared entries state the residency condition explicitly. A&E and professional referral routes also exist; the guide describes the direct walk-in option. |
| London SPA and Milton Keynes out of hours | [CNWL Single Point of Access](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/single-point-access) | CNWL's service page describes coverage for the five London boroughs and Milton Keynes out of hours. The shared Milton Keynes entry retains this distinction alongside its separate local crisis contact. |
| Milton Keynes crisis advice | [CNWL emergency guidance](https://www.cnwl.nhs.uk/patients-and-carers/help-mental-physical-health-crisis) | The general page also lists a separate Milton Keynes crisis contact and encourages existing patients to contact their usual team in working hours. The guide keeps NHS 111 available at all times and the crisis contact in the care plan; it does not describe the London SPA as the sole daytime Milton Keynes route. |
| London Coves | [CNWL The Coves](https://www.cnwl.nhs.uk/services/coves) | The detailed access section permits walk-ins daily from 2pm to 10pm. Minimum age is 16 in Brent, Harrow and Hillingdon, and 18 in Kensington and Chelsea/Westminster. Locations were checked against the page. This is community support for distress, separate from emergency assessment. |
| Kensington and Chelsea/Westminster Cove | [Hestia KCW Cove notice](https://www.hestia.org/FAQs/kensington-chelsea-and-westminster-cove) | Hestia currently reports restricted support and no telephone contact, with visits at North Paddington Food Bank, 57 Goldney Road. Keep that warning beside the NHS opening information. The canonical notice was checked here; the existing shared service link is preserved in this PR. |
| Hillingdon Lighthouse | [CNWL Hillingdon Lighthouse](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/hillingdon-hospital/lighthouse-hillingdon-hospital-uxbridge) | Adult access requires assessment and referral from Hillingdon A&E. Listed opening is 8am to 8pm. It is not a direct walk-in route. |
| St Mary's Lighthouse | [CNWL St Mary's Lighthouse](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/lighthouse-st-marys-hospital-paddington) | Adult access requires St Mary's A&E referral. Listed opening is 8am to 9pm daily. Do not confuse this clinical service with the KCW Cove. |
| Camden clinical crisis route | [North London NHS crisis referrals](https://www.northlondonmentalhealth.nhs.uk/crisis-referrals) | Camden and Islington have their own Crisis SPA, available at all times. Camden is not mapped to CNWL's MHCAS walk-in catchment. |
| Camden Crisis Sanctuary | [Hestia Camden Crisis Sanctuary](https://www.hestia.org/camden-crisis-sanctuary) | Free adult walk-in support for Camden residents or people who have used mental health services there. Provider hours are 5.30pm to 10.30pm daily, at 50-52 Hampstead Road. Council listings show different opening times; the guide follows the provider. |
| Milton Keynes Crisis Cafe | [Mind BLMK Crisis Cafe](https://www.mind-blmk.org.uk/how-we-can-help/milton-keynes/crisis-cafe-milton-keynes/) | Adults can drop in without an appointment, 5pm to 11pm daily. The provider lists Queensway in Bletchley; the guide directs readers to the current venue details before travel. |
| Surrey and North East Hampshire | [Surrey and Borders Partnership Safe Havens](https://www.sabp.nhs.uk/our-services/mental-health/safe-havens) | Adult walk-in and online support is listed daily from 6pm to 11pm, with no referral or appointment. Five locations are listed. |
| Ealing | [West London NHS Safe Spaces](https://www.westlondon.nhs.uk/our-services/adult/communuty-services/safe-spaces) | Adult eligibility includes Ealing residence, an Ealing GP or caring for a resident. Daily hours are 2pm to 10pm, with last drop-in by 9.30pm. The guide retains the Wolsey Wing location and no planned appointments. |

PR #3 was merged during this work and already provides the MHCAS/Milton Keynes corrections and cross-project consistency workflow. This PR builds on that release and leaves the shared crisis configuration and Navigator source pin unchanged. DTP-specific guidance about community support is held separately in `config/workbook-guidance.json` and used by both the website and blank Word forms.

## Staff handover

The offer form already asks about relevant risks, safety steps and the service safeguarding lead. The coordinator now has a separate editable box for the lead's name, role and contact, alongside the clinical and backup contacts. Staff must confirm these locally; no named safeguarding officer is inferred from public information. Missing checks are resolved before the call, and the caller's acceptance is recorded.

Personal care information stays in the agreed NHS record and Word documents. The website only holds optional area/team choices in memory. The same crisis configuration supplies the public guidance, the staff preview and all four customised Word downloads. Blank forms retain emergency, urgent, age and community guidance and a link to the local routes.

## Publication after Oscar's approval

1. Review this source record, the PR diff and regenerated forms. Recheck any provider notice that has changed since this source check.
2. Require the PR's build, unit, desktop/phone and accessibility checks to pass. Merge only after Oscar approves this PR.
3. The existing Cloudflare Pages integration builds `main` with `npm run build && npm run check` and publishes `dist` to `dtp.lxportal.space`. This PR does not change deployment configuration. Repository documentation records preview branch deployments as disabled.
4. Confirm the deployed commit using `build-info.json` and the Cloudflare check. Smoke-test urgent help, all borough selectors, the offer risk question, the handover lead field, and blank/customised downloads on desktop and phone. Check the KCW notice and MHCAS/Milton Keynes qualifications in actual downloaded files.

Preparing this PR does not authorise a merge or production publication. Keep auto-merge off.
