import type { HeroImage, HeroVideo } from "./HeroMedia";

export interface Project {
  _id?: string;
  projectNumber?: string;
  title: string;
  slug?: {
    current: string;
  };
  postCode: string;
  county?: string;
  year?: number;
  type?: "urban" | "inter-urban" | "rural";
  typology?: string;
  includeInWorkIndex?: boolean;
  caseStudyEnabled?: boolean;
  caseStudyText?: string;
  heroImage?: HeroImage;
  heroVideo?: HeroVideo;
  imageUrl?: string;
}
