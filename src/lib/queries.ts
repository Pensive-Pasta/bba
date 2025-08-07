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