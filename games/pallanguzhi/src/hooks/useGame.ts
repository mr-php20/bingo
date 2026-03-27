import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Player, createInitialState, makeMove, canPick, getAiMove } from '../utils/game';

const BEST_KEY = 'pallanguzhi-wins';

function loadWins(): [number, number] {
  const v = localStorage.getItem(BEST_KEY);
  if (!v) return [0, 0];
  const parsed = JSON.parse(v) as [number, number];
  return parsed;
}

export function useGame() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [wins, setWins] = useState<[number, number]>(loadWins);
  const [vsAi, setVsAi] = useState(true);
  const aiThinking = useRef(false);

  const newGame = useCallback(() => {
    setState(createInitialState());
    aiThinking.current = false;
  }, []);

  const toggleMode = useCallback(() => {
    setVsAi(prev => !prev);
    setState(createInitialState());
    aiThinking.current = false;
  }, []);

  const handlePitClick = useCallback((pitIndex: number) => {
    if (aiThinking.current) return;

    setState(prev => {
      if (!canPick(prev, pitIndex)) return prev;
      const next = makeMove(prev, pitIndex);

      if (next.gameOver && next.winner !== null) {
        setWins(w => {
          const updated: [number, number] = [...w];
          updated[next.winner as Player]++;
          localStorage.setItem(BEST_KEY, JSON.stringify(updated));
          return updated;
        });
      }

      return next;
    });
  }, []);

  // AI move
  useEffect(() => {
    if (!vsAi || state.currentPlayer !== 1 || state.gameOver) {
      aiThinking.current = false;
      return;
    }

    aiThinking.current = true;
    const timeout = setTimeout(() => {
      const pit = getAiMove(state);
      if (pit >= 0) {
        handlePitClick(pit);
      }
      aiThinking.current = false;
    }, 500);

    return () => {
      clearTimeout(timeout);
      aiThinking.current = false;
    };
  }, [vsAi, state.currentPlayer, state.gameOver, state, handlePitClick]);

  return {
    state,
    wins,
    vsAi,
    newGame,
    toggleMode,
    handlePitClick,
    canPick: (i: number) => canPick(state, i),
  };
}
