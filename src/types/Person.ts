export interface Person {
  name?: string;
  position?: string;
  bio?: string;
  socialLink?: string;
  email?: string;
  image?: {
    url: string;
    alt?: string;
  };
}