import type { Namespace, Socket } from 'socket.io';
import { createRoom, joinRoom, getRoomBySocketId, removePlayer, startGame, getPlayersArray } from './rooms.js';
import { drawLine } from './engine.js';

export function registerDotsBoxesHandlers(nsp: Namespace): void {
  nsp.on('connection', (socket: Socket) => {
    console.log(`[dotsboxes][connect] ${socket.id}`);

    socket.on('create-room', ({ playerName }: { playerName: string }) => {
      try {
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length < 3) {
          socket.emit('error', { message: 'Name must be at least 3 characters' });
          return;
        }
        const { room, player } = createRoom(socket.id, playerName.trim().slice(0, 20));
        socket.join(room.code);
        socket.emit('room-created', { code: room.code, playerId: player.id, color: player.color });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('join-room', ({ code, playerName }: { code: string; playerName: string }) => {
      try {
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length < 3) {
          socket.emit('error', { message: 'Name must be at least 3 characters' });
          return;
        }
        if (!code || typeof code !== 'string') {
          socket.emit('error', { message: 'Room code is required' });
          return;
        }
        const { room, player } = joinRoom(socket.id, code, playerName.trim().slice(0, 20));
        socket.join(room.code);
        socket.emit('room-joined', {
          playerId: player.id,
          color: player.color,
          players: getPlayersArray(room),
          gridSize: room.gridSize,
        });
        socket.to(room.code).emit('player-joined', {
          player: { id: player.id, name: player.name, color: player.color },
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('start-game', () => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;
        if (player.id !== room.hostId) {
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }
        if (room.players.size < 2) {
          socket.emit('error', { message: 'Need 2 players to start' });
          return;
        }
        startGame(room);
        nsp.to(room.code).emit('game-start', {
          gridSize: room.gridSize,
          currentTurn: room.currentTurn,
          players: getPlayersArray(room),
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('draw-line', ({ r1, c1, r2, c2 }: { r1: number; c1: number; r2: number; c2: number }) => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;
        if (room.phase !== 'playing') {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const moveResult = drawLine(room, player.id, r1, c1, r2, c2);

        const scores = Array.from(room.scores.entries()).map(([id, score]) => ({
          id, name: room.players.get(id)?.name ?? '', score,
        }));

        const boxes: { key: string; owner: string }[] = [];
        for (const bk of moveResult.completedBoxes) {
          boxes.push({ key: bk, owner: player.id });
        }

        nsp.to(room.code).emit('line-drawn', {
          r1, c1, r2, c2,
          playerId: player.id,
          color: player.color,
          completedBoxes: boxes,
          nextTurn: room.currentTurn,
          scores,
        });

        if (moveResult.gameOver) {
          // Find winner (highest score)
          let winnerId: string | null = null;
          let maxScore = 0;
          let tied = false;
          for (const [id, score] of room.scores) {
            if (score > maxScore) {
              maxScore = score;
              winnerId = id;
              tied = false;
            } else if (score === maxScore) {
              tied = true;
            }
          }

          nsp.to(room.code).emit('game-over', {
            winnerId: tied ? null : winnerId,
            winnerName: tied ? null : (room.players.get(winnerId!)?.name ?? ''),
            draw: tied,
            scores,
          });
        }
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('rematch', () => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room } = result;
        if (room.phase !== 'game-over') {
          socket.emit('error', { message: 'Cannot rematch now' });
          return;
        }
        startGame(room);
        nsp.to(room.code).emit('game-start', {
          gridSize: room.gridSize,
          currentTurn: room.currentTurn,
          players: getPlayersArray(room),
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[dotsboxes][disconnect] ${socket.id}`);
      const result = removePlayer(socket.id);
      if (result) {
        const { room, player } = result;
        if (room.players.size > 0) {
          nsp.to(room.code).emit('player-left', { playerId: player.id, playerName: player.name });
        }
      }
    });
  });
}
