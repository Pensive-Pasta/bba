// Shared by the existing Project, Insight and Studio block arrays.
const galleryBlockProjection = `
_type == "galleryBlock" => {
  heading,
  presentation,
  "images": coalesce(images, [])[]{
    _key,
    altText,
    decorative,
    caption,
    editorialLayout,
    crop,
    hotspot,
    asset->{ url, altText, metadata{ dimensions{ width, height } } }
  }
}`;

// Keep detail eligibility in one place, including for route enumeration.
export const caseStudyCondition = `_type == "project" && !(_id in path("drafts.**")) &&
  caseStudyEnabled == true && defined(slug.current) &&
  (defined(heroImage.asset->url) || defined(heroVideo.asset->url)) &&
  count(contentBlocks[_type == "textBlock" && length(pt::text(content)) > 0]) > 0`;

export const projectSummaryProjection = `
  _id,
  projectNumber,
  title,
  slug,
  postCode,
  county,
  year,
  type,
  typology,
  includeInWorkIndex,
  caseStudyEnabled,
  "caseStudyText": pt::text(contentBlocks[_type == "textBlock"].content[]),
  heroImage{ altText, decorative, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } },
  "heroVideo": heroVideo.asset->{ url, mimeType },
  "imageUrl": heroImage.asset->url
`;

export const getHomePageQuery = `*[_type == "homePage"][0]{
  title,
  intro,
  "projectTiles": coalesce(projectTiles, [])[]{
    display,
    label,
    "project": project->{${projectSummaryProjection}}
  },
  "mediaProjects": *[_type == "project" && !(_id in path("drafts.**")) &&
    defined(postCode) && postCode != "" &&
    defined(heroImage.asset->url)]{${projectSummaryProjection}},
  "postcodeProjects": *[_type == "project" && !(_id in path("drafts.**")) &&
    defined(postCode) && postCode != ""]{_id, postCode},
  landingHeading,
  landingText,
  heroImage{ altText, decorative, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } },
  "heroVideo": heroVideo.asset->{ url, mimeType },
  mobileHeroImage{ altText, decorative, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } },
  "mobileHeroVideo": mobileHeroVideo.asset->{ url, mimeType },
  "landingFallbackProject": *[_type == "project" && slug.current == "copper-house"][0]{
    title,
    postCode,
    heroImage{ altText, decorative, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  },
  featuredPage{
    pageTitle,
    pageSlug
  },
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  }
}`;

export const getWorkPageQuery = `*[_type == "workPage"][0]{
  title,
  description,
  "projects": coalesce(projects, [])[]->{${projectSummaryProjection}},
  "indexProjects": *[_type == "project" && !(_id in path("drafts.**")) && includeInWorkIndex == true]{${projectSummaryProjection}},
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  }
}`;

export const getCaseStudiesQuery = `*[${caseStudyCondition}]{${projectSummaryProjection}}`;

export const getProjectBySlugQuery = `
*[${caseStudyCondition} && slug.current == $slug][0]{
  ${projectSummaryProjection},
  "altText": heroImage.altText,
  mobileHeroImage{ altText, decorative, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } },
  "mobileHeroVideo": mobileHeroVideo.asset->{ url, mimeType },
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  },
  // Default to [] if missing
  "contentBlocks": coalesce(contentBlocks, [])[]{
    _type,
    _key,
    // imageBlock: default images to []
    _type == "imageBlock" => {
      "images": coalesce(images, [])[]{
        altText,
        decorative,
        caption,
        size,
        asset->{ url, altText, metadata{ dimensions{ width, height } } }
      }
    },
    // textBlock
    _type == "textBlock" => { content },
    ${galleryBlockProjection}
  },
      credits[] {
    label,
    value
  }
}
`;

export const getStudioPageQuery = `*[_type == "studioPage"][0]{
  // Content blocks for sections
  "profileBlocks": coalesce(profileBlocks, [])[]{
    _type,
    _key,
    _type == "imageBlock" => {
      "images": coalesce(images, [])[]{
        altText,
        decorative,
        caption,
        size,
        asset->{ url, altText, metadata{ dimensions{ width, height } } }
      }
    },
    _type == "textBlock" => { content },
    ${galleryBlockProjection}
  },

  "valuesBlocks": coalesce(valuesBlocks, [])[]{
    _type,
    _key,
    _type == "imageBlock" => {
      "images": coalesce(images, [])[]{
        altText,
        decorative,
        caption,
        size,
        asset->{ url, altText, metadata{ dimensions{ width, height } } }
      }
    },
    _type == "textBlock" => { content },
    ${galleryBlockProjection}
  },

  "awardsBlocks": coalesce(awardsBlocks, [])[]{
    _type,
    _key,
    _type == "imageBlock" => {
      "images": coalesce(images, [])[]{
        altText,
        decorative,
        caption,
        size,
        asset->{ url, altText, metadata{ dimensions{ width, height } } }
      }
    },
    _type == "textBlock" => { content },
    ${galleryBlockProjection}
  },

  // Single text block for People intro
  "peopleIntro": peopleIntro.content,

  // People list
  "people": coalesce(people, [])[]{
    name,
    position,
    bio,
    socialLink,
    email,
    "image": {
      "url": image.asset->url,
      "alt": coalesce(image.alt, image.asset->altText),
      "decorative": image.decorative
    }
  },

  // SEO
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  }
}`;

export const getInsightPageQuery = `*[_type == "insightPage"][0]{
  title,
  description,
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  }
}`;

const insightCondition = `_type == "insight" && !(_id in path("drafts.**")) && defined(slug.current)`;

export const getInsightsQuery = `*[${insightCondition}] | order(publishedAt desc){
  _id,
  title,
  slug,
  type,
  "publishedAt": coalesce(publishedAt, _createdAt)
}`;

export const getInsightBySlugQuery = `
*[${insightCondition} && slug.current == $slug][0]{
  _id,
  slug,
  title,
  _updatedAt,
  "publishedAt": coalesce(publishedAt, _createdAt),
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  },
  "contentBlocks": coalesce(contentBlocks, [])[]{
    _type,
    _key,
    _type == "imageBlock" => {
      "images": coalesce(images, [])[]{
        altText,
        decorative,
        caption,
        size,
        asset->{ url, altText, metadata{ dimensions{ width, height } } }
      }
    },
    _type == "textBlock" => { content },
    ${galleryBlockProjection}
  }
}
`;

export const getContactPageQuery = `
*[_type=="contactPage"][0]{
  title,
  description,
  email,
  tel,
  manchesterTel,
  mapCards{
    locationA{ label, addressLines, postcodeBadge, mapsLink, embedSrc },
    locationB{ label, addressLines, postcodeBadge, mapsLink, embedSrc }
  },
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  }
}
`;

export const getLegalPageQuery = `
*[_type=="legalPage"][0]{
  title,
  lastUpdated,
  body,
  seo{
    metaTitle,
    metaDescription,
    ogImage{ altText, crop, hotspot, asset->{ url, altText, metadata{ dimensions{ width, height } } } }
  }
}
`;
