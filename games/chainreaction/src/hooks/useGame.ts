import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type Screen = 'home' | 'lobby' | 'playing' | 'game-over';

export interface CellData {
  orbs: number;
  owner: string | null;
}

interface PlayerInfo { id: string; name: string; colorIndex: number }
interface ScoreInfo { id: string; name: string; score: number }

interface GameState {
  screen: Screen;
  playerName: string;
  playerId: string | null;
  roomCode: string | null;
  isHost: boolean;
  myColorIndex: number;
  players: PlayerInfo[];
  board: CellData[][];
  rows: number;
  cols: number;
  currentTurn: string | null;
  turnOrder: string[];
  eliminatedPlayers: string[];
  winnerId: string | null;
  winnerName: string | null;
  scores: ScoreInfo[];
  error: string | null;
}

const serverUrl = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_SERVER_URL ?? 'http://localhost:3001';

fetch(`${serverUrl}/api/health`).catch(() => {});

function emptyBoard(rows: number, cols: number): CellData[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ orbs: 0, owner: null }))
  );
}

export function useGame() {
  const [state, setState] = useState<GameState>({
    screen: 'home',
    playerName: '',
    playerId: null,
    roomCode: null,
    isHost: false,
    myColorIndex: 0,
    players: [],
    board: emptyBoard(9, 6),
    rows: 9,
    cols: 6,
    currentTurn: null,
    turnOrder: [],
    eliminatedPlayers: [],
    winnerId: null,
    winnerName: null,
    scores: [],
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${serverUrl}/chainreaction`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('room-created', ({ code, playerId, colorIndex }: { code: string; playerId: string; colorIndex: number }) => {
      setState(prev => ({
        ...prev,
        roomCode: code,
        playerId,
        isHost: true,
        myColorIndex: colorIndex,
        screen: 'lobby',
        players: [{ id: playerId, name: prev.playerName, colorIndex }],
        error: null,
      }));
    });

    socket.on('room-joined', ({ playerId, colorIndex, players }: { playerId: string; colorIndex: number; players: PlayerInfo[] }) => {
      setState(prev => ({
        ...prev,
        playerId,
        myColorIndex: colorIndex,
        players,
        isHost: false,
        screen: 'lobby',
        error: null,
      }));
    });

    socket.on('player-joined', ({ player }: { player: PlayerInfo }) => {
      setState(prev => ({ ...prev, players: [...prev.players, player] }));
    });

    socket.on('game-start', ({ board, rows, cols, currentTurn, turnOrder, players }: {
      board: CellData[][]; rows: number; cols: number; currentTurn: string; turnOrder: string[]; players: PlayerInfo[];
    }) => {
      setState(prev => {
        const me = players.find(p => p.id === prev.playerId);
        return {
          ...prev,
          screen: 'playing',
          board,
          rows,
          cols,
          currentTurn,
          turnOrder,
          players,
          myColorIndex: me?.colorIndex ?? prev.myColorIndex,
          eliminatedPlayers: [],
          winnerId: null,
          winnerName: null,
          scores: players.map(p => ({ id: p.id, name: p.name, score: 0 })),
          error: null,
        };
      });
    });

    socket.on('orb-placed', ({ board, eliminated, nextTurn }: {
      board: CellData[][]; eliminated: string[]; nextTurn: string;
    }) => {
      setState(prev => ({
        ...prev,
        board,
        currentTurn: nextTurn,
        eliminatedPlayers: [...new Set([...prev.eliminatedPlayers, ...eliminated])],
      }));
    });

    socket.on('game-over', ({ winnerId, winnerName, scores }: {
      winnerId: string; winnerName: string; scores: ScoreInfo[];
    }) => {
      setState(prev => ({
        ...prev,
        screen: 'game-over',
        winnerId,
        winnerName,
        scores,
      }));
    });

    socket.on('player-left', ({ playerId, playerName }: { playerId: string; playerName: string }) => {
      setState(prev => {
        const newPlayers = prev.players.filter(p => p.id !== playerId);
        // If we're in lobby, just remove from list
        if (prev.screen === 'lobby') {
          return {
            ...prev,
            error: `${playerName} left the game`,
            players: newPlayers,
          };
        }
        // During game, they get eliminated
        return {
          ...prev,
          error: `${playerName} left the game`,
          players: newPlayers,
          eliminatedPlayers: [...new Set([...prev.eliminatedPlayers, playerId])],
        };
      });
    });

    socket.on('error', ({ message }: { message: string }) => {
      setState(prev => ({ ...prev, error: message }));
    });

    return () => { socket.disconnect(); };
  }, []);

  const createRoom = useCallback((name: string) => {
    setState(prev => ({ ...prev, playerName: name }));
    socketRef.current?.emit('create-room', { playerName: name });
  }, []);

  const joinRoom = useCallback((name: string, code: string) => {
    setState(prev => ({ ...prev, playerName: name, roomCode: code }));
    socketRef.current?.emit('join-room', { code, playerName: name });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start-game');
  }, []);

  const placeOrb = useCallback((row: number, col: number) => {
    socketRef.current?.emit('place-orb', { row, col });
  }, []);

  const rematch = useCallback(() => {
    socketRef.current?.emit('rematch');
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const goHome = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current?.connect();
    setState(prev => ({
      ...prev,
      screen: 'home',
      playerName: '',
      playerId: null,
      roomCode: null,
      isHost: false,
      myColorIndex: 0,
      players: [],
      board: emptyBoard(9, 6),
      rows: 9,
      cols: 6,
      currentTurn: null,
      turnOrder: [],
      eliminatedPlayers: [],
      winnerId: null,
      winnerName: null,
      scores: [],
      error: null,
    }));
  }, []);

  const isMyTurn = state.currentTurn === state.playerId;
  const amEliminated = state.eliminatedPlayers.includes(state.playerId ?? '');

  return { ...state, createRoom, joinRoom, startGame, placeOrb, rematch, clearError, goHome, isMyTurn, amEliminated };
}
