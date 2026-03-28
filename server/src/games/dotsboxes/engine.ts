import type { Room } from './types.js';
import { lineKey, boxKey } from './types.js';

export function drawLine(
  room: Room,
  playerId: string,
  r1: number, c1: number, r2: number, c2: number,
): { completedBoxes: string[]; gameOver: boolean } {
  if (room.currentTurn !== playerId) throw new Error('Not your turn');

  const gs = room.gridSize;

  // Validate coordinates
  if (r1 < 0 || r1 >= gs || c1 < 0 || c1 >= gs || r2 < 0 || r2 >= gs || c2 < 0 || c2 >= gs) {
    throw new Error('Invalid coordinates');
  }

  // Must be adjacent (horizontal or vertical, distance = 1)
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) {
    throw new Error('Line must connect adjacent dots');
  }

  const key = lineKey(r1, c1, r2, c2);
  if (room.lines.has(key)) throw new Error('Line already drawn');

  room.lines.add(key);

  // Check if this line completes any boxes
  const completedBoxes: string[] = [];
  const maxBox = gs - 1; // grid of (gs-1) x (gs-1) boxes

  if (r1 === r2) {
    // Horizontal line — check box above and below
    const r = r1;
    const c = Math.min(c1, c2);

    // Box above: top-left corner = (r-1, c)
    if (r > 0) {
      const bk = boxKey(r - 1, c);
      if (!room.boxes.has(bk) && isBoxComplete(room, r - 1, c)) {
        room.boxes.set(bk, playerId);
        completedBoxes.push(bk);
      }
    }
    // Box below: top-left corner = (r, c)
    if (r < maxBox) {
      const bk = boxKey(r, c);
      if (!room.boxes.has(bk) && isBoxComplete(room, r, c)) {
        room.boxes.set(bk, playerId);
        completedBoxes.push(bk);
      }
    }
  } else {
    // Vertical line — check box left and right
    const r = Math.min(r1, r2);
    const c = c1;

    // Box to the left: top-left corner = (r, c-1)
    if (c > 0) {
      const bk = boxKey(r, c - 1);
      if (!room.boxes.has(bk) && isBoxComplete(room, r, c - 1)) {
        room.boxes.set(bk, playerId);
        completedBoxes.push(bk);
      }
    }
    // Box to the right: top-left corner = (r, c)
    if (c < maxBox) {
      const bk = boxKey(r, c);
      if (!room.boxes.has(bk) && isBoxComplete(room, r, c)) {
        room.boxes.set(bk, playerId);
        completedBoxes.push(bk);
      }
    }
  }

  // Update scores
  if (completedBoxes.length > 0) {
    const current = room.scores.get(playerId) ?? 0;
    room.scores.set(playerId, current + completedBoxes.length);
  }

  // Check game over
  const totalBoxes = (gs - 1) * (gs - 1);
  const gameOver = room.boxes.size >= totalBoxes;

  if (gameOver) {
    room.phase = 'game-over';
  } else if (completedBoxes.length === 0) {
    // No box completed, switch turn
    const playerIds = Array.from(room.players.keys());
    const nextIdx = (playerIds.indexOf(playerId) + 1) % playerIds.length;
    room.currentTurn = playerIds[nextIdx];
  }
  // If boxes were completed, same player keeps their turn

  return { completedBoxes, gameOver };
}

function isBoxComplete(room: Room, boxRow: number, boxCol: number): boolean {
  // A box at (boxRow, boxCol) has corners:
  // (boxRow, boxCol), (boxRow, boxCol+1), (boxRow+1, boxCol), (boxRow+1, boxCol+1)
  // 4 sides:
  const top = lineKey(boxRow, boxCol, boxRow, boxCol + 1);
  const bottom = lineKey(boxRow + 1, boxCol, boxRow + 1, boxCol + 1);
  const left = lineKey(boxRow, boxCol, boxRow + 1, boxCol);
  const right = lineKey(boxRow, boxCol + 1, boxRow + 1, boxCol + 1);

  return room.lines.has(top) && room.lines.has(bottom) && room.lines.has(left) && room.lines.has(right);
}
