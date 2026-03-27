import { useGame } from './hooks/useGame';
import {
  PLAYER_COLORS, PLAYER_NAMES, PLAYERS, TOKENS_PER_PLAYER,
  getTokenGridPos, getPathCoord, SAFE_SQUARES, Token,
  getHomeColumnCoord, HOME_COLUMN_LENGTH,
} from './utils/game';

const GRID = 15;
const CELL = 24;
const BOARD_PX = GRID * CELL;

function TokenPiece({
  token,
  isMovable,
  onClick,
}: {
  token: Token;
  isMovable: boolean;
  onClick: () => void;
}) {
  const [col, row] = getTokenGridPos(token);
  const color = PLAYER_COLORS[token.player];

  return (
    <div
      className={`ludo-token ${isMovable ? 'movable' : ''} ${token.finished ? 'finished' : ''}`}
      style={{
        left: col * CELL + CELL / 2,
        top: row * CELL + CELL / 2,
        backgroundColor: color,
        borderColor: color,
      }}
      onClick={isMovable ? onClick : undefined}
    >
      {token.index + 1}
    </div>
  );
}

function DiceFace({ value }: { value: number | null }) {
  if (value === null) return <span className="dice-placeholder">?</span>;
  const dots = '⚀⚁⚂⚃⚄⚅';
  return <span className="dice-face">{dots[value - 1]}</span>;
}

export default function App() {
  const {
    state, humanPlayer, movableTokens,
    needsRoll,
    newGame, rollDice, handleTokenClick,
  } = useGame();

  const { tokens, currentPlayer, diceValue, gameOver, rankings, message } = state;

  const movableIds = new Set(movableTokens.map(t => `${t.player}-${t.index}`));

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Ludo</h1>
        <button className="btn btn-secondary" onClick={newGame}>New</button>
      </div>

      <div className="score-bar">
        {PLAYERS.map(p => (
          <div key={p} className="score-box" style={{ borderColor: currentPlayer === p ? PLAYER_COLORS[p] : 'transparent' }}>
            <span className="label" style={{ color: PLAYER_COLORS[p] }}>
              {p === humanPlayer ? '★ ' : ''}{PLAYER_NAMES[p]}
            </span>
            <span className="value">
              {tokens.filter(t => t.player === p && t.finished).length}/{TOKENS_PER_PLAYER}
            </span>
          </div>
        ))}
      </div>

      <div className="ludo-board-wrapper">
        <div className="ludo-board" style={{ width: BOARD_PX, height: BOARD_PX }}>
          {/* Board grid background */}
          <svg viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`} className="ludo-grid-svg">
            {/* Path squares */}
            {Array.from({ length: 52 }, (_, abs) => {
              const [c, r] = getPathCoord(abs);
              const isSafe = SAFE_SQUARES.has(abs);
              // Determine color: start squares are colored
              let fill = 'var(--bg-card)';
              if (abs === 0) fill = PLAYER_COLORS[0] + '40';
              else if (abs === 13) fill = PLAYER_COLORS[1] + '40';
              else if (abs === 26) fill = PLAYER_COLORS[2] + '40';
              else if (abs === 39) fill = PLAYER_COLORS[3] + '40';
              return (
                <rect
                  key={`path-${abs}`}
                  x={c * CELL + 1} y={r * CELL + 1}
                  width={CELL - 2} height={CELL - 2}
                  rx={3}
                  fill={fill}
                  stroke={isSafe ? 'var(--accent-2)' : 'var(--border)'}
                  strokeWidth={isSafe ? 1.5 : 0.5}
                />
              );
            })}
            {/* Home columns */}
            {PLAYERS.map(p =>
              Array.from({ length: HOME_COLUMN_LENGTH }, (_, step) => {
                const [c, r] = getHomeColumnCoord(p, step);
                return (
                  <rect
                    key={`home-${p}-${step}`}
                    x={c * CELL + 1} y={r * CELL + 1}
                    width={CELL - 2} height={CELL - 2}
                    rx={3}
                    fill={PLAYER_COLORS[p] + '30'}
                    stroke={PLAYER_COLORS[p] + '60'}
                    strokeWidth={0.5}
                  />
                );
              })
            )}
            {/* Center */}
            <rect
              x={7 * CELL + 1} y={7 * CELL + 1}
              width={CELL - 2} height={CELL - 2}
              rx={3}
              fill="var(--bg-secondary)"
              stroke="var(--accent-1)"
              strokeWidth={1}
            />
            {/* Base areas */}
            {PLAYERS.map(p => {
              const baseX = p === 1 || p === 2 ? 1 : 9;
              const baseY = p === 2 || p === 3 ? 1 : 9;
              return (
                <rect
                  key={`base-bg-${p}`}
                  x={baseX * CELL}
                  y={baseY * CELL}
                  width={6 * CELL}
                  height={6 * CELL}
                  rx={8}
                  fill={PLAYER_COLORS[p] + '12'}
                  stroke={PLAYER_COLORS[p] + '30'}
                  strokeWidth={1}
                />
              );
            })}
          </svg>

          {/* Token pieces */}
          {tokens.map(token => (
            <TokenPiece
              key={`${token.player}-${token.index}`}
              token={token}
              isMovable={movableIds.has(`${token.player}-${token.index}`)}
              onClick={() => handleTokenClick(token.player, token.index)}
            />
          ))}
        </div>
      </div>

      <div className="ludo-controls">
        <div className="dice-area" onClick={needsRoll ? rollDice : undefined}>
          <DiceFace value={diceValue} />
          {needsRoll && <span className="dice-hint">Tap to roll</span>}
        </div>
        <p className="hint-text">{message}</p>
      </div>

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>{rankings[0] === humanPlayer ? '🎉 You Win!' : `${PLAYER_NAMES[rankings[0]]} Wins!`}</h2>
            <ol className="rankings-list">
              {rankings.map((p, i) => (
                <li key={p} style={{ color: PLAYER_COLORS[p] }}>
                  {i + 1}. {PLAYER_NAMES[p]} {p === humanPlayer ? '(You)' : ''}
                </li>
              ))}
            </ol>
            <div className="actions">
              <button className="btn btn-primary" onClick={newGame}>Play Again</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
