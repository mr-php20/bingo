import { useGame } from './hooks/useGame';
import { Direction } from './utils/game';

export default function App() {
  const {
    snake, food, score, highScore, gameOver, paused, started,
    gridSize, newGame, changeDirection, togglePause,
  } = useGame();

  const headKey = `${snake[0].x},${snake[0].y}`;
  const foodKey = `${food.x},${food.y}`;
  const snakeSet = new Set(snake.map(p => `${p.x},${p.y}`));

  const handleDPad = (dir: Direction) => {
    if (!started) togglePause();
    changeDirection(dir);
  };

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Snake</h1>
        <button className="btn btn-secondary" onClick={newGame}>New</button>
      </div>

      <div className="score-bar">
        <div className="score-box">
          <span className="label">Score</span>
          <span className="value">{score}</span>
        </div>
        <div className="score-box">
          <span className="label">Best</span>
          <span className="value">{highScore}</span>
        </div>
      </div>

      <div className="snake-board" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const x = i % gridSize;
          const y = Math.floor(i / gridSize);
          const key = `${x},${y}`;
          const isHead = key === headKey;
          const isSnake = snakeSet.has(key);
          const isFood = key === foodKey;
          return (
            <div
              key={key}
              className={`snake-cell ${isHead ? 'head' : isSnake ? 'body' : ''} ${isFood ? 'food' : ''}`}
            />
          );
        })}
      </div>

      {!started && !gameOver && (
        <div className="snake-start-overlay">
          <p>Press any arrow key, swipe, or tap a direction to start</p>
          <button className="btn btn-primary" onClick={togglePause}>Start</button>
        </div>
      )}

      {paused && started && !gameOver && (
        <div className="game-over-overlay" onClick={togglePause}>
          <div className="game-over-card">
            <h2>Paused</h2>
            <p>Press Space or tap to resume</p>
          </div>
        </div>
      )}

      {/* Mobile D-pad */}
      <div className="dpad">
        <button className="dpad-btn dpad-up" onClick={() => handleDPad('up')}>▲</button>
        <div className="dpad-row">
          <button className="dpad-btn" onClick={() => handleDPad('left')}>◀</button>
          <button className="dpad-btn" onClick={() => handleDPad('right')}>▶</button>
        </div>
        <button className="dpad-btn dpad-down" onClick={() => handleDPad('down')}>▼</button>
      </div>

      <p className="hint-text">Arrow keys / WASD · Space to pause · Swipe on mobile</p>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>Game Over</h2>
            <p>Score: {score}</p>
            <div className="actions">
              <button className="btn btn-primary" onClick={newGame}>Play Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
