import { useGame } from './hooks/useGame';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function App() {
  const { board, moves, timer, bestTime, won, newGame, handleTileClick, canMoveTile } = useGame();

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>15 Puzzle</h1>
        <button className="btn btn-secondary" onClick={newGame}>New</button>
      </div>

      <div className="score-bar">
        <div className="score-box">
          <span className="label">Moves</span>
          <span className="value">{moves}</span>
        </div>
        <div className="score-box">
          <span className="label">Time</span>
          <span className="value">{formatTime(timer)}</span>
        </div>
        {bestTime !== null && (
          <div className="score-box">
            <span className="label">Best</span>
            <span className="value">{formatTime(bestTime)}</span>
          </div>
        )}
      </div>

      <div className="puzzle-board">
        {board.map((val, i) => (
          <div
            key={i}
            className={[
              'puzzle-tile',
              val === null ? 'empty' : '',
              val !== null && canMoveTile(i) ? 'movable' : '',
              val !== null && val === i + 1 ? 'correct' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => val !== null && handleTileClick(i)}
          >
            {val}
          </div>
        ))}
      </div>

      <p className="hint-text">Click a tile next to the empty space to slide it</p>

      {won && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>🎉 Solved!</h2>
            <p>{moves} moves in {formatTime(timer)}</p>
            <div className="actions">
              <button className="btn btn-primary" onClick={newGame}>Play Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
