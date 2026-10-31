# Portfolio blueprint

## Current scope

Two static routes: homepage and `/guestbook/`. Homepage: Header, Intro, Experience, Selected projects, Education, Highlights, Contributions, Guestbook invitation, Contact, Footer. Open source, Notes, and Off the clock are deferred and hidden; their components are retained for later.

Layout and eventual scroll/footer direction follow Rimzz; section breadth follows Ashutoshx7. Hero, Experience, Selected projects, Education, Highlights, and Contact have source-backed content. Contributions uses a checked-in GitHub snapshot, refreshed manually with the CLI. Guestbook has a separate preview route with disabled authentication/posting. Working destinations include email, résumé, LinkedIn, GitHub, source repository, and the public Credly profile. The contact scene is an original canvas water surface (see README); the music widget remains a placeholder. No ASCII background, backend, or deployment. See `content-notes.md` for source decisions.

## Source responsibilities

| Location | Responsibility |
| --- | --- |
| `src/pages/` | Route composition only |
| `src/layouts/` | Document metadata, local fonts, global styles |
| `src/components/layout/` | Container, header, footer |
| `src/components/sections/` | One removable component per homepage section |
| `src/components/ui/` | Section heading, visual placeholder, link/action presentation |
| `src/styles/` | Tokens and shared base/list styles |
| `src/assets/` | Reserved directory for future processed assets |
| `public/` | Reserved directory for future static files such as the CV |

`public/resume/` now holds an unchanged copy of the supplied résumé PDF. `src/assets/` remains empty and may need to be created with the first processed asset. `src/data/profile.ts` holds shared identity and destination values used by the hero and footer.

## Visual decisions

- Source Serif 4 at 400/500: name, headings, introduction. Source Sans 3 at 400/600: lists, navigation, metadata, actions. Latin subsets self-hosted through Fontsource; retain package font licenses when redistributing assets.
- Colors: background `#FAF9F6`, surface `#F0EEE8`, text `#292824`, muted `#69665F`, border `#DDDAD2`, keyboard focus `#456657`.
- Centered, left-aligned 720px maximum column. Section gaps: 80px desktop, 48px mobile. Gutters: 32px desktop, 20px mobile, 16px at 375px and below.
- Desktop begins at 768px. Navigation blends into the page at the top, hides on downward scroll, and appears as a translucent capsule on upward scroll. Below 768px it is a bottom icon dock with directional hiding. Focus/menu interaction keeps navigation available. The name appears only in the hero. List metadata moves beneath titles on mobile. Footer link groups remain three compact columns on mobile, with its identity/widget row stacked above them.
- Off the clock is one framed personal collection with four static windows: a large creative-work panel, two stacked interest panels, and a wide note panel. At 540px and below the windows become a single column. Window dots are decorative, not controls. All visual media and the footer listening widget remain explicit placeholders.
- Name: 44/36px; section titles: 28/25px; body: 17px with 1.65 line height; metadata: 14px. Paragraphs are limited to 65ch.
- Visual panels: 12px radius. Contact scene: 16:9, a canvas water surface over a CSS still-frame fallback. List separators are thin and quiet. No decorative numbering, custom cursor, shadow kit, or entrance effects.

## Component contracts

- `SectionHeading`: required `id` and `title`; renders an h2. The parent section references its ID using `aria-labelledby`.
- `Placeholder`: required `label`; optional `variant` of `visual`, `compact`, or `scene`.
- `PortfolioLink`: required `label`, optional `href`, optional `appearance` of `text` or `action`. Missing destinations render as noninteractive spans, never dead anchors.
- Navigation points to homepage anchors `intro`, `projects`, `contributions`, plus `/guestbook/`. Contact remains accessible through hero/footer. Shared navigation/footer route back to the homepage from the guestbook. Utilities provide light/dark theme and animation/layout settings. Language remains deferred until translations exist.
- No public API or content schema yet. Introduce typed data only when a vertical pass establishes actual content requirements.

## Next vertical passes

1. Current priority: horizontal completeness. Professional summaries and contact are populated from supplied evidence; project details stay brief.
2. Remaining professional sections: choose actual material or omit unsupported slots before launch.
3. Off the clock: personal interests, assets, captions.
4. Contact/footer: scene direction and optional music widget. Public profile/source links are populated.
5. Motion and background: smooth scrolling, footer animation, ASCII, reduced-motion handling, performance.
6. Deep case studies only when the user returns to vertical refinement.

Choose content and interaction details within each pass. Do not implement all planned features merely because a slot exists.

## Acceptance checks

Run `npm run check` and `npm run build`. Check widths 360, 390, 768, 1024, 1440px for overflow and layout changes. Verify anchors, keyboard focus, heading order, fonts, noninteractive missing destinations, and scene ratio. Save desktop/mobile screenshots to `output/playwright/`. The blueprint has `noindex, nofollow`; revisit metadata before launch.
