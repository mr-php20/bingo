import { useState, useEffect, useCallback } from 'react';
import { useGame, lineKey } from './hooks/useGame';

const DOT_R = 5;
const CELL = 60;
const PAD = 20;
const LINE_HIT = 10; // clickable line hit area width

export default function App() {
  const game = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join' | 'join-link'>('menu');
  const [showRules, setShowRules] = useState(false);
  const [hoverLine, setHoverLine] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setCode(roomParam.toUpperCase());
      setMode('join-link');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const nameTooShort = name.trim().length < 3;

  const handleCreate = () => {
    if (nameTooShort) return;
    game.createRoom(name.trim());
  };

  const handleJoin = () => {
    if (nameTooShort || !code.trim()) return;
    game.joinRoom(name.trim(), code.trim());
  };

  const handleCopy = useCallback(async () => {
    if (game.roomCode) await navigator.clipboard.writeText(game.roomCode);
  }, [game.roomCode]);

  const handleShare = useCallback(async () => {
    const gameUrl = `${window.location.origin}${window.location.pathname}?room=${game.roomCode}`;
    const shareText = `Join my Dots & Boxes game!\n${gameUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Dots & Boxes', text: shareText, url: gameUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(gameUrl);
    }
  }, [game.roomCode]);

  // ── Home Screen ──
  if (game.screen === 'home') {
    return (
      <div className="game-app">
        <div className="game-header">
          <a href="/" className="back-link">← Games</a>
          <h1>Dots & Boxes</h1>
          <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
        </div>

        {mode === 'menu' && (
          <div className="home-actions">
            <input
              type="text"
              placeholder="Enter your name (min 3 chars)"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={nameTooShort}>
              Create Game
            </button>
            <button className="btn btn-secondary" onClick={() => { if (!nameTooShort) setMode('join'); }} disabled={nameTooShort}>
              Join Game
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="home-actions">
            <p className="join-link-info">Joining as <strong>{name}</strong></p>
            <input
              type="text"
              placeholder="Enter room code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoComplete="off"
              style={{ textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center' }}
            />
            <button className="btn btn-primary" onClick={handleJoin} disabled={!code.trim() || code.trim().length < 6 || nameTooShort}>
              Join Room
            </button>
            <button className="btn btn-text" onClick={() => setMode('menu')}>Back</button>
          </div>
        )}

        {mode === 'join-link' && (
          <div className="home-actions">
            <p className="join-link-info">Joining room <strong>{code}</strong></p>
            <input
              type="text"
              placeholder="Enter your name (min 3 chars)"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={handleJoin} disabled={nameTooShort}>
              Join Game
            </button>
          </div>
        )}

        {game.error && <div className="error-toast" onClick={game.clearError}>{game.error}</div>}
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

        <div className="lobby-section">
          <h2>Game Lobby</h2>

          <div className="room-code-section">
            <p className="label">Room Code</p>
            <div className="room-code" onClick={handleCopy} title="Click to copy">
              {game.roomCode}
            </div>
            <div className="room-code-actions">
              <button className="btn btn-small" onClick={handleCopy}>📋 Copy</button>
              <button className="btn btn-small" onClick={handleShare}>📤 Share</button>
            </div>
          </div>

          <div className="players-section">
            <p className="label">Players ({game.players.length})</p>
            {game.players.map(p => (
              <div key={p.id} className={`player-tag color-${p.color}`}>
                {p.name} {p.id === game.playerId ? '(You)' : ''}
              </div>
            ))}
            {game.players.length < 2 && (
              <div className="player-tag waiting">Waiting for opponent…</div>
            )}
          </div>

          {game.isHost && (
            <button className="btn btn-primary" onClick={game.startGame} disabled={game.players.length < 2}>
              {game.players.length < 2 ? 'Waiting for Player…' : 'Start Game'}
            </button>
          )}

          {!game.isHost && (
            <p className="info-text">Waiting for host to start the game…</p>
          )}

          <button className="btn btn-text" onClick={game.goHome}>Leave Room</button>
        </div>

        {game.error && <div className="error-toast" onClick={game.clearError}>{game.error}</div>}
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
        <div className="game-actions">
          <button className="btn btn-primary" onClick={game.rematch}>Rematch</button>
        </div>
      )}

      {game.error && <div className="error-toast" onClick={game.clearError}>{game.error}</div>}
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
