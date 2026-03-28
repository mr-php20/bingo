import { customAlphabet } from 'nanoid';
import type { Room, Player, RoomPhase } from './types.js';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

function createEmptyBoard() {
  return Array(9).fill(null);
}

export function createRoom(socketId: string, playerName: string): { room: Room; player: Player } {
  let code: string;
  do { code = generateCode(); } while (rooms.has(code));

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const player: Player = { id: playerId, name: playerName, socketId, mark: 'X' };

  const room: Room = {
    code,
    hostId: playerId,
    players: new Map([[playerId, player]]),
    scores: new Map([[playerId, 0]]),
    board: createEmptyBoard(),
    currentTurn: null,
    winner: null,
    phase: 'lobby',
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
  if (room.players.size >= 2) throw new Error('Room is full.');
  if (room.phase !== 'lobby') throw new Error('Game already in progress.');

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const player: Player = { id: playerId, name: playerName, socketId, mark: 'O' };

  room.players.set(playerId, player);
  room.scores.set(playerId, 0);
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
  socketToRoom.delete(socketId);

  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    room.phase = 'lobby';
    room.board = createEmptyBoard();
    room.currentTurn = null;
    room.winner = null;
    if (room.hostId === player.id) {
      const remaining = room.players.values().next().value;
      if (remaining) {
        room.hostId = remaining.id;
        remaining.mark = 'X';
      }
    }
  }
  return { room, player };
}

export function startGame(room: Room): void {
  room.board = createEmptyBoard();
  room.winner = null;
  room.phase = 'playing';
  // X always goes first — find the X player
  for (const p of room.players.values()) {
    if (p.mark === 'X') { room.currentTurn = p.id; break; }
  }
}

export function swapMarks(room: Room): void {
  for (const p of room.players.values()) {
    p.mark = p.mark === 'X' ? 'O' : 'X';
  }
}

export function getPlayersArray(room: Room): { id: string; name: string; mark: string }[] {
  return Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, mark: p.mark! }));
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
