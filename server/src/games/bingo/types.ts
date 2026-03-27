export interface Player {
  id: string;
  name: string;
  socketId: string;
  grid: number[][];      // 5x5 grid, 0 = empty
  marked: boolean[][];   // 5x5, true = struck out
  completedLines: number;
  ready: boolean;
}

export interface SeriesConfig {
  bestOf: number; // must be odd: 1, 3, 5, 7, ...
  hideOpponentStatus: boolean;
}

export interface RoundState {
  gridsSubmitted: number;
  currentTurn: string;        // player id whose turn it is
  calledNumbers: number[];    // numbers called so far
  winner: string | null;      // player id of round winner
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  series: SeriesConfig;
  scores: Map<string, number>;  // player id -> rounds won
  currentRound: number;         // 1-based
  roundState: RoundState | null;
  phase: RoomPhase;
  createdAt: number;
}

export type RoomPhase =
  | 'lobby'       // waiting for players / configuring series
  | 'setup'       // players arranging their grids
  | 'playing'     // game in progress
  | 'round-end'   // showing round result
  | 'series-end'; // showing series result

// --- Socket event payloads ---

export interface CreateRoomPayload {
  playerName: string;
}

export interface JoinRoomPayload {
  code: string;
  playerName: string;
}

export interface SetSeriesPayload {
  bestOf: number;
}

export interface SubmitGridPayload {
  grid: number[][];
}

export interface CallNumberPayload {
  number: number;
}

// Server -> Client events
export interface RoomCreatedEvent {
  code: string;
  playerId: string;
}

export interface RoomJoinedEvent {
  playerId: string;
  players: { id: string; name: string }[];
}

export interface PlayerJoinedEvent {
  player: { id: string; name: string };
}

export interface SeriesUpdatedEvent {
  bestOf: number;
}

export interface GameStartEvent {
  phase: 'setup';
}

export interface GridsReadyEvent {
  currentTurn: string;
}

export interface NumberCalledEvent {
  number: number;
  calledBy: string;
  players: {
    id: string;
    completedLines: number;
    markedCell: { row: number; col: number } | null;
  }[];
}

export interface RoundWonEvent {
  winnerId: string;
  winnerName: string;
  scores: { id: string; name: string; score: number }[];
  currentRound: number;
  seriesOver: boolean;
}

export interface PlayerLeftEvent {
  playerId: string;
  playerName: string;
}

export interface ErrorEvent {
  message: string;
}
