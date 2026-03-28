import { customAlphabet } from 'nanoid';
import type { Room, Player, RoomPhase } from './types.js';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

const DEFAULT_GRID = 5; // 5×5 dots = 4×4 boxes

export function createRoom(socketId: string, playerName: string): { room: Room; player: Player } {
  let code: string;
  do { code = generateCode(); } while (rooms.has(code));

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const player: Player = { id: playerId, name: playerName, socketId, color: 'red' };

  const room: Room = {
    code,
    hostId: playerId,
    players: new Map([[playerId, player]]),
    scores: new Map([[playerId, 0]]),
    gridSize: DEFAULT_GRID,
    lines: new Set(),
    boxes: new Map(),
    currentTurn: null,
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
  const player: Player = { id: playerId, name: playerName, socketId, color: 'blue' };

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
    resetRoomState(room);
    if (room.hostId === player.id) {
      const remaining = room.players.values().next().value;
      if (remaining) {
        room.hostId = remaining.id;
        remaining.color = 'red';
      }
    }
  }
  return { room, player };
}

export function startGame(room: Room): void {
  resetRoomState(room);
  room.phase = 'playing';
  // Host goes first
  room.currentTurn = room.hostId;
}

function resetRoomState(room: Room): void {
  room.lines = new Set();
  room.boxes = new Map();
  room.currentTurn = null;
  for (const [pid] of room.scores) {
    room.scores.set(pid, 0);
  }
}

export function getPlayersArray(room: Room): { id: string; name: string; color: string }[] {
  return Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name, color: p.color }));
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
