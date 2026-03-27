import { useGame } from './hooks/useGame';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function App() {
  const { board, moves, timer, bestTime, won, lastMove, newGame, handleTileClick, canMoveTile } = useGame();

  // Build tile list: for each non-null value, compute its row/col from the board array
  const tiles = board
    .map((val, idx) => ({ val, row: Math.floor(idx / 4), col: idx % 4, idx }))
    .filter((t): t is { val: number; row: number; col: number; idx: number } => t.val !== null);

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
        {/* Background cells */}
        {Array.from({ length: 16 }, (_, i) => (
          <div key={`bg-${i}`} className="puzzle-cell-bg" />
        ))}
        {/* Animated tiles keyed by value so they persist across moves */}
        {tiles.map(t => {
          const isLastMoved = lastMove !== null && lastMove.value === t.val;
          const style: React.CSSProperties = {
            gridRow: t.row + 1,
            gridColumn: t.col + 1,
            '--from-row': isLastMoved ? lastMove.fromRow - lastMove.toRow : 0,
            '--from-col': isLastMoved ? lastMove.fromCol - lastMove.toCol : 0,
          } as React.CSSProperties;

          return (
            <div
              key={isLastMoved ? `${t.val}-${moves}` : t.val}
              className={[
                'puzzle-tile',
                canMoveTile(t.idx) ? 'movable' : '',
                t.val === t.idx + 1 ? 'correct' : '',
                isLastMoved ? 'tile-sliding' : '',
              ].filter(Boolean).join(' ')}
              style={style}
              onClick={() => handleTileClick(t.idx)}
            >
              {t.val}
            </div>
          );
        })}
      </div>

      <p className="hint-text">Click, use arrow keys, or WASD to slide tiles</p>

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
