import { useGame } from './hooks/useGame';
import { getPointPositions, getEdges, TOTAL_GOATS, GOATS_TO_WIN } from './utils/game';

const POINTS = getPointPositions();
const EDGES = getEdges();

const BOARD_SIZE = 320;
const PAD = 30;
const INNER = BOARD_SIZE - PAD * 2;

function px(frac: number, pad: number, inner: number) {
  return pad + frac * inner;
}

export default function App() {
  const {
    state, playerRole, wins, validDestinations,
    newGame, switchRole, handlePointClick, isHumanTurn,
  } = useGame();

  const { board, goatsPlaced, goatsCaptured, turn, phase, selectedPoint, gameOver, winner } = state;

  const goatsRemaining = TOTAL_GOATS - goatsPlaced;

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Goats & Tigers</h1>
        <button className="btn btn-secondary" onClick={newGame}>New</button>
      </div>

      <div className="score-bar">
        <div className="score-box">
          <span className="label">🐐 To Place</span>
          <span className="value">{goatsRemaining}</span>
        </div>
        <div className="score-box">
          <span className="label">🐅 Captured</span>
          <span className="value">{goatsCaptured}/{GOATS_TO_WIN}</span>
        </div>
        <div className="score-box">
          <span className="label">Wins</span>
          <span className="value">🐐{wins.goat} 🐅{wins.tiger}</span>
        </div>
      </div>

      <div className="gat-board-container">
        <svg
          viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
          className="gat-board"
          width={BOARD_SIZE}
          height={BOARD_SIZE}
        >
          {/* Grid lines */}
          {EDGES.map(([a, b], idx) => (
            <line
              key={idx}
              x1={px(POINTS[a].x, PAD, INNER)}
              y1={px(POINTS[a].y, PAD, INNER)}
              x2={px(POINTS[b].x, PAD, INNER)}
              y2={px(POINTS[b].y, PAD, INNER)}
              className="gat-edge"
            />
          ))}

          {/* Points */}
          {POINTS.map((pt, i) => {
            const cx = px(pt.x, PAD, INNER);
            const cy = px(pt.y, PAD, INNER);
            const piece = board[i];
            const isSelected = selectedPoint === i;
            const isValidDest = validDestinations.includes(i);

            return (
              <g key={i} onClick={() => handlePointClick(i)} style={{ cursor: 'pointer' }}>
                {/* Hit area */}
                <circle cx={cx} cy={cy} r={18} fill="transparent" />

                {/* Valid destination indicator */}
                {isValidDest && !piece && (
                  <circle cx={cx} cy={cy} r={12} className="gat-valid-dest" />
                )}

                {/* Empty point */}
                {!piece && !isValidDest && (
                  <circle cx={cx} cy={cy} r={5} className="gat-empty-point" />
                )}

                {/* Tiger */}
                {piece === 'tiger' && (
                  <>
                    <circle
                      cx={cx} cy={cy} r={14}
                      className={`gat-tiger ${isSelected ? 'selected' : ''}`}
                    />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize="14">
                      🐅
                    </text>
                  </>
                )}

                {/* Goat */}
                {piece === 'goat' && (
                  <>
                    <circle
                      cx={cx} cy={cy} r={14}
                      className={`gat-goat ${isSelected ? 'selected' : ''}`}
                    />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize="14">
                      🐐
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="controls-row">
        <p className="hint-text">
          {isHumanTurn
            ? turn === 'goat' && phase === 'placing'
              ? 'Place a goat on an empty point'
              : selectedPoint !== null
                ? 'Click a highlighted point to move'
                : `Select a ${turn} to move`
            : 'AI thinking…'}
          {' · You: '}
          {playerRole === 'goat' ? '🐐' : '🐅'}
        </p>
        <button className="btn btn-text" onClick={switchRole}>
          Play as {playerRole === 'goat' ? '🐅' : '🐐'}
        </button>
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>
              {winner === 'goat'
                ? playerRole === 'goat' ? '🎉 Goats Win!' : 'Goats Win!'
                : playerRole === 'tiger' ? '🎉 Tigers Win!' : 'Tigers Win!'}
            </h2>
            <p>
              {winner === 'tiger'
                ? `Tigers captured ${goatsCaptured} goats`
                : 'All tigers are trapped!'}
            </p>
            <div className="actions">
              <button className="btn btn-primary" onClick={newGame}>Play Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
