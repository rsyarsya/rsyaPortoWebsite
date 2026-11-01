import { demoCollection } from './off-the-clock-demo';
/** Personal collections. Keep titles and personal notes exactly as supplied. */
export interface GalleryPhoto {
  id: string;
  src: string;
  alt: string;
  caption: string;
  location?: string;
  date?: string;
  width: number;
  height: number;
  /** CSS object-position for the homepage crop; the lightbox shows the full photo. */
  position?: string;
}

export interface Game {
  id: string;
  title: string;
  cover: string;
  status: 'playing' | 'played';
  /** 1–9 determines placement in “9 games that made me”. */
  formativeRank?: number;
  note?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  status: 'reading' | 'read' | 'want-to-read';
  note?: string;
  featured?: boolean;
}

export interface VisitedPlace {
  name: string;
  location: string;
  photo: string;
  alt: string;
  date: string;
  note: string;
}

export interface OffTheClockCollection {
  demo: boolean;
  photos: GalleryPhoto[];
  games: Game[];
  books: Book[];
  lastVisited: VisitedPlace | null;
}

// Replace this demo with personal data and set demo: false when ready.
export const offTheClock: OffTheClockCollection = demoCollection;
