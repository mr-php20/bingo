import { useState, useCallback, useEffect, useRef } from 'react';
import { Board, shuffleBoard, moveTile, canMoveTile, isSolved } from '../utils/game';

interface GameState {
  board: Board;
  moves: number;
  timer: number;
  bestTime: number | null;
  won: boolean;
}

const BEST_KEY = 'sliding-puzzle-best';

function loadBest(): number | null {
  const v = localStorage.getItem(BEST_KEY);
  return v ? parseInt(v, 10) : null;
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => ({
    board: shuffleBoard(),
    moves: 0,
    timer: 0,
    bestTime: loadBest(),
    won: false,
  }));

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (state.won || state.moves === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, timer: prev.timer + 1 }));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.won, state.moves]);

  const newGame = useCallback(() => {
    setState(prev => ({
      board: shuffleBoard(),
      moves: 0,
      timer: 0,
      bestTime: prev.bestTime,
      won: false,
    }));
  }, []);

  const handleTileClick = useCallback((index: number) => {
    setState(prev => {
      if (prev.won) return prev;
      if (!canMoveTile(prev.board, index)) return prev;

      const newBoard = moveTile(prev.board, index);
      const newMoves = prev.moves + 1;
      const won = isSolved(newBoard);

      let bestTime = prev.bestTime;
      if (won) {
        const time = prev.timer;
        if (bestTime === null || time < bestTime) {
          bestTime = time;
          localStorage.setItem(BEST_KEY, String(time));
        }
      }

      return { ...prev, board: newBoard, moves: newMoves, won, bestTime };
    });
  }, []);

  return { ...state, newGame, handleTileClick, canMoveTile: (i: number) => canMoveTile(state.board, i) };
}
