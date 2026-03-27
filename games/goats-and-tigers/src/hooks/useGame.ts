import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState, Player,
  createInitialState, getValidMoves, applyMove, getMovesFrom, getAiMove,
  TOTAL_GOATS,
} from '../utils/game';

export type Role = 'goat' | 'tiger';

export function useGame() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [playerRole, setPlayerRole] = useState<Role>('goat');
  const [wins, setWins] = useState({ goat: 0, tiger: 0 });
  const aiThinking = useRef(false);

  const aiPlayer: Player = playerRole === 'goat' ? 'tiger' : 'goat';

  const newGame = useCallback(() => {
    setState(createInitialState());
    aiThinking.current = false;
  }, []);

  const switchRole = useCallback(() => {
    setPlayerRole(prev => prev === 'goat' ? 'tiger' : 'goat');
    setState(createInitialState());
    aiThinking.current = false;
  }, []);

  const handlePointClick = useCallback((point: number) => {
    if (aiThinking.current) return;

    setState(prev => {
      if (prev.gameOver) return prev;
      if (prev.turn !== (playerRole === 'goat' ? 'goat' : 'tiger')) {
        // Not human's turn in single-player
        return prev;
      }

      const validMoves = getValidMoves(prev);

      // Placing phase for goats
      if (prev.turn === 'goat' && prev.goatsPlaced < TOTAL_GOATS && prev.phase === 'placing') {
        const placeMove = validMoves.find(m => m.type === 'place' && m.to === point);
        if (placeMove) {
          const next = applyMove(prev, placeMove);
          if (next.gameOver) recordWin(next.winner);
          return next;
        }
        return prev;
      }

      // Select/move phase
      if (prev.selectedPoint === null) {
        // Selecting a piece
        const piece = prev.board[point];
        if (piece !== prev.turn) return prev;
        const moves = getMovesFrom(prev, point);
        if (moves.length === 0) return prev;
        return { ...prev, selectedPoint: point };
      }

      // Already selected — try to move
      if (prev.selectedPoint === point) {
        return { ...prev, selectedPoint: null };
      }

      const moves = getMovesFrom(prev, prev.selectedPoint);
      const move = moves.find(m => m.to === point);
      if (move) {
        const next = applyMove(prev, move);
        if (next.gameOver) recordWin(next.winner);
        return next;
      }

      // Clicked another own piece — reselect
      if (prev.board[point] === prev.turn) {
        const newMoves = getMovesFrom(prev, point);
        if (newMoves.length > 0) return { ...prev, selectedPoint: point };
      }

      return { ...prev, selectedPoint: null };
    });
  }, [playerRole]);

  function recordWin(winner: Player | null) {
    if (winner) {
      setWins(w => ({ ...w, [winner]: w[winner] + 1 }));
    }
  }

  // AI move
  useEffect(() => {
    if (state.gameOver || state.turn !== aiPlayer) {
      aiThinking.current = false;
      return;
    }

    aiThinking.current = true;
    const timeout = setTimeout(() => {
      setState(prev => {
        if (prev.gameOver || prev.turn !== aiPlayer) return prev;
        const move = getAiMove(prev);
        if (!move) return prev;
        const next = applyMove(prev, move);
        if (next.gameOver && next.winner) {
          setWins(w => ({ ...w, [next.winner!]: w[next.winner!] + 1 }));
        }
        return next;
      });
      aiThinking.current = false;
    }, 600);

    return () => {
      clearTimeout(timeout);
      aiThinking.current = false;
    };
  }, [state.turn, state.gameOver, aiPlayer]);

  // Compute valid destinations for selected piece
  const validDestinations = state.selectedPoint !== null
    ? getMovesFrom(state, state.selectedPoint).map(m => m.to)
    : state.turn === 'goat' && state.phase === 'placing'
      ? getValidMoves(state).filter(m => m.type === 'place').map(m => m.to)
      : [];

  return {
    state,
    playerRole,
    wins,
    validDestinations,
    newGame,
    switchRole,
    handlePointClick,
    isHumanTurn: state.turn !== aiPlayer,
  };
}
