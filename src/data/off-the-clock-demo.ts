import photo1 from '../assets/off-the-clock/demo/photo-1.jpg';
import photo2 from '../assets/off-the-clock/demo/photo-2.jpg';
import photo3 from '../assets/off-the-clock/demo/photo-3.jpg';
import photo4 from '../assets/off-the-clock/demo/photo-4.jpg';
import photo5 from '../assets/off-the-clock/demo/photo-5.jpg';
import photo6 from '../assets/off-the-clock/demo/photo-6.jpg';
import game0 from '../assets/off-the-clock/demo/stardew.jpg';
import game1 from '../assets/off-the-clock/demo/hollow-knight.jpg';
import game2 from '../assets/off-the-clock/demo/celeste.jpg';
import game3 from '../assets/off-the-clock/demo/portal-2.jpg';
import game4 from '../assets/off-the-clock/demo/terraria.jpg';
import game5 from '../assets/off-the-clock/demo/hades.jpg';
import game6 from '../assets/off-the-clock/demo/outer-wilds.jpg';
import game7 from '../assets/off-the-clock/demo/undertale.jpg';
import game8 from '../assets/off-the-clock/demo/journey.jpg';
import type { OffTheClockCollection } from './off-the-clock';

const gameCovers = [game0, game1, game2, game3, game4, game5, game6, game7, game8];

const asset = (name: string) => `/images/off-the-clock/demo/${name}`;

// Design preview only. These are not claims about the owner's life or tastes.
export const demoCollection: OffTheClockCollection = {
  demo: true,
  photos: [
    { id: 'hills', src: photo1.src, image: photo1, alt: 'Layers of green hills in morning mist', caption: 'Between the hills', width: 1200, height: 715 },
    { id: 'forest', src: photo2.src, image: photo2, alt: 'Sunlight falling through a green forest', caption: 'A little further into the woods', width: 1200, height: 799 },
    { id: 'ocean', src: photo3.src, image: photo3, alt: 'Ocean waves and an open horizon', caption: 'Room to breathe', width: 1200, height: 800 },
    { id: 'lake', src: photo4.src, image: photo4, alt: 'A quiet lake surrounded by mountains', caption: 'The long way home', width: 1200, height: 800 },
    { id: 'trees', src: photo5.src, image: photo5, alt: 'A woodland scene framed by tall trees', caption: 'Looking up', width: 1200, height: 800 },
    { id: 'outside', src: photo6.src, image: photo6, alt: 'A sunlit landscape beneath an open sky', caption: 'An afternoon outside', width: 1200, height: 800 },
  ],
  games: [
    ['stardew', 'Stardew Valley'], ['hollow-knight', 'Hollow Knight'], ['celeste', 'Celeste'],
    ['portal-2', 'Portal 2'], ['terraria', 'Terraria'], ['hades', 'Hades'],
    ['outer-wilds', 'Outer Wilds'], ['undertale', 'Undertale'], ['journey', 'Journey'],
  ].map(([id, title], index) => ({ id, title, cover: gameCovers[index].src, image: gameCovers[index], status: index === 0 || index === 5 ? 'playing' : 'played', formativeRank: index + 1,
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
  lastVisited: { name: 'Somewhere by the water', location: 'Sample postcard', photo: photo4.src, image: photo4, alt: 'Mountains reflected in a lake', date: '', note: 'A photo, a place, and a small memory. Your latest stop will live here.' },
};
