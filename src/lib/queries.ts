export const getWorkPageQuery = `*[_type == "workPage"][0]{
  title,
  description
}`;

export const getProjectsQuery = `*[_type == "project"] | order(year desc){
  title,
  slug,
  postCode,
  county,
  year,
  type,
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
    _type == "textBlock" => { content }
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
    _type == "textBlock" => { content }
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
    _type == "textBlock" => { content }
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
    _type == "textBlock" => { content }
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
},
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
    _type == "textBlock" => { content }
  }
}
`;