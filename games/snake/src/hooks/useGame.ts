import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Point, Direction, GRID_SIZE,
  createInitialSnake, generateFood, moveSnake, growSnake, checkCollision, isOpposite,
} from '../utils/game';

interface GameState {
  snake: Point[];
  food: Point;
  direction: Direction;
  score: number;
  highScore: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;
}

const HIGH_KEY = 'snake-high';

function loadHigh(): number {
  const v = localStorage.getItem(HIGH_KEY);
  return v ? parseInt(v, 10) : 0;
}

function getSpeed(score: number): number {
  return Math.max(60, 150 - score * 2);
}

export function useGame() {
  const initSnake = createInitialSnake();

  const [state, setState] = useState<GameState>(() => ({
    snake: initSnake,
    food: generateFood(initSnake),
    direction: 'right',
    score: 0,
    highScore: loadHigh(),
    gameOver: false,
    paused: false,
    started: false,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;
  const dirQueueRef = useRef<Direction[]>([]);

  const newGame = useCallback(() => {
    const snake = createInitialSnake();
    dirQueueRef.current = [];
    setState(prev => ({
      snake,
      food: generateFood(snake),
      direction: 'right',
      score: 0,
      highScore: prev.highScore,
      gameOver: false,
      paused: false,
      started: false,
    }));
  }, []);

  const changeDirection = useCallback((newDir: Direction) => {
    dirQueueRef.current.push(newDir);
  }, []);

  const togglePause = useCallback(() => {
    setState(prev => {
      if (prev.gameOver) return prev;
      return { ...prev, paused: !prev.paused, started: true };
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (state.gameOver || state.paused || !state.started) return;

    const tick = () => {
      setState(prev => {
        let dir = prev.direction;
        while (dirQueueRef.current.length > 0) {
          const next = dirQueueRef.current.shift()!;
          if (!isOpposite(dir, next)) {
            dir = next;
            break;
          }
        }

        let newSnake = moveSnake(prev.snake, dir);

        if (checkCollision(newSnake)) {
          const newHigh = Math.max(prev.score, prev.highScore);
          if (newHigh > prev.highScore) localStorage.setItem(HIGH_KEY, String(newHigh));
          return { ...prev, direction: dir, gameOver: true, highScore: newHigh };
        }

        let newFood = prev.food;
        let newScore = prev.score;

        if (newSnake[0].x === prev.food.x && newSnake[0].y === prev.food.y) {
          newSnake = growSnake(newSnake);
          newScore++;
          newFood = generateFood(newSnake);
        }

        return { ...prev, snake: newSnake, food: newFood, direction: dir, score: newScore };
      });
    };

    const id = setInterval(tick, getSpeed(stateRef.current.score));
    return () => clearInterval(id);
  }, [state.gameOver, state.paused, state.started, state.score]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      };
      if (e.key === ' ') {
        e.preventDefault();
        togglePause();
        return;
      }
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        if (!stateRef.current.started) {
          setState(prev => ({ ...prev, started: true }));
        }
        changeDirection(dir);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [changeDirection, togglePause]);

  // Touch/swipe
  useEffect(() => {
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      if (!stateRef.current.started) setState(prev => ({ ...prev, started: true }));
      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 'right' : 'left');
      } else {
        changeDirection(dy > 0 ? 'down' : 'up');
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [changeDirection]);

  return { ...state, gridSize: GRID_SIZE, newGame, changeDirection, togglePause };
}
