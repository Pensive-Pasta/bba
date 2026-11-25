# Astro Starter Kit: Minimal

## Production launch configuration

The confirmed production canonical origin is `https://www.wearebba.co.uk`, preserving the
current public URL. Read-only checks found the apex domain redirects to www. The older
checkout setting used the apex domain; the preferred local setting now explicitly uses www.
The application does not hardcode a fallback domain. Set the same confirmed origin in hosting
and retain the apex-to-www redirect before launch.

| Setting | Behaviour |
| --- | --- |
| `PUBLIC_PRODUCTION_SITE_URL` | Set to `https://www.wearebba.co.uk` in every context. Preferred HTTPS canonical origin, with no path/query. |
| `PUBLIC_SITE_URL` | Existing legacy fallback for the canonical origin. It must also be a production URL. |
| Netlify `CONTEXT` | Only `production` enables indexing. Branch deploys, Deploy Previews, preview servers and local development remain noindex. |
| `BBA_DEPLOYMENT_ENV` | Outside Netlify, explicitly set `production` for an indexable production build. Default is development/noindex. |
| `PUBLIC_ALLOW_INDEXING` | Retired and ignored. A leftover staging `false` cannot silently noindex production; `true` cannot index previews. |

If Netlify's production `URL` disagrees with the canonical origin, the build fails with a
configuration error. Preview hostnames cannot be used as canonical origins. A Netlify
Preview Server always stays noindex, even with inherited production variables.

Production builds produce `robots.txt` and a sitemap containing only generated, legitimate
public pages. The enquiry form and 404 page stay noindex and outside the sitemap. Staging
builds produce no sitemap, but allow crawling so search engines can read the noindex meta
directive, following [Google's noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
Canonicals, Open Graph URLs and structured-data URLs always use the configured public origin.

The Sanity client uses the published perspective. Project routes additionally require the
enabled case-study flag, a valid slug, hero media and real editorial text. Insight listings
and routes use Sanity's publication status and require a valid route slug. Article content
and display dates do not control visibility or indexing. Publishing an index-only Project
cannot create a detail route.
CMS publication reaches this static site on its next build; no deployment is performed by
the metadata update scripts.

## Pre-launch review — 25 November 2026

The SEO pass added shared metadata defaults/overrides, correctly sized social images with
crop/hotspot handling, safe JSON-LD serialization, Article dates/identity, a skip link,
keyboard menu focus management, visible focus outlines, image-description fallbacks and
explicit decorative-image support. Existing brand colours and approved content were preserved.

Sanity updates: missing descriptions on the eight enabled case studies and the completed
Olly Roffe article; two inspected article images and four team portraits; an inspected,
face-focused article share image; and removal of a stray closing quote from Work's description.
The backed-up, revision-locked CMS script verifies that other fields and documents are unchanged.

### Editorial items requiring review

Five legacy published Insights still contain Lorem ipsum. They remain visible in the listing,
have working detail routes and appear in the production sitemap because they are published.
Update their content or unpublish them editorially before launch if they are not ready:

- BBA appointed to 20-home Passivhaus development.
- Can we design for a more progressive kind of rural life?
- BBA shortlisted in Architect of the Year Awards.
- How to achieve planning on inter-urban sites.
- The Pumps in Northamptonshire on site.

The Process page still uses five grey placeholder illustrations; these are now correctly
decorative rather than misleading descriptions copied from step headings. Replace or remove
them when approved imagery is available. The Olly portrait is only 384 × 545 pixels; a larger
approved source would improve social-card sharpness. No architectural or image details were
invented from filenames. Existing manually entered descriptions and image text were retained.

### Known contrast issues — colours unchanged pending approval

Normal-sized text needs 4.5:1 contrast. Qualifying large text (24px regular or about 18.7px
bold) and meaningful UI boundaries need 3:1. The approved brand blue `#178FE4` against white
is 3.45:1: retain it for qualifying large text and decorative uses.

| Affected use | Components | Smallest recommendation, not applied |
| --- | --- | --- |
| Normal blue text on white | `TextBlock`, `WorkHeader`, `ProjectIndexTable`, `Breadcrumbs`, `PeopleGrid`, contact/other body copy via the shared body colour | An opt-in text-only blue such as `#106FB2` gives 5.33:1 on white. Leave the main brand colour unchanged. |
| Small white text on brand blue | Footer, header menu copyright/legal text, active `AnimatedPills` labels | Review existing dark text for footer/menu copy, or a darker fill confined to the small active control. No global palette change. |
| White Insight card text on pastel fills | `InsightCard`: green 1.93:1, pink 2.01:1, orange 1.80:1 | Use existing dark foreground text for these labels, preserving tile colours. |
| White text over project photography/tints | `ProjectCard`, `ProjectVideoPreview` | Review each state/image and approve local text backing if needed; a reliable ratio cannot be inferred from the base colour alone. |

These remain documented accessibility issues, not blockers to finishing the other launch
work. No colour change is authorised by this report. Do not claim full WCAG AA compliance
without resolving them and completing manual keyboard/screen-reader and visual review.

The alt-text policy follows [W3C's image decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/).
The Article metadata follows [Google's Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article).

```sh
npm create astro@latest -- --template minimal
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/minimal)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/minimal)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/minimal/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
