import { useGame } from './hooks/useGame';
import { Difficulty } from './utils/generator';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function App() {
  const {
    puzzle, board, selected, difficulty, errors, completed, timer,
    newGame, selectCell, enterNumber, eraseCell,
  } = useGame();

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Sudoku</h1>
        <div className="score-box" style={{ padding: '0.4rem 0.8rem' }}>
          <span className="label">Time</span>
          <span className="value" style={{ fontSize: '1rem' }}>{formatTime(timer)}</span>
        </div>
      </div>

      <div className="difficulty-bar">
        {difficulties.map(d => (
          <button
            key={d}
            className={`btn ${d === difficulty ? 'btn-primary' : 'btn-secondary'} diff-btn`}
            onClick={() => newGame(d)}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      <div className="sudoku-board">
        {board.map((row, r) =>
          row.map((val, c) => {
            const isClue = puzzle[r][c] !== 0;
            const isSelected = selected && selected[0] === r && selected[1] === c;
            const isHighlight = selected && (selected[0] === r || selected[1] === c ||
              (Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3)));
            const isError = errors[r][c];
            const isSameNum = selected && val !== 0 && board[selected[0]][selected[1]] === val;

            return (
              <div
                key={`${r}-${c}`}
                className={[
                  'sudoku-cell',
                  isClue ? 'clue' : 'editable',
                  isSelected ? 'selected' : '',
                  isHighlight ? 'highlight' : '',
                  isError ? 'error' : '',
                  isSameNum ? 'same-num' : '',
                  c % 3 === 2 && c < 8 ? 'box-right' : '',
                  r % 3 === 2 && r < 8 ? 'box-bottom' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectCell(r, c)}
              >
                {val || ''}
              </div>
            );
          })
        )}
      </div>

      <div className="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} className="numpad-btn" onClick={() => enterNumber(n)}>
            {n}
          </button>
        ))}
        <button className="numpad-btn erase-btn" onClick={eraseCell}>⌫</button>
      </div>

      <p className="hint-text">Click a cell, then tap a number · Arrow keys to navigate</p>

      {completed && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>🎉 Solved!</h2>
            <p>Time: {formatTime(timer)}</p>
            <div className="actions">
              <button className="btn btn-primary" onClick={() => newGame(difficulty)}>New Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
