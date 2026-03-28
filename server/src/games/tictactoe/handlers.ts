import type { Namespace, Socket } from 'socket.io';
import { createRoom, joinRoom, getRoomBySocketId, removePlayer, startGame, swapMarks, getPlayersArray } from './rooms.js';
import { makeMove } from './engine.js';

export function registerTicTacToeHandlers(nsp: Namespace): void {
  nsp.on('connection', (socket: Socket) => {
    console.log(`[tictactoe][connect] ${socket.id}`);

    socket.on('create-room', ({ playerName }: { playerName: string }) => {
      try {
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length < 3) {
          socket.emit('error', { message: 'Name must be at least 3 characters' });
          return;
        }
        const { room, player } = createRoom(socket.id, playerName.trim().slice(0, 20));
        socket.join(room.code);
        socket.emit('room-created', { code: room.code, playerId: player.id, mark: player.mark });
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
          mark: player.mark,
          players: getPlayersArray(room),
        });
        socket.to(room.code).emit('player-joined', {
          player: { id: player.id, name: player.name, mark: player.mark },
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
          board: room.board,
          currentTurn: room.currentTurn,
          players: getPlayersArray(room),
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('make-move', ({ cell }: { cell: number }) => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;
        if (room.phase !== 'playing') {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const moveResult = makeMove(room, player.id, cell);

        nsp.to(room.code).emit('move-made', {
          cell,
          mark: player.mark,
          playerId: player.id,
          board: room.board,
          nextTurn: room.currentTurn,
        });

        if (moveResult.winner) {
          const winnerPlayer = room.players.get(moveResult.winner);
          const scores = Array.from(room.scores.entries()).map(([id, score]) => ({
            id, name: room.players.get(id)?.name ?? '', score,
          }));
          nsp.to(room.code).emit('game-over', {
            winnerId: moveResult.winner,
            winnerName: winnerPlayer?.name ?? '',
            draw: false,
            scores,
          });
        } else if (moveResult.draw) {
          const scores = Array.from(room.scores.entries()).map(([id, score]) => ({
            id, name: room.players.get(id)?.name ?? '', score,
          }));
          nsp.to(room.code).emit('game-over', {
            winnerId: null,
            winnerName: null,
            draw: true,
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
        if (room.phase !== 'round-end') {
          socket.emit('error', { message: 'Cannot rematch now' });
          return;
        }
        swapMarks(room);
        startGame(room);
        nsp.to(room.code).emit('game-start', {
          board: room.board,
          currentTurn: room.currentTurn,
          players: getPlayersArray(room),
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[tictactoe][disconnect] ${socket.id}`);
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
