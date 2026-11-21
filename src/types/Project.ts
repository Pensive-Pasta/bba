import type { HeroImage } from "./HeroMedia";

export interface Project {
  title: string;
  slug: {
    current: string;
  };
  postCode: string;
  county?: string;
  year?: number;
  type?: "urban" | "inter-urban" | "rural";
  heroImage?: HeroImage;
  imageUrl?: string;
}