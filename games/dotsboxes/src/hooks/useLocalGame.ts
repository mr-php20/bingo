import { useState, useCallback } from 'react';

type Screen = 'home' | 'playing' | 'game-over';
type Color = 'red' | 'blue';

interface PlayerInfo { id: string; name: string; color: string }
interface ScoreInfo { id: string; name: string; score: number }

export function lineKey(r1: number, c1: number, r2: number, c2: number): string {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) return `${r2},${c2},${r1},${c1}`;
  return `${r1},${c1},${r2},${c2}`;
}

function boxKey(r: number, c: number): string {
  return `${r},${c}`;
}

function isBoxComplete(lines: Set<string>, boxRow: number, boxCol: number): boolean {
  const top = lineKey(boxRow, boxCol, boxRow, boxCol + 1);
  const bottom = lineKey(boxRow + 1, boxCol, boxRow + 1, boxCol + 1);
  const left = lineKey(boxRow, boxCol, boxRow + 1, boxCol);
  const right = lineKey(boxRow, boxCol + 1, boxRow + 1, boxCol + 1);
  return lines.has(top) && lines.has(bottom) && lines.has(left) && lines.has(right);
}

const PLAYERS: PlayerInfo[] = [
  { id: 'red', name: 'Red', color: 'red' },
  { id: 'blue', name: 'Blue', color: 'blue' },
];

interface LocalState {
  screen: Screen;
  gridSize: number;
  lines: Map<string, Color>;
  boxes: Map<string, string>;
  currentTurn: string; // 'red' or 'blue'
  scores: ScoreInfo[];
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
}

export function useLocalGame() {
  const [state, setState] = useState<LocalState>({
    screen: 'home',
    gridSize: 5,
    lines: new Map(),
    boxes: new Map(),
    currentTurn: 'red',
    scores: [
      { id: 'red', name: 'Red', score: 0 },
      { id: 'blue', name: 'Blue', score: 0 },
    ],
    winnerId: null,
    winnerName: null,
    isDraw: false,
  });

  const startLocal = useCallback(() => {
    setState(prev => ({
      ...prev,
      screen: 'playing',
      lines: new Map(),
      boxes: new Map(),
      currentTurn: 'red',
      winnerId: null,
      winnerName: null,
      isDraw: false,
    }));
  }, []);

  const drawLine = useCallback((r1: number, c1: number, r2: number, c2: number) => {
    setState(prev => {
      if (prev.screen !== 'playing') return prev;
      const key = lineKey(r1, c1, r2, c2);
      if (prev.lines.has(key)) return prev;

      const newLines = new Map(prev.lines);
      newLines.set(key, prev.currentTurn as Color);

      // Convert to Set for box checking
      const lineSet = new Set(newLines.keys());

      const gs = prev.gridSize;
      const maxBox = gs - 1;
      const newBoxes = new Map(prev.boxes);
      const completedBoxes: string[] = [];

      if (r1 === r2) {
        // Horizontal line
        const r = r1;
        const c = Math.min(c1, c2);
        if (r > 0) {
          const bk = boxKey(r - 1, c);
          if (!newBoxes.has(bk) && isBoxComplete(lineSet, r - 1, c)) {
            newBoxes.set(bk, prev.currentTurn);
            completedBoxes.push(bk);
          }
        }
        if (r < maxBox) {
          const bk = boxKey(r, c);
          if (!newBoxes.has(bk) && isBoxComplete(lineSet, r, c)) {
            newBoxes.set(bk, prev.currentTurn);
            completedBoxes.push(bk);
          }
        }
      } else {
        // Vertical line
        const r = Math.min(r1, r2);
        const c = c1;
        if (c > 0) {
          const bk = boxKey(r, c - 1);
          if (!newBoxes.has(bk) && isBoxComplete(lineSet, r, c - 1)) {
            newBoxes.set(bk, prev.currentTurn);
            completedBoxes.push(bk);
          }
        }
        if (c < maxBox) {
          const bk = boxKey(r, c);
          if (!newBoxes.has(bk) && isBoxComplete(lineSet, r, c)) {
            newBoxes.set(bk, prev.currentTurn);
            completedBoxes.push(bk);
          }
        }
      }

      // Update scores
      const newScores = prev.scores.map(s =>
        s.id === prev.currentTurn ? { ...s, score: s.score + completedBoxes.length } : s
      );

      // Check game over
      const totalBoxes = maxBox * maxBox;
      const gameOver = newBoxes.size >= totalBoxes;

      if (gameOver) {
        const redScore = newScores.find(s => s.id === 'red')!.score;
        const blueScore = newScores.find(s => s.id === 'blue')!.score;
        const isDraw = redScore === blueScore;
        const winnerId = isDraw ? null : redScore > blueScore ? 'red' : 'blue';
        const winnerName = isDraw ? null : winnerId === 'red' ? 'Red' : 'Blue';
        return {
          ...prev,
          screen: 'game-over' as Screen,
          lines: newLines,
          boxes: newBoxes,
          scores: newScores,
          winnerId,
          winnerName,
          isDraw,
        };
      }

      // If no box completed, switch turn
      const nextTurn = completedBoxes.length === 0
        ? (prev.currentTurn === 'red' ? 'blue' : 'red')
        : prev.currentTurn;

      return { ...prev, lines: newLines, boxes: newBoxes, scores: newScores, currentTurn: nextTurn };
    });
  }, []);

  const rematch = useCallback(() => {
    setState(prev => ({
      ...prev,
      screen: 'playing',
      lines: new Map(),
      boxes: new Map(),
      currentTurn: 'red',
      winnerId: null,
      winnerName: null,
      isDraw: false,
    }));
  }, []);

  const goHome = useCallback(() => {
    setState({
      screen: 'home',
      gridSize: 5,
      lines: new Map(),
      boxes: new Map(),
      currentTurn: 'red',
      scores: [
        { id: 'red', name: 'Red', score: 0 },
        { id: 'blue', name: 'Blue', score: 0 },
      ],
      winnerId: null,
      winnerName: null,
      isDraw: false,
    });
  }, []);

  return {
    screen: state.screen,
    gridSize: state.gridSize,
    lines: state.lines,
    boxes: state.boxes,
    currentTurn: state.currentTurn,
    myColor: state.currentTurn as Color,
    isMyTurn: true,
    playerId: state.currentTurn,
    players: PLAYERS,
    scores: state.scores,
    winnerId: state.winnerId,
    winnerName: state.winnerName,
    isDraw: state.isDraw,
    error: null as string | null,
    roomCode: null as string | null,
    isHost: false,
    startLocal,
    drawLine,
    rematch,
    goHome,
    clearError: () => {},
  };
}

export type { Color };
