// Aadu Puli Aattam (Goats & Tigers)
// Board: 23 points on a triangular grid
// 3 Tigers, 15 Goats
// Phase 1: Goat player places goats on empty points
// Phase 2: Both sides move; tigers can jump over goats to capture
// Tigers win if they capture 5+ goats; Goats win if all 3 tigers are trapped

export type Piece = 'tiger' | 'goat' | null;
export type Player = 'tiger' | 'goat';
export type Phase = 'placing' | 'moving';

// Board layout: 5 rows
// Row 0: 1 point (apex)
// Row 1: 3 points
// Row 2: 5 points
// Row 3: 3 points (inner triangle base, optional)
// Actually, use the classic Pulijudam board:
// 5x5 grid of intersections forming the base square + triangle on top
// Classic layout: a 5×5 grid with diagonals, plus a triangle on one side.
//
// Simpler encoding: use node IDs 0-22 with an adjacency list.
// Standard Aadu Puli Aattam board (Lambs and Tigers):
//
//       0
//      / \
//     1---2
//    /|\ /|\
//   3-4-5-6-7
//    \|/ \|/
//     8---9
//      \ /
//      10
//   (plus the extension below forming a square base)
//
// Actually, the most common south Indian board is a triangle grid:
//
// Let me use the standard 5-row triangle + inverse triangle (23 nodes):
// More commonly it's played on a simpler 25-point board or 23-point board.
//
// Let's use the classic "Puliattam" board which is a triangle:
//       0
//      / \
//     1---2
//    / \ / \
//   3---4---5
//  / \ / \ / \
// 6---7---8---9
//  \ / \ / \ /
//  10--11--12
//   \ / \ /
//   13--14
//    \ /
//    15  -- not standard
//
// Actually, let me use the well-known 5-row board with the base quadrilateral:
// The most standard "Aadu Puli Aattam" board is:
// A 5x5 grid of points forming a diamond/rhombus-like structure.
//
// Simplest correct board: use a triangle (top) + inverted triangle (bottom)
// giving us a hexagonal arrangement. But the MOST classic board is actually
// just a grid:
//
//  0--1--2--3--4
//  |\/|\/|\/|\/|
//  5--6--7--8--9
//  |/\|/\|/\|/\|
// 10-11-12-13-14
//  |\/|\/|\/|\/|
// 15-16-17-18-19
//  |/\|/\|/\|/\|
// 20-21-22-23-24
//
// This is the standard 25-point board for Pulijudam / Aadu Puli Aattam.

export const NUM_POINTS = 25;
export const TOTAL_GOATS = 15;
export const GOATS_TO_WIN = 5; // Tigers win by capturing 5 goats

// Adjacency: orthogonal + diagonal connections on 5×5 grid
// Row r, Col c => index = r*5 + c
// Connections: horizontal, vertical, and diagonal based on standard board

function buildAdjacency(): number[][] {
  const adj: number[][] = Array.from({ length: 25 }, () => []);

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      // Right
      if (c + 1 < 5) {
        adj[i].push(i + 1);
        adj[i + 1].push(i);
      }
      // Down
      if (r + 1 < 5) {
        adj[i].push(i + 5);
        adj[i + 5].push(i);
      }
      // Diagonals: only on squares where (r+c) is even
      if ((r + c) % 2 === 0) {
        // Down-right
        if (r + 1 < 5 && c + 1 < 5) {
          adj[i].push(i + 6);
          adj[i + 6].push(i);
        }
        // Down-left
        if (r + 1 < 5 && c - 1 >= 0) {
          adj[i].push(i + 4);
          adj[i + 4].push(i);
        }
      }
    }
  }

  // Deduplicate
  return adj.map(list => [...new Set(list)].sort((a, b) => a - b));
}

export const ADJACENCY = buildAdjacency();

// For tiger jumps: given tiger at `from`, jumping over `over` to `to`
// `to` must be the mirror of `from` across `over`
function getJumpTarget(from: number, over: number): number | null {
  const fromR = Math.floor(from / 5), fromC = from % 5;
  const overR = Math.floor(over / 5), overC = over % 5;
  const toR = overR + (overR - fromR);
  const toC = overC + (overC - fromC);
  if (toR < 0 || toR >= 5 || toC < 0 || toC >= 5) return null;
  const to = toR * 5 + toC;
  // Verify the jump direction is a valid adjacency
  if (!ADJACENCY[from].includes(over)) return null;
  if (!ADJACENCY[over].includes(to)) return null;
  return to;
}

export interface GameState {
  board: Piece[];
  turn: Player;
  phase: Phase;
  goatsPlaced: number;
  goatsCaptured: number;
  selectedPoint: number | null;
  gameOver: boolean;
  winner: Player | null;
}

export function createInitialState(): GameState {
  const board: Piece[] = Array(NUM_POINTS).fill(null);
  // Tigers start at 4 corners
  board[0] = 'tiger';
  board[4] = 'tiger';
  board[20] = 'tiger';
  // Some variants place tigers differently; using 3 tigers at top + bottom-left
  return {
    board,
    turn: 'goat', // Goat always goes first
    phase: 'placing',
    goatsPlaced: 0,
    goatsCaptured: 0,
    selectedPoint: null,
    gameOver: false,
    winner: null,
  };
}

export interface MoveInfo {
  type: 'place' | 'move' | 'jump';
  from?: number;
  to: number;
  captured?: number;
}

/** Get all valid moves for the current player */
export function getValidMoves(state: GameState): MoveInfo[] {
  const moves: MoveInfo[] = [];
  const { board, turn, phase, goatsPlaced } = state;

  if (turn === 'goat') {
    if (phase === 'placing' && goatsPlaced < TOTAL_GOATS) {
      // Place on any empty point
      for (let i = 0; i < NUM_POINTS; i++) {
        if (board[i] === null) moves.push({ type: 'place', to: i });
      }
    } else {
      // Move goats
      for (let i = 0; i < NUM_POINTS; i++) {
        if (board[i] !== 'goat') continue;
        for (const adj of ADJACENCY[i]) {
          if (board[adj] === null) {
            moves.push({ type: 'move', from: i, to: adj });
          }
        }
      }
    }
  } else {
    // Tiger: can move to adjacent empty, or jump over goat
    for (let i = 0; i < NUM_POINTS; i++) {
      if (board[i] !== 'tiger') continue;
      // Normal moves
      for (const adj of ADJACENCY[i]) {
        if (board[adj] === null) {
          moves.push({ type: 'move', from: i, to: adj });
        }
      }
      // Jumps
      for (const adj of ADJACENCY[i]) {
        if (board[adj] !== 'goat') continue;
        const target = getJumpTarget(i, adj);
        if (target !== null && board[target] === null) {
          moves.push({ type: 'jump', from: i, to: target, captured: adj });
        }
      }
    }
  }

  return moves;
}

/** Apply a move and return new state */
export function applyMove(state: GameState, move: MoveInfo): GameState {
  const board = [...state.board];
  let { goatsPlaced, goatsCaptured, phase } = state;

  if (move.type === 'place') {
    board[move.to] = 'goat';
    goatsPlaced++;
    if (goatsPlaced >= TOTAL_GOATS) phase = 'moving';
  } else if (move.type === 'move') {
    board[move.to] = board[move.from!];
    board[move.from!] = null;
  } else if (move.type === 'jump') {
    board[move.to] = board[move.from!];
    board[move.from!] = null;
    board[move.captured!] = null;
    goatsCaptured++;
  }

  const nextTurn: Player = state.turn === 'goat' ? 'tiger' : 'goat';

  const newState: GameState = {
    board,
    turn: nextTurn,
    phase,
    goatsPlaced,
    goatsCaptured,
    selectedPoint: null,
    gameOver: false,
    winner: null,
  };

  // Check win conditions
  if (goatsCaptured >= GOATS_TO_WIN) {
    newState.gameOver = true;
    newState.winner = 'tiger';
  } else {
    // Check if tigers are trapped (no valid moves for tiger)
    const tigerMoves = getValidMovesFor(newState, 'tiger');
    if (tigerMoves.length === 0 && nextTurn === 'tiger') {
      newState.gameOver = true;
      newState.winner = 'goat';
    }
    // Also check if goats have no moves in moving phase
    if (nextTurn === 'goat' && phase === 'moving') {
      const goatMoves = getValidMovesFor(newState, 'goat');
      if (goatMoves.length === 0) {
        newState.gameOver = true;
        newState.winner = 'tiger';
      }
    }
  }

  return newState;
}

function getValidMovesFor(state: GameState, player: Player): MoveInfo[] {
  const tempState = { ...state, turn: player };
  return getValidMoves(tempState);
}

/** Get moves from a specific point */
export function getMovesFrom(state: GameState, point: number): MoveInfo[] {
  return getValidMoves(state).filter(m => m.from === point);
}

/** Simple AI for tigers: prefer jumps, then greedy */
export function getAiMove(state: GameState): MoveInfo | null {
  const moves = getValidMoves(state);
  if (moves.length === 0) return null;

  // Prefer jumps (captures)
  const jumps = moves.filter(m => m.type === 'jump');
  if (jumps.length > 0) {
    return jumps[Math.floor(Math.random() * jumps.length)];
  }

  // For tigers: move to positions with more jump opportunities
  if (state.turn === 'tiger') {
    let best = moves[0];
    let bestScore = -1;

    for (const move of moves) {
      const next = applyMove(state, move);
      // Count potential future jumps
      const futureMoves = getValidMovesFor({ ...next, turn: 'tiger' }, 'tiger');
      const futureJumps = futureMoves.filter(m => m.type === 'jump').length;
      if (futureJumps > bestScore) {
        bestScore = futureJumps;
        best = move;
      }
    }
    return best;
  }

  // For goat AI (if needed): place/move to block tigers
  return moves[Math.floor(Math.random() * moves.length)];
}

/** Board point positions for rendering (normalized 0-1) */
export function getPointPositions(): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      positions.push({
        x: c / 4,
        y: r / 4,
      });
    }
  }
  return positions;
}

/** Get all lines (edges) for rendering */
export function getEdges(): [number, number][] {
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < NUM_POINTS; i++) {
    for (const j of ADJACENCY[i]) {
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }
  }
  return edges;
}
