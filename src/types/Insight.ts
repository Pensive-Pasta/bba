export interface Insight {
  _id?: string;
  title: string;
  slug: {
    current: string;
  };
  type: "news" | "projects" | "thinking";
  publishedAt: string;
}
