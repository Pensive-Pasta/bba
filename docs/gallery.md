# Reusable image galleries

The optional Gallery block is available in Projects, Insights and Studio's Profile,
Values and Awards content arrays. Existing image/text blocks, alternating layouts,
hero media, homepage, Work grid and decorative grid are unchanged.

## Implementation

Editors can add an optional heading, select existing Sanity images or upload new
ones, supply alt text and optional captions, and drag images into order. A Gallery
requires at least one image; every image requires an asset and nonblank alt text.
There is no maximum image count. The preview shows a thumbnail and image count.
Existing documents need no migration.

Astro renders the images and captions as static HTML, in CMS order. Empty galleries
and images without usable asset metadata are skipped. Native horizontal scrolling,
proximity scroll-snap, proportional image widths and responsive heights provide the
strip. A glimpse of the next image is retained where space allows. Galleries follow
the existing half-width alternating block layout and become full-width on mobile.

Previous/next buttons follow the actual starts of variable-width images. Controls
reflect the scroll range and disappear when no scrolling is needed. The focused
strip supports Left/Right; image links support Tab and Enter. Vertical scrolling
is not intercepted. Reduced-motion preferences are respected.

PhotoSwipe 5.4.4 is the only added dependency. Each Gallery is its own lightbox
group, with zoom, touch gestures, close/previous/next controls, Escape and focus
management. Captions use the documented UI integration and `textContent`, with
their original static captions also available in the page. Long lightbox captions
have a scrollable, keyboard-focusable area.

The Gallery controller is included when a Gallery renders. PhotoSwipe's lightbox
module and CSS load on first image activation; its core is dynamically imported.
Nearby-slide preloading is limited to `[1, 1]`. Custom-element connection and
disconnection handle Astro ClientRouter navigation and listener/instance cleanup.
Without JavaScript, native scrolling, image links and captions remain available.

Thumbnails have responsive Sanity URLs, lazy loading, intrinsic dimensions and
automatic format selection. Larger URLs cap the lightbox's longest edge at 2560px
and never request upscaling. Explicit editorial crops are applied consistently to
both views, and dimensions are calculated from the cropped region. Hotspots are
retained in the query; they do not change framing because no aspect crop is imposed.

References: [PhotoSwipe integration](https://photoswipe.com/getting-started/),
[caption API](https://photoswipe.com/caption/),
[options](https://photoswipe.com/options/).

## Files

CMS (`../bba-cms`):

- `schemaTypes/galleryBlock.ts`: new reusable schema.
- `schemaTypes/index.ts`: registration.
- `schemaTypes/project.ts`, `insight.ts`, `studioPage.ts`: additive block options.
- `scripts/gallery-schema.test.mjs`, `package.json`: validation tests and command.

Frontend:

- `src/components/GalleryBlock.astro`: static markup, native strip and scoped styles.
- `src/components/ContentBlock.astro`, `src/lib/contentBlocks.ts`: dispatch/filtering.
- `src/lib/gallery.ts`: image URLs, crops, dimensions and safe data handling.
- `src/scripts/gallery.ts`, `gallery-navigation.ts`: controls and lifecycle.
- `src/scripts/gallery-lightbox.ts`, `src/styles/gallery-lightbox.css`: lightbox and captions.
- `src/lib/queries.ts`: shared Gallery projection in all five supported arrays.
- `src/types/Gallery.ts`, `src/types/StudioPage.ts`: Gallery type and block union.
- `src/lib/seo.ts`: first-image fallback supports gallery-only Insights.
- `src/scripts/gallery.test.ts`: image, content, navigation and SEO regression tests.
- `package.json`, `package-lock.json`: PhotoSwipe dependency.
- `docs/gallery.md`: this guide.

## Local testing

Use Node 24, as required by the frontend. Existing environment configuration is
used; no new credentials or preview infrastructure are required.

Terminal 1:

```sh
cd /Users/rickybutcher/dev/bba-cms
npm run dev
```

Open `http://localhost:3333` and sign in to the existing Sanity project.

Terminal 2:

```sh
cd /Users/rickybutcher/dev/bba-site
npm run dev
```

Open `http://localhost:4321`.

1. In Sanity, create a test Project with a title, generated slug, typology and
   suitable existing metadata. Add Text, Image, Gallery, Text, Gallery blocks.
2. Give the first Gallery a heading. Select a landscape and a portrait image,
   add alt text/captions and drag to reorder. Try a deliberate crop on one image.
3. Give the second Gallery different photographs. Save and publish the Project.
4. Create a test Insight with title, slug, type and publication date. Add the same
   mixed block sequence and publish it.
5. Restart Astro after creating the new slugs, then visit
   `http://localhost:4321/work/<project-slug>/` and
   `http://localhost:4321/insights/<insight-slug>/`.

The existing client uses API version `2023-01-01` without an explicit perspective.
That version defaults to `raw`: authenticated queries can include drafts as well
as published documents. This feature leaves that policy unchanged. Publish the
test documents for the existing staging workflow; do not rely on draft-only
content as a preview mechanism. Publishing writes to the existing `production`
dataset and may trigger the existing staging build webhook.

Manual interaction checklist:

- Scroll with touch/trackpad; use previous/next and confirm their end states.
- Tab to the strip and use Left/Right. Tab to an image and press Enter.
- Open a non-first image; confirm the selected photo, caption, alt text and zoom.
- Test lightbox arrows, Escape, close button and focus returning to the opener.
- Open Gallery B and confirm it contains only Gallery B's images.
- Check portrait/landscape framing, deliberate crops and narrow/short viewports.
- Test a single image, long caption, optional heading and missing caption.
- Navigate away and back through site links; check controls still act once.
- Enable reduced motion. Disable JavaScript and confirm the strip/links work.
- Check existing project hero videos and existing image/text blocks.

## Automated validation

```sh
cd /Users/rickybutcher/dev/bba-cms
npm run test:gallery
./node_modules/.bin/tsc --noEmit --incremental false
npm run build

cd /Users/rickybutcher/dev/bba-site
npm run check
npm test
npm run build
```

Implementation verification also used temporary fixtures to render Astro HTML,
evaluate the actual GROQ projections, exercise controls in a DOM environment,
extract the Sanity schema and compare delivered Sanity image dimensions. No browser
visual or real touch/zoom interaction testing was performed. Complete the manual
checklist before deployment sign-off.

## Manual deployment

Both repositories already contained uncommitted hero changes. The frontend also
had staged changes. Review the complete index before committing: everything already
staged will be included in a commit. Interactive staging below lets you select
changes in existing files; include or separate the existing hero work intentionally.

### 1. Review and deploy Sanity Studio first

```sh
cd /Users/rickybutcher/dev/bba-cms
git status --short --branch
git diff
git diff --cached
git add schemaTypes/galleryBlock.ts scripts/gallery-schema.test.mjs
git add -p package.json schemaTypes/index.ts schemaTypes/project.ts schemaTypes/insight.ts schemaTypes/studioPage.ts
git diff --cached
git commit -m "Add reusable Gallery content blocks"
git push origin main
npm run deploy
```

Confirm the hosted Studio offers Gallery in Project and Insight Content Blocks.
The existing `npm run deploy` command deploys the configured `wearebba` Studio.

### 2. Review, commit and push Astro staging

```sh
cd /Users/rickybutcher/dev/bba-site
git status --short --branch
git diff
git diff --cached
git add docs/gallery.md src/components/GalleryBlock.astro src/lib/contentBlocks.ts src/lib/gallery.ts src/scripts/gallery.ts src/scripts/gallery-navigation.ts src/scripts/gallery-lightbox.ts src/scripts/gallery.test.ts src/styles/gallery-lightbox.css src/types/Gallery.ts
git add -p package.json package-lock.json src/components/ContentBlock.astro src/lib/queries.ts src/lib/seo.ts src/types/StudioPage.ts
git diff --cached
git commit -m "Render native image galleries with PhotoSwipe"
git push origin staging
```

Wait for the normal staging deployment to succeed.

### 3. Publish Gallery content

Add/publish a Gallery in a Project and an Insight. Confirm that the existing Sanity
publishing webhook starts a staging rebuild. If a manual rebuild is needed, find
the latest Netlify deploy for the **staging branch** and select **Retry with latest
branch commit**. This builds staging's current HEAD against current Sanity content.
See [Netlify's retry documentation](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#retry-deploy-from-latest-branch-commit).

### 4. Verify staging

Repeat the manual checklist at `https://staging--wearebba.netlify.app/`, including
both content types, multiple galleries, desktop/mobile and keyboard use. The public
holding-page deployment remains on its existing release branch.

No commits, pushes, deployments or content publishing were performed during
implementation. Future body video support can be a separate inline Video block;
this Gallery intentionally supports photographs only.
