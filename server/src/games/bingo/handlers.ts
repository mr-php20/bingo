import type { Server, Socket, Namespace } from 'socket.io';
import {
  createRoom,
  joinRoom,
  getRoomBySocketId,
  removePlayer,
  setSeriesConfig,
  setHideOpponentStatus,
  setRoomPhase,
  getPlayersArray,
} from './rooms.js';
import {
  submitGrid,
  callNumber,
  checkSeriesWin,
  nextRound,
  resetSeries,
  continueGame,
} from './engine.js';

export function registerBingoHandlers(nsp: Namespace): void {
  nsp.on('connection', (socket: Socket) => {
    console.log(`[bingo][connect] ${socket.id}`);

    // ---- CREATE ROOM ----
    socket.on('create-room', ({ playerName }: { playerName: string }) => {
      try {
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length < 3) {
          socket.emit('error', { message: 'Name must be at least 3 characters' });
          return;
        }
        const { room, player } = createRoom(socket.id, playerName.trim().slice(0, 20));
        socket.join(room.code);
        socket.emit('room-created', { code: room.code, playerId: player.id });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- JOIN ROOM ----
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
          players: getPlayersArray(room),
          bestOf: room.series.bestOf,
          hideOpponentStatus: room.series.hideOpponentStatus,
        });
        socket.to(room.code).emit('player-joined', {
          player: { id: player.id, name: player.name },
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- SET SERIES CONFIG ----
    socket.on('set-series', ({ bestOf }: { bestOf: number }) => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;
        if (player.id !== room.hostId) {
          socket.emit('error', { message: 'Only the host can change series settings' });
          return;
        }
        if (typeof bestOf !== 'number' || bestOf < 1 || bestOf % 2 === 0) {
          socket.emit('error', { message: 'Best-of must be a positive odd number' });
          return;
        }
        setSeriesConfig(room.code, bestOf);
        nsp.to(room.code).emit('series-updated', { bestOf });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- SET HIDE OPPONENT STATUS ----
    socket.on('set-hide-opponent', ({ hide }: { hide: boolean }) => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;
        if (player.id !== room.hostId) {
          socket.emit('error', { message: 'Only the host can change this setting' });
          return;
        }
        setHideOpponentStatus(room.code, !!hide);
        nsp.to(room.code).emit('hide-opponent-updated', { hide: !!hide });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- START GAME (host only) ----
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
          socket.emit('error', { message: 'Need at least 2 players to start' });
          return;
        }
        setRoomPhase(room.code, 'setup');
        nsp.to(room.code).emit('game-start', { phase: 'setup' });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- SUBMIT GRID ----
    socket.on('submit-grid', ({ grid }: { grid: number[][] }) => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;

        if (room.phase !== 'setup') {
          socket.emit('error', { message: 'Not in setup phase' });
          return;
        }

        const bothReady = submitGrid(room, player.id, grid);
        socket.emit('grid-accepted');
        socket.to(room.code).emit('opponent-ready');

        if (bothReady) {
          nsp.to(room.code).emit('grids-ready', {
            currentTurn: room.roundState!.currentTurn,
          });
        }
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- CALL NUMBER ----
    socket.on('call-number', ({ number }: { number: number }) => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;

        if (room.phase !== 'playing') {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const callResult = callNumber(room, player.id, number);

        nsp.to(room.code).emit('number-called', {
          number,
          calledBy: player.id,
          players: callResult.players,
          nextTurn: room.roundState?.currentTurn ?? null,
        });

        if (callResult.winner) {
          const winnerPlayer = room.players.get(callResult.winner);
          const { seriesOver } = checkSeriesWin(room);

          const scores = Array.from(room.scores.entries()).map(([id, score]) => ({
            id,
            name: room.players.get(id)?.name ?? 'Unknown',
            score,
          }));

          nsp.to(room.code).emit('round-won', {
            winnerId: callResult.winner,
            winnerName: winnerPlayer?.name ?? 'Unknown',
            scores,
            currentRound: room.currentRound,
            seriesOver,
          });
        }
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- NEXT ROUND ----
    socket.on('next-round', () => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room } = result;

        if (room.phase !== 'round-end') {
          socket.emit('error', { message: 'Not at round end' });
          return;
        }

        nextRound(room);
        nsp.to(room.code).emit('game-start', { phase: 'setup' });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- REMATCH (restart series) ----
    socket.on('rematch', () => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room } = result;

        if (room.phase !== 'series-end' && room.phase !== 'round-end' && room.phase !== 'setup') {
          socket.emit('error', { message: 'Cannot rematch from this state' });
          return;
        }

        resetSeries(room);
        nsp.to(room.code).emit('game-start', { phase: 'setup' });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- CONTINUE GAME (keep scores, play more) ----
    socket.on('continue-game', () => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room } = result;

        if (room.phase !== 'series-end' && room.phase !== 'round-end') {
          socket.emit('error', { message: 'Cannot continue from this state' });
          return;
        }

        continueGame(room);
        nsp.to(room.code).emit('game-start', { phase: 'setup' });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    // ---- DISCONNECT ----
    socket.on('disconnect', () => {
      console.log(`[bingo][disconnect] ${socket.id}`);
      const result = removePlayer(socket.id);
      if (result) {
        const { room, player } = result;
        if (room.players.size > 0) {
          nsp.to(room.code).emit('player-left', {
            playerId: player.id,
            playerName: player.name,
          });
        }
      }
    });
  });
}
