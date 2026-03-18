import { customAlphabet } from 'nanoid';
import type { Room, Player, RoomPhase } from './types.js';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const rooms = new Map<string, Room>();

// Map socketId -> roomCode for quick disconnect lookup
const socketToRoom = new Map<string, string>();

export function createRoom(socketId: string, playerName: string): { room: Room; player: Player } {
  let code: string;
  do {
    code = generateCode();
  } while (rooms.has(code));

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const player: Player = {
    id: playerId,
    name: playerName,
    socketId,
    grid: [],
    marked: [],
    completedLines: 0,
    ready: false,
  };

  const room: Room = {
    code,
    hostId: playerId,
    players: new Map([[playerId, player]]),
    series: { bestOf: 1, hideOpponentStatus: false },
    scores: new Map([[playerId, 0]]),
    currentRound: 1,
    roundState: null,
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

  if (!room) {
    throw new Error('Room not found. Check the code and try again.');
  }
  if (room.players.size >= 10) {
    throw new Error('Room is full.');
  }
  if (room.phase !== 'lobby') {
    throw new Error('Game already in progress.');
  }

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const player: Player = {
    id: playerId,
    name: playerName,
    socketId,
    grid: [],
    marked: [],
    completedLines: 0,
    ready: false,
  };

  room.players.set(playerId, player);
  room.scores.set(playerId, 0);
  socketToRoom.set(socketId, normalizedCode);

  return { room, player };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase().trim());
}

export function getRoomBySocketId(socketId: string): { room: Room; player: Player } | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;

  const room = rooms.get(code);
  if (!room) return null;

  for (const player of room.players.values()) {
    if (player.socketId === socketId) {
      return { room, player };
    }
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

  // If room is empty, delete it
  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    // Reset room to lobby if a player leaves mid-game
    room.phase = 'lobby';
    room.roundState = null;
    room.currentRound = 1;
    // Reset remaining player scores
    for (const [pid] of room.scores) {
      room.scores.set(pid, 0);
    }
    // Reset remaining player state
    for (const p of room.players.values()) {
      resetPlayerState(p);
    }
    // Transfer host if needed
    if (room.hostId === player.id) {
      const remaining = room.players.values().next().value;
      if (remaining) {
        room.hostId = remaining.id;
      }
    }
  }

  return { room, player };
}

export function setSeriesConfig(code: string, bestOf: number): void {
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found');
  if (bestOf < 1 || bestOf % 2 === 0) throw new Error('Best-of must be a positive odd number (1, 3, 5, ...)');
  room.series.bestOf = bestOf;
}

export function setHideOpponentStatus(code: string, hide: boolean): void {
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found');
  room.series.hideOpponentStatus = hide;
}

export function setRoomPhase(code: string, phase: RoomPhase): void {
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found');
  room.phase = phase;
}

export function resetPlayerState(player: Player): void {
  player.grid = [];
  player.marked = [];
  player.completedLines = 0;
  player.ready = false;
}

export function getPlayersArray(room: Room): { id: string; name: string }[] {
  return Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name }));
}

// Cleanup stale rooms older than 2 hours
export function cleanupStaleRooms(): void {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.createdAt < twoHoursAgo) {
      for (const player of room.players.values()) {
        socketToRoom.delete(player.socketId);
      }
      rooms.delete(code);
    }
  }
}
