export interface Insight {
  title: string;
  slug: {
    current: string;
  };
  type: "news" | "projects" | "thinking";
  publishedAt: string;
}