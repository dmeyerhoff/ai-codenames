import type { Card, CardType } from '../types/game';
import { CODENAMES_WORDS } from '../config/wordlists';

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateBoard(): Card[] {
  const words = shuffle(CODENAMES_WORDS).slice(0, 25);

  // Blue goes first: 9 blue, 8 red, 7 bystander, 1 assassin
  const types: CardType[] = [
    ...Array(9).fill('blue'),
    ...Array(8).fill('red'),
    ...Array(7).fill('bystander'),
    'assassin',
  ];
  const shuffledTypes = shuffle(types);

  return words.map((word, i) => ({
    word,
    type: shuffledTypes[i],
    revealed: false,
    position: i,
  }));
}

export function getBoardStateForSpymaster(board: Card[]) {
  const remaining = {
    blue: board.filter(c => !c.revealed && c.type === 'blue').map(c => c.word),
    red: board.filter(c => !c.revealed && c.type === 'red').map(c => c.word),
    bystander: board.filter(c => !c.revealed && c.type === 'bystander').map(c => c.word),
    assassin: board.filter(c => !c.revealed && c.type === 'assassin').map(c => c.word),
  };
  const revealed = {
    blue: board.filter(c => c.revealed && c.type === 'blue').map(c => c.word),
    red: board.filter(c => c.revealed && c.type === 'red').map(c => c.word),
    bystander: board.filter(c => c.revealed && c.type === 'bystander').map(c => c.word),
    assassin: board.filter(c => c.revealed && c.type === 'assassin').map(c => c.word),
  };
  return { remaining, revealed };
}

export function getBoardStateForOperatives(board: Card[]) {
  const revealed = {
    blue: board.filter(c => c.revealed && c.type === 'blue').map(c => c.word),
    red: board.filter(c => c.revealed && c.type === 'red').map(c => c.word),
    bystander: board.filter(c => c.revealed && c.type === 'bystander').map(c => c.word),
    assassin: board.filter(c => c.revealed && c.type === 'assassin').map(c => c.word),
  };
  const unknown = board.filter(c => !c.revealed).map(c => c.word);
  return { revealed, unknown };
}

export function getBoardGrid(board: Card[]): string[][] {
  const grid: string[][] = [];
  for (let row = 0; row < 5; row++) {
    grid.push(board.slice(row * 5, (row + 1) * 5).map(c => c.word));
  }
  return grid;
}
