import { useState, useCallback, useEffect, useRef } from 'react';
import { Board, shuffleBoard, moveTile, canMoveTile, isSolved } from '../utils/game';

export interface LastMove {
  value: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

interface GameState {
  board: Board;
  moves: number;
  timer: number;
  bestTime: number | null;
  won: boolean;
  lastMove: LastMove | null;
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
    lastMove: null,
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
      lastMove: null,
    }));
  }, []);

  const handleTileClick = useCallback((index: number) => {
    setState(prev => {
      if (prev.won) return prev;
      if (!canMoveTile(prev.board, index)) return prev;

      const tileValue = prev.board[index]!;
      const fromRow = Math.floor(index / 4);
      const fromCol = index % 4;

      const newBoard = moveTile(prev.board, index);
      const newMoves = prev.moves + 1;
      const won = isSolved(newBoard);

      const newIndex = newBoard.indexOf(tileValue);
      const toRow = Math.floor(newIndex / 4);
      const toCol = newIndex % 4;

      let bestTime = prev.bestTime;
      if (won) {
        const time = prev.timer;
        if (bestTime === null || time < bestTime) {
          bestTime = time;
          localStorage.setItem(BEST_KEY, String(time));
        }
      }

      return {
        ...prev,
        board: newBoard,
        moves: newMoves,
        won,
        bestTime,
        lastMove: { value: tileValue, fromRow, fromCol, toRow, toCol },
      };
    });
  }, []);

  return { ...state, newGame, handleTileClick, canMoveTile: (i: number) => canMoveTile(state.board, i) };
}
