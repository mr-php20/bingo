export type Point = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';

export const GRID_SIZE = 20;

export function createInitialSnake(): Point[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

export function generateFood(snake: Point[]): Point {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
  const empty: Point[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

export function moveSnake(snake: Point[], direction: Direction): Point[] {
  const head = snake[0];
  let newHead: Point;
  switch (direction) {
    case 'up': newHead = { x: head.x, y: head.y - 1 }; break;
    case 'down': newHead = { x: head.x, y: head.y + 1 }; break;
    case 'left': newHead = { x: head.x - 1, y: head.y }; break;
    case 'right': newHead = { x: head.x + 1, y: head.y }; break;
  }
  return [newHead, ...snake.slice(0, -1)];
}

export function growSnake(snake: Point[]): Point[] {
  return [...snake, snake[snake.length - 1]];
}

export function checkCollision(snake: Point[]): boolean {
  const head = snake[0];
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) return true;
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return true;
  }
  return false;
}

export function isOpposite(d1: Direction, d2: Direction): boolean {
  return (d1 === 'up' && d2 === 'down') || (d1 === 'down' && d2 === 'up') ||
         (d1 === 'left' && d2 === 'right') || (d1 === 'right' && d2 === 'left');
}
