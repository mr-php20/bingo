import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from './hooks/useGame';
import { useLocalGame } from './hooks/useLocalGame';
import type { CellData, AnimationData } from './hooks/useLocalGame';

const PLAYER_COLORS = [
  '#e17055', // red
  '#00cec9', // teal
  '#fdcb6e', // yellow
  '#6c5ce7', // purple
  '#00b894', // green
  '#e84393', // pink
  '#0984e3', // blue
  '#fd79a8', // salmon
];

function getColor(colorIndex: number): string {
  return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
}

export default function App() {
  const onlineGame = useGame();
  const localGame = useLocalGame();
  const [isLocal, setIsLocal] = useState(false);
  const game = isLocal ? localGame : onlineGame;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join' | 'join-link' | 'local-setup'>('menu');
  const [showRules, setShowRules] = useState(false);
  const [localPlayerCount, setLocalPlayerCount] = useState(2);

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
    onlineGame.createRoom(name.trim());
  };

  const handleJoin = () => {
    if (nameTooShort || !code.trim()) return;
    onlineGame.joinRoom(name.trim(), code.trim());
  };

  const handleCopy = useCallback(async () => {
    if (game.roomCode) await navigator.clipboard.writeText(game.roomCode);
  }, [game.roomCode]);

  const handleShare = useCallback(async () => {
    const gameUrl = `${window.location.origin}${window.location.pathname}?room=${game.roomCode}`;
    const shareText = `Join my Chain Reaction game!\n${gameUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Chain Reaction', text: shareText, url: gameUrl }); } catch { /* cancelled */ }
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
          <h1>Chain Reaction</h1>
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
            <div className="divider"><span>or</span></div>
            <button className="btn btn-secondary" onClick={() => setMode('local-setup')}>Pass & Play</button>
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

        {mode === 'local-setup' && (
          <div className="home-actions">
            <p className="join-link-info">Pass & Play — share one device</p>
            <div className="cr-player-count">
              <span className="label">Players</span>
              <div className="cr-count-selector">
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    className={`cr-count-btn ${localPlayerCount === n ? 'selected' : ''}`}
                    onClick={() => setLocalPlayerCount(n)}
                  >{n}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setIsLocal(true); localGame.startLocal(localPlayerCount); }}>Start Game</button>
            <button className="btn btn-text" onClick={() => setMode('menu')}>Back</button>
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
          <h1>Chain Reaction</h1>
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
            <p className="label">Players ({game.players.length}/8)</p>
            {game.players.map(p => (
              <div
                key={p.id}
                className="player-tag"
                style={{ borderLeft: `3px solid ${getColor(p.colorIndex)}` }}
              >
                {p.name} {p.id === game.playerId ? '(You)' : ''}
              </div>
            ))}
            {game.players.length < 2 && (
              <div className="player-tag waiting">Need at least 2 players…</div>
            )}
          </div>

          {game.isHost && (
            <button className="btn btn-primary" onClick={game.startGame} disabled={game.players.length < 2}>
              {game.players.length < 2 ? 'Waiting for Players…' : 'Start Game'}
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
  const currentPlayer = game.players.find(p => p.id === game.currentTurn);
  const activePlayers = game.players.filter(p => !game.eliminatedPlayers.includes(p.id));

  return <GameBoard
    game={game}
    isLocal={isLocal}
    localGame={localGame}
    showRules={showRules}
    setShowRules={setShowRules}
    setIsLocal={setIsLocal}
    setMode={setMode}
    currentPlayer={currentPlayer}
    activePlayers={activePlayers}
  />;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

interface GameBoardProps {
  game: ReturnType<typeof useGame> | ReturnType<typeof useLocalGame>;
  isLocal: boolean;
  localGame: ReturnType<typeof useLocalGame>;
  showRules: boolean;
  setShowRules: (v: boolean) => void;
  setIsLocal: (v: boolean) => void;
  setMode: (v: 'menu' | 'join' | 'join-link' | 'local-setup') => void;
  currentPlayer: { id: string; name: string; colorIndex: number } | undefined;
  activePlayers: { id: string; name: string; colorIndex: number }[];
}

function GameBoard({ game, isLocal, localGame, showRules, setShowRules, setIsLocal, setMode, currentPlayer, activePlayers }: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [displayBoard, setDisplayBoard] = useState<CellData[][] | null>(null);
  const [flyingOrbs, setFlyingOrbs] = useState<{ fromX: number; fromY: number; toX: number; toY: number; color: string }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const boardToRender = displayBoard ?? game.board;

  const getCellCenter = useCallback((row: number, col: number): { x: number; y: number } | null => {
    const board = boardRef.current;
    if (!board) return null;
    const cellIndex = row * game.cols + col;
    const cells = board.querySelectorAll('.cr-cell');
    const cell = cells[cellIndex] as HTMLElement | undefined;
    if (!cell) return null;
    return {
      x: cell.offsetLeft + cell.offsetWidth / 2,
      y: cell.offsetTop + cell.offsetHeight / 2,
    };
  }, [game.cols]);

  const animateWaves = useCallback(async (anim: AnimationData) => {
    setIsAnimating(true);
    // Show board after orb placed, before explosions
    setDisplayBoard(anim.boardStates[0]);
    await sleep(120);

    for (let w = 0; w < anim.waves.length; w++) {
      const wave = anim.waves[w];

      // Compute flying orb pixel positions from current DOM layout
      const orbs = wave.map(o => {
        const from = getCellCenter(o.fromRow, o.fromCol);
        const to = getCellCenter(o.toRow, o.toCol);
        return {
          fromX: from?.x ?? 0,
          fromY: from?.y ?? 0,
          toX: to?.x ?? 0,
          toY: to?.y ?? 0,
          color: getColor(o.colorIndex),
        };
      });

      setFlyingOrbs(orbs);
      // Wait a frame for elements to mount, then animate
      await sleep(20);
      const flyEls = boardRef.current?.querySelectorAll('.cr-flying-orb');
      const animPromises: Promise<void>[] = [];
      flyEls?.forEach((el, i) => {
        const orb = orbs[i];
        if (!orb) return;
        const dx = orb.toX - orb.fromX;
        const dy = orb.toY - orb.fromY;
        const a = el.animate([
          { transform: 'translate(-50%, -50%) scale(1.3)', opacity: '1' },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)`, opacity: '0.4' },
        ], { duration: 220, easing: 'ease-in', fill: 'forwards' });
        animPromises.push(a.finished.then(() => {}));
      });

      await Promise.all(animPromises).catch(() => {});

      // Update to post-wave board state
      const nextBoard = anim.boardStates[w + 1] ?? null;
      setDisplayBoard(nextBoard);
      setFlyingOrbs([]);
      await sleep(40);
    }

    setDisplayBoard(null);
    setIsAnimating(false);
  }, [getCellCenter]);

  const handlePlaceOrb = useCallback(async (r: number, c: number) => {
    if (isAnimating) return;
    game.placeOrb(r, c);

    if (isLocal && 'getPendingAnimation' in game) {
      const anim = (game as ReturnType<typeof useLocalGame>).getPendingAnimation();
      if (anim && anim.waves.length > 0) {
        await animateWaves(anim);
      }
    }
  }, [game, isLocal, isAnimating, animateWaves]);

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Chain Reaction</h1>
        <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
      </div>

      {/* Player indicator bar */}
      <div className="cr-players-bar">
        {game.players.map(p => {
          const isEliminated = game.eliminatedPlayers.includes(p.id);
          const isCurrent = p.id === game.currentTurn && game.screen === 'playing';
          return (
            <div
              key={p.id}
              className={`cr-player-chip ${isCurrent ? 'active' : ''} ${isEliminated ? 'eliminated' : ''}`}
              style={{ '--player-color': getColor(p.colorIndex) } as React.CSSProperties}
            >
              {isLocal ? p.name : p.id === game.playerId ? 'You' : p.name.slice(0, 8)}
            </div>
          );
        })}
      </div>

      <p className="hint-text" style={{ marginBottom: '0.5rem' }}>
        {game.screen === 'game-over'
          ? `🎉 ${game.winnerName} wins!`
          : isLocal
            ? `${currentPlayer?.name ?? 'Player 1'}'s turn — tap a cell`
            : game.amEliminated
              ? 'You were eliminated — watching…'
              : game.isMyTurn ? 'Your turn — tap a cell' : `${currentPlayer?.name ?? 'Opponent'}'s turn`}
      </p>

      {/* Board */}
      <div ref={boardRef} className="cr-board" style={{ gridTemplateColumns: `repeat(${game.cols}, 1fr)` }}>
        {boardToRender.map((row, r) =>
          row.map((cell, c) => {
            const canPlace = !isAnimating && game.isMyTurn && !game.amEliminated && game.screen === 'playing'
              && (cell.owner === null || cell.owner === game.playerId);
            const isPlayable = !isAnimating && game.isMyTurn && !game.amEliminated && game.screen === 'playing'
              && (cell.owner === null || cell.owner === game.playerId);
            return (
              <button
                key={`${r}-${c}`}
                className={`cr-cell ${canPlace ? 'clickable' : ''} ${isPlayable ? 'playable' : ''}`}
                disabled={!canPlace}
                onClick={() => handlePlaceOrb(r, c)}
                style={{
                  '--cell-color': cell.owner
                    ? getColor(game.players.find(p => p.id === cell.owner)?.colorIndex ?? 0)
                    : 'transparent',
                } as React.CSSProperties}
              >
                {cell.orbs > 0 && (
                  <div className={`cr-orbs cr-orbs-${Math.min(cell.orbs, 3)}`}>
                    {Array.from({ length: Math.min(cell.orbs, 3) }, (_, i) => (
                      <div
                        key={i}
                        className="cr-orb"
                        style={{ background: getColor(game.players.find(p => p.id === cell.owner)?.colorIndex ?? 0) }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}

        {/* Flying orbs overlay */}
        {flyingOrbs.map((orb, i) => (
          <div
            key={`fly-${i}`}
            className="cr-flying-orb"
            style={{
              left: orb.fromX,
              top: orb.fromY,
              background: orb.color,
              boxShadow: `0 0 8px ${orb.color}, 0 0 4px ${orb.color}`,
            }}
          />
        ))}
      </div>

      {game.screen === 'game-over' && (
        <div className="game-actions">
          <button className="btn btn-primary" onClick={game.rematch}>Rematch</button>
          {isLocal && <button className="btn btn-text" onClick={() => { localGame.goHome(); setIsLocal(false); setMode('menu'); }}>Back to Menu</button>}
        </div>
      )}

      {game.screen === 'playing' && activePlayers.length > 2 && (
        <div className="cr-alive-count">
          {activePlayers.length} players remaining
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
        <h2>How to Play Chain Reaction</h2>
        <h3>Goal</h3>
        <p>Eliminate all other players by capturing their orbs through chain reactions.</p>
        <h3>Rules</h3>
        <ul>
          <li>Players take turns placing orbs on the grid (2–8 players).</li>
          <li>You can only place on empty cells or cells you already own.</li>
          <li>Each cell has a <strong>critical mass</strong> equal to its number of neighbors (corner = 2, edge = 3, interior = 4).</li>
          <li>When a cell reaches critical mass, it <strong>explodes</strong> — sending one orb to each neighbor and capturing those cells.</li>
          <li>Explosions can <strong>chain</strong> — captured cells may also exceed their critical mass!</li>
          <li>A player is <strong>eliminated</strong> when they lose all their orbs.</li>
          <li>Last player standing wins!</li>
        </ul>
        <div className="rules-close">
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
