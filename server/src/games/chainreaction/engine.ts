import type { Room, Cell } from './types.js';
import { advanceTurn } from './rooms.js';

/**
 * Critical mass for a cell = number of orthogonal neighbors.
 * Corner = 2, Edge = 3, Interior = 4.
 */
function criticalMass(row: number, col: number, rows: number, cols: number): number {
  let neighbors = 4;
  if (row === 0 || row === rows - 1) neighbors--;
  if (col === 0 || col === cols - 1) neighbors--;
  return neighbors;
}

interface Explosion {
  row: number;
  col: number;
}

export interface MoveResult {
  winner: string | null;
  board: Cell[][];
  explosions: Explosion[][];     // chain of explosion waves
  eliminated: string[];          // player IDs eliminated this move
  capturedCells: { row: number; col: number; from: string; to: string }[];
}

export function placeOrb(room: Room, playerId: string, row: number, col: number): MoveResult {
  if (room.currentTurn !== playerId) throw new Error('Not your turn');
  if (row < 0 || row >= room.rows || col < 0 || col >= room.cols) throw new Error('Invalid cell');

  const cell = room.board[row][col];
  if (cell.owner !== null && cell.owner !== playerId) throw new Error('Cell belongs to another player');

  // Place the orb
  cell.orbs++;
  cell.owner = playerId;
  room.moveCount++;

  // Resolve chain reactions
  const explosions: Explosion[][] = [];
  const capturedCells: MoveResult['capturedCells'] = [];
  const eliminated: string[] = [];

  resolveExplosions(room, explosions, capturedCells);

  // Check eliminations — only after each player has made at least one move
  // (i.e., after the first full round)
  const totalPlayers = room.turnOrder.filter(id => !room.eliminatedPlayers.has(id)).length;
  if (room.moveCount >= totalPlayers) {
    const activePlayers = room.turnOrder.filter(id => !room.eliminatedPlayers.has(id));
    for (const pid of activePlayers) {
      if (pid === playerId) continue; // placer can't be eliminated on their own turn
      const hasOrbs = hasAnyOrbs(room, pid);
      if (!hasOrbs) {
        room.eliminatedPlayers.add(pid);
        eliminated.push(pid);
      }
    }
  }

  // Check win condition
  const remainingActive = room.turnOrder.filter(id => !room.eliminatedPlayers.has(id));
  if (remainingActive.length <= 1 && room.moveCount > room.turnOrder.length) {
    room.winner = remainingActive[0] ?? playerId;
    room.phase = 'game-over';
    room.scores.set(room.winner, (room.scores.get(room.winner) ?? 0) + 1);
    return { winner: room.winner, board: room.board, explosions, eliminated, capturedCells };
  }

  // Advance turn (skip eliminated players)
  advanceTurn(room);

  return { winner: null, board: room.board, explosions, eliminated, capturedCells };
}

function resolveExplosions(
  room: Room,
  explosions: Explosion[][],
  capturedCells: MoveResult['capturedCells'],
): void {
  const { board, rows, cols } = room;
  const maxIterations = rows * cols * 4; // safety limit
  let iterations = 0;

  while (iterations++ < maxIterations) {
    const wave: Explosion[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].orbs >= criticalMass(r, c, rows, cols)) {
          wave.push({ row: r, col: c });
        }
      }
    }
    if (wave.length === 0) break;
    explosions.push(wave);

    // Process all explosions in this wave simultaneously
    const deltas: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const additions: { r: number; c: number; owner: string }[] = [];

    for (const { row, col } of wave) {
      const cell = board[row][col];
      const owner = cell.owner!;
      cell.orbs -= criticalMass(row, col, rows, cols);
      if (cell.orbs <= 0) {
        cell.orbs = 0;
        cell.owner = null;
      }
      for (const [dr, dc] of deltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          additions.push({ r: nr, c: nc, owner });
        }
      }
    }

    for (const { r, c, owner } of additions) {
      const target = board[r][c];
      if (target.owner !== null && target.owner !== owner) {
        capturedCells.push({ row: r, col: c, from: target.owner, to: owner });
      }
      target.orbs++;
      target.owner = owner;
    }
  }
}

function hasAnyOrbs(room: Room, playerId: string): boolean {
  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      if (room.board[r][c].owner === playerId && room.board[r][c].orbs > 0) {
        return true;
      }
    }
  }
  return false;
}
