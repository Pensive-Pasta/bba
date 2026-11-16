// Shared by the existing Project, Insight and Studio block arrays.
const galleryBlockProjection = `
_type == "galleryBlock" => {
  heading,
  "images": coalesce(images, [])[]{
    _key,
    altText,
    caption,
    crop,
    hotspot,
    asset->{ url, metadata{ dimensions{ width, height } } }
  }
}`;

export const getHomePageQuery = `*[_type == "homePage"][0]{
  title,
  intro,
  landingHeading,
  landingText,
  heroImage{ altText, crop, hotspot, asset->{ url, metadata{ dimensions{ width, height } } } },
  "heroVideo": heroVideo.asset->{ url, mimeType },
  mobileHeroImage{ altText, crop, hotspot, asset->{ url, metadata{ dimensions{ width, height } } } },
  "mobileHeroVideo": mobileHeroVideo.asset->{ url, mimeType },
  "landingFallbackProject": *[_type == "project" && slug.current == "copper-house"][0]{
    title,
    postCode,
    heroImage{ altText, crop, hotspot, asset->{ url, metadata{ dimensions{ width, height } } } }
  },
  featuredPage{
    pageTitle,
    pageSlug
  },
  seo{
    metaTitle,
    metaDescription,
    ogImage{ asset->{ url } }
  }
}`;

export const getWorkPageQuery = `*[_type == "workPage"][0]{
  title,
  description,
  seo{
    metaTitle,
    metaDescription,
    ogImage{ asset->{ url } }
  }
}`;

export const getProjectsQuery = `*[_type == "project"] | order(year desc){
  title,
  slug,
  postCode,
  county,
  year,
  type,
  heroImage{ crop, hotspot, asset->{ url, metadata{ dimensions{ width, height } } } },
  "heroVideo": heroVideo.asset->{ url, mimeType },
  "imageUrl": heroImage.asset->url
}`;

export const getProjectBySlugQuery = `
*[_type == "project" && slug.current == $slug][0]{
  title,
  postCode,
  county,
  year,
  site,
  type,
  "imageUrl": heroImage.asset->url,
  "altText": heroImage.altText,
  heroImage{ altText, crop, hotspot, asset->{ url, metadata{ dimensions{ width, height } } } },
  "heroVideo": heroVideo.asset->{ url, mimeType },
  mobileHeroImage{ altText, crop, hotspot, asset->{ url, metadata{ dimensions{ width, height } } } },
  "mobileHeroVideo": mobileHeroVideo.asset->{ url, mimeType },
  seo{
    metaTitle,
    metaDescription,
    ogImage{ asset->{ url } }
  },
  // Default to [] if missing
  "contentBlocks": coalesce(contentBlocks, [])[]{
    _type,
    _key,
    // imageBlock: default images to []
    _type == "imageBlock" => {
      "images": coalesce(images, [])[]{
        altText,
        caption,
        size,
        asset->{ url }
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
        caption,
        size,
        asset->{ url }
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
        caption,
        size,
        asset->{ url }
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
        caption,
        size,
        asset->{ url }
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
      "alt": image.alt
    }
  },

  // SEO
  seo{
    metaTitle,
    metaDescription,
    ogImage{ asset->{ url } }
  }
}`;

export const getInsightPageQuery = `*[_type == "insightPage"][0]{
  title,
  seo{
    metaTitle,
    metaDescription,
    ogImage{ asset->{ url } }
  }
}`;

export const getInsightsQuery = `*[_type == "insight"] | order(publishedAt desc){
  title,
  slug,
  type,
  publishedAt
}`;

export const getInsightBySlugQuery = `
*[_type == "insight" && slug.current == $slug][0]{
  title,
  "publishedAt": coalesce(publishedAt, _createdAt),
  seo{
    metaTitle,
    metaDescription,
    ogImage{ asset->{ url } }
  },
  "contentBlocks": coalesce(contentBlocks, [])[]{
    _type,
    _key,
    _type == "imageBlock" => {
      "images": coalesce(images, [])[]{
        altText,
        caption,
        size,
        asset->{ url }
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
  mapCards{
    locationA{ label, addressLines, postcodeBadge, mapsLink, embedSrc },
    locationB{ label, addressLines, postcodeBadge, mapsLink, embedSrc }
  },
  seo{
    metaTitle,
    metaDescription,
    ogImage{ asset->{ url } }
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
    ogImage{ asset->{ url } }
  }
}
`;
