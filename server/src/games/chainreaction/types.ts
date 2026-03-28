export interface Cell {
  orbs: number;
  owner: string | null; // playerId
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  colorIndex: number; // 0-7
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  scores: Map<string, number>;
  board: Cell[][];
  rows: number;
  cols: number;
  currentTurn: string | null;
  turnOrder: string[]; // player IDs in order
  eliminatedPlayers: Set<string>;
  winner: string | null;
  phase: RoomPhase;
  moveCount: number;
  createdAt: number;
}

export type RoomPhase = 'lobby' | 'playing' | 'game-over';
