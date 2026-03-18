export interface PlayerInfo {
  id: string;
  name: string;
}

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
}

export type Screen = 'home' | 'lobby' | 'setup' | 'playing' | 'round-end' | 'series-end';

export interface GameState {
  screen: Screen;
  playerId: string | null;
  playerName: string;
  roomCode: string | null;
  isHost: boolean;
  players: PlayerInfo[];
  bestOf: number;
  hideOpponentStatus: boolean;
  // Grid setup
  grid: number[][];         // 5x5, 0 = empty
  placementStack: number[]; // cell indices in order placed
  gridReady: boolean;
  readyCount: number;
  // Gameplay
  currentTurn: string | null;
  calledNumbers: number[];
  marked: boolean[][];     // 5x5
  myCompletedLines: number;
  playersCompletedLines: Record<string, number>;
  // Round/Series
  currentRound: number;
  scores: PlayerScore[];
  roundWinner: { id: string; name: string } | null;
  seriesOver: boolean;
  // Error
  error: string | null;
}

export const initialGameState: GameState = {
  screen: 'home',
  playerId: null,
  playerName: '',
  roomCode: null,
  isHost: false,
  players: [],
  bestOf: 1,
  hideOpponentStatus: false,
  grid: Array.from({ length: 5 }, () => Array(5).fill(0)),
  placementStack: [],
  gridReady: false,
  readyCount: 0,
  currentTurn: null,
  calledNumbers: [],
  marked: Array.from({ length: 5 }, () => Array(5).fill(false)),
  myCompletedLines: 0,
  playersCompletedLines: {},
  currentRound: 1,
  scores: [],
  roundWinner: null,
  seriesOver: false,
  error: null,
};
