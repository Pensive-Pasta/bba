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