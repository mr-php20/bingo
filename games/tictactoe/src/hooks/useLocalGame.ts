import { useState, useCallback } from 'react';

type Mark = 'X' | 'O' | null;
type Screen = 'home' | 'playing' | 'game-over';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

interface LocalState {
  screen: Screen;
  board: Mark[];
  currentMark: Mark;
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  scores: { id: string; name: string; score: number }[];
  round: number;
}

export function useLocalGame() {
  const [state, setState] = useState<LocalState>({
    screen: 'home',
    board: Array(9).fill(null),
    currentMark: 'X',
    winnerId: null,
    winnerName: null,
    isDraw: false,
    scores: [
      { id: 'x', name: 'Player X', score: 0 },
      { id: 'o', name: 'Player O', score: 0 },
    ],
    round: 0,
  });

  const startLocal = useCallback(() => {
    setState(prev => ({
      ...prev,
      screen: 'playing',
      board: Array(9).fill(null),
      currentMark: 'X',
      winnerId: null,
      winnerName: null,
      isDraw: false,
    }));
  }, []);

  const makeMove = useCallback((cell: number) => {
    setState(prev => {
      if (prev.screen !== 'playing' || prev.board[cell] !== null) return prev;
      const board = [...prev.board];
      board[cell] = prev.currentMark;

      // Check win
      for (const [a, b, c] of WIN_LINES) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
          const winnerId = prev.currentMark === 'X' ? 'x' : 'o';
          const winnerName = prev.currentMark === 'X' ? 'Player X' : 'Player O';
          return {
            ...prev,
            board,
            screen: 'game-over',
            winnerId,
            winnerName,
            scores: prev.scores.map(s =>
              s.id === winnerId ? { ...s, score: s.score + 1 } : s
            ),
          };
        }
      }

      // Check draw
      if (board.every(c => c !== null)) {
        return { ...prev, board, screen: 'game-over', isDraw: true };
      }

      return { ...prev, board, currentMark: prev.currentMark === 'X' ? 'O' : 'X' };
    });
  }, []);

  const rematch = useCallback(() => {
    setState(prev => ({
      ...prev,
      screen: 'playing',
      board: Array(9).fill(null),
      currentMark: 'X',
      winnerId: null,
      winnerName: null,
      isDraw: false,
      round: prev.round + 1,
    }));
  }, []);

  const goHome = useCallback(() => {
    setState({
      screen: 'home',
      board: Array(9).fill(null),
      currentMark: 'X',
      winnerId: null,
      winnerName: null,
      isDraw: false,
      scores: [
        { id: 'x', name: 'Player X', score: 0 },
        { id: 'o', name: 'Player O', score: 0 },
      ],
      round: 0,
    });
  }, []);

  return {
    screen: state.screen,
    board: state.board,
    currentMark: state.currentMark,
    myMark: state.currentMark,
    isMyTurn: true, // always your turn in local
    playerId: state.currentMark === 'X' ? 'x' : 'o',
    players: [
      { id: 'x', name: 'Player X', mark: 'X' },
      { id: 'o', name: 'Player O', mark: 'O' },
    ],
    scores: state.scores,
    winnerId: state.winnerId,
    winnerName: state.winnerName,
    isDraw: state.isDraw,
    error: null as string | null,
    roomCode: null as string | null,
    isHost: false,
    startLocal,
    makeMove,
    rematch,
    goHome,
    clearError: () => {},
  };
}
