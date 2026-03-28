import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type Mark = 'X' | 'O' | null;
type Screen = 'home' | 'lobby' | 'playing' | 'game-over';

interface PlayerInfo { id: string; name: string; mark: string }
interface ScoreInfo { id: string; name: string; score: number }

interface GameState {
  screen: Screen;
  socket: Socket | null;
  playerName: string;
  playerId: string | null;
  roomCode: string | null;
  isHost: boolean;
  myMark: Mark;
  players: PlayerInfo[];
  board: Mark[];
  currentTurn: string | null;
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  scores: ScoreInfo[];
  error: string | null;
}

const serverUrl = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_SERVER_URL ?? 'http://localhost:3001';

// Wake up the server on first visit so the cold start happens while the user is on the home screen
fetch(`${serverUrl}/api/health`).catch(() => {});

export function useGame() {
  const [state, setState] = useState<GameState>({
    screen: 'home',
    socket: null,
    playerName: '',
    playerId: null,
    roomCode: null,
    isHost: false,
    myMark: null,
    players: [],
    board: Array(9).fill(null),
    currentTurn: null,
    winnerId: null,
    winnerName: null,
    isDraw: false,
    scores: [],
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);

  // Connect socket on mount
  useEffect(() => {
    const socket = io(`${serverUrl}/tictactoe`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    setState(prev => ({ ...prev, socket }));

    socket.on('room-created', ({ code, playerId, mark }: { code: string; playerId: string; mark: string }) => {
      setState(prev => ({
        ...prev,
        roomCode: code,
        playerId,
        isHost: true,
        myMark: mark as Mark,
        screen: 'lobby',
        players: [{ id: playerId, name: prev.playerName, mark }],
        error: null,
      }));
    });

    socket.on('room-joined', ({ playerId, mark, players }: { playerId: string; mark: string; players: PlayerInfo[] }) => {
      setState(prev => ({
        ...prev,
        playerId,
        myMark: mark as Mark,
        players,
        isHost: false,
        screen: 'lobby',
        error: null,
      }));
    });

    socket.on('player-joined', ({ player }: { player: PlayerInfo }) => {
      setState(prev => ({ ...prev, players: [...prev.players, player] }));
    });

    socket.on('game-start', ({ board, currentTurn, players }: { board: Mark[]; currentTurn: string; players: PlayerInfo[] }) => {
      setState(prev => {
        const me = players.find(p => p.id === prev.playerId);
        return {
          ...prev,
          screen: 'playing',
          board,
          currentTurn,
          players,
          myMark: (me?.mark ?? prev.myMark) as Mark,
          winnerId: null,
          winnerName: null,
          isDraw: false,
          error: null,
        };
      });
    });

    socket.on('move-made', ({ board, nextTurn }: { board: Mark[]; nextTurn: string }) => {
      setState(prev => ({ ...prev, board, currentTurn: nextTurn }));
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
        board: Array(9).fill(null),
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

  const makeMove = useCallback((cell: number) => {
    socketRef.current?.emit('make-move', { cell });
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
      myMark: null,
      players: [],
      board: Array(9).fill(null),
      currentTurn: null,
      winnerId: null,
      winnerName: null,
      isDraw: false,
      scores: [],
      error: null,
    }));
  }, []);

  const isMyTurn = state.currentTurn === state.playerId;

  return { ...state, createRoom, joinRoom, startGame, makeMove, rematch, clearError, goHome, isMyTurn };
}
