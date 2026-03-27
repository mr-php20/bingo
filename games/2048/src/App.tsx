import { useGame } from './hooks/useGame';
import { TileData } from './utils/game';

const TILE_COLORS: Record<number, string> = {
  2: '#6c5ce7', 4: '#7c6ef0', 8: '#00cec9', 16: '#00b894',
  32: '#0984e3', 64: '#e74c3c', 128: '#fdcb6e', 256: '#f39c12',
  512: '#e17055', 1024: '#d63031', 2048: '#6c5ce7',
};

function Tile({ tile }: { tile: TileData }) {
  const bg = TILE_COLORS[tile.value] || '#6c5ce7';
  const fontSize = tile.value >= 1024 ? '1.2rem' : tile.value >= 128 ? '1.4rem' : '1.7rem';

  // Tiles start at their previous position and CSS transition moves them to current
  const style: React.CSSProperties = {
    // Position at current cell
    gridRow: tile.row + 1,
    gridColumn: tile.col + 1,
    backgroundColor: bg,
    fontSize,
    // Animate from previous position via transform
    '--from-row': tile.prevRow - tile.row,
    '--from-col': tile.prevCol - tile.col,
  } as React.CSSProperties;

  const classes = [
    'tile-2048',
    tile.isNew ? 'tile-new' : '',
    tile.isMerged ? 'tile-merged' : '',
    (tile.prevRow !== tile.row || tile.prevCol !== tile.col) ? 'tile-moving' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {tile.value}
    </div>
  );
}

export default function App() {
  const { tiles, score, bestScore, gameOver, won, newGame, keepPlaying } = useGame();

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
        {/* Background cells */}
        {Array.from({ length: 16 }, (_, i) => (
          <div key={`bg-${i}`} className="cell-bg" />
        ))}
        {/* Animated tiles — key includes position so React remounts on move, replaying animation */}
        {tiles.map(tile => (
          <Tile key={`${tile.id}-${tile.row}-${tile.col}`} tile={tile} />
        ))}
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
