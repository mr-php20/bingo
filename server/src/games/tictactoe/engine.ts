import type { Room, Mark } from './types.js';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diags
];

export function makeMove(room: Room, playerId: string, cell: number): { winner: string | null; draw: boolean } {
  if (room.currentTurn !== playerId) throw new Error('Not your turn');
  if (cell < 0 || cell > 8) throw new Error('Invalid cell');
  if (room.board[cell] !== null) throw new Error('Cell already taken');

  const player = room.players.get(playerId);
  if (!player) throw new Error('Player not found');

  room.board[cell] = player.mark;

  // Check win
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (room.board[a] && room.board[a] === room.board[b] && room.board[b] === room.board[c]) {
      room.winner = playerId;
      room.phase = 'round-end';
      const score = room.scores.get(playerId) ?? 0;
      room.scores.set(playerId, score + 1);
      return { winner: playerId, draw: false };
    }
  }

  // Check draw
  if (room.board.every(c => c !== null)) {
    room.phase = 'round-end';
    return { winner: null, draw: true };
  }

  // Switch turn
  const playerIds = Array.from(room.players.keys());
  const nextIdx = (playerIds.indexOf(playerId) + 1) % playerIds.length;
  room.currentTurn = playerIds[nextIdx];

  return { winner: null, draw: false };
}
