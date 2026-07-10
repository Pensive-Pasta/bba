import { createClient } from '@sanity/client';

export const sanity = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: "production",
  apiVersion: import.meta.env.SANITY_API_VERSION,
  useCdn: false, // useCdn: false when using tokens
  token: import.meta.env.SANITY_API_TOKEN,
});