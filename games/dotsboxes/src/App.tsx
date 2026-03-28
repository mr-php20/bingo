import { useState, useCallback } from 'react';
import { useGame, lineKey } from './hooks/useGame';

const DOT_R = 5;
const CELL = 60;
const PAD = 20;
const LINE_HIT = 10; // clickable line hit area width

export default function App() {
  const game = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [hoverLine, setHoverLine] = useState<string | null>(null);

  // ── Home Screen ──
  if (game.screen === 'home') {
    return (
      <div className="game-app">
        <div className="game-header">
          <a href="/" className="back-link">← Games</a>
          <h1>Dots & Boxes</h1>
          <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
        </div>

        <div className="db-home">
          <input className="db-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} maxLength={20} />
          <button className="btn btn-primary" disabled={name.trim().length < 3} onClick={() => game.createRoom(name.trim())}>
            Create Room
          </button>
          <div className="db-divider"><span>or</span></div>
          <input className="db-input" placeholder="Room code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} />
          <button className="btn btn-secondary" disabled={name.trim().length < 3 || code.trim().length < 4} onClick={() => game.joinRoom(name.trim(), code.trim())}>
            Join Room
          </button>
        </div>

        {game.error && <p className="db-error">{game.error}</p>}
        {showRules && <Rules onClose={() => setShowRules(false)} />}
      </div>
    );
  }

  // ── Lobby Screen ──
  if (game.screen === 'lobby') {
    return (
      <div className="game-app">
        <div className="game-header">
          <a href="/" className="back-link">← Games</a>
          <h1>Dots & Boxes</h1>
          <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
        </div>

        <div className="db-lobby">
          <div className="db-room-code">Room: <strong>{game.roomCode}</strong></div>
          <p className="db-players-label">Players:</p>
          <ul className="db-player-list">
            {game.players.map(p => (
              <li key={p.id} className={`color-${p.color}`}>
                {p.name} {p.id === game.playerId ? '(You)' : ''}
              </li>
            ))}
          </ul>

          {game.players.length < 2 && <p className="hint-text">Waiting for opponent to join…</p>}

          {game.isHost && game.players.length >= 2 && (
            <button className="btn btn-primary" onClick={game.startGame}>Start Game</button>
          )}
          {!game.isHost && game.players.length >= 2 && (
            <p className="hint-text">Waiting for host to start…</p>
          )}
        </div>

        {game.error && <p className="db-error">{game.error}</p>}
        {showRules && <Rules onClose={() => setShowRules(false)} />}
      </div>
    );
  }

  // ── Playing / Game Over ──
  return <Board game={game} showRules={showRules} setShowRules={setShowRules} hoverLine={hoverLine} setHoverLine={setHoverLine} />;
}

interface BoardProps {
  game: ReturnType<typeof useGame>;
  showRules: boolean;
  setShowRules: (v: boolean) => void;
  hoverLine: string | null;
  setHoverLine: (v: string | null) => void;
}

function Board({ game, showRules, setShowRules, hoverLine, setHoverLine }: BoardProps) {
  const gs = game.gridSize;
  const boardW = PAD * 2 + (gs - 1) * CELL;
  const boardH = boardW;
  const opponent = game.players.find(p => p.id !== game.playerId);

  const handleLineClick = useCallback((r1: number, c1: number, r2: number, c2: number) => {
    if (!game.isMyTurn || game.screen === 'game-over') return;
    const key = lineKey(r1, c1, r2, c2);
    if (game.lines.has(key)) return;
    game.drawLine(r1, c1, r2, c2);
  }, [game]);

  // Build clickable line segments
  const lineSegments: { r1: number; c1: number; r2: number; c2: number; key: string }[] = [];
  for (let r = 0; r < gs; r++) {
    for (let c = 0; c < gs; c++) {
      // Horizontal line to the right
      if (c + 1 < gs) lineSegments.push({ r1: r, c1: c, r2: r, c2: c + 1, key: lineKey(r, c, r, c + 1) });
      // Vertical line downward
      if (r + 1 < gs) lineSegments.push({ r1: r, c1: c, r2: r + 1, c2: c, key: lineKey(r, c, r + 1, c) });
    }
  }

  // Build box fills
  const boxFills: { r: number; c: number; color: string }[] = [];
  for (const [key, owner] of game.boxes) {
    const [rs, cs] = key.split(',').map(Number);
    const player = game.players.find(p => p.id === owner);
    if (player) boxFills.push({ r: rs, c: cs, color: player.color });
  }

  const getColor = (playerColor: string) => playerColor === 'red' ? '#e17055' : '#00cec9';

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Dots & Boxes</h1>
        <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
      </div>

      <div className="score-bar">
        <div className={`score-box ${game.isMyTurn && game.screen === 'playing' ? 'active-turn' : ''}`}>
          <span className="label" style={{ color: getColor(game.myColor) }}>You</span>
          <span className="value">{game.scores.find(s => s.id === game.playerId)?.score ?? 0}</span>
        </div>
        <div className={`score-box ${!game.isMyTurn && game.screen === 'playing' ? 'active-turn' : ''}`}>
          <span className="label" style={{ color: getColor(opponent?.color ?? 'blue') }}>{opponent?.name ?? 'Opponent'}</span>
          <span className="value">{game.scores.find(s => s.id !== game.playerId)?.score ?? 0}</span>
        </div>
      </div>

      <p className="hint-text" style={{ marginBottom: '0.5rem' }}>
        {game.screen === 'game-over'
          ? game.isDraw ? "It's a draw!" : game.winnerId === game.playerId ? '🎉 You win!' : `${game.winnerName} wins!`
          : game.isMyTurn ? 'Your turn — draw a line' : `${opponent?.name ?? 'Opponent'}'s turn`}
      </p>

      <div className="db-board-container">
        <svg
          viewBox={`0 0 ${boardW} ${boardH}`}
          width={boardW}
          height={boardH}
          className="db-board"
        >
          {/* Box fills */}
          {boxFills.map(b => (
            <rect
              key={`box-${b.r}-${b.c}`}
              x={PAD + b.c * CELL + 2}
              y={PAD + b.r * CELL + 2}
              width={CELL - 4}
              height={CELL - 4}
              rx={4}
              fill={getColor(b.color)}
              opacity={0.2}
            />
          ))}

          {/* Line segments — drawn + clickable */}
          {lineSegments.map(seg => {
            const x1 = PAD + seg.c1 * CELL;
            const y1 = PAD + seg.r1 * CELL;
            const x2 = PAD + seg.c2 * CELL;
            const y2 = PAD + seg.r2 * CELL;
            const drawn = game.lines.get(seg.key);
            const isHover = hoverLine === seg.key && !drawn && game.isMyTurn && game.screen === 'playing';

            return (
              <g key={seg.key}>
                {/* Drawn line */}
                {drawn && (
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={getColor(drawn)} strokeWidth={3} strokeLinecap="round" />
                )}

                {/* Hover preview */}
                {isHover && (
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={getColor(game.myColor)} strokeWidth={3} strokeLinecap="round" opacity={0.4} />
                )}

                {/* Undrawn line placeholder */}
                {!drawn && !isHover && (
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="var(--border-solid, #2a2d3e)" strokeWidth={1.5} strokeLinecap="round" />
                )}

                {/* Hit area */}
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="transparent" strokeWidth={LINE_HIT * 2} strokeLinecap="round"
                  style={{ cursor: (!drawn && game.isMyTurn && game.screen === 'playing') ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHoverLine(seg.key)}
                  onMouseLeave={() => setHoverLine(null)}
                  onClick={() => handleLineClick(seg.r1, seg.c1, seg.r2, seg.c2)}
                />
              </g>
            );
          })}

          {/* Dots */}
          {Array.from({ length: gs }, (_, r) =>
            Array.from({ length: gs }, (_, c) => (
              <circle
                key={`dot-${r}-${c}`}
                cx={PAD + c * CELL}
                cy={PAD + r * CELL}
                r={DOT_R}
                fill="var(--text-primary)"
              />
            ))
          )}
        </svg>
      </div>

      {game.screen === 'game-over' && (
        <div className="db-actions">
          <button className="btn btn-primary" onClick={game.rematch}>Rematch</button>
        </div>
      )}

      {game.error && <p className="db-error">{game.error}</p>}
      {showRules && <Rules onClose={() => setShowRules(false)} />}
    </div>
  );
}

function Rules({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-card" onClick={e => e.stopPropagation()}>
        <h2>How to Play Dots & Boxes</h2>
        <h3>Goal</h3>
        <p>Complete more boxes than your opponent on a grid of dots.</p>
        <h3>Rules</h3>
        <ul>
          <li>Create a room and share the code with a friend.</li>
          <li>Players take turns drawing a line between two adjacent dots.</li>
          <li>If you complete the <strong>4th side</strong> of a box, you score a point and get another turn.</li>
          <li>The game ends when all boxes are filled. Most boxes wins!</li>
        </ul>
        <div className="rules-close">
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
