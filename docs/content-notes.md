# Content decisions

## Hero pass — 30 October 2026

- Display name: Rasyadwa Arsya. Appears once in the page body, in the hero.
- Fifth-semester Information Technology student, Universitas Gadjah Mada.
- Focus: data, AI, cloud, IoT. Describe interests and project experience without claiming an employed professional title.
- User states available now and seeking a six-month internship starting January 2027. Preserve both statements; do not infer an end date or change the start to today.
- Email and LinkedIn are from the supplied résumé. Résumé CTA serves an unchanged local copy of the supplied PDF; the user says this is not the latest version. Replace it when the revised CV arrives.
- LinkedIn direct access returned HTTP 999. Public search excerpts confirm UGM Information Technology education and IoT/AI background; they are supporting context, not a substitute for a complete profile read.
- Source résumé: `C:\UGM\Rasyadwa Arsya Irnantyanto\CV_RasyadwaArsya-updated.pdf`. Extracted with document-intake/MarkItDown. SHA256: `0c0adf2c815a44b93a1f23009201e40011c3c13a4f784f7b074c8f81dd2eaf0c`.
- Résumé summary supports hands-on IoT, embedded AI, full-stack development, hardware/firmware/cloud/user-facing applications. No GPA, phone number, scores, or extra credentials needed in the hero.
- Keep `noindex, nofollow` during local development; review before launch.

## Next: selected projects, user order

1. HydroConnect — supplied CV lists Vice Project Director, Power Generation & Instrumentation, IEEE SIGHT × PT Telkom Indonesia CSR. Verify current scope, personal contributions, evidence, and dates in the project pass.
2. OSTOSENSE — supplied CV lists AI Engineer, edge inference on ESP32-S3, sensor time-series features, ordinal risk classification. Verify demo/disclosure boundaries and results in the project pass.
3. Fish boids simulation in Unity — supplied CV describes a Unity/C# fish-schooling simulation with water-current disturbances. Confirm project name, visuals, and repository.
4. AWS cloud coursework project — user references a previously made AWS architecture diagram. Its actual architecture, service list, name, and evidence are not present in this chat or supplied CV. Obtain those sources in the project pass; do not invent an architecture from the mention.

## Horizontal content pass — 30 October 2026

User prioritizes a complete horizontal pass over detailed case studies. Four project summaries now appear in the requested order, with short role/context/technology metadata and no invented repository/demo destinations. AWS stays generic: only its coursework and AWS identity are supplied; architecture and services remain unverified.

Experience now summarizes HydroConnect, Technocorner, FIND IT!, and KMTETI social affairs from the CV. Education adds UGM Information Technology and the expected 2028 graduation. Highlights show national PKM-KC funding, KIHAJAR STEM finalist, DataCamp deep learning, and Cisco Introduction to Networks. Projected impact figures, grades, selection scores, medical performance claims, and ambiguous date mappings from the CV are omitted.

Contact now has internship copy and working email/LinkedIn actions. Footer email/résumé/LinkedIn links remain functional. Source/résumé links do not imply updated CV content. No personal phone number is added to the site.

Open source, Notes, Off the clock, Contributions, Guestbook, the contact scene, and the music widget remain accepted placeholders because no corresponding original material/account integrations were supplied. These are remaining content tasks, not completed features. No deep project pages, extra research, animations, or deployment in this pass.

Latest link preferences: hero has exactly two actions (Get in touch and My résumé). LinkedIn appears only in the footer. Credly is added to the footer using the exact user-supplied dashboard URL, `https://www.credly.com/earner/dashboard/home`; this is not a verified public badge profile. Astro check/build passed; generated HTML verified for two hero links, one LinkedIn link, and the supplied Credly destination.

## GitHub, guestbook, and identity assets — 30 October 2026

- HydroSense replaces Technocorner in Experience, from the user's LinkedIn screenshot: Project Lead at UGM, October 2026–present; water treatment/pumping/IoT coordination for an initial target of 25 households. Keep the target distinct from a delivered outcome.
- Off the clock, Open source, and Notes are deferred and removed from homepage composition. Their source components remain available for future work. Activity replaces Notes in navigation.
- Public links supplied by the user: GitHub `https://github.com/rsyarsya`, source `https://github.com/rsyarsya/rsyaPortoWebsite`, Credly `https://www.credly.com/users/rasyadwa-arsya-irnantyanto` (supersedes dashboard URL).
- GitHub GraphQL snapshot covers 31 October 2025–30 October 2026: 270 contributions over 365 days; 46 within October 2026. Source period and fetch time are recorded in the JSON. No repository names, access tokens, or private event details are saved. Initial site push will occur after the snapshot and is not included in these counts.
- Refresh through `npm run sync:github`, using local GitHub CLI authentication. No credential is sent to the browser and builds do not require live GitHub access.
- Guestbook layout reference: `https://rimzzlabs.com/guestbook/`. Original Astro implementation follows its intro/composer/entries arrangement. Sign-in and posting remain disabled; anonymous UI is a preview with working open/back/focus behavior. No copied visitor messages, fake signatures, persistence, or OAuth setup.
- Favicon is a format/size conversion of the user-supplied portrait; 32/48/180/192px variants retain the image's appearance and transparency. CV remains the supplied version.
- User explicitly requested an initial source push to the empty GitHub repository. No website hosting/deployment was requested.
