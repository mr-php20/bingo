export type Mark = 'X' | 'O' | null;

export interface Player {
  id: string;
  name: string;
  socketId: string;
  mark: Mark;
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  scores: Map<string, number>;
  board: Mark[];
  currentTurn: string | null;
  winner: string | null;
  phase: RoomPhase;
  createdAt: number;
}

export type RoomPhase = 'lobby' | 'playing' | 'round-end';
