import type { Room, Player, RoundState } from './types.js';
import { resetPlayerState } from './rooms.js';

const GRID_SIZE = 5;
const TOTAL_NUMBERS = 25;
const LINES_TO_WIN = 5;

/**
 * Validate that a grid is a proper 5x5 arrangement of numbers 1-25, each used exactly once.
 */
export function validateGrid(grid: number[][]): boolean {
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE) return false;

  const seen = new Set<number>();
  for (let r = 0; r < GRID_SIZE; r++) {
    if (!Array.isArray(grid[r]) || grid[r].length !== GRID_SIZE) return false;
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c];
      if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > TOTAL_NUMBERS) return false;
      if (seen.has(val)) return false;
      seen.add(val);
    }
  }
  return seen.size === TOTAL_NUMBERS;
}

/**
 * Submit a player's grid. Returns true if both players have submitted.
 */
export function submitGrid(room: Room, playerId: string, grid: number[][]): boolean {
  if (!validateGrid(grid)) {
    throw new Error('Invalid grid: must be 5x5 with numbers 1-25 each used exactly once');
  }

  const player = room.players.get(playerId);
  if (!player) throw new Error('Player not found');

  player.grid = grid;
  player.marked = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  player.ready = true;
  player.completedLines = 0;

  // Check if both players have submitted
  let allReady = true;
  for (const p of room.players.values()) {
    if (!p.ready) {
      allReady = false;
      break;
    }
  }

  if (allReady) {
    // Initialize round state
    const players = Array.from(room.players.keys());
    const firstPlayerIndex = (room.currentRound - 1) % players.length;
    room.roundState = {
      gridsSubmitted: players.length,
      currentTurn: players[firstPlayerIndex],
      calledNumbers: [],
      winner: null,
    };
    room.phase = 'playing';
  }

  return allReady;
}

/**
 * Find the position of a number on a player's grid.
 */
function findNumberOnGrid(player: Player, num: number): { row: number; col: number } | null {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (player.grid[r][c] === num) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Count completed lines (rows, columns, diagonals) on a player's marked grid.
 */
export function countCompletedLines(marked: boolean[][]): number {
  let count = 0;

  // Check rows
  for (let r = 0; r < GRID_SIZE; r++) {
    if (marked[r].every(v => v)) count++;
  }

  // Check columns
  for (let c = 0; c < GRID_SIZE; c++) {
    let complete = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!marked[r][c]) { complete = false; break; }
    }
    if (complete) count++;
  }

  // Check main diagonal (top-left to bottom-right)
  let diagComplete = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!marked[i][i]) { diagComplete = false; break; }
  }
  if (diagComplete) count++;

  // Check anti-diagonal (top-right to bottom-left)
  let antiDiagComplete = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!marked[i][GRID_SIZE - 1 - i]) { antiDiagComplete = false; break; }
  }
  if (antiDiagComplete) count++;

  return count;
}

/**
 * Process a number call. Marks the number on both grids and checks for wins.
 * Returns the result for both players.
 */
export function callNumber(
  room: Room,
  callerId: string,
  num: number
): {
  players: { id: string; completedLines: number; markedCell: { row: number; col: number } | null }[];
  winner: string | null;
} {
  const rs = room.roundState;
  if (!rs) throw new Error('No active round');
  if (rs.currentTurn !== callerId) throw new Error('Not your turn');
  if (num < 1 || num > TOTAL_NUMBERS) throw new Error('Invalid number');
  if (rs.calledNumbers.includes(num)) throw new Error('Number already called');

  rs.calledNumbers.push(num);

  const results: { id: string; completedLines: number; markedCell: { row: number; col: number } | null }[] = [];

  // Mark the number on all players' grids
  for (const player of room.players.values()) {
    const pos = findNumberOnGrid(player, num);
    if (pos) {
      player.marked[pos.row][pos.col] = true;
    }
    player.completedLines = countCompletedLines(player.marked);
    results.push({
      id: player.id,
      completedLines: player.completedLines,
      markedCell: pos,
    });
  }

  // Check for winner — caller has priority if both reach 5
  let winner: string | null = null;
  const caller = room.players.get(callerId);
  if (caller && caller.completedLines >= LINES_TO_WIN) {
    winner = callerId;
  } else {
    // Check other player
    for (const player of room.players.values()) {
      if (player.id !== callerId && player.completedLines >= LINES_TO_WIN) {
        winner = player.id;
        break;
      }
    }
  }

  if (winner) {
    rs.winner = winner;
    room.phase = 'round-end';

    // Update series scores
    const currentScore = room.scores.get(winner) ?? 0;
    room.scores.set(winner, currentScore + 1);
  } else {
    // Switch turn (round-robin)
    const playerIds = Array.from(room.players.keys());
    const currentIdx = playerIds.indexOf(callerId);
    rs.currentTurn = playerIds[(currentIdx + 1) % playerIds.length];
  }

  return { players: results, winner };
}

/**
 * Check if the series is over (a player has won majority of rounds).
 */
export function checkSeriesWin(room: Room): { seriesOver: boolean; winnerId: string | null } {
  const winsNeeded = Math.ceil(room.series.bestOf / 2);

  for (const [playerId, score] of room.scores) {
    if (score >= winsNeeded) {
      room.phase = 'series-end';
      return { seriesOver: true, winnerId: playerId };
    }
  }
  return { seriesOver: false, winnerId: null };
}

/**
 * Start the next round in a series. Resets player grids, increments round counter.
 */
export function nextRound(room: Room): void {
  room.currentRound++;
  room.roundState = null;
  room.phase = 'setup';

  for (const player of room.players.values()) {
    resetPlayerState(player);
  }
}

/**
 * Reset the entire series for a rematch.
 */
export function resetSeries(room: Room): void {
  room.currentRound = 1;
  room.roundState = null;
  room.phase = 'setup';

  for (const [pid] of room.scores) {
    room.scores.set(pid, 0);
  }

  for (const player of room.players.values()) {
    resetPlayerState(player);
  }
}

/**
 * Continue playing after a series ends. Keeps scores, starts a new round.
 */
export function continueGame(room: Room): void {
  room.currentRound++;
  room.roundState = null;
  room.phase = 'setup';

  for (const player of room.players.values()) {
    resetPlayerState(player);
  }
}
