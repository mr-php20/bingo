export interface Player {
  id: string;
  name: string;
  socketId: string;
  color: 'red' | 'blue';
}

export interface Line {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  scores: Map<string, number>;
  gridSize: number; // number of dots per row/col (e.g. 5 => 4x4 boxes)
  lines: Set<string>; // "r1,c1,r2,c2"
  boxes: Map<string, string>; // "r,c" => playerId who completed it
  currentTurn: string | null;
  phase: RoomPhase;
  createdAt: number;
}

export type RoomPhase = 'lobby' | 'playing' | 'game-over';

export function lineKey(r1: number, c1: number, r2: number, c2: number): string {
  // Normalize so smaller point comes first
  if (r1 > r2 || (r1 === r2 && c1 > c2)) {
    return `${r2},${c2},${r1},${c1}`;
  }
  return `${r1},${c1},${r2},${c2}`;
}

export function boxKey(r: number, c: number): string {
  return `${r},${c}`;
}
