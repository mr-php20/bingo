import { useState, useCallback, useRef } from 'react';

type Screen = 'home' | 'playing' | 'game-over';

export interface CellData { orbs: number; owner: string | null; }
interface PlayerInfo { id: string; name: string; colorIndex: number }
interface ScoreInfo { id: string; name: string; score: number }

export interface FlyingOrb {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  colorIndex: number;
}

export interface AnimationData {
  waves: FlyingOrb[][];
  boardStates: CellData[][][]; // board state before each wave (index 0 = after orb placed, before explosions)
}

function emptyBoard(rows: number, cols: number): CellData[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ orbs: 0, owner: null })));
}

function criticalMass(row: number, col: number, rows: number, cols: number): number {
  let neighbors = 4;
  if (row === 0 || row === rows - 1) neighbors--;
  if (col === 0 || col === cols - 1) neighbors--;
  return neighbors;
}

function cloneBoard(board: CellData[][]): CellData[][] {
  return board.map(row => row.map(cell => ({ ...cell })));
}

const PLAYER_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8'];

interface LocalState {
  screen: Screen;
  board: CellData[][];
  rows: number;
  cols: number;
  turnOrder: string[];
  currentTurnIndex: number;
  eliminatedPlayers: string[];
  moveCount: number;
  winnerId: string | null;
  winnerName: string | null;
  scores: ScoreInfo[];
  players: PlayerInfo[];
}

export function useLocalGame() {
  const [state, setState] = useState<LocalState>({
    screen: 'home',
    board: emptyBoard(9, 6),
    rows: 9,
    cols: 6,
    turnOrder: [],
    currentTurnIndex: 0,
    eliminatedPlayers: [],
    moveCount: 0,
    winnerId: null,
    winnerName: null,
    scores: [],
    players: [],
  });

  const startLocal = useCallback((numPlayers: number) => {
    const players: PlayerInfo[] = [];
    const scores: ScoreInfo[] = [];
    const turnOrder: string[] = [];
    for (let i = 0; i < numPlayers; i++) {
      const id = `p${i}`;
      players.push({ id, name: PLAYER_NAMES[i], colorIndex: i });
      scores.push({ id, name: PLAYER_NAMES[i], score: 0 });
      turnOrder.push(id);
    }
    setState({
      screen: 'playing',
      board: emptyBoard(9, 6),
      rows: 9,
      cols: 6,
      turnOrder,
      currentTurnIndex: 0,
      eliminatedPlayers: [],
      moveCount: 0,
      winnerId: null,
      winnerName: null,
      scores,
      players,
    });
  }, []);

  const pendingAnimRef = useRef<AnimationData | null>(null);

  const placeOrb = useCallback((row: number, col: number) => {
    setState(prev => {
      if (prev.screen !== 'playing') return prev;
      const currentPlayerId = prev.turnOrder[prev.currentTurnIndex];

      const cell = prev.board[row][col];
      if (cell.owner !== null && cell.owner !== currentPlayerId) return prev;

      const board = cloneBoard(prev.board);
      board[row][col].orbs++;
      board[row][col].owner = currentPlayerId;
      const moveCount = prev.moveCount + 1;

      // Resolve chain explosions, collecting wave animation data
      const animData = resolveExplosionsWithWaves(board, prev.rows, prev.cols, prev.players);
      pendingAnimRef.current = animData.waves.length > 0 ? animData : null;

      // Check eliminations (only after first full round)
      let eliminatedPlayers = [...prev.eliminatedPlayers];
      const activePlayers = prev.turnOrder.filter(id => !eliminatedPlayers.includes(id));
      if (moveCount >= activePlayers.length) {
        for (const pid of activePlayers) {
          if (pid === currentPlayerId) continue;
          if (!hasAnyOrbs(board, pid, prev.rows, prev.cols)) {
            eliminatedPlayers.push(pid);
          }
        }
      }

      // Check win condition
      const remainingActive = prev.turnOrder.filter(id => !eliminatedPlayers.includes(id));
      if (remainingActive.length <= 1 && moveCount > prev.turnOrder.length) {
        const winnerId = remainingActive[0] ?? currentPlayerId;
        const winnerName = prev.players.find(p => p.id === winnerId)?.name ?? 'Unknown';
        return {
          ...prev,
          screen: 'game-over' as Screen,
          board,
          moveCount,
          eliminatedPlayers,
          winnerId,
          winnerName,
          scores: prev.scores.map(s => s.id === winnerId ? { ...s, score: s.score + 1 } : s),
        };
      }

      // Advance turn (skip eliminated)
      let nextIndex = prev.currentTurnIndex;
      do {
        nextIndex = (nextIndex + 1) % prev.turnOrder.length;
      } while (eliminatedPlayers.includes(prev.turnOrder[nextIndex]) && nextIndex !== prev.currentTurnIndex);

      return {
        ...prev,
        board,
        moveCount,
        eliminatedPlayers,
        currentTurnIndex: nextIndex,
      };
    });
  }, []);

  const rematch = useCallback(() => {
    setState(prev => ({
      ...prev,
      screen: 'playing',
      board: emptyBoard(9, 6),
      currentTurnIndex: 0,
      eliminatedPlayers: [],
      moveCount: 0,
      winnerId: null,
      winnerName: null,
    }));
  }, []);

  const goHome = useCallback(() => {
    setState({
      screen: 'home',
      board: emptyBoard(9, 6),
      rows: 9,
      cols: 6,
      turnOrder: [],
      currentTurnIndex: 0,
      eliminatedPlayers: [],
      moveCount: 0,
      winnerId: null,
      winnerName: null,
      scores: [],
      players: [],
    });
  }, []);

  const currentTurn = state.turnOrder[state.currentTurnIndex] ?? null;

  return {
    screen: state.screen,
    board: state.board,
    rows: state.rows,
    cols: state.cols,
    currentTurn,
    turnOrder: state.turnOrder,
    eliminatedPlayers: state.eliminatedPlayers,
    myColorIndex: state.players.find(p => p.id === currentTurn)?.colorIndex ?? 0,
    isMyTurn: true,
    amEliminated: false,
    playerId: currentTurn,
    players: state.players,
    scores: state.scores,
    winnerId: state.winnerId,
    winnerName: state.winnerName,
    error: null as string | null,
    roomCode: null as string | null,
    isHost: false,
    startLocal,
    placeOrb,
    rematch,
    goHome,
    clearError: () => {},
    getPendingAnimation: () => {
      const data = pendingAnimRef.current;
      pendingAnimRef.current = null;
      return data;
    },
  };
}

function resolveExplosionsWithWaves(
  board: CellData[][],
  rows: number,
  cols: number,
  players: PlayerInfo[],
): AnimationData {
  const waves: FlyingOrb[][] = [];
  const boardStates: CellData[][][] = [cloneBoard(board)];
  const maxIterations = rows * cols * 4;
  let iterations = 0;
  const deltas: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (iterations++ < maxIterations) {
    const wave: { row: number; col: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].orbs >= criticalMass(r, c, rows, cols)) {
          wave.push({ row: r, col: c });
        }
      }
    }
    if (wave.length === 0) break;

    const orbFlights: FlyingOrb[] = [];
    const additions: { r: number; c: number; owner: string }[] = [];

    for (const { row, col } of wave) {
      const cell = board[row][col];
      const owner = cell.owner!;
      const ownerPlayer = players.find(p => p.id === owner);
      const colorIndex = ownerPlayer?.colorIndex ?? 0;

      cell.orbs -= criticalMass(row, col, rows, cols);
      if (cell.orbs <= 0) {
        cell.orbs = 0;
        cell.owner = null;
      }
      for (const [dr, dc] of deltas) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          additions.push({ r: nr, c: nc, owner });
          orbFlights.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, colorIndex });
        }
      }
    }

    for (const { r, c, owner } of additions) {
      board[r][c].orbs++;
      board[r][c].owner = owner;
    }

    waves.push(orbFlights);
    boardStates.push(cloneBoard(board));
  }

  return { waves, boardStates };
}

function hasAnyOrbs(board: CellData[][], playerId: string, rows: number, cols: number): boolean {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].owner === playerId && board[r][c].orbs > 0) return true;
    }
  }
  return false;
}
