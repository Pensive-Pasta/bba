export interface Project {
  title: string;
  slug: {
    current: string;
  };
  postCode: string;
  county: string;
  year: number;
  type: "urban" | "inter-urban" | "rural";
  imageUrl: string;
}