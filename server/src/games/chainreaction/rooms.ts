import { customAlphabet } from 'nanoid';
import type { Room, Player, Cell } from './types.js';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

const DEFAULT_ROWS = 9;
const DEFAULT_COLS = 6;

function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ orbs: 0, owner: null }))
  );
}

export function createRoom(socketId: string, playerName: string): { room: Room; player: Player } {
  let code: string;
  do { code = generateCode(); } while (rooms.has(code));

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const player: Player = { id: playerId, name: playerName, socketId, colorIndex: 0 };

  const room: Room = {
    code,
    hostId: playerId,
    players: new Map([[playerId, player]]),
    scores: new Map([[playerId, 0]]),
    board: createEmptyBoard(DEFAULT_ROWS, DEFAULT_COLS),
    rows: DEFAULT_ROWS,
    cols: DEFAULT_COLS,
    currentTurn: null,
    turnOrder: [playerId],
    eliminatedPlayers: new Set(),
    winner: null,
    phase: 'lobby',
    moveCount: 0,
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  return { room, player };
}

export function joinRoom(socketId: string, code: string, playerName: string): { room: Room; player: Player } {
  const normalizedCode = code.toUpperCase().trim();
  const room = rooms.get(normalizedCode);
  if (!room) throw new Error('Room not found. Check the code and try again.');
  if (room.players.size >= 8) throw new Error('Room is full (max 8 players).');
  if (room.phase !== 'lobby') throw new Error('Game already in progress.');

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const colorIndex = room.players.size;
  const player: Player = { id: playerId, name: playerName, socketId, colorIndex };

  room.players.set(playerId, player);
  room.scores.set(playerId, 0);
  room.turnOrder.push(playerId);
  socketToRoom.set(socketId, normalizedCode);
  return { room, player };
}

export function getRoomBySocketId(socketId: string): { room: Room; player: Player } | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;
  for (const player of room.players.values()) {
    if (player.socketId === socketId) return { room, player };
  }
  return null;
}

export function removePlayer(socketId: string): { room: Room; player: Player } | null {
  const result = getRoomBySocketId(socketId);
  if (!result) return null;
  const { room, player } = result;

  room.players.delete(player.id);
  room.scores.delete(player.id);
  room.turnOrder = room.turnOrder.filter(id => id !== player.id);
  room.eliminatedPlayers.delete(player.id);
  socketToRoom.delete(socketId);

  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    if (room.phase === 'playing') {
      // Remove player's orbs from the board
      for (let r = 0; r < room.rows; r++) {
        for (let c = 0; c < room.cols; c++) {
          if (room.board[r][c].owner === player.id) {
            room.board[r][c] = { orbs: 0, owner: null };
          }
        }
      }
      // If it was their turn, advance to next
      if (room.currentTurn === player.id) {
        advanceTurn(room);
      }
      // Check if only one player left
      const activePlayers = room.turnOrder.filter(id => !room.eliminatedPlayers.has(id));
      if (activePlayers.length <= 1) {
        room.winner = activePlayers[0] ?? null;
        room.phase = 'game-over';
        if (room.winner) {
          room.scores.set(room.winner, (room.scores.get(room.winner) ?? 0) + 1);
        }
      }
    } else {
      room.phase = 'lobby';
      room.board = createEmptyBoard(room.rows, room.cols);
      room.currentTurn = null;
      room.winner = null;
      room.moveCount = 0;
      room.eliminatedPlayers.clear();
    }
    // Transfer host
    if (room.hostId === player.id) {
      const remaining = room.players.values().next().value;
      if (remaining) room.hostId = remaining.id;
    }
  }
  return { room, player };
}

function advanceTurn(room: Room): void {
  const activePlayers = room.turnOrder.filter(id => !room.eliminatedPlayers.has(id));
  if (activePlayers.length <= 1) return;
  const currentIdx = activePlayers.indexOf(room.currentTurn!);
  const nextIdx = (currentIdx + 1) % activePlayers.length;
  room.currentTurn = activePlayers[nextIdx];
}

export function startGame(room: Room): void {
  // Reassign color indices
  let idx = 0;
  for (const p of room.players.values()) {
    p.colorIndex = idx++;
  }
  room.board = createEmptyBoard(room.rows, room.cols);
  room.winner = null;
  room.phase = 'playing';
  room.moveCount = 0;
  room.eliminatedPlayers.clear();
  room.turnOrder = Array.from(room.players.keys());
  room.currentTurn = room.turnOrder[0];
}

export { advanceTurn };

export function getPlayersArray(room: Room): { id: string; name: string; colorIndex: number }[] {
  return Array.from(room.players.values()).map(p => ({
    id: p.id, name: p.name, colorIndex: p.colorIndex,
  }));
}

export function cleanupStaleRooms(): void {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.createdAt < twoHoursAgo) {
      for (const player of room.players.values()) socketToRoom.delete(player.socketId);
      rooms.delete(code);
    }
  }
}
