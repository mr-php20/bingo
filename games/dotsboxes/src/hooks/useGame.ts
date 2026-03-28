import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type Screen = 'home' | 'lobby' | 'playing' | 'game-over';
type Color = 'red' | 'blue';

interface PlayerInfo { id: string; name: string; color: string }
interface ScoreInfo { id: string; name: string; score: number }
interface DrawnLine { r1: number; c1: number; r2: number; c2: number; color: Color }
interface CompletedBox { key: string; owner: string }

export function lineKey(r1: number, c1: number, r2: number, c2: number): string {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) return `${r2},${c2},${r1},${c1}`;
  return `${r1},${c1},${r2},${c2}`;
}

interface GameState {
  screen: Screen;
  playerName: string;
  playerId: string | null;
  roomCode: string | null;
  isHost: boolean;
  myColor: Color;
  players: PlayerInfo[];
  gridSize: number;
  lines: Map<string, Color>; // lineKey => color
  boxes: Map<string, string>; // "r,c" => playerId
  currentTurn: string | null;
  scores: ScoreInfo[];
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  error: string | null;
}

const serverUrl = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_SERVER_URL ?? 'http://localhost:3001';

// Wake up the server on first visit so the cold start happens while the user is on the home screen
fetch(`${serverUrl}/api/health`).catch(() => {});

export function useGame() {
  const [state, setState] = useState<GameState>({
    screen: 'home',
    playerName: '',
    playerId: null,
    roomCode: null,
    isHost: false,
    myColor: 'red',
    players: [],
    gridSize: 5,
    lines: new Map(),
    boxes: new Map(),
    currentTurn: null,
    scores: [],
    winnerId: null,
    winnerName: null,
    isDraw: false,
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${serverUrl}/dotsboxes`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('room-created', ({ code, playerId, color }: { code: string; playerId: string; color: Color }) => {
      setState(prev => ({
        ...prev,
        roomCode: code,
        playerId,
        isHost: true,
        myColor: color,
        screen: 'lobby',
        players: [{ id: playerId, name: prev.playerName, color }],
        error: null,
      }));
    });

    socket.on('room-joined', ({ playerId, color, players, gridSize }: { playerId: string; color: Color; players: PlayerInfo[]; gridSize: number }) => {
      setState(prev => ({
        ...prev,
        playerId,
        myColor: color,
        players,
        gridSize,
        isHost: false,
        screen: 'lobby',
        error: null,
      }));
    });

    socket.on('player-joined', ({ player }: { player: PlayerInfo }) => {
      setState(prev => ({ ...prev, players: [...prev.players, player] }));
    });

    socket.on('game-start', ({ gridSize, currentTurn, players }: { gridSize: number; currentTurn: string; players: PlayerInfo[] }) => {
      setState(prev => {
        const me = players.find(p => p.id === prev.playerId);
        return {
          ...prev,
          screen: 'playing',
          gridSize,
          currentTurn,
          players,
          myColor: (me?.color as Color) ?? prev.myColor,
          lines: new Map(),
          boxes: new Map(),
          scores: players.map(p => ({ id: p.id, name: p.name, score: 0 })),
          winnerId: null,
          winnerName: null,
          isDraw: false,
          error: null,
        };
      });
    });

    socket.on('line-drawn', ({ r1, c1, r2, c2, color, completedBoxes, nextTurn, scores }: {
      r1: number; c1: number; r2: number; c2: number;
      playerId: string; color: Color;
      completedBoxes: CompletedBox[];
      nextTurn: string;
      scores: ScoreInfo[];
    }) => {
      setState(prev => {
        const newLines = new Map(prev.lines);
        newLines.set(lineKey(r1, c1, r2, c2), color);
        const newBoxes = new Map(prev.boxes);
        for (const b of completedBoxes) {
          newBoxes.set(b.key, b.owner);
        }
        return { ...prev, lines: newLines, boxes: newBoxes, currentTurn: nextTurn, scores };
      });
    });

    socket.on('game-over', ({ winnerId, winnerName, draw, scores }: { winnerId: string | null; winnerName: string | null; draw: boolean; scores: ScoreInfo[] }) => {
      setState(prev => ({
        ...prev,
        screen: 'game-over',
        winnerId,
        winnerName,
        isDraw: draw,
        scores,
      }));
    });

    socket.on('player-left', ({ playerId, playerName }: { playerId: string; playerName: string }) => {
      setState(prev => ({
        ...prev,
        screen: 'lobby',
        lines: new Map(),
        boxes: new Map(),
        currentTurn: null,
        error: `${playerName} left the game`,
        players: prev.players.filter(p => p.id !== playerId),
      }));
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

  const drawLine = useCallback((r1: number, c1: number, r2: number, c2: number) => {
    socketRef.current?.emit('draw-line', { r1, c1, r2, c2 });
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
      myColor: 'red',
      players: [],
      gridSize: 5,
      lines: new Map(),
      boxes: new Map(),
      currentTurn: null,
      scores: [],
      winnerId: null,
      winnerName: null,
      isDraw: false,
      error: null,
    }));
  }, []);

  const isMyTurn = state.currentTurn === state.playerId;

  return { ...state, createRoom, joinRoom, startGame, drawLine, rematch, clearError, goHome, isMyTurn };
}

export type { DrawnLine, Color };
