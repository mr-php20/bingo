import { useState, useCallback, useEffect, useRef } from 'react';
import { Grid, TileData, Direction, initGame, move, canMove, hasWon } from '../utils/game';

interface GameState {
  grid: Grid;
  tiles: TileData[];
  score: number;
  bestScore: number;
  gameOver: boolean;
  won: boolean;
  keepPlaying: boolean;
}

const BEST_KEY = '2048-best';

function loadBest(): number {
  const v = localStorage.getItem(BEST_KEY);
  return v ? parseInt(v, 10) : 0;
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const { grid, tiles } = initGame();
    return { grid, tiles, score: 0, bestScore: loadBest(), gameOver: false, won: false, keepPlaying: false };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const newGame = useCallback(() => {
    const { grid, tiles } = initGame();
    setState(prev => ({
      grid,
      tiles,
      score: 0,
      bestScore: prev.bestScore,
      gameOver: false,
      won: false,
      keepPlaying: false,
    }));
  }, []);

  const handleMove = useCallback((direction: Direction) => {
    setState(prev => {
      if (prev.gameOver || (prev.won && !prev.keepPlaying)) return prev;

      const result = move(prev.grid, prev.tiles, direction);
      if (!result.moved) return prev;

      const newScore = prev.score + result.score;
      const newBest = Math.max(newScore, prev.bestScore);
      const won = !prev.keepPlaying && hasWon(result.grid);
      const gameOver = !won && !canMove(result.grid);

      if (newBest > prev.bestScore) {
        localStorage.setItem(BEST_KEY, String(newBest));
      }

      return {
        grid: result.grid,
        tiles: result.tiles,
        score: newScore,
        bestScore: newBest,
        gameOver,
        won,
        keepPlaying: prev.keepPlaying,
      };
    });
  }, []);

  const handleKeepPlaying = useCallback(() => {
    setState(prev => ({ ...prev, won: false, keepPlaying: true }));
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleMove]);

  // Touch/swipe
  useEffect(() => {
    let startX = 0, startY = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        handleMove(dx > 0 ? 'right' : 'left');
      } else {
        handleMove(dy > 0 ? 'down' : 'up');
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleMove]);

  return { ...state, newGame, handleMove, keepPlaying: handleKeepPlaying };
}
