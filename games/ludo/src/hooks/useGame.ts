import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState, PlayerIndex, createInitialState,
  applyDiceRoll, moveToken, getMovableTokens, getAiTokenChoice,
} from '../utils/game';

export function useGame() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [humanPlayer] = useState<PlayerIndex>(0);
  const aiThinking = useRef(false);

  const newGame = useCallback(() => {
    setState(createInitialState());
    aiThinking.current = false;
  }, []);

  const rollDice = useCallback(() => {
    if (aiThinking.current) return;
    setState(prev => {
      if (prev.diceRolled || prev.gameOver) return prev;
      if (prev.currentPlayer !== humanPlayer) return prev;
      return applyDiceRoll(prev);
    });
  }, [humanPlayer]);

  const handleTokenClick = useCallback((player: PlayerIndex, index: number) => {
    if (aiThinking.current) return;
    setState(prev => {
      if (prev.gameOver) return prev;
      if (prev.currentPlayer !== humanPlayer) return prev;
      if (!prev.diceRolled) return prev;
      return moveToken(prev, player, index);
    });
  }, [humanPlayer]);

  // AI turns
  useEffect(() => {
    if (state.gameOver || state.currentPlayer === humanPlayer) {
      aiThinking.current = false;
      return;
    }

    aiThinking.current = true;

    const doAiTurn = () => {
      setState(prev => {
        if (prev.gameOver || prev.currentPlayer === humanPlayer) return prev;

        if (!prev.diceRolled) {
          // Roll the dice
          return applyDiceRoll(prev);
        }

        // Pick a token to move
        const choice = getAiTokenChoice(prev);
        if (!choice) {
          // No moves — this shouldn't happen as applyDiceRoll handles it
          return prev;
        }
        return moveToken(prev, choice.player, choice.index);
      });
    };

    const timeout = setTimeout(doAiTurn, 700);
    return () => {
      clearTimeout(timeout);
      aiThinking.current = false;
    };
  }, [state.currentPlayer, state.diceRolled, state.gameOver, humanPlayer, state.diceValue]);

  const movableTokens = state.currentPlayer === humanPlayer && state.diceRolled
    ? getMovableTokens(state)
    : [];

  const isHumanTurn = state.currentPlayer === humanPlayer;
  const needsRoll = isHumanTurn && !state.diceRolled && !state.gameOver;
  const needsMove = isHumanTurn && state.diceRolled && movableTokens.length > 0;

  return {
    state,
    humanPlayer,
    movableTokens,
    isHumanTurn,
    needsRoll,
    needsMove,
    newGame,
    rollDice,
    handleTokenClick,
  };
}
