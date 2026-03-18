import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Screen, PlayerInfo, PlayerScore } from '../types/game';
import { initialGameState } from '../types/game';
import { createEmptyGrid, createEmptyMarked, findNumberPosition, countCompletedLines } from '../utils/bingo';

// --- Actions ---
type Action =
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'ROOM_CREATED'; code: string; playerId: string }
  | { type: 'ROOM_JOINED'; playerId: string; players: PlayerInfo[]; bestOf: number; hideOpponentStatus: boolean }
  | { type: 'PLAYER_JOINED'; player: PlayerInfo }
  | { type: 'SERIES_UPDATED'; bestOf: number }
  | { type: 'HIDE_OPPONENT_UPDATED'; hide: boolean }
  | { type: 'GAME_START' }
  | { type: 'PLACE_NUMBER'; row: number; col: number }
  | { type: 'UNDO_LAST' }
  | { type: 'RANDOM_FILL' }
  | { type: 'GRID_ACCEPTED' }
  | { type: 'OPPONENT_READY' }
  | { type: 'GRIDS_READY'; currentTurn: string }
  | { type: 'NUMBER_CALLED'; number: number; calledBy: string; nextTurn: string | null; players: { id: string; completedLines: number; markedCell: { row: number; col: number } | null }[] }
  | { type: 'ROUND_WON'; winnerId: string; winnerName: string; scores: PlayerScore[]; currentRound: number; seriesOver: boolean }
  | { type: 'PLAYER_LEFT'; playerId: string; playerName: string }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET'; screen?: Screen }
  | { type: 'SET_SCREEN'; screen: Screen };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.name };

    case 'ROOM_CREATED':
      return {
        ...state,
        roomCode: action.code,
        playerId: action.playerId,
        isHost: true,
        screen: 'lobby',
        players: [{ id: action.playerId, name: state.playerName }],
        error: null,
      };

    case 'ROOM_JOINED':
      return {
        ...state,
        playerId: action.playerId,
        players: action.players,
        bestOf: action.bestOf,
        hideOpponentStatus: action.hideOpponentStatus,
        isHost: false,
        screen: 'lobby',
        error: null,
      };

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: [...state.players, action.player],
      };

    case 'SERIES_UPDATED':
      return { ...state, bestOf: action.bestOf };

    case 'HIDE_OPPONENT_UPDATED':
      return { ...state, hideOpponentStatus: action.hide };

    case 'GAME_START':
      return {
        ...state,
        screen: 'setup',
        grid: createEmptyGrid(),
        placementStack: [],
        gridReady: false,
        readyCount: 0,
        marked: createEmptyMarked(),
        myCompletedLines: 0,
        prevCompletedLineCount: 0,
        playersCompletedLines: {},
        calledNumbers: [],
        currentTurn: null,
        roundWinner: null,
        seriesOver: false,
        error: null,
      };

    case 'PLACE_NUMBER': {
      const { row, col } = action;
      if (state.gridReady) return state; // locked
      if (state.grid[row][col] !== 0) return state; // cell occupied
      const nextNum = state.placementStack.length + 1;
      if (nextNum > 25) return state; // all placed
      const newGrid = state.grid.map(r => [...r]);
      newGrid[row][col] = nextNum;
      return {
        ...state,
        grid: newGrid,
        placementStack: [...state.placementStack, row * 5 + col],
      };
    }

    case 'UNDO_LAST': {
      if (state.placementStack.length === 0) return state;
      const stack = [...state.placementStack];
      const lastIdx = stack.pop()!;
      const r = Math.floor(lastIdx / 5);
      const c = lastIdx % 5;
      const newGrid = state.grid.map(row => [...row]);
      newGrid[r][c] = 0;
      return {
        ...state,
        grid: newGrid,
        placementStack: stack,
      };
    }

    case 'RANDOM_FILL': {
      const placed = new Set<number>();
      const newGrid = state.grid.map(r => [...r]);
      const newStack = [...state.placementStack];

      // Collect already placed numbers
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (newGrid[r][c] !== 0) placed.add(newGrid[r][c]);
        }
      }

      // Remaining numbers to place
      const remaining: number[] = [];
      for (let i = 1; i <= 25; i++) {
        if (!placed.has(i)) remaining.push(i);
      }

      // Shuffle remaining
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      // Fill empty cells in order, ensuring sequential numbering
      // We need to place them as the next numbers in sequence
      let numIdx = 0;
      const emptyCells: number[] = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (newGrid[r][c] === 0) {
            emptyCells.push(r * 5 + c);
          }
        }
      }

      // Shuffle empty cell positions
      for (let i = emptyCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
      }

      // Place remaining numbers sequentially into shuffled empty cells
      for (const cellIdx of emptyCells) {
        const r = Math.floor(cellIdx / 5);
        const c = cellIdx % 5;
        newGrid[r][c] = remaining[numIdx];
        // We need to reconsider: random fill should place actual numbers, not sequential
        // Let's just place them correctly
        numIdx++;
        newStack.push(cellIdx);
      }

      // Fix: re-assign with correct numbers
      numIdx = 0;
      for (const cellIdx of emptyCells) {
        const r = Math.floor(cellIdx / 5);
        const c = cellIdx % 5;
        newGrid[r][c] = remaining[numIdx];
        numIdx++;
      }

      return {
        ...state,
        grid: newGrid,
        placementStack: newStack,
      };
    }

    case 'GRID_ACCEPTED':
      return { ...state, gridReady: true };

    case 'OPPONENT_READY':
      return { ...state, readyCount: state.readyCount + 1 };

    case 'GRIDS_READY':
      return {
        ...state,
        screen: 'playing',
        currentTurn: action.currentTurn,
        marked: createEmptyMarked(),
        myCompletedLines: 0,
        prevCompletedLineCount: 0,
        playersCompletedLines: {},
        calledNumbers: [],
      };

    case 'NUMBER_CALLED': {
      const newMarked = state.marked.map(r => [...r]);
      const pos = findNumberPosition(state.grid, action.number);
      if (pos) {
        newMarked[pos.row][pos.col] = true;
      }
      const myLines = countCompletedLines(newMarked);

      const newPlayersLines: Record<string, number> = {};
      for (const p of action.players) {
        if (p.id !== state.playerId) {
          newPlayersLines[p.id] = p.completedLines;
        }
      }

      return {
        ...state,
        marked: newMarked,
        calledNumbers: [...state.calledNumbers, action.number],
        myCompletedLines: myLines,
        prevCompletedLineCount: state.myCompletedLines,
        playersCompletedLines: newPlayersLines,
        currentTurn: action.nextTurn ?? state.currentTurn,
      };
    }

    case 'ROUND_WON':
      return {
        ...state,
        screen: action.seriesOver ? 'series-end' : 'round-end',
        roundWinner: { id: action.winnerId, name: action.winnerName },
        scores: action.scores,
        currentRound: action.currentRound,
        seriesOver: action.seriesOver,
      };

    case 'PLAYER_LEFT': {
      const remaining = state.players.filter(p => p.id !== action.playerId);
      return {
        ...state,
        players: remaining,
        screen: remaining.length > 0 ? 'lobby' : 'home',
        grid: createEmptyGrid(),
        placementStack: [],
        gridReady: false,
        readyCount: 0,
        marked: createEmptyMarked(),
        myCompletedLines: 0,
        playersCompletedLines: {},
        calledNumbers: [],
        currentTurn: null,
        roundWinner: null,
        seriesOver: false,
        currentRound: 1,
        scores: [],
        error: `${action.playerName} left the game`,
      };
    }

    case 'SET_ERROR':
      return { ...state, error: action.message };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'RESET':
      return { ...initialGameState, playerName: state.playerName, screen: action.screen ?? 'home' };

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    default:
      return state;
  }
}

// --- Context ---
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  socket: Socket | null;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  setSeries: (bestOf: number) => void;
  setHideOpponent: (hide: boolean) => void;
  startGame: () => void;
  submitGrid: () => void;
  callNumber: (num: number) => void;
  nextRound: () => void;
  continueGame: () => void;
  rematch: () => void;
  goHome: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialGameState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
    const socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('room-created', (data: { code: string; playerId: string }) => {
      dispatch({ type: 'ROOM_CREATED', code: data.code, playerId: data.playerId });
    });

    socket.on('room-joined', (data: { playerId: string; players: PlayerInfo[]; bestOf: number; hideOpponentStatus: boolean }) => {
      dispatch({ type: 'ROOM_JOINED', playerId: data.playerId, players: data.players, bestOf: data.bestOf, hideOpponentStatus: data.hideOpponentStatus ?? false });
    });

    socket.on('player-joined', (data: { player: PlayerInfo }) => {
      dispatch({ type: 'PLAYER_JOINED', player: data.player });
    });

    socket.on('series-updated', (data: { bestOf: number }) => {
      dispatch({ type: 'SERIES_UPDATED', bestOf: data.bestOf });
    });

    socket.on('hide-opponent-updated', (data: { hide: boolean }) => {
      dispatch({ type: 'HIDE_OPPONENT_UPDATED', hide: data.hide });
    });

    socket.on('game-start', () => {
      dispatch({ type: 'GAME_START' });
    });

    socket.on('grid-accepted', () => {
      dispatch({ type: 'GRID_ACCEPTED' });
    });

    socket.on('opponent-ready', () => {
      dispatch({ type: 'OPPONENT_READY' });
    });

    socket.on('grids-ready', (data: { currentTurn: string }) => {
      dispatch({ type: 'GRIDS_READY', currentTurn: data.currentTurn });
    });

    socket.on('number-called', (data: { number: number; calledBy: string; nextTurn: string | null; players: { id: string; completedLines: number; markedCell: { row: number; col: number } | null }[] }) => {
      dispatch({ type: 'NUMBER_CALLED', ...data });
    });

    socket.on('round-won', (data: { winnerId: string; winnerName: string; scores: PlayerScore[]; currentRound: number; seriesOver: boolean }) => {
      dispatch({ type: 'ROUND_WON', ...data });
    });

    socket.on('player-left', (data: { playerId: string; playerName: string }) => {
      dispatch({ type: 'PLAYER_LEFT', ...data });
    });

    socket.on('error', (data: { message: string }) => {
      dispatch({ type: 'SET_ERROR', message: data.message });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback(() => {
    socketRef.current?.emit('create-room', { playerName: state.playerName });
  }, [state.playerName]);

  const joinRoom = useCallback((code: string) => {
    dispatch({ type: 'CLEAR_ERROR' });
    socketRef.current?.emit('join-room', { code, playerName: state.playerName });
  }, [state.playerName]);

  const setSeries = useCallback((bestOf: number) => {
    socketRef.current?.emit('set-series', { bestOf });
  }, []);

  const setHideOpponent = useCallback((hide: boolean) => {
    socketRef.current?.emit('set-hide-opponent', { hide });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start-game');
  }, []);

  const submitGridFn = useCallback(() => {
    socketRef.current?.emit('submit-grid', { grid: state.grid });
  }, [state.grid]);

  const callNumberFn = useCallback((num: number) => {
    socketRef.current?.emit('call-number', { number: num });
  }, []);

  const nextRoundFn = useCallback(() => {
    socketRef.current?.emit('next-round');
  }, []);

  const continueGameFn = useCallback(() => {
    socketRef.current?.emit('continue-game');
  }, []);

  const rematch = useCallback(() => {
    socketRef.current?.emit('rematch');
  }, []);

  const goHome = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current?.connect();
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      dispatch,
      socket: socketRef.current,
      createRoom,
      joinRoom,
      setSeries,
      setHideOpponent,
      startGame,
      submitGrid: submitGridFn,
      callNumber: callNumberFn,
      nextRound: nextRoundFn,
      continueGame: continueGameFn,
      rematch,
      goHome,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
