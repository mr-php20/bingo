import { useState, useCallback, useEffect, useRef } from 'react';
import { Board, Difficulty, generatePuzzle, checkErrors, isBoardComplete } from '../utils/generator';

interface GameState {
  puzzle: Board;    // original clues (0 = empty)
  board: Board;     // current state
  solution: Board;
  selected: [number, number] | null;
  difficulty: Difficulty;
  errors: boolean[][];
  completed: boolean;
  timer: number;
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const { puzzle, solution } = generatePuzzle('easy');
    return {
      puzzle,
      board: puzzle.map(row => [...row]),
      solution,
      selected: null,
      difficulty: 'easy',
      errors: Array.from({ length: 9 }, () => Array(9).fill(false)),
      completed: false,
      timer: 0,
    };
  });

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Timer
  useEffect(() => {
    if (state.completed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, timer: prev.timer + 1 }));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.completed]);

  const newGame = useCallback((difficulty: Difficulty) => {
    const { puzzle, solution } = generatePuzzle(difficulty);
    setState({
      puzzle,
      board: puzzle.map(row => [...row]),
      solution,
      selected: null,
      difficulty,
      errors: Array.from({ length: 9 }, () => Array(9).fill(false)),
      completed: false,
      timer: 0,
    });
  }, []);

  const selectCell = useCallback((row: number, col: number) => {
    setState(prev => ({ ...prev, selected: [row, col] }));
  }, []);

  const enterNumber = useCallback((num: number) => {
    setState(prev => {
      if (!prev.selected || prev.completed) return prev;
      const [r, c] = prev.selected;
      if (prev.puzzle[r][c] !== 0) return prev; // can't change clues

      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = num;
      const errors = checkErrors(newBoard, prev.solution);
      const completed = isBoardComplete(newBoard, prev.solution);

      return { ...prev, board: newBoard, errors, completed };
    });
  }, []);

  const eraseCell = useCallback(() => {
    setState(prev => {
      if (!prev.selected || prev.completed) return prev;
      const [r, c] = prev.selected;
      if (prev.puzzle[r][c] !== 0) return prev;

      const newBoard = prev.board.map(row => [...row]);
      newBoard[r][c] = 0;
      const errors = checkErrors(newBoard, prev.solution);

      return { ...prev, board: newBoard, errors };
    });
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        enterNumber(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        eraseCell();
      } else if (e.key === 'ArrowUp' && state.selected) {
        e.preventDefault();
        const [r, c] = state.selected;
        if (r > 0) selectCell(r - 1, c);
      } else if (e.key === 'ArrowDown' && state.selected) {
        e.preventDefault();
        const [r, c] = state.selected;
        if (r < 8) selectCell(r + 1, c);
      } else if (e.key === 'ArrowLeft' && state.selected) {
        e.preventDefault();
        const [r, c] = state.selected;
        if (c > 0) selectCell(r, c - 1);
      } else if (e.key === 'ArrowRight' && state.selected) {
        e.preventDefault();
        const [r, c] = state.selected;
        if (c < 8) selectCell(r, c + 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [enterNumber, eraseCell, selectCell, state.selected]);

  return { ...state, newGame, selectCell, enterNumber, eraseCell };
}
