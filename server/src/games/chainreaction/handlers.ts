import type { Namespace, Socket } from 'socket.io';
import { createRoom, joinRoom, getRoomBySocketId, removePlayer, startGame, getPlayersArray } from './rooms.js';
import { placeOrb } from './engine.js';

function serializeBoard(board: { orbs: number; owner: string | null }[][]): { orbs: number; owner: string | null }[][] {
  return board.map(row => row.map(cell => ({ orbs: cell.orbs, owner: cell.owner })));
}

export function registerChainReactionHandlers(nsp: Namespace): void {
  nsp.on('connection', (socket: Socket) => {
    console.log(`[chainreaction][connect] ${socket.id}`);

    socket.on('create-room', ({ playerName }: { playerName: string }) => {
      try {
        if (!playerName || typeof playerName !== 'string' || playerName.trim().length < 3) {
          socket.emit('error', { message: 'Name must be at least 3 characters' });
          return;
        }
        const { room, player } = createRoom(socket.id, playerName.trim().slice(0, 20));
        socket.join(room.code);
        socket.emit('room-created', {
          code: room.code,
          playerId: player.id,
          colorIndex: player.colorIndex,
        });
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
          colorIndex: player.colorIndex,
          players: getPlayersArray(room),
        });
        socket.to(room.code).emit('player-joined', {
          player: { id: player.id, name: player.name, colorIndex: player.colorIndex },
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
          socket.emit('error', { message: 'Need at least 2 players to start' });
          return;
        }
        startGame(room);
        nsp.to(room.code).emit('game-start', {
          board: serializeBoard(room.board),
          rows: room.rows,
          cols: room.cols,
          currentTurn: room.currentTurn,
          turnOrder: room.turnOrder,
          players: getPlayersArray(room),
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('place-orb', ({ row, col }: { row: number; col: number }) => {
      try {
        const result = getRoomBySocketId(socket.id);
        if (!result) return;
        const { room, player } = result;
        if (room.phase !== 'playing') {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const moveResult = placeOrb(room, player.id, row, col);

        nsp.to(room.code).emit('orb-placed', {
          row,
          col,
          playerId: player.id,
          board: serializeBoard(moveResult.board),
          explosions: moveResult.explosions,
          capturedCells: moveResult.capturedCells,
          eliminated: moveResult.eliminated,
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
          board: serializeBoard(room.board),
          rows: room.rows,
          cols: room.cols,
          currentTurn: room.currentTurn,
          turnOrder: room.turnOrder,
          players: getPlayersArray(room),
        });
      } catch (err: unknown) {
        socket.emit('error', { message: (err as Error).message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[chainreaction][disconnect] ${socket.id}`);
      const result = removePlayer(socket.id);
      if (result) {
        const { room, player } = result;
        if (room.players.size > 0) {
          nsp.to(room.code).emit('player-left', {
            playerId: player.id,
            playerName: player.name,
          });
          // If game ended due to disconnect
          if (room.phase === 'game-over' && room.winner) {
            const winnerPlayer = room.players.get(room.winner);
            const scores = Array.from(room.scores.entries()).map(([id, score]) => ({
              id, name: room.players.get(id)?.name ?? '', score,
            }));
            nsp.to(room.code).emit('game-over', {
              winnerId: room.winner,
              winnerName: winnerPlayer?.name ?? '',
              scores,
            });
          }
        }
      }
    });
  });
}
