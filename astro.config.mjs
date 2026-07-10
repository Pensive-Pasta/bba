import { defineConfig } from "astro/config";

export default defineConfig({
  site: import.meta.env.PUBLIC_SITE_URL ?? "https://wearebba.co.uk",
});
