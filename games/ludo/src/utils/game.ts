// Ludo — Classic Indian Board Game
// 4 players, 4 tokens each
// Standard board: 52 main squares + 4 home columns (6 each) + 4 bases
// Players: 0=Red, 1=Blue, 2=Yellow, 3=Green (clockwise)

export type PlayerIndex = 0 | 1 | 2 | 3;

export interface Token {
  player: PlayerIndex;
  index: number;      // 0-3
  position: number;   // -1 = base, 0-56 = relative position on track (0=start, 51=last main, 52-57=home column)
  finished: boolean;
}

export const PLAYERS = [0, 1, 2, 3] as const;
export const TOKENS_PER_PLAYER = 4;
export const TRACK_LENGTH = 52; // Main board squares
export const HOME_COLUMN_LENGTH = 6;
export const FINISH_POS = TRACK_LENGTH + HOME_COLUMN_LENGTH; // 58 = finished

// Starting positions for each player on the main track (absolute indices 0-51)
export const START_POS: Record<PlayerIndex, number> = { 0: 0, 1: 13, 2: 26, 3: 39 };

// Safe squares (absolute): star positions + start positions
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Convert relative position to absolute main board position
export function toAbsolute(player: PlayerIndex, relPos: number): number {
  if (relPos < 0 || relPos >= TRACK_LENGTH) return -1; // base or home column
  return (START_POS[player] + relPos) % TRACK_LENGTH;
}

export const PLAYER_COLORS = ['#e74c3c', '#0984e3', '#fdcb6e', '#00b894'] as const;
export const PLAYER_NAMES = ['Red', 'Blue', 'Yellow', 'Green'] as const;

export interface GameState {
  tokens: Token[];
  currentPlayer: PlayerIndex;
  diceValue: number | null;
  diceRolled: boolean;
  consecutiveSixes: number;
  gameOver: boolean;
  rankings: PlayerIndex[]; // Order of finishing
  message: string;
}

export function createInitialState(): GameState {
  const tokens: Token[] = [];
  for (const p of PLAYERS) {
    for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
      tokens.push({ player: p, index: i, position: -1, finished: false });
    }
  }
  return {
    tokens,
    currentPlayer: 0,
    diceValue: null,
    diceRolled: false,
    consecutiveSixes: 0,
    gameOver: false,
    rankings: [],
    message: 'Roll the dice!',
  };
}

/** Roll dice: returns 1-6 */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Get tokens for a specific player */
export function getPlayerTokens(state: GameState, player: PlayerIndex): Token[] {
  return state.tokens.filter(t => t.player === player);
}

/** Check if a token can move with the given dice value */
export function canMoveToken(_state: GameState, token: Token, dice: number): boolean {
  if (token.finished) return false;

  // In base: need a 6 to come out
  if (token.position === -1) return dice === 6;

  const newPos = token.position + dice;

  // Can't overshoot finish
  if (newPos > FINISH_POS) return false;

  // In home column (pos >= 52): no captures possible, just check bounds
  if (newPos >= TRACK_LENGTH) return true;

  // On main track: destination is valid
  return true;
}

/** Get all movable tokens for current player */
export function getMovableTokens(state: GameState): Token[] {
  if (!state.diceRolled || state.diceValue === null) return [];
  return getPlayerTokens(state, state.currentPlayer).filter(t =>
    canMoveToken(state, t, state.diceValue!)
  );
}

/** Apply dice roll to state */
export function applyDiceRoll(state: GameState): GameState {
  const dice = rollDice();
  const newState = { ...state, diceValue: dice, diceRolled: true };

  const movable = getMovableTokens(newState);

  if (movable.length === 0) {
    // No valid moves — pass turn
    return {
      ...newState,
      message: `${PLAYER_NAMES[state.currentPlayer]} rolled ${dice} — no moves!`,
      ...advanceTurn(newState, false),
    };
  }

  return {
    ...newState,
    message: `${PLAYER_NAMES[state.currentPlayer]} rolled ${dice}`,
  };
}

function advanceTurn(state: GameState, gotSix: boolean): Partial<GameState> {
  if (state.gameOver) return {};

  let nextPlayer = state.currentPlayer;
  let consecutiveSixes = state.consecutiveSixes;

  if (gotSix && consecutiveSixes < 2) {
    // Same player rolls again (up to 3 sixes)
    consecutiveSixes++;
    return {
      diceValue: null,
      diceRolled: false,
      consecutiveSixes,
      message: `${PLAYER_NAMES[state.currentPlayer]} gets another turn!`,
    };
  }

  // Move to next active player
  consecutiveSixes = 0;
  for (let i = 1; i <= 4; i++) {
    const candidate = ((state.currentPlayer + i) % 4) as PlayerIndex;
    const candidateTokens = getPlayerTokens(state, candidate);
    if (candidateTokens.some(t => !t.finished)) {
      nextPlayer = candidate;
      break;
    }
  }

  return {
    currentPlayer: nextPlayer,
    diceValue: null,
    diceRolled: false,
    consecutiveSixes: 0,
    message: `${PLAYER_NAMES[nextPlayer]}'s turn — roll the dice!`,
  };
}

/** Move a token and return new state */
export function moveToken(state: GameState, tokenPlayer: PlayerIndex, tokenIndex: number): GameState {
  if (!state.diceRolled || state.diceValue === null) return state;

  const token = state.tokens.find(t => t.player === tokenPlayer && t.index === tokenIndex);
  if (!token || !canMoveToken(state, token, state.diceValue)) return state;

  const tokens = state.tokens.map(t => ({ ...t }));
  const moving = tokens.find(t => t.player === tokenPlayer && t.index === tokenIndex)!;
  const dice = state.diceValue;
  let gotCapture = false;

  if (moving.position === -1) {
    // Coming out of base
    moving.position = 0;
  } else {
    const newPos = moving.position + dice;

    if (newPos === FINISH_POS) {
      // Reached home!
      moving.position = FINISH_POS;
      moving.finished = true;
    } else {
      moving.position = newPos;
    }
  }

  // Check for captures (only on main track, not safe squares)
  if (!moving.finished && moving.position >= 0 && moving.position < TRACK_LENGTH) {
    const absPos = toAbsolute(moving.player, moving.position);
    if (!SAFE_SQUARES.has(absPos)) {
      const captured = tokens.filter(
        t => t.player !== moving.player && !t.finished && t.position >= 0 && t.position < TRACK_LENGTH
          && toAbsolute(t.player, t.position) === absPos
      );
      for (const c of captured) {
        c.position = -1; // Send back to base
        gotCapture = true;
      }
    }
  }

  // Check rankings
  const rankings = [...state.rankings];
  const playerTokens = tokens.filter(t => t.player === tokenPlayer);
  if (playerTokens.every(t => t.finished) && !rankings.includes(tokenPlayer)) {
    rankings.push(tokenPlayer);
  }

  const gameOver = rankings.length >= 3; // 3 players finished = game over
  const gotSix = dice === 6;

  let message = '';
  if (moving.finished) {
    message = `${PLAYER_NAMES[tokenPlayer]} token reached home!`;
  } else if (gotCapture) {
    message = `${PLAYER_NAMES[tokenPlayer]} captured an opponent!`;
  }

  const newState: GameState = {
    tokens,
    currentPlayer: state.currentPlayer,
    diceValue: state.diceValue,
    diceRolled: state.diceRolled,
    consecutiveSixes: state.consecutiveSixes,
    gameOver,
    rankings,
    message: message || state.message,
  };

  // Extra turn for six or capture
  const shouldReroll = gotSix || gotCapture;

  return {
    ...newState,
    ...advanceTurn(newState, shouldReroll),
  };
}

/** Simple AI: prefer captures > coming out on 6 > furthest token > random */
export function getAiTokenChoice(state: GameState): { player: PlayerIndex; index: number } | null {
  const movable = getMovableTokens(state);
  if (movable.length === 0) return null;
  const dice = state.diceValue!;

  // 1. Check for captures
  for (const token of movable) {
    let testPos = token.position === -1 ? 0 : token.position + dice;
    if (testPos >= TRACK_LENGTH || testPos === FINISH_POS) continue;
    const absPos = toAbsolute(token.player, testPos);
    if (SAFE_SQUARES.has(absPos)) continue;
    const enemy = state.tokens.find(
      t => t.player !== token.player && !t.finished && t.position >= 0 && t.position < TRACK_LENGTH
        && toAbsolute(t.player, t.position) === absPos
    );
    if (enemy) return { player: token.player, index: token.index };
  }

  // 2. Bring out a token if rolled 6
  if (dice === 6) {
    const inBase = movable.find(t => t.position === -1);
    if (inBase) return { player: inBase.player, index: inBase.index };
  }

  // 3. Move token closest to finish
  const sorted = [...movable].sort((a, b) => b.position - a.position);
  return { player: sorted[0].player, index: sorted[0].index };
}

// Board layout helpers for rendering
// The Ludo board is 15x15 grid. Each player's home column, start, and path can be computed.
// For simplicity, we'll render using CSS grid with piece overlays.

export interface BoardCell {
  row: number;
  col: number;
  type: 'path' | 'home-column' | 'safe' | 'start' | 'center' | 'base' | 'empty';
  player?: PlayerIndex; // Owner for colored cells
  absIndex?: number;    // Absolute track position for path cells
}

// Map absolute track position to grid coordinates
const PATH_COORDS: [number, number][] = [];

// Build the standard Ludo path (52 squares, clockwise starting from Red's start)
// Top-left = (0,0), board is 15x15
function buildPath() {
  // Red start (left side, going up): absolute 0-4 → col 6, rows 13→9
  // Then top arm left→right: abs 5-10 → row 8, cols 5→0
  // Then up: abs 11 → col 0, row 7→6
  // Then right: abs 12 → row 6, cols 0→5
  // ... this is complex. Let me define the path segments:

  // Standard Ludo board path coordinates (15x15 grid):
  // Going clockwise, starting at Red's entry (bottom-center-left)

  // Segment: Red start → going up along column 6
  const coords: [number, number][] = [
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], // abs 0-4
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // abs 5-10
    [0, 7], [0, 6], // abs 11-12 (corner + turn)
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // abs 13-17
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // abs 18-23
    [7, 0], [8, 0], // abs 24-25 (corner + turn)
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // abs 26-30
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // abs 31-36
    [14, 7], [14, 8], // abs 37-38 (corner + turn)
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // abs 39-43
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // abs 44-49
    [7, 14], [6, 14], // abs 50-51 (corner + last before Red's home)
  ];

  for (const c of coords) {
    PATH_COORDS.push(c);
  }
}

buildPath();

export function getPathCoord(absIndex: number): [number, number] {
  return PATH_COORDS[absIndex];
}

// Home column coordinates for each player (6 squares leading to center)
const HOME_COLUMNS: Record<PlayerIndex, [number, number][]> = {
  0: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Red: row 7, cols 13→8
  1: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],     // Blue: col 7, rows 1→6
  2: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],      // Yellow: row 7, cols 1→6
  3: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],   // Green: col 7, rows 13→8
};

export function getHomeColumnCoord(player: PlayerIndex, step: number): [number, number] {
  return HOME_COLUMNS[player][step];
}

// Base areas (2x2 in each corner)
const BASE_AREAS: Record<PlayerIndex, [number, number][]> = {
  0: [[10, 10], [10, 12], [12, 10], [12, 12]], // Red: bottom-right
  1: [[2, 10], [2, 12], [4, 10], [4, 12]],     // Blue: top-right (swapped to match standard)
  2: [[2, 2], [2, 4], [4, 2], [4, 4]],         // Yellow: top-left
  3: [[10, 2], [10, 4], [12, 2], [12, 4]],     // Green: bottom-left
};

export function getBaseCoord(player: PlayerIndex, tokenIdx: number): [number, number] {
  return BASE_AREAS[player][tokenIdx];
}

/** Get the grid position for a token */
export function getTokenGridPos(token: Token): [number, number] {
  if (token.finished) return [7, 7]; // Center
  if (token.position === -1) return getBaseCoord(token.player, token.index);
  if (token.position >= TRACK_LENGTH) {
    const step = token.position - TRACK_LENGTH;
    return getHomeColumnCoord(token.player, step);
  }
  const abs = toAbsolute(token.player, token.position);
  return getPathCoord(abs);
}
