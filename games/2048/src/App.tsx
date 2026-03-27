import { useGame } from './hooks/useGame';

const TILE_COLORS: Record<number, string> = {
  2: '#6c5ce7',
  4: '#7c6ef0',
  8: '#00cec9',
  16: '#00b894',
  32: '#0984e3',
  64: '#e74c3c',
  128: '#fdcb6e',
  256: '#f39c12',
  512: '#e17055',
  1024: '#d63031',
  2048: '#6c5ce7',
};

function getTileStyle(value: number) {
  const bg = TILE_COLORS[value] || '#6c5ce7';
  const fontSize = value >= 1024 ? '1.2rem' : value >= 128 ? '1.4rem' : '1.7rem';
  return { backgroundColor: bg, fontSize };
}

export default function App() {
  const { grid, score, bestScore, gameOver, won, newGame, keepPlaying } = useGame();

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>2048</h1>
        <button className="btn btn-secondary" onClick={newGame}>New</button>
      </div>

      <div className="score-bar">
        <div className="score-box">
          <span className="label">Score</span>
          <span className="value">{score}</span>
        </div>
        <div className="score-box">
          <span className="label">Best</span>
          <span className="value">{bestScore}</span>
        </div>
      </div>

      <div className="board-2048">
        {grid.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={`cell-2048 ${val ? 'filled' : 'empty'}`}
              style={val ? getTileStyle(val) : undefined}
            >
              {val || ''}
            </div>
          ))
        )}
      </div>

      <p className="hint-text">Use arrow keys, WASD, or swipe to play</p>

      {(gameOver || won) && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>{won ? '🎉 You Win!' : 'Game Over'}</h2>
            <p>Score: {score}</p>
            <div className="actions">
              {won && <button className="btn btn-secondary" onClick={keepPlaying}>Keep Going</button>}
              <button className="btn btn-primary" onClick={newGame}>New Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
