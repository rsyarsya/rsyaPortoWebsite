import type { OffTheClockCollection } from './off-the-clock';

const asset = (name: string) => `/images/off-the-clock/demo/${name}`;

// Design preview only. These are not claims about the owner's life or tastes.
export const demoCollection: OffTheClockCollection = {
  demo: true,
  photos: [
    { id: 'hills', src: asset('photo-1.jpg'), alt: 'Layers of green hills in morning mist', caption: 'Between the hills', width: 1200, height: 715 },
    { id: 'forest', src: asset('photo-2.jpg'), alt: 'Sunlight falling through a green forest', caption: 'A little further into the woods', width: 1200, height: 799 },
    { id: 'ocean', src: asset('photo-3.jpg'), alt: 'Ocean waves and an open horizon', caption: 'Room to breathe', width: 1200, height: 800 },
    { id: 'lake', src: asset('photo-4.jpg'), alt: 'A quiet lake surrounded by mountains', caption: 'The long way home', width: 1200, height: 800 },
    { id: 'trees', src: asset('photo-5.jpg'), alt: 'A woodland scene framed by tall trees', caption: 'Looking up', width: 1200, height: 800 },
    { id: 'outside', src: asset('photo-6.jpg'), alt: 'A sunlit landscape beneath an open sky', caption: 'An afternoon outside', width: 1200, height: 800 },
  ],
  games: [
    ['stardew', 'Stardew Valley'], ['hollow-knight', 'Hollow Knight'], ['celeste', 'Celeste'],
    ['portal-2', 'Portal 2'], ['terraria', 'Terraria'], ['hades', 'Hades'],
    ['outer-wilds', 'Outer Wilds'], ['undertale', 'Undertale'], ['journey', 'Journey'],
  ].map(([id, title], index) => ({ id, title, cover: asset(`${id}.jpg`), status: index === 0 || index === 5 ? 'playing' : 'played', formativeRank: index + 1,
    note: 'Demo entry. Your story about this game will go here.' })),
  books: [
    { id: 'little-prince', title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', status: 'reading' },
    { id: 'secret-garden', title: 'The Secret Garden', author: 'Frances Hodgson Burnett', status: 'read' },
    { id: 'alice', title: 'Alice in Wonderland', author: 'Lewis Carroll', status: 'read' },
    { id: 'pride', title: 'Pride and Prejudice', author: 'Jane Austen', status: 'want-to-read' },
    { id: 'moby-dick', title: 'Moby-Dick', author: 'Herman Melville', status: 'read' },
    { id: 'frankenstein', title: 'Frankenstein', author: 'Mary Shelley', status: 'want-to-read' },
  ].map(book => ({ ...book, status: book.status as 'reading' | 'read' | 'want-to-read', cover: asset(`${book.id}.svg`), featured: true,
    note: 'Demo entry. Your reading notes will go here.' })),
  lastVisited: { name: 'Somewhere by the water', location: 'Sample postcard', photo: asset('photo-4.jpg'), alt: 'Mountains reflected in a lake', date: '', note: 'A photo, a place, and a small memory. Your latest stop will live here.' },
};
